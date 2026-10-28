const mongoose = require('mongoose');
const { Budget, Notification, User, Actual, Department } = require('../src/models');
const { setupDb, teardownDb } = require('./helpers/db');
const { seedDummyData, pendingMigrations } = require('../seed/seedDummyData');

const silent = () => {};

beforeAll(setupDb);
afterAll(teardownDb);

describe('dummy data seed', () => {
  let counts;

  test('no pending migrations after setup', async () => {
    expect(await pendingMigrations(mongoose.connection.db)).toEqual([]);
  });

  test('full seed run creates the documented dataset', async () => {
    counts = await seedDummyData({ log: silent });
    expect(counts).toMatchObject({ departments: 5, users: 8, budgets: 12 });
    expect(counts.actuals).toBeGreaterThan(1000);
    expect(await User.countDocuments()).toBe(9);
  });

  test('FY2026 budget statuses', async () => {
    const depts = Object.fromEntries((await Department.find().lean()).map((d) => [String(d._id), d.code]));
    const fy26 = await Budget.find({ fiscalYear: 2026 }).lean();
    const summary = fy26.map((b) => `${depts[String(b.departmentId)]}:v${b.version}:${b.status}`).sort();
    expect(summary).toEqual([
      'ENG:v1:APPROVED',
      'ENG:v2:DRAFT',
      'HR:v1:PENDING_FM',
      'MKT:v1:APPROVED',
      'MKT:v2:PENDING_CFO',
      'OPS:v1:REJECTED',
      'SAL:v1:APPROVED',
    ]);
  });

  test('actuals cover Apr–Oct 2026 only for FY2026', async () => {
    const months = await Actual.distinct('fiscalMonth', { fiscalYear: 2026 });
    expect(months.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('alert service produced the planned alerts', async () => {
    const head = await User.findOne({ email: 'head.eng@demo.com' });
    const engOver = await Notification.find({ userId: head._id, type: 'OVER' }).lean();
    expect(engOver.some((n) => /ENG Software at 11\d%/.test(n.message))).toBe(true);

    const mktHead = await User.findOne({ email: 'head.mkt@demo.com' });
    const mktWarn = await Notification.find({ userId: mktHead._id, type: 'WARN' }).lean();
    expect(mktWarn.some((n) => /MKT Marketing at 9\d%/.test(n.message))).toBe(true);

    const salHead = await User.findOne({ email: 'head.sal@demo.com' });
    expect(await Notification.exists({ userId: salHead._id, type: 'OVER', message: /SAL Travel/ })).toBeTruthy();
  });

  test('second run is a no-op; reset rebuilds the same counts', async () => {
    expect(await seedDummyData({ log: silent })).toEqual({ skipped: true });
    const again = await seedDummyData({ reset: true, log: silent });
    expect(again).toEqual(counts);
    expect(await User.countDocuments({ email: 'admin@demo.com' })).toBe(1);
  });

  test('refuses to run in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    await expect(seedDummyData({ log: silent })).rejects.toThrow(/production/);
    process.env.NODE_ENV = prev;
  });
});
