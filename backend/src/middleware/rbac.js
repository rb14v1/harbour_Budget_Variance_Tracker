const ApiError = require('../utils/ApiError');

const DEPT_SCOPED_ROLES = new Set(['DEPT_HEAD', 'VIEWER']);

function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!allowed.has(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

function isDeptScoped(user) {
  return DEPT_SCOPED_ROLES.has(user.role);
}

// Forces DEPT_HEAD/VIEWER onto their own department regardless of query params (prevents IDOR).
function scopeToDepartment(req, _res, next) {
  const requested = typeof req.query.departmentId === 'string' && req.query.departmentId ? req.query.departmentId : null;
  if (isDeptScoped(req.user)) {
    if (!req.user.departmentId) throw ApiError.forbidden('No department assigned to this account');
    if (requested && requested !== req.user.departmentId) throw ApiError.forbidden('Access limited to your own department');
    req.scope = { departmentId: req.user.departmentId };
  } else {
    req.scope = { departmentId: requested };
  }
  next();
}

function assertDepartmentAccess(user, departmentId) {
  if (isDeptScoped(user) && String(departmentId) !== user.departmentId) {
    throw ApiError.forbidden('Access limited to your own department');
  }
}

module.exports = { requireRole, scopeToDepartment, assertDepartmentAccess, isDeptScoped };
