// Single source of truth for who may move a budget from which status to which.
const TRANSITIONS = Object.freeze([
  { action: 'SUBMIT', role: 'DEPT_HEAD', from: ['DRAFT', 'REJECTED'], to: 'PENDING_FM' },
  { action: 'APPROVE', role: 'FINANCE_MANAGER', from: ['PENDING_FM'], to: 'PENDING_CFO' },
  { action: 'APPROVE', role: 'CFO', from: ['PENDING_CFO'], to: 'APPROVED' },
  { action: 'REJECT', role: 'FINANCE_MANAGER', from: ['PENDING_FM'], to: 'REJECTED' },
  { action: 'REJECT', role: 'CFO', from: ['PENDING_CFO'], to: 'REJECTED' },
]);

function findTransition(action, role) {
  return TRANSITIONS.find((t) => t.action === action && t.role === role) || null;
}

module.exports = { TRANSITIONS, findTransition };
