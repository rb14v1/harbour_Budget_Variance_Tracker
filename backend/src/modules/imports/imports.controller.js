const service = require('./imports.service');

async function upload(req, res) {
  res.status(201).json(await service.importCsv(req.user, req.file));
}

async function list(req, res) {
  res.json(await service.list(req.valid.query));
}

async function getById(req, res) {
  res.json(await service.getById(req.valid.params.id));
}

async function revert(req, res) {
  res.json(await service.revert(req.user, req.valid.params.id));
}

function template(_req, res) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="actuals-template.csv"');
  res.send(`${service.REQUIRED_COLUMNS.join(',')}\r\n2026-04-15,ENG,SOFTWARE,1234.50,Example licence,INV-001\r\n`);
}

module.exports = { upload, list, getById, revert, template };
