const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../../models/User');
const ApiError = require('../../utils/ApiError');

// Compared against when the email is unknown so response timing doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 4);

async function login(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const token = jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
  return { token, user: user.toJSON() };
}

async function getProfile(userId) {
  const user = await User.findById(userId).populate('departmentId', 'name code');
  if (!user) throw ApiError.unauthorized();
  return user.toJSON();
}

module.exports = { login, getProfile };
