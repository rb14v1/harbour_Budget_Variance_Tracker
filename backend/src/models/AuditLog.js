const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entity: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  at: { type: Date, required: true },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
