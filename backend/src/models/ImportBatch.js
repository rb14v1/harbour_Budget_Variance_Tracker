const mongoose = require('mongoose');
const { IMPORT_STATUSES } = require('../constants/enums');

const importBatchSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, maxlength: 255 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rowCount: { type: Number, required: true },
    successCount: { type: Number, required: true },
    rowErrors: {
      type: [new mongoose.Schema({ row: Number, message: String }, { _id: false })],
      default: [],
    },
    status: { type: String, enum: IMPORT_STATUSES, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImportBatch', importBatchSchema);
