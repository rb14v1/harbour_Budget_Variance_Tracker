const service = require('./actuals.service');

async function list(req, res) {
  res.json(await service.list(req.scope, req.valid.query));
}

async function create(req, res) {
  res.status(201).json(await service.create(req.user, req.valid.body));
}

async function update(req, res) {
  res.json(await service.update(req.user, req.valid.params.id, req.valid.body));
}

async function remove(req, res) {
  await service.remove(req.user, req.valid.params.id);
  res.status(204).end();
}

module.exports = { list, create, update, remove };
