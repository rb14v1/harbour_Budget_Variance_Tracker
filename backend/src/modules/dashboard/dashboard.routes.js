const { Router } = require('express');
const { scopeToDepartment } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { summaryQuery } = require('./dashboard.schema');
const controller = require('./dashboard.controller');

const router = Router();

router.get('/summary', scopeToDepartment, validate({ query: summaryQuery }), controller.summary);

module.exports = router;
