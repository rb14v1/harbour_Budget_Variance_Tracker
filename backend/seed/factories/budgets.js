const THOUSAND_RUPEES = 1000 * 100;

function buildLines(faker, profile, catIdByCode, growth = 1) {
  return Object.entries(profile).map(([code, rupees]) => ({
    categoryId: catIdByCode[code],
    monthly: Array.from({ length: 12 }, () => {
      const seasonal = faker.number.float({ min: 0.9, max: 1.1, fractionDigits: 3 });
      // Round to whole thousands of rupees so demo numbers look like real plans.
      return Math.round((rupees * growth * seasonal * 100) / THOUSAND_RUPEES) * THOUSAND_RUPEES;
    }),
  }));
}

function scaleCategory(lines, categoryId, factor) {
  return lines.map((l) =>
    String(l.categoryId) === String(categoryId)
      ? { ...l, monthly: l.monthly.map((v) => Math.round((v * factor) / THOUSAND_RUPEES) * THOUSAND_RUPEES) }
      : l
  );
}

const HISTORY_STEPS = {
  DRAFT: [['CREATE', 'head', null, 'DRAFT']],
  PENDING_FM: [
    ['CREATE', 'head', null, 'DRAFT'],
    ['SUBMIT', 'head', 'DRAFT', 'PENDING_FM'],
  ],
  PENDING_CFO: [
    ['CREATE', 'head', null, 'DRAFT'],
    ['SUBMIT', 'head', 'DRAFT', 'PENDING_FM'],
    ['APPROVE', 'fm', 'PENDING_FM', 'PENDING_CFO'],
  ],
  APPROVED: [
    ['CREATE', 'head', null, 'DRAFT'],
    ['SUBMIT', 'head', 'DRAFT', 'PENDING_FM'],
    ['APPROVE', 'fm', 'PENDING_FM', 'PENDING_CFO'],
    ['APPROVE', 'cfo', 'PENDING_CFO', 'APPROVED'],
  ],
  REJECTED: [
    ['CREATE', 'head', null, 'DRAFT'],
    ['SUBMIT', 'head', 'DRAFT', 'PENDING_FM'],
    ['REJECT', 'fm', 'PENDING_FM', 'REJECTED'],
  ],
};

const ROLE_OF = { head: 'DEPT_HEAD', fm: 'FINANCE_MANAGER', cfo: 'CFO' };

function buildHistory(status, actors, startDate, { firstAction = 'CREATE', rejectComment } = {}) {
  return HISTORY_STEPS[status].map(([action, who, fromStatus, toStatus], i) => ({
    action: i === 0 ? firstAction : action,
    byUserId: actors[who],
    role: ROLE_OF[who],
    fromStatus,
    toStatus,
    comment: action === 'REJECT' ? rejectComment : null,
    at: new Date(startDate.getTime() + i * 3 * 24 * 60 * 60 * 1000),
  }));
}

function budgetDoc({ departmentId, fiscalYear, version, status, lines, history }) {
  const totalAmount = lines.reduce((acc, l) => acc + l.monthly.reduce((a, v) => a + v, 0), 0);
  return {
    departmentId,
    fiscalYear,
    version,
    status,
    isOpen: status !== 'APPROVED',
    lines,
    totalAmount,
    approvalHistory: history,
  };
}

module.exports = { buildLines, scaleCategory, buildHistory, budgetDoc };
