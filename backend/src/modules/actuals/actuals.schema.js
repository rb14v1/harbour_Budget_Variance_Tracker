const { z } = require('zod');
const { objectId, pagination, fiscalYear } = require('../../utils/schemas');

const listQuery = z.object({
  ...pagination,
  fiscalYear: fiscalYear.optional(),
  fiscalMonth: z.coerce.number().int().min(0).max(11).optional(),
  departmentId: objectId.optional(),
  categoryId: objectId.optional(),
  source: z.enum(['MANUAL', 'CSV']).optional(),
});

const body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  departmentId: objectId,
  categoryId: objectId,
  amount: z.number().int('Amount must be in whole paise').min(1).max(1e13),
  description: z.string().trim().max(500).optional().nullable(),
  reference: z.string().trim().max(100).optional().nullable(),
});

module.exports = { listQuery, body };
