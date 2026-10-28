const { z } = require('zod');
const { BUDGET_STATUSES } = require('../../constants/enums');
const { objectId, pagination, fiscalYear } = require('../../utils/schemas');

// Upper bound keeps any sum of 12 months x 50 lines well inside Number.MAX_SAFE_INTEGER.
const MAX_MONTH_PAISE = 1e13;

const line = z.object({
  categoryId: objectId,
  monthly: z.array(z.number().int().min(0).max(MAX_MONTH_PAISE)).length(12),
});

const lines = z
  .array(line)
  .max(50)
  .refine((ls) => new Set(ls.map((l) => l.categoryId)).size === ls.length, 'Each category may appear only once');

const listQuery = z.object({
  ...pagination,
  fiscalYear: fiscalYear.optional(),
  status: z.enum(BUDGET_STATUSES).optional(),
  departmentId: objectId.optional(),
});

const createBody = z.object({ fiscalYear, lines });
const updateBody = z.object({ lines });
const transitionBody = z.object({ comment: z.string().trim().max(1000).optional() });
const rejectBody = z.object({ comment: z.string().trim().min(3, 'A rejection comment is required').max(1000) });

module.exports = { listQuery, createBody, updateBody, transitionBody, rejectBody };
