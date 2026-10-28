const mongoose = require('mongoose');
const { BUDGET_STATUSES, APPROVAL_ACTIONS, ROLES } = require('../constants/enums');

const lineSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    monthly: {
      type: [{ type: Number, min: 0, validate: Number.isInteger }],
      validate: { validator: (v) => Array.isArray(v) && v.length === 12, message: 'monthly must have 12 entries' },
    },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, enum: APPROVAL_ACTIONS, required: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    comment: { type: String, default: null, maxlength: 1000 },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    fiscalYear: { type: Number, required: true },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: BUDGET_STATUSES, required: true },
    isOpen: { type: Boolean, required: true },
    lines: { type: [lineSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    approvalHistory: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
