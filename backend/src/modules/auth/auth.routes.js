const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../../config/env');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { loginBody } = require('./auth.schema');
const controller = require('./auth.controller');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.loginRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts, try again later' } },
});

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginBody }), controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
