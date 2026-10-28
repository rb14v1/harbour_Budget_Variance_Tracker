const { z } = require('zod');
const { objectId, fiscalYear } = require('../../utils/schemas');

const varianceQuery = z.object({
  fiscalYear,
  departmentId: objectId.optional(),
  period: z.enum(['month', 'quarter', 'year']).default('year'),
  periodIndex: z.coerce.number().int().min(0).max(11).optional(),
  groupBy: z.enum(['category', 'department']).default('category'),
});

module.exports = { varianceQuery };
