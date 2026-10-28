const { z } = require('zod');
const { pagination } = require('../../utils/schemas');

const listQuery = z.object({ ...pagination });

module.exports = { listQuery };
