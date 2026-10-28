const { Budget, Department, Notification } = require('../../models');
const { currentFiscalYear, toFiscal } = require('../../utils/fiscal');
const reports = require('../reports/reports.service');

const ALL_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function ytdMonths(fiscalYear, now = new Date()) {
  const current = currentFiscalYear(now);
  if (fiscalYear < current) return ALL_MONTHS;
  if (fiscalYear > current) return [];
  const { fiscalMonth } = toFiscal(now);
  return ALL_MONTHS.slice(0, fiscalMonth + 1);
}

async function pendingApprovals(user) {
  if (user.role === 'FINANCE_MANAGER') return Budget.countDocuments({ status: 'PENDING_FM' });
  if (user.role === 'CFO') return Budget.countDocuments({ status: 'PENDING_CFO' });
  if (user.role === 'ADMIN') return Budget.countDocuments({ status: { $in: ['PENDING_FM', 'PENDING_CFO'] } });
  if (user.role === 'DEPT_HEAD') return Budget.countDocuments({ departmentId: user.departmentId, status: { $in: ['PENDING_FM', 'PENDING_CFO'] } });
  return 0;
}

async function summary(user, scope, fiscalYear) {
  const [{ effective, entries }, labels, pending, unread, activeDepts] = await Promise.all([
    reports.buildMatrix(fiscalYear, scope.departmentId),
    reports.labelMaps(),
    pendingApprovals(user),
    Notification.countDocuments({ userId: user.id, isRead: false }),
    Department.find(scope.departmentId ? { _id: scope.departmentId, isActive: true } : { isActive: true }).select('_id').lean(),
  ]);

  const ytd = ytdMonths(fiscalYear);
  const totals = { budget: 0, actual: 0, budgetYtd: 0, actualYtd: 0 };
  const byCategory = new Map();

  for (const e of entries) {
    totals.budget += reports.sumMonths(e.budget, ALL_MONTHS);
    totals.actual += reports.sumMonths(e.actual, ALL_MONTHS);
    const b = reports.sumMonths(e.budget, ytd);
    const a = reports.sumMonths(e.actual, ytd);
    totals.budgetYtd += b;
    totals.actualYtd += a;
    const c = byCategory.get(e.categoryId) || { budget: 0, actual: 0 };
    c.budget += b;
    c.actual += a;
    byCategory.set(e.categoryId, c);
  }

  const topOverspends = entries
    .map((e) => {
      const budget = reports.sumMonths(e.budget, ytd);
      const actual = reports.sumMonths(e.actual, ytd);
      return {
        departmentId: e.departmentId,
        department: labels.departments.get(e.departmentId)?.code || '?',
        categoryId: e.categoryId,
        category: labels.categories.get(e.categoryId)?.name || '?',
        budget,
        actual,
        overBy: actual - budget,
        variancePct: reports.variancePct(budget, actual),
      };
    })
    .filter((r) => r.overBy > 0)
    .sort((a, b) => b.overBy - a.overBy)
    .slice(0, 5);

  const categoryVariance = [...byCategory.entries()]
    .map(([id, v]) => ({ categoryId: id, category: labels.categories.get(id)?.name || '?', budget: v.budget, actual: v.actual, variance: v.budget - v.actual }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return {
    fiscalYear,
    ytdMonths: ytd.length,
    totals: {
      ...totals,
      varianceYtd: totals.budgetYtd - totals.actualYtd,
      variancePctYtd: reports.variancePct(totals.budgetYtd, totals.actualYtd),
    },
    trend: reports.trendOf(entries),
    categoryVariance,
    topOverspends,
    pendingApprovals: pending,
    unreadNotifications: unread,
    departmentsWithoutApprovedBudget: activeDepts.filter((d) => !effective.has(String(d._id))).length,
  };
}

module.exports = { summary, ytdMonths };
