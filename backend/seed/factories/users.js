const DEMO_PASSWORD = 'Password@123';

function demoUsers(deptIdByCode) {
  const heads = Object.entries(deptIdByCode).map(([code, id]) => ({
    name: `${code} Department Head`,
    email: `head.${code.toLowerCase()}@demo.com`,
    role: 'DEPT_HEAD',
    departmentId: id,
  }));
  return [
    { name: 'Chief Financial Officer', email: 'cfo@demo.com', role: 'CFO', departmentId: null },
    { name: 'Finance Manager', email: 'fm@demo.com', role: 'FINANCE_MANAGER', departmentId: null },
    { name: 'Engineering Viewer', email: 'viewer@demo.com', role: 'VIEWER', departmentId: deptIdByCode.ENG },
    ...heads,
  ];
}

module.exports = { DEMO_PASSWORD, demoUsers };
