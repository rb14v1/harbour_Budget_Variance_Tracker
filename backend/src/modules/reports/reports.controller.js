const service = require('./reports.service');

function params(req) {
  return { ...req.valid.query, departmentId: req.scope.departmentId };
}

async function variance(req, res) {
  res.json(await service.variance(params(req)));
}

async function varianceExport(req, res) {
  const p = params(req);
  const csv = await service.varianceCsv(p);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="variance-FY${p.fiscalYear}-${p.groupBy}-${p.period}.csv"`);
  res.send(csv);
}

module.exports = { variance, varianceExport };
