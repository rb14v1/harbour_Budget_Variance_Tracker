const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const { authenticate } = require('./middleware/auth');
const { originCheck } = require('./middleware/originCheck');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(originCheck);

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
  api.use('/auth', require('./modules/auth/auth.routes'));

  api.use(authenticate);
  api.use('/users', require('./modules/users/users.routes'));
  api.use('/departments', require('./modules/departments/departments.routes'));
  api.use('/categories', require('./modules/categories/categories.routes'));
  api.use('/budgets', require('./modules/budgets/budgets.routes'));
  api.use('/actuals', require('./modules/actuals/actuals.routes'));
  api.use('/imports', require('./modules/imports/imports.routes'));
  api.use('/reports', require('./modules/reports/reports.routes'));
  api.use('/alert-rules', require('./modules/alerts/alerts.routes'));
  api.use('/notifications', require('./modules/notifications/notifications.routes'));
  api.use('/dashboard', require('./modules/dashboard/dashboard.routes'));

  app.use('/api/v1', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
