const service = require('./users.service');

async function list(req, res) {
  res.json(await service.list(req.valid.query));
}

async function create(req, res) {
  res.status(201).json(await service.create(req.valid.body, req.user.id));
}

async function update(req, res) {
  res.json(await service.update(req.valid.params.id, req.valid.body, req.user.id));
}

module.exports = { list, create, update };
