const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defence in depth on top of SameSite=Lax; non-browser clients send no Origin and are allowed.
function originCheck(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== env.CLIENT_ORIGIN) throw ApiError.forbidden('Origin not allowed');
  next();
}

module.exports = { originCheck };
