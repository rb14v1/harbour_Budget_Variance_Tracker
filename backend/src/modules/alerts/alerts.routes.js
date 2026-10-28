const { Router } = require('express');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { idParams } = require('../../utils/schemas');
const { upsertBody } = require('./alerts.schema');
const controller = require('./alerts.controller');

const router = Router();

router.get('/', controller.list);
router.put('/', requireRole('ADMIN', 'FINANCE_MANAGER'), validate({ body: upsertBody }), controller.upsert);
router.delete('/:id', requireRole('ADMIN', 'FINANCE_MANAGER'), validate({ params: idParams }), controller.remove);

module.exports = router;
