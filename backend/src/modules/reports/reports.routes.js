const { Router } = require('express');
const { scopeToDepartment } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { varianceQuery } = require('./reports.schema');
const controller = require('./reports.controller');

const router = Router();

router.get('/variance', scopeToDepartment, validate({ query: varianceQuery }), controller.variance);
router.get('/variance/export', scopeToDepartment, validate({ query: varianceQuery }), controller.varianceExport);

module.exports = router;
