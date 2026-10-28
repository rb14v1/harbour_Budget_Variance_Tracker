const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { idParams } = require('../../utils/schemas');
const { listQuery } = require('./notifications.schema');
const controller = require('./notifications.controller');

const router = Router();

router.get('/', validate({ query: listQuery }), controller.list);
router.post('/read-all', controller.markAllRead);
router.patch('/:id/read', validate({ params: idParams }), controller.markRead);

module.exports = router;
