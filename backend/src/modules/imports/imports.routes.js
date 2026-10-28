const { Router } = require('express');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { csvUpload } = require('../../middleware/upload');
const { idParams } = require('../../utils/schemas');
const { listQuery } = require('./imports.schema');
const controller = require('./imports.controller');

const router = Router();

router.use(requireRole('ADMIN', 'FINANCE_MANAGER'));
router.get('/', validate({ query: listQuery }), controller.list);
router.get('/template', controller.template);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', csvUpload, controller.upload);
router.delete('/:id', validate({ params: idParams }), controller.revert);

module.exports = router;
