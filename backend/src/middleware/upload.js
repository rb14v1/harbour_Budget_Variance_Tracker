const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_BYTES = 2 * 1024 * 1024;
const CSV_MIME = new Set(['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/plain', 'application/octet-stream']);

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.csv' || !CSV_MIME.has(file.mimetype)) {
      return cb(ApiError.badRequest('Only .csv files are allowed'));
    }
    cb(null, true);
  },
}).single('file');

module.exports = { csvUpload, MAX_BYTES };
