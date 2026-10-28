const { Router } = require('express');
const { requireRole, scopeToDepartment } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { idParams } = require('../../utils/schemas');
const { listQuery, body } = require('./actuals.schema');
const controller = require('./actuals.controller');

const router = Router();
const writers = requireRole('ADMIN', 'FINANCE_MANAGER');

router.get('/', scopeToDepartment, validate({ query: listQuery }), controller.list);
router.post('/', writers, validate({ body }), controller.create);
router.put('/:id', writers, validate({ params: idParams, body }), controller.update);
router.delete('/:id', writers, validate({ params: idParams }), controller.remove);

module.exports = router;
