const path = require('path');
const { createApp } = require('../src/app');
const { Actual, Budget, Notification } = require('../src/models');
const { setupDb, teardownDb } = require('./helpers/db');
const { buildWorld, createDepartment, monthly } = require('./helpers/factory');

let app;
let w;

beforeAll(async () => {
  await setupDb();
  app = createApp();
  w = await buildWorld(app, 'ENG');
  for (const code of ['MKT', 'SAL', 'HR', 'OPS']) await createDepartment(code);
});

afterAll(teardownDb);

async function approvedBudget(fiscalYear) {
  return Budget.create({
    departmentId: w.dept._id,
    fiscalYear,
    version: 1,
    status: 'APPROVED',
    isOpen: false,
    lines: [
      { categoryId: w.cats.SOFTWARE, monthly: monthly(1000) },
      { categoryId: w.cats.TRAVEL, monthly: monthly(500) },
    ],
    totalAmount: 12 * 150000,
    approvalHistory: [],
  });
}

const actual = (categoryId, amount, date = '2030-04-10') => ({ date, departmentId: String(w.dept._id), categoryId, amount });

describe('variance report and alerts', () => {
  beforeAll(async () => {
    await approvedBudget(2030);
    await w.agents.fm.post('/api/v1/actuals').send(actual(w.cats.SOFTWARE, 120000)).expect(201);
    await w.agents.fm.post('/api/v1/actuals').send(actual(w.cats.TRAVEL, 41000)).expect(201);
  });

  test('stores fiscal fields computed in IST', async () => {
    const a = await Actual.findOne({ categoryId: w.cats.SOFTWARE }).lean();
    expect(a).toMatchObject({ fiscalYear: 2030, fiscalMonth: 0, source: 'MANUAL' });
  });

  test('monthly variance math', async () => {
    const res = await w.agents.cfo.get('/api/v1/reports/variance?fiscalYear=2030&period=month&periodIndex=0&groupBy=category');
    expect(res.status).toBe(200);
    const byLabel = Object.fromEntries(res.body.rows.map((r) => [r.label, r]));
    expect(byLabel.Software).toMatchObject({ budget: 100000, actual: 120000, variance: -20000, variancePct: 120 });
    expect(byLabel.Travel).toMatchObject({ budget: 50000, actual: 41000, variance: 9000, variancePct: 82 });
    expect(res.body.totals).toMatchObject({ budget: 150000, actual: 161000, variance: -11000 });
    expect(res.body.thresholds).toEqual({ warnPct: 80, overPct: 100 });
    expect(res.body.trend[0]).toMatchObject({ label: 'Apr', budget: 150000, actual: 161000 });
  });

  test('quarter and year aggregation', async () => {
    const q = await w.agents.cfo.get('/api/v1/reports/variance?fiscalYear=2030&period=quarter&periodIndex=1');
    expect(q.body.rows.find((r) => r.label === 'Software')).toMatchObject({ budget: 300000, actual: 120000, variancePct: 40 });
    const y = await w.agents.cfo.get('/api/v1/reports/variance?fiscalYear=2030&period=year');
    expect(y.body.totals.budget).toBe(1800000);
  });

  test('department grouping flags departments without an approved budget', async () => {
    const res = await w.agents.fm.get('/api/v1/reports/variance?fiscalYear=2030&period=year&groupBy=department');
    const eng = res.body.rows.find((r) => r.code === 'ENG');
    const mkt = res.body.rows.find((r) => r.code === 'MKT');
    expect(eng.noApprovedBudget).toBe(false);
    expect(mkt).toMatchObject({ budget: 0, actual: 0, noApprovedBudget: true });
  });

  test('alerts: OVER for software, WARN for travel, sent to dept head and FM', async () => {
    for (const user of [w.users.head, w.users.fm]) {
      const notes = await Notification.find({ userId: user._id, type: { $in: ['WARN', 'OVER'] } }).lean();
      expect(notes.filter((n) => n.type === 'OVER')).toHaveLength(1);
      expect(notes.filter((n) => n.type === 'WARN')).toHaveLength(1);
      expect(notes.find((n) => n.type === 'OVER').message).toMatch(/Software at 120%/);
    }
    expect(await Notification.countDocuments({ userId: w.users.cfo._id, type: 'OVER' })).toBe(0);
  });

  test('alerts are de-duplicated per level and period', async () => {
    await w.agents.fm.post('/api/v1/actuals').send(actual(w.cats.SOFTWARE, 5000, '2030-04-20')).expect(201);
    expect(await Notification.countDocuments({ userId: w.users.head._id, type: 'OVER' })).toBe(1);
  });

  test('CSV export escapes and totals', async () => {
    const res = await w.agents.cfo.get('/api/v1/reports/variance/export?fiscalYear=2030&period=month&periodIndex=0');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.split('\r\n')[0]).toBe('Category,Code,Budget (INR),Actual (INR),Variance (INR),Variance %');
    expect(res.text).toMatch(/Software,SOFTWARE,1000.00,1250.00,-250.00,125.00/);
    expect(res.text).toMatch(/^Total,/m);
  });

  test('dashboard summary', async () => {
    const res = await w.agents.head.get('/api/v1/dashboard/summary?fiscalYear=2030');
    expect(res.status).toBe(200);
    expect(res.body.totals.budget).toBe(1800000);
    expect(res.body.trend).toHaveLength(12);
  });

  test('dept head and viewer cannot write actuals', async () => {
    await w.agents.head.post('/api/v1/actuals').send(actual(w.cats.SOFTWARE, 100)).expect(403);
    await w.agents.viewer.post('/api/v1/actuals').send(actual(w.cats.SOFTWARE, 100)).expect(403);
  });
});

