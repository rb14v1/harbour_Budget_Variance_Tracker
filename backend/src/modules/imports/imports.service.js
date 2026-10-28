const { parse } = require('csv-parse/sync');
const { Actual, Category, Department, ImportBatch } = require('../../models');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');
const { parseOrgDate, toFiscal } = require('../../utils/fiscal');
const { parseRupees } = require('../../utils/money');
const { paged } = require('../../utils/schemas');
const alerts = require('../alerts/alerts.service');

const REQUIRED_COLUMNS = ['date', 'departmentCode', 'categoryCode', 'amount', 'description', 'reference'];
const MAX_ROWS = 10000;

function parseCsv(buffer) {
  try {
    return parse(buffer, {
      columns: (header) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    throw ApiError.badRequest(`Could not parse CSV: ${err.message}`);
  }
}

// Returns valid documents plus per-row errors; row numbers are 1-based and count the header line.
async function validateRows(records) {
  const [departments, categories] = await Promise.all([
    Department.find({ isActive: true }).select('code').lean(),
    Category.find({ isActive: true }).select('code').lean(),
  ]);
  const deptByCode = new Map(departments.map((d) => [d.code, d._id]));
  const catByCode = new Map(categories.map((c) => [c.code, c._id]));

  const docs = [];
  const rowErrors = [];
  records.forEach((r, i) => {
    const row = i + 2;
    const problems = [];
    const date = parseOrgDate(r.date);
    if (!date) problems.push(`invalid date "${r.date}" (expected YYYY-MM-DD)`);
    const departmentId = deptByCode.get(String(r.departmentCode || '').toUpperCase());
    if (!departmentId) problems.push(`unknown department code "${r.departmentCode}"`);
    const categoryId = catByCode.get(String(r.categoryCode || '').toUpperCase());
    if (!categoryId) problems.push(`unknown category code "${r.categoryCode}"`);
    const amount = parseRupees(r.amount);
    if (amount === null) problems.push(`invalid amount "${r.amount}" (max 2 decimals)`);
    else if (amount <= 0) problems.push('amount must be greater than zero');
    if ((r.description || '').length > 500) problems.push('description longer than 500 characters');
    if ((r.reference || '').length > 100) problems.push('reference longer than 100 characters');

    if (problems.length) {
      rowErrors.push({ row, message: problems.join('; ') });
      return;
    }
    const { fiscalYear, fiscalMonth } = toFiscal(date);
    docs.push({
      departmentId,
      categoryId,
      date,
      fiscalYear,
      fiscalMonth,
      amount,
      description: r.description || null,
      reference: r.reference || null,
      source: 'CSV',
    });
  });
  return { docs, rowErrors };
}

async function importCsv(user, file) {
  if (!file) throw ApiError.badRequest('A CSV file is required (field name "file")');
  const records = parseCsv(file.buffer);
  if (!records.length) throw ApiError.badRequest('The CSV file has no data rows');
  if (records.length > MAX_ROWS) throw ApiError.badRequest(`Too many rows (max ${MAX_ROWS})`);
  const columns = Object.keys(records[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length) throw ApiError.badRequest(`Missing columns: ${missing.join(', ')}`, { expected: REQUIRED_COLUMNS });

  const { docs, rowErrors } = await validateRows(records);
  const status = docs.length === 0 ? 'FAILED' : rowErrors.length ? 'PARTIAL' : 'COMPLETED';

  const batch = await ImportBatch.create({
    fileName: (file.originalname || 'upload.csv').slice(0, 255),
    uploadedBy: user.id,
    rowCount: records.length,
    successCount: docs.length,
    rowErrors,
    status,
  });

  if (docs.length) {
    await Actual.insertMany(docs.map((d) => ({ ...d, importBatchId: batch._id, createdBy: user.id })));
  }

  await audit.record({
    entity: 'ImportBatch',
    entityId: batch._id,
    action: 'IMPORT',
    userId: user.id,
    after: { fileName: batch.fileName, rowCount: batch.rowCount, successCount: batch.successCount, status },
  });
  await alerts.evaluate(docs.map((d) => ({ departmentId: d.departmentId, fiscalYear: d.fiscalYear, fiscalMonth: d.fiscalMonth })));
  return batch.toObject();
}

async function list({ page, limit }) {
  const [items, total] = await Promise.all([
    ImportBatch.find().populate('uploadedBy', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ImportBatch.countDocuments(),
  ]);
  return paged(items, total, page, limit);
}

async function getById(id) {
  const batch = await ImportBatch.findById(id).populate('uploadedBy', 'name email').lean();
  if (!batch) throw ApiError.notFound('Import batch not found');
  return batch;
}

async function revert(user, id) {
  const batch = await ImportBatch.findOneAndUpdate(
    { _id: id, status: { $in: ['COMPLETED', 'PARTIAL'] } },
    { $set: { status: 'REVERTED' } },
    { new: true }
  ).lean();
  if (!batch) {
    if (!(await ImportBatch.exists({ _id: id }))) throw ApiError.notFound('Import batch not found');
    throw ApiError.conflict('Only completed or partial imports can be reverted');
  }
  const keys = await Actual.aggregate([
    { $match: { importBatchId: batch._id } },
    { $group: { _id: { departmentId: '$departmentId', fiscalYear: '$fiscalYear', fiscalMonth: '$fiscalMonth' } } },
  ]);
  const { deletedCount } = await Actual.deleteMany({ importBatchId: batch._id });
  await audit.record({ entity: 'ImportBatch', entityId: batch._id, action: 'REVERT', userId: user.id, after: { deletedCount } });
  await alerts.evaluate(keys.map((k) => k._id));
  return { ...batch, deletedCount };
}

module.exports = { importCsv, list, getById, revert, REQUIRED_COLUMNS };
