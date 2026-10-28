const service = require('./notifications.service');

async function list(req, res) {
  res.json(await service.list(req.user.id, req.valid.query));
}

async function markRead(req, res) {
  res.json(await service.markRead(req.user.id, req.valid.params.id));
}

async function markAllRead(req, res) {
  res.json(await service.markAllRead(req.user.id));
}

module.exports = { list, markRead, markAllRead };
