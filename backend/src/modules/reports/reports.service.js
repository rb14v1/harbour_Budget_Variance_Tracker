const mongoose = require('mongoose');
const { Actual, Category, Department } = require('../../models');
const { getEffectiveBudgets } = require('../budgets/budgets.service');
const { resolveRule } = require('../alerts/rules');
const ApiError = require('../../utils/ApiError');
const { FISCAL_MONTH_LABELS, quarterMonths } = require('../../utils/fiscal');
const { paiseToRupeeString } = require('../../utils/money');
const { toCsv } = require('../../utils/csvSafe');

const ALL_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function sumMonths(arr, months) {
  let total = 0;
  for (const m of months) total += arr[m];
  return total;
}

function variancePct(budget, actual) {
  return budget > 0 ? Math.round((actual * 10000) / budget) / 100 : null;
}

// Builds per (department, category) monthly budget and actual arrays for one fiscal year.
async function buildMatrix(fiscalYear, departmentId = null) {
  const effective = await getEffectiveBudgets(fiscalYear, departmentId);
  const cells = new Map();
  const cell = (dept, cat) => {
    const key = `${dept}|${cat}`;
    if (!cells.has(key)) {
      cells.set(key, { departmentId: String(dept), categoryId: String(cat), budget: Array(12).fill(0), actual: Array(12).fill(0) });
    }
    return cells.get(key);
  };

  for (const [deptId, budget] of effective) {
    for (const line of budget.lines) {
      const c = cell(deptId, line.categoryId);
      line.monthly.forEach((v, i) => {
        c.budget[i] += v;
      });
    }
  }

  const match = { fiscalYear };
  if (departmentId) match.departmentId = new mongoose.Types.ObjectId(String(departmentId));
  const sums = await Actual.aggregate([
    { $match: match },
    { $group: { _id: { d: '$departmentId', c: '$categoryId', m: '$fiscalMonth' }, total: { $sum: '$amount' } } },
  ]);
  for (const s of sums) cell(s._id.d, s._id.c).actual[s._id.m] += s.total;

  return { effective, entries: [...cells.values()] };
}

function resolveMonths(period, periodIndex) {
  if (period === 'year') return ALL_MONTHS;
  if (period === 'quarter') {
    if (!periodIndex || periodIndex < 1 || periodIndex > 4) throw ApiError.badRequest('periodIndex must be 1-4 for quarter');
    return quarterMonths(periodIndex);
  }
  if (periodIndex === undefined || periodIndex < 0 || periodIndex > 11) throw ApiError.badRequest('periodIndex must be 0-11 for month');
  return [periodIndex];
}

async function labelMaps() {
  const [departments, categories] = await Promise.all([
    Department.find().select('name code isActive').lean(),
    Category.find().select('name code type').lean(),
  ]);
  return {
    departments: new Map(departments.map((d) => [String(d._id), d])),
    categories: new Map(categories.map((c) => [String(c._id), c])),
  };
}

function trendOf(entries) {
  return ALL_MONTHS.map((m) => ({
    fiscalMonth: m,
    label: FISCAL_MONTH_LABELS[m],
    budget: entries.reduce((acc, e) => acc + e.budget[m], 0),
    actual: entries.reduce((acc, e) => acc + e.actual[m], 0),
  }));
}

async function variance({ fiscalYear, departmentId, period, periodIndex, groupBy }) {
  const months = resolveMonths(period, periodIndex);
  const [{ effective, entries }, labels, rule] = await Promise.all([
    buildMatrix(fiscalYear, departmentId),
    labelMaps(),
    resolveRule(departmentId),
  ]);

  const groups = new Map();
  const group = (key) => {
    if (!groups.has(key)) groups.set(key, { key, budget: 0, actual: 0 });
    return groups.get(key);
  };

  if (groupBy === 'department') {
    for (const [id, d] of labels.departments) {
      if (d.isActive && (!departmentId || id === String(departmentId))) group(id);
    }
  }

  for (const e of entries) {
    const g = group(groupBy === 'department' ? e.departmentId : e.categoryId);
    g.budget += sumMonths(e.budget, months);
    g.actual += sumMonths(e.actual, months);
  }

  const rows = [...groups.values()]
    .map((g) => {
      const meta = groupBy === 'department' ? labels.departments.get(g.key) : labels.categories.get(g.key);
      const row = {
        key: g.key,
        label: meta?.name || 'Unknown',
        code: meta?.code || '',
        budget: g.budget,
        actual: g.actual,
        variance: g.budget - g.actual,
        variancePct: variancePct(g.budget, g.actual),
      };
      if (groupBy === 'department') row.noApprovedBudget = !effective.has(g.key);
      return row;
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const totalBudget = rows.reduce((acc, r) => acc + r.budget, 0);
  const totalActual = rows.reduce((acc, r) => acc + r.actual, 0);

  return {
    fiscalYear,
    period,
    periodIndex: period === 'year' ? null : periodIndex,
    groupBy,
    departmentId: departmentId || null,
    noApprovedBudget: departmentId ? !effective.has(String(departmentId)) : false,
    thresholds: { warnPct: rule.warnPct, overPct: rule.overPct },
    rows,
    totals: { budget: totalBudget, actual: totalActual, variance: totalBudget - totalActual, variancePct: variancePct(totalBudget, totalActual) },
    trend: trendOf(entries),
  };
}

async function varianceCsv(params) {
  const report = await variance(params);
  const header = [params.groupBy === 'department' ? 'Department' : 'Category', 'Code', 'Budget (INR)', 'Actual (INR)', 'Variance (INR)', 'Variance %'];
  const body = report.rows.map((r) => [
    r.label,
    r.code,
    paiseToRupeeString(r.budget),
    paiseToRupeeString(r.actual),
    paiseToRupeeString(r.variance),
    r.variancePct === null ? '' : r.variancePct.toFixed(2),
  ]);
  const t = report.totals;
  body.push(['Total', '', paiseToRupeeString(t.budget), paiseToRupeeString(t.actual), paiseToRupeeString(t.variance), t.variancePct === null ? '' : t.variancePct.toFixed(2)]);
  return toCsv([header, ...body]);
}

module.exports = { buildMatrix, variance, varianceCsv, labelMaps, trendOf, sumMonths, variancePct };
