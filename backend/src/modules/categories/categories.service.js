const { Category } = require('../../models');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');

async function list({ includeInactive }) {
  const filter = includeInactive === 'true' ? {} : { isActive: true };
  return Category.find(filter).sort({ name: 1 }).lean();
}

async function create(data, actorId) {
  const category = await Category.create(data);
  await audit.record({ entity: 'Category', entityId: category._id, action: 'CREATE', userId: actorId, after: data });
  return category;
}

async function update(id, data, actorId) {
  const before = await Category.findById(id).lean();
  if (!before) throw ApiError.notFound('Category not found');
  const category = await Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  await audit.record({ entity: 'Category', entityId: category._id, action: 'UPDATE', userId: actorId, before, after: category.toObject() });
  return category;
}

module.exports = { list, create, update };
