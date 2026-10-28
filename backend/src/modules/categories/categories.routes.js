const { Router } = require('express');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { idParams } = require('../../utils/schemas');
const { createBody, updateBody, listQuery } = require('./categories.schema');
const controller = require('./categories.controller');

const router = Router();

router.get('/', validate({ query: listQuery }), controller.list);
router.post('/', requireRole('ADMIN'), validate({ body: createBody }), controller.create);
router.patch('/:id', requireRole('ADMIN'), validate({ params: idParams, body: updateBody }), controller.update);

module.exports = router;
