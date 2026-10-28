const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants/enums');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true, maxlength: 500 },
    link: { type: String, default: null, maxlength: 300 },
    isRead: { type: Boolean, default: false },
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
