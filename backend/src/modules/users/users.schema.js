const { z } = require('zod');
const { ROLES } = require('../../constants/enums');
const { objectId, pagination } = require('../../utils/schemas');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const listQuery = z.object({
  ...pagination,
  role: z.enum(ROLES).optional(),
  departmentId: objectId.optional(),
});

const createBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password,
  role: z.enum(ROLES),
  departmentId: objectId.nullable().optional(),
});

const updateBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    role: z.enum(ROLES).optional(),
    departmentId: objectId.nullable().optional(),
    isActive: z.boolean().optional(),
    password: password.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

module.exports = { listQuery, createBody, updateBody };
