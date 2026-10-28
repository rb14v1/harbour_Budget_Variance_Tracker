const mongoose = require('mongoose');
const { ALERT_SCOPES, ALERT_PERIODS } = require('../constants/enums');

const alertRuleSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ALERT_SCOPES, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    warnPct: { type: Number, required: true, min: 1, max: 1000 },
    overPct: { type: Number, required: true, min: 1, max: 1000 },
    period: { type: String, enum: ALERT_PERIODS, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AlertRule', alertRuleSchema);
