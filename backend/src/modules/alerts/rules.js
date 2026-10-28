const { AlertRule } = require('../../models');

const FALLBACK_RULE = Object.freeze({ scope: 'GLOBAL', departmentId: null, warnPct: 80, overPct: 100, period: 'MONTH' });

// A department rule overrides the global rule.
async function resolveRule(departmentId) {
  if (departmentId) {
    const deptRule = await AlertRule.findOne({ scope: 'DEPARTMENT', departmentId }).lean();
    if (deptRule) return deptRule;
  }
  const global = await AlertRule.findOne({ scope: 'GLOBAL' }).lean();
  return global || FALLBACK_RULE;
}

module.exports = { resolveRule, FALLBACK_RULE };
