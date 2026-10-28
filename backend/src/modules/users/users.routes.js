const { Router } = require('express');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { idParams } = require('../../utils/schemas');
const { listQuery, createBody, updateBody } = require('./users.schema');
const controller = require('./users.controller');

const router = Router();

router.use(requireRole('ADMIN'));
router.get('/', validate({ query: listQuery }), controller.list);
router.post('/', validate({ body: createBody }), controller.create);
router.patch('/:id', validate({ params: idParams, body: updateBody }), controller.update);

module.exports = router;
