const service = require('./alerts.service');

async function list(_req, res) {
  res.json(await service.listRules());
}

async function upsert(req, res) {
  res.json(await service.upsertRule(req.valid.body, req.user.id));
}

async function remove(req, res) {
  await service.deleteRule(req.valid.params.id, req.user.id);
  res.status(204).end();
}

module.exports = { list, upsert, remove };
