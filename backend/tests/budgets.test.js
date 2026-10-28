const { createApp } = require('../src/app');
const { Budget } = require('../src/models');
const { setupDb, teardownDb } = require('./helpers/db');
const { buildWorld, createDepartment, createUser, loginAgent, monthly } = require('./helpers/factory');

let app;
let w;

beforeAll(async () => {
  await setupDb();
  app = createApp();
  w = await buildWorld(app, 'ENG');
});

afterAll(teardownDb);

const lines = () => [
  { categoryId: w.cats.SOFTWARE, monthly: monthly(1000) },
  { categoryId: w.cats.TRAVEL, monthly: monthly(500) },
];

async function newDraft(fiscalYear) {
  const res = await w.agents.head.post('/api/v1/budgets').send({ fiscalYear, lines: lines() });
  expect(res.status).toBe(201);
  return res.body;
}

describe('budget workflow', () => {
  test('full happy path DRAFT → PENDING_FM → PENDING_CFO → APPROVED', async () => {
    const b = await newDraft(2030);
    expect(b).toMatchObject({ status: 'DRAFT', version: 1, isOpen: true, totalAmount: 12 * 150000 });

    let res = await w.agents.head.post(`/api/v1/budgets/${b._id}/submit`).send({});
    expect(res.body.status).toBe('PENDING_FM');
    res = await w.agents.fm.post(`/api/v1/budgets/${b._id}/approve`).send({});
    expect(res.body.status).toBe('PENDING_CFO');
    res = await w.agents.cfo.post(`/api/v1/budgets/${b._id}/approve`).send({ comment: 'ok' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'APPROVED', isOpen: false });
    expect(res.body.approvalHistory.map((h) => h.action)).toEqual(['CREATE', 'SUBMIT', 'APPROVE', 'APPROVE']);
  });

  test.each([
    ['fm', 'submit'],
    ['cfo', 'submit'],
    ['viewer', 'submit'],
    ['admin', 'approve'],
    ['head', 'approve'],
    ['viewer', 'reject'],
  ])('%s cannot %s', async (who, action) => {
    const b = await Budget.findOne({ fiscalYear: 2030 }).lean();
    const res = await w.agents[who].post(`/api/v1/budgets/${b._id}/${action}`).send({ comment: 'not allowed' });
    expect(res.status).toBe(403);
  });

  test('CFO cannot approve at the FM stage and FM cannot approve at the CFO stage', async () => {
    const b = await newDraft(2031);
    await w.agents.head.post(`/api/v1/budgets/${b._id}/submit`).send({});
    expect((await w.agents.cfo.post(`/api/v1/budgets/${b._id}/approve`).send({})).status).toBe(409);
    await w.agents.fm.post(`/api/v1/budgets/${b._id}/approve`).send({});
    expect((await w.agents.fm.post(`/api/v1/budgets/${b._id}/approve`).send({})).status).toBe(409);
  });

  test('rejection requires a comment and allows edit + resubmit', async () => {
    const b = await newDraft(2032);
    await w.agents.head.post(`/api/v1/budgets/${b._id}/submit`).send({});
    expect((await w.agents.fm.post(`/api/v1/budgets/${b._id}/reject`).send({})).status).toBe(400);

    const rej = await w.agents.fm.post(`/api/v1/budgets/${b._id}/reject`).send({ comment: 'Too high' });
    expect(rej.body).toMatchObject({ status: 'REJECTED', isOpen: true });

    const edit = await w.agents.head.put(`/api/v1/budgets/${b._id}`).send({ lines: [{ categoryId: w.cats.SOFTWARE, monthly: monthly(10) }] });
    expect(edit.status).toBe(200);
    expect(edit.body.totalAmount).toBe(12 * 1000);
    expect((await w.agents.head.post(`/api/v1/budgets/${b._id}/submit`).send({})).body.status).toBe('PENDING_FM');
  });

  test('lines cannot be edited once submitted', async () => {
    const b = await newDraft(2033);
    await w.agents.head.post(`/api/v1/budgets/${b._id}/submit`).send({});
    const res = await w.agents.head.put(`/api/v1/budgets/${b._id}`).send({ lines: lines() });
    expect(res.status).toBe(409);
  });

  test('concurrent approvals: exactly one succeeds, the other gets 409', async () => {
    const b = await newDraft(2034);
    await w.agents.head.post(`/api/v1/budgets/${b._id}/submit`).send({});
    const fm2 = await loginAgent(app, await createUser('FINANCE_MANAGER'));
    const results = await Promise.all([
      w.agents.fm.post(`/api/v1/budgets/${b._id}/approve`).send({}),
      fm2.post(`/api/v1/budgets/${b._id}/approve`).send({}),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const saved = await Budget.findById(b._id).lean();
    expect(saved.status).toBe('PENDING_CFO');
    expect(saved.approvalHistory.filter((h) => h.action === 'APPROVE')).toHaveLength(1);
  });

  test('only one open version per department and fiscal year', async () => {
    const approved = await Budget.findOne({ fiscalYear: 2030, status: 'APPROVED' }).lean();
    expect((await w.agents.head.post('/api/v1/budgets').send({ fiscalYear: 2030, lines: lines() })).status).toBe(409);

    const results = await Promise.all([
      w.agents.head.post(`/api/v1/budgets/${approved._id}/revise`).send({}),
      w.agents.head.post(`/api/v1/budgets/${approved._id}/revise`).send({}),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Budget.countDocuments({ fiscalYear: 2030, isOpen: true })).toBe(1);
    const v2 = results.find((r) => r.status === 201).body;
    expect(v2).toMatchObject({ version: 2, status: 'DRAFT' });

    // v1 stays effective while v2 is in progress
    expect((await w.agents.head.post(`/api/v1/budgets/${approved._id}/revise`).send({})).status).toBe(409);
  });

  test('approval notifies the next actor', async () => {
    const res = await w.agents.fm.get('/api/v1/notifications');
    expect(res.body.items.some((n) => n.type === 'APPROVAL')).toBe(true);
  });
});

describe('department scoping', () => {
  let other;
  let otherBudget;

  beforeAll(async () => {
    other = await createDepartment('MKT');
    const otherHead = await loginAgent(app, await createUser('DEPT_HEAD', other._id));
    otherBudget = (await otherHead.post('/api/v1/budgets').send({ fiscalYear: 2030, lines: lines() })).body;
  });

  test('dept head cannot read another department budget (403)', async () => {
    expect((await w.agents.head.get(`/api/v1/budgets/${otherBudget._id}`)).status).toBe(403);
    expect((await w.agents.viewer.get(`/api/v1/budgets/${otherBudget._id}`)).status).toBe(403);
  });

  test('departmentId query param for another department is rejected (403)', async () => {
    expect((await w.agents.head.get(`/api/v1/budgets?departmentId=${other._id}`)).status).toBe(403);
    expect((await w.agents.viewer.get(`/api/v1/reports/variance?fiscalYear=2030&departmentId=${other._id}`)).status).toBe(403);
  });

  test('list is forced to own department', async () => {
    const res = await w.agents.head.get('/api/v1/budgets?limit=100');
    expect(res.status).toBe(200);
    expect(res.body.items.every((b) => b.departmentId._id === String(w.dept._id))).toBe(true);
  });

  test('dept head cannot edit or submit another department budget', async () => {
    expect((await w.agents.head.put(`/api/v1/budgets/${otherBudget._id}`).send({ lines: lines() })).status).toBe(403);
    expect((await w.agents.head.post(`/api/v1/budgets/${otherBudget._id}/submit`).send({})).status).toBe(403);
  });

  test('finance roles see all departments', async () => {
    const res = await w.agents.cfo.get(`/api/v1/budgets/${otherBudget._id}`);
    expect(res.status).toBe(200);
  });
});

describe('security basics', () => {
  test('unauthenticated requests get 401', async () => {
    const request = require('supertest');
    expect((await request(app).get('/api/v1/budgets')).status).toBe(401);
  });

  test('mutations from a foreign Origin are rejected', async () => {
    const res = await w.agents.head.post('/api/v1/budgets').set('Origin', 'https://evil.example').send({ fiscalYear: 2040, lines: [] });
    expect(res.status).toBe(403);
  });

  test('login response never includes passwordHash', async () => {
    const request = require('supertest');
    const res = await request(app).post('/api/v1/auth/login').send({ email: w.users.fm.email, password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  test('wrong password gets 401', async () => {
    const request = require('supertest');
    const res = await request(app).post('/api/v1/auth/login').send({ email: w.users.fm.email, password: 'nope' });
    expect(res.status).toBe(401);
  });
});
