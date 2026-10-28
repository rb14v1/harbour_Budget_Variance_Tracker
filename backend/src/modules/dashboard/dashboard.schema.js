const { z } = require('zod');
const { objectId, fiscalYear } = require('../../utils/schemas');

const summaryQuery = z.object({
  fiscalYear,
  departmentId: objectId.optional(),
});

module.exports = { summaryQuery };
