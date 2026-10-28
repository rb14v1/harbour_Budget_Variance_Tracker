const { Router } = require('express');
const { requireRole, scopeToDepartment } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { idParams } = require('../../utils/schemas');
const { listQuery, createBody, updateBody, transitionBody, rejectBody } = require('./budgets.schema');
const controller = require('./budgets.controller');

const router = Router();

router.get('/', scopeToDepartment, validate({ query: listQuery }), controller.list);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', requireRole('DEPT_HEAD'), validate({ body: createBody }), controller.create);
router.put('/:id', requireRole('DEPT_HEAD'), validate({ params: idParams, body: updateBody }), controller.updateLines);
router.post('/:id/submit', requireRole('DEPT_HEAD'), validate({ params: idParams, body: transitionBody }), controller.submit);
router.post('/:id/approve', requireRole('FINANCE_MANAGER', 'CFO'), validate({ params: idParams, body: transitionBody }), controller.approve);
router.post('/:id/reject', requireRole('FINANCE_MANAGER', 'CFO'), validate({ params: idParams, body: rejectBody }), controller.reject);
router.post('/:id/revise', requireRole('DEPT_HEAD'), validate({ params: idParams }), controller.revise);

module.exports = router;
