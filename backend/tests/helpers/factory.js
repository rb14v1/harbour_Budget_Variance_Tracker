const bcrypt = require('bcryptjs');
const request = require('supertest');
const { Category, Department, User } = require('../../src/models');

const PASSWORD = 'Password@123';
let hashCache;

async function createDepartment(code, name = `${code} Dept`) {
  return Department.create({ code, name });
}

async function createUser(role, departmentId = null, email) {
  hashCache = hashCache || (await bcrypt.hash(PASSWORD, 4));
  return User.create({
    name: `${role} user`,
    email: email || `${role.toLowerCase()}.${Math.random().toString(36).slice(2, 8)}@test.com`,
    passwordHash: hashCache,
    role,
    departmentId,
  });
}

async function loginAgent(app, user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed for ${user.email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

async function categoryIds() {
  const cats = await Category.find().lean();
  return Object.fromEntries(cats.map((c) => [c.code, String(c._id)]));
}

function monthly(rupeesPerMonth) {
  return Array(12).fill(rupeesPerMonth * 100);
}

// Builds a department with one user per role and logged-in agents for each.
async function buildWorld(app, code = 'ENG') {
  const dept = await createDepartment(code);
  const users = {
    admin: await createUser('ADMIN'),
    head: await createUser('DEPT_HEAD', dept._id),
    fm: await createUser('FINANCE_MANAGER'),
    cfo: await createUser('CFO'),
    viewer: await createUser('VIEWER', dept._id),
  };
  const agents = {};
  for (const [k, u] of Object.entries(users)) agents[k] = await loginAgent(app, u);
  return { dept, users, agents, cats: await categoryIds() };
}

module.exports = { PASSWORD, createDepartment, createUser, loginAgent, categoryIds, monthly, buildWorld };
