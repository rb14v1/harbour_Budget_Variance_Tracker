const { z } = require('zod');
const { ALERT_SCOPES, ALERT_PERIODS } = require('../../constants/enums');
const { objectId } = require('../../utils/schemas');

const upsertBody = z
  .object({
    scope: z.enum(ALERT_SCOPES),
    departmentId: objectId.nullable().optional(),
    warnPct: z.number().int().min(1).max(1000),
    overPct: z.number().int().min(1).max(1000),
    period: z.enum(ALERT_PERIODS),
  })
  .refine((v) => v.warnPct < v.overPct, { message: 'warnPct must be lower than overPct', path: ['warnPct'] })
  .refine((v) => v.scope === 'GLOBAL' || Boolean(v.departmentId), { message: 'departmentId is required for DEPARTMENT scope', path: ['departmentId'] });

module.exports = { upsertBody };
