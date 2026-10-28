const mongoose = require('mongoose');
const { CATEGORY_TYPES } = require('../constants/enums');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9_]{2,20}$/ },
    type: { type: String, enum: CATEGORY_TYPES, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
