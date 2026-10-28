const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const COOKIE_NAME = 'token';

async function authenticate(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw ApiError.unauthorized('Session expired or invalid');
  }

  // Reload the user so deactivation and role changes take effect immediately.
  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive');

  req.user = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ? String(user.departmentId) : null,
  };
  next();
}

module.exports = { authenticate, COOKIE_NAME };
