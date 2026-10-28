const mongoose = require('mongoose');
const { ACTUAL_SOURCES } = require('../constants/enums');

const actualSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    date: { type: Date, required: true },
    fiscalYear: { type: Number, required: true },
    fiscalMonth: { type: Number, required: true, min: 0, max: 11 },
    amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    description: { type: String, default: null, maxlength: 500 },
    reference: { type: String, default: null, maxlength: 100 },
    source: { type: String, enum: ACTUAL_SOURCES, required: true },
    importBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportBatch', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Actual', actualSchema);
