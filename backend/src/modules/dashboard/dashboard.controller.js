const service = require('./dashboard.service');

async function summary(req, res) {
  res.json(await service.summary(req.user, req.scope, req.valid.query.fiscalYear));
}

module.exports = { summary };
