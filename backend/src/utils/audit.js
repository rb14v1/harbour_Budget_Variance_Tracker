const AuditLog = require('../models/AuditLog');

async function record({ entity, entityId, action, userId = null, before = null, after = null }) {
  await AuditLog.create({ entity, entityId, action, userId, before, after, at: new Date() });
}

module.exports = { record };