describe('CSV import', () => {
  const sample = path.resolve(__dirname, '../seed/samples/actuals-sample.csv');
  let batchId;

  test('imports 20 valid rows and reports 3 row errors', async () => {
    const res = await w.agents.fm.post('/api/v1/imports').attach('file', sample);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rowCount: 23, successCount: 20, status: 'PARTIAL' });
    expect(res.body.rowErrors.map((e) => e.row)).toEqual([22, 23, 24]);
    expect(res.body.rowErrors[0].message).toMatch(/unknown department code "FIN"/);
    expect(res.body.rowErrors[1].message).toMatch(/greater than zero/);
    expect(res.body.rowErrors[2].message).toMatch(/invalid date/);
    batchId = res.body._id;

    const lakh = await Actual.findOne({ importBatchId: batchId, reference: 'CSV-1017' }).lean();
    expect(lakh.amount).toBe(12000000);
    expect(await Actual.countDocuments({ importBatchId: batchId })).toBe(20);
  });

  test('revert removes the batch actuals once', async () => {
    const res = await w.agents.fm.delete(`/api/v1/imports/${batchId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'REVERTED', deletedCount: 20 });
    expect(await Actual.countDocuments({ importBatchId: batchId })).toBe(0);
    expect((await w.agents.fm.delete(`/api/v1/imports/${batchId}`)).status).toBe(409);
  });

  test('rejects non-CSV uploads', async () => {
    const res = await w.agents.fm.post('/api/v1/imports').attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('rejects files over 2 MB', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 10, 'a');
    const res = await w.agents.fm.post('/api/v1/imports').attach('file', big, { filename: 'big.csv', contentType: 'text/csv' });
    expect(res.status).toBe(413);
  });

  test('rejects CSV with missing columns', async () => {
    const res = await w.agents.fm.post('/api/v1/imports').attach('file', Buffer.from('date,amount\n2030-04-01,10\n'), { filename: 'bad.csv', contentType: 'text/csv' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Missing columns/);
  });

  test('viewers cannot import', async () => {
    const res = await w.agents.viewer.post('/api/v1/imports').attach('file', sample);
    expect(res.status).toBe(403);
  });
});
