const { Actual, Category, Department } = require('../../models');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');
const { parseOrgDate, toFiscal } = require('../../utils/fiscal');
const { paged } = require('../../utils/schemas');
const alerts = require('../alerts/alerts.service');

function keyOf(a) {
  return { departmentId: String(a.departmentId), fiscalYear: a.fiscalYear, fiscalMonth: a.fiscalMonth };
}

async function resolveFields(data) {
  const date = parseOrgDate(data.date);
  if (!date) throw ApiError.badRequest('Invalid date');
  const [dept, cat] = await Promise.all([
    Department.exists({ _id: data.departmentId, isActive: true }),
    Category.exists({ _id: data.categoryId, isActive: true }),
  ]);
  if (!dept) throw ApiError.badRequest('Department not found or inactive');
  if (!cat) throw ApiError.badRequest('Category not found or inactive');
  const { fiscalYear, fiscalMonth } = toFiscal(date);
  return {
    departmentId: data.departmentId,
    categoryId: data.categoryId,
    date,
    fiscalYear,
    fiscalMonth,
    amount: data.amount,
    description: data.description || null,
    reference: data.reference || null,
  };
}

async function list(scope, { page, limit, fiscalYear, fiscalMonth, categoryId, source }) {
  const filter = {};
  if (scope.departmentId) filter.departmentId = scope.departmentId;
  if (fiscalYear !== undefined) filter.fiscalYear = fiscalYear;
  if (fiscalMonth !== undefined) filter.fiscalMonth = fiscalMonth;
  if (categoryId) filter.categoryId = categoryId;
  if (source) filter.source = source;
  const [items, total] = await Promise.all([
    Actual.find(filter)
      .populate('departmentId', 'name code')
      .populate('categoryId', 'name code')
      .sort({ date: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Actual.countDocuments(filter),
  ]);
  return paged(items, total, page, limit);
}

async function create(user, data) {
  const fields = await resolveFields(data);
  const actual = await Actual.create({ ...fields, source: 'MANUAL', createdBy: user.id });
  await audit.record({ entity: 'Actual', entityId: actual._id, action: 'CREATE', userId: user.id, after: fields });
  await alerts.evaluate([keyOf(actual)]);
  return actual.toObject();
}

async function update(user, id, data) {
  const before = await Actual.findById(id).lean();
  if (!before) throw ApiError.notFound('Actual not found');
  const fields = await resolveFields(data);
  const updated = await Actual.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true }).lean();
  await audit.record({ entity: 'Actual', entityId: updated._id, action: 'UPDATE', userId: user.id, before, after: fields });
  await alerts.evaluate([keyOf(before), keyOf(updated)]);
  return updated;
}

async function remove(user, id) {
  const before = await Actual.findByIdAndDelete(id).lean();
  if (!before) throw ApiError.notFound('Actual not found');
  await audit.record({ entity: 'Actual', entityId: before._id, action: 'DELETE', userId: user.id, before });
  await alerts.evaluate([keyOf(before)]);
}

module.exports = { list, create, update, remove, keyOf };
