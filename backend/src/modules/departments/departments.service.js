const { Department } = require('../../models');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');

async function list({ includeInactive }) {
  const filter = includeInactive === 'true' ? {} : { isActive: true };
  return Department.find(filter).sort({ name: 1 }).lean();
}

async function create(data, actorId) {
  const dept = await Department.create(data);
  await audit.record({ entity: 'Department', entityId: dept._id, action: 'CREATE', userId: actorId, after: data });
  return dept;
}

async function update(id, data, actorId) {
  const before = await Department.findById(id).lean();
  if (!before) throw ApiError.notFound('Department not found');
  const dept = await Department.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  await audit.record({ entity: 'Department', entityId: dept._id, action: 'UPDATE', userId: actorId, before, after: dept.toObject() });
  return dept;
}

module.exports = { list, create, update };
