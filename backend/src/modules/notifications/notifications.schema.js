const { z } = require('zod');
const { pagination } = require('../../utils/schemas');

const listQuery = z.object({
  ...pagination,
  unreadOnly: z.enum(['true', 'false']).optional(),
});

module.exports = { listQuery };
