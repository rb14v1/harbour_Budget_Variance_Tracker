const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const fiscalYear = z.coerce.number().int().min(2000).max(2100);

const idParams = z.object({ id: objectId });

function paged(items, total, page, limit) {
  return { items, total, page, limit };
}

module.exports = { objectId, pagination, fiscalYear, idParams, paged };
