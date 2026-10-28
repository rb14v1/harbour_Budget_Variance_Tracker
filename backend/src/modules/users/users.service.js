const bcrypt = require('bcryptjs');
const env = require('../../config/env');
const { User, Department } = require('../../models');
const ApiError = require('../../utils/ApiError');
const audit = require('../../utils/audit');
const { paged } = require('../../utils/schemas');

const DEPT_ROLES = new Set(['DEPT_HEAD', 'VIEWER']);

async function assertDepartmentForRole(role, departmentId) {
  if (DEPT_ROLES.has(role)) {
    if (!departmentId) throw ApiError.badRequest(`${role} must be assigned to a department`);
    const exists = await Department.exists({ _id: departmentId, isActive: true });
    if (!exists) throw ApiError.badRequest('Department not found or inactive');
  }
}

async function list({ page, limit, role, departmentId }) {
  const filter = {};
  if (role) filter.role = role;
  if (departmentId) filter.departmentId = departmentId;
  const [items, total] = await Promise.all([
    User.find(filter).populate('departmentId', 'name code').sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  return paged(items.map((u) => u.toJSON()), total, page, limit);
}

async function create(data, actorId) {
  const departmentId = DEPT_ROLES.has(data.role) ? data.departmentId : null;
  await assertDepartmentForRole(data.role, departmentId);
  const passwordHash = await bcrypt.hash(data.password, env.bcryptRounds);
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    departmentId,
  });
  await audit.record({ entity: 'User', entityId: user._id, action: 'CREATE', userId: actorId, after: { email: user.email, role: user.role } });
  return user.toJSON();
}

async function update(id, data, actorId) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === actorId && (data.isActive === false || (data.role && data.role !== user.role))) {
    throw ApiError.badRequest('You cannot deactivate yourself or change your own role');
  }
  const before = { name: user.name, role: user.role, departmentId: user.departmentId, isActive: user.isActive };

  if (data.name !== undefined) user.name = data.name;
  if (data.role !== undefined) user.role = data.role;
  if (data.departmentId !== undefined) user.departmentId = data.departmentId;
  if (data.isActive !== undefined) user.isActive = data.isActive;
  if (!DEPT_ROLES.has(user.role)) user.departmentId = null;
  await assertDepartmentForRole(user.role, user.departmentId);
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, env.bcryptRounds);

  await user.save();
  await audit.record({
    entity: 'User',
    entityId: user._id,
    action: 'UPDATE',
    userId: actorId,
    before,
    after: { name: user.name, role: user.role, departmentId: user.departmentId, isActive: user.isActive, passwordChanged: Boolean(data.password) },
  });
  return user.toJSON();
}

module.exports = { list, create, update };
