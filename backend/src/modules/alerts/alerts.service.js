const { AlertRule, Department, Category } = require('../../models');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');
const { monthsForPeriod, periodKey, periodLabel } = require('../../utils/fiscal');
const { buildMatrix, sumMonths } = require('../reports/reports.service');
const notifications = require('../notifications/notifications.service');
const { resolveRule } = require('./rules');

function levelFor(budget, actual, rule) {
  if (actual <= 0) return null;
  // Integer comparison avoids float percentages.
  if (actual * 100 > budget * rule.overPct) return 'OVER';
  if (actual * 100 >= budget * rule.warnPct) return 'WARN';
  return null;
}

// Runs once per affected (department, fiscal year, fiscal month) after any change to actuals.
async function evaluate(keys) {
  const unique = new Map();
  for (const k of keys) {
    const id = `${k.departmentId}|${k.fiscalYear}|${k.fiscalMonth}`;
    if (!unique.has(id)) unique.set(id, { departmentId: String(k.departmentId), fiscalYear: k.fiscalYear, fiscalMonth: k.fiscalMonth });
  }
  if (!unique.size) return 0;

  const [departments, categories] = await Promise.all([
    Department.find().select('code name').lean(),
    Category.find().select('name').lean(),
  ]);
  const deptById = new Map(departments.map((d) => [String(d._id), d]));
  const catById = new Map(categories.map((c) => [String(c._id), c]));

  const matrixCache = new Map();
  const recipientCache = new Map();
  let created = 0;

  for (const key of unique.values()) {
    const rule = await resolveRule(key.departmentId);
    const months = monthsForPeriod(rule.period, key.fiscalMonth);

    const cacheKey = `${key.departmentId}|${key.fiscalYear}`;
    if (!matrixCache.has(cacheKey)) matrixCache.set(cacheKey, await buildMatrix(key.fiscalYear, key.departmentId));
    const { effective, entries } = matrixCache.get(cacheKey);
    if (!effective.has(key.departmentId)) continue;

    if (!recipientCache.has(key.departmentId)) {
      recipientCache.set(key.departmentId, await notifications.recipientsFor({ roles: ['FINANCE_MANAGER'], departmentHeadOf: key.departmentId }));
    }
    const recipients = recipientCache.get(key.departmentId);

    for (const e of entries) {
      const budget = sumMonths(e.budget, months);
      const actual = sumMonths(e.actual, months);
      const level = levelFor(budget, actual, rule);
      if (!level) continue;

      const pct = budget > 0 ? `${Math.round((actual * 100) / budget)}%` : 'unbudgeted spend';
      const dept = deptById.get(e.departmentId);
      const cat = catById.get(e.categoryId);
      const pKey = periodKey(rule.period, key.fiscalMonth);
      created += await notifications.notifyMany(recipients, {
        type: level,
        message: `${level === 'OVER' ? 'Over budget' : 'Budget warning'}: ${dept?.code || ''} ${cat?.name || ''} at ${pct} for ${periodLabel(rule.period, key.fiscalMonth, key.fiscalYear)}`,
        link: `/reports/variance?fiscalYear=${key.fiscalYear}&departmentId=${e.departmentId}`,
        dedupeKey: `${level}:${e.departmentId}:${e.categoryId}:${key.fiscalYear}:${pKey}`,
      });
    }
  }
  return created;
}

async function listRules() {
  return AlertRule.find().populate('departmentId', 'name code').sort({ scope: -1 }).lean();
}

async function upsertRule(data, actorId) {
  const departmentId = data.scope === 'DEPARTMENT' ? data.departmentId : null;
  if (departmentId && !(await Department.exists({ _id: departmentId }))) throw ApiError.badRequest('Department not found');
  const filter = { scope: data.scope, departmentId };
  const before = await AlertRule.findOne(filter).lean();
  const rule = await AlertRule.findOneAndUpdate(
    filter,
    { $set: { warnPct: data.warnPct, overPct: data.overPct, period: data.period } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  await audit.record({ entity: 'AlertRule', entityId: rule._id, action: before ? 'UPDATE' : 'CREATE', userId: actorId, before, after: rule });
  return rule;
}

async function deleteRule(id, actorId) {
  const rule = await AlertRule.findById(id).lean();
  if (!rule) throw ApiError.notFound('Alert rule not found');
  if (rule.scope === 'GLOBAL') throw ApiError.badRequest('The global rule cannot be deleted');
  await AlertRule.deleteOne({ _id: id });
  await audit.record({ entity: 'AlertRule', entityId: rule._id, action: 'DELETE', userId: actorId, before: rule });
}

module.exports = { evaluate, levelFor, listRules, upsertRule, deleteRule };
