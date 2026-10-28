const mongoose = require('mongoose');
const { Budget, Category, Department } = require('../../models');
const { findTransition } = require('../../constants/budgetTransitions');
const { EDITABLE_BUDGET_STATUSES } = require('../../constants/enums');
const { assertDepartmentAccess } = require('../../middleware/rbac');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');
const { sum } = require('../../utils/money');
const { paged } = require('../../utils/schemas');
const notifications = require('../notifications/notifications.service');

const STATUS_LABEL = {
  PENDING_FM: 'awaiting Finance Manager approval',
  PENDING_CFO: 'awaiting CFO approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function totalOf(lines) {
  return sum(lines.map((l) => sum(l.monthly)));
}

async function assertCategoriesActive(lines) {
  const ids = lines.map((l) => l.categoryId);
  if (!ids.length) return;
  const count = await Category.countDocuments({ _id: { $in: ids }, isActive: true });
  if (count !== ids.length) throw ApiError.badRequest('One or more categories are unknown or inactive');
}

function historyEntry(user, action, fromStatus, toStatus, comment) {
  return { action, byUserId: user.id, role: user.role, fromStatus, toStatus, comment: comment || null, at: new Date() };
}

async function list(scope, { page, limit, fiscalYear, status }) {
  const filter = {};
  if (scope.departmentId) filter.departmentId = scope.departmentId;
  if (fiscalYear) filter.fiscalYear = fiscalYear;
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Budget.find(filter)
      .select('-lines -approvalHistory')
      .populate('departmentId', 'name code')
      .sort({ fiscalYear: -1, departmentId: 1, version: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Budget.countDocuments(filter),
  ]);
  return paged(items, total, page, limit);
}

async function getById(user, id) {
  const budget = await Budget.findById(id)
    .populate('departmentId', 'name code')
    .populate('approvalHistory.byUserId', 'name email')
    .lean();
  if (!budget) throw ApiError.notFound('Budget not found');
  assertDepartmentAccess(user, budget.departmentId._id);
  return budget;
}

async function create(user, { fiscalYear, lines }) {
  if (!user.departmentId) throw ApiError.forbidden('No department assigned to this account');
  const dept = await Department.exists({ _id: user.departmentId, isActive: true });
  if (!dept) throw ApiError.badRequest('Department is inactive');
  await assertCategoriesActive(lines);

  const existing = await Budget.exists({ departmentId: user.departmentId, fiscalYear });
  if (existing) throw ApiError.conflict('A budget already exists for this fiscal year; edit or revise it instead');

  const budget = await Budget.create({
    departmentId: user.departmentId,
    fiscalYear,
    version: 1,
    status: 'DRAFT',
    isOpen: true,
    lines,
    totalAmount: totalOf(lines),
    approvalHistory: [historyEntry(user, 'CREATE', null, 'DRAFT')],
  });
  await audit.record({ entity: 'Budget', entityId: budget._id, action: 'CREATE', userId: user.id, after: { fiscalYear, totalAmount: budget.totalAmount } });
  return budget.toObject();
}

async function updateLines(user, id, { lines }) {
  const current = await Budget.findById(id).lean();
  if (!current) throw ApiError.notFound('Budget not found');
  if (String(current.departmentId) !== user.departmentId) throw ApiError.forbidden('You can only edit your own department budget');
  await assertCategoriesActive(lines);

  const totalAmount = totalOf(lines);
  const updated = await Budget.findOneAndUpdate(
    { _id: id, status: { $in: EDITABLE_BUDGET_STATUSES } },
    { $set: { lines, totalAmount } },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) throw ApiError.conflict('Budget can only be edited in DRAFT or REJECTED status');

  await audit.record({
    entity: 'Budget',
    entityId: updated._id,
    action: 'UPDATE_LINES',
    userId: user.id,
    before: { totalAmount: current.totalAmount, lines: current.lines },
    after: { totalAmount, lines },
  });
  return updated;
}

