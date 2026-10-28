const service = require('./budgets.service');

async function list(req, res) {
  res.json(await service.list(req.scope, req.valid.query));
}

async function getById(req, res) {
  res.json(await service.getById(req.user, req.valid.params.id));
}

async function create(req, res) {
  res.status(201).json(await service.create(req.user, req.valid.body));
}

async function updateLines(req, res) {
  res.json(await service.updateLines(req.user, req.valid.params.id, req.valid.body));
}

function transitionHandler(action) {
  return async (req, res) => {
    res.json(await service.transition(req.user, req.valid.params.id, action, req.valid.body.comment));
  };
}

async function revise(req, res) {
  res.status(201).json(await service.revise(req.user, req.valid.params.id));
}

module.exports = {
  list,
  getById,
  create,
  updateLines,
  submit: transitionHandler('SUBMIT'),
  approve: transitionHandler('APPROVE'),
  reject: transitionHandler('REJECT'),
  revise,
};
