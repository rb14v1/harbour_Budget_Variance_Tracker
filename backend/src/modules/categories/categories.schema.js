const { z } = require('zod');
const { CATEGORY_TYPES } = require('../../constants/enums');

const createBody = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,20}$/, 'Code must be 2-20 chars A-Z, 0-9 or _'),
  type: z.enum(CATEGORY_TYPES),
});

const updateBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.enum(CATEGORY_TYPES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const listQuery = z.object({
  includeInactive: z.enum(['true', 'false']).optional(),
});

module.exports = { createBody, updateBody, listQuery };