async function notifyTransition(budget, toStatus) {
  const dept = await Department.findById(budget.departmentId).select('code name').lean();
  const label = `${dept?.code || 'Dept'} FY${budget.fiscalYear} budget v${budget.version}`;
  const link = `/budgets/${budget._id}`;
  let recipients = [];
  if (toStatus === 'PENDING_FM') recipients = await notifications.recipientsFor({ roles: ['FINANCE_MANAGER'] });
  else if (toStatus === 'PENDING_CFO') recipients = await notifications.recipientsFor({ roles: ['CFO'], departmentHeadOf: budget.departmentId });
  else recipients = await notifications.recipientsFor({ departmentHeadOf: budget.departmentId });
  await notifications.notifyMany(recipients, { type: 'APPROVAL', message: `${label} is ${STATUS_LABEL[toStatus]}`, link });
}

async function transition(user, id, action, comment) {
  const t = findTransition(action, user.role);
  if (!t) throw ApiError.forbidden(`Your role cannot ${action.toLowerCase()} budgets`);

  const budget = await Budget.findById(id).lean();
  if (!budget) throw ApiError.notFound('Budget not found');
  if (t.role === 'DEPT_HEAD' && String(budget.departmentId) !== user.departmentId) {
    throw ApiError.forbidden('You can only submit your own department budget');
  }
  if (!t.from.includes(budget.status)) {
    throw ApiError.conflict(`Cannot ${action.toLowerCase()} a budget in ${budget.status} status`);
  }
  if (action === 'SUBMIT' && !budget.lines.length) throw ApiError.badRequest('Add at least one budget line before submitting');

  // Filtering on the status we read makes the transition atomic: a concurrent change yields null.
  const updated = await Budget.findOneAndUpdate(
    { _id: id, status: budget.status },
    {
      $set: { status: t.to, isOpen: t.to !== 'APPROVED' },
      $push: { approvalHistory: historyEntry(user, action, budget.status, t.to, comment) },
    },
    { new: true }
  ).lean();
  if (!updated) throw ApiError.conflict('Budget was modified by someone else; reload and try again');

  await audit.record({
    entity: 'Budget',
    entityId: updated._id,
    action,
    userId: user.id,
    before: { status: budget.status },
    after: { status: t.to, comment: comment || null },
  });
  await notifyTransition(updated, t.to);
  return updated;
}

async function revise(user, id) {
  const budget = await Budget.findById(id).lean();
  if (!budget) throw ApiError.notFound('Budget not found');
  if (String(budget.departmentId) !== user.departmentId) throw ApiError.forbidden('You can only revise your own department budget');
  if (budget.status !== 'APPROVED') throw ApiError.conflict('Only an APPROVED budget can be revised');

  const latest = await Budget.findOne({ departmentId: budget.departmentId, fiscalYear: budget.fiscalYear }).sort({ version: -1 }).lean();
  if (latest.version !== budget.version) throw ApiError.conflict(`A newer version (v${latest.version}) already exists`);

  // The partial unique index on isOpen rejects a second concurrent revision with 11000 → 409.
  const next = await Budget.create({
    departmentId: budget.departmentId,
    fiscalYear: budget.fiscalYear,
    version: budget.version + 1,
    status: 'DRAFT',
    isOpen: true,
    lines: budget.lines,
    totalAmount: budget.totalAmount,
    approvalHistory: [historyEntry(user, 'REVISE', null, 'DRAFT', `Revision of v${budget.version}`)],
  });
  await audit.record({ entity: 'Budget', entityId: next._id, action: 'REVISE', userId: user.id, before: { version: budget.version }, after: { version: next.version } });
  return next.toObject();
}

// Effective budget = highest APPROVED version per department for the fiscal year.
async function getEffectiveBudgets(fiscalYear, departmentId = null) {
  const match = { fiscalYear, status: 'APPROVED' };
  if (departmentId) match.departmentId = new mongoose.Types.ObjectId(String(departmentId));
  const rows = await Budget.aggregate([
    { $match: match },
    { $sort: { departmentId: 1, version: -1 } },
    { $group: { _id: '$departmentId', doc: { $first: '$$ROOT' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.doc]));
}

module.exports = { list, getById, create, updateLines, transition, revise, getEffectiveBudgets, totalOf };
