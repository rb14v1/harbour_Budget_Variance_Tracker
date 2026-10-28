const env = require('../../config/env');
const { COOKIE_NAME } = require('../../middleware/auth');
const authService = require('./auth.service');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  path: '/',
};

async function login(req, res) {
  const { email, password } = req.valid.body;
  const { token, user } = await authService.login(email, password);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: env.cookieMaxAgeMs });
  res.json({ user });
}

function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
}

async function me(req, res) {
  res.json({ user: await authService.getProfile(req.user.id) });
}

module.exports = { login, logout, me };
