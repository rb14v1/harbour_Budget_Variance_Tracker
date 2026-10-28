const mongoose = require('mongoose');
const { setupDb, teardownDb, migrateUp, migrateDown } = require('./helpers/db');
const enums = require('../src/constants/enums');

let db;

beforeAll(async () => {
  db = await setupDb();
});

afterAll(teardownDb);

async function validatorOf(name) {
  const [info] = await db.listCollections({ name }).toArray();
  return info.options.validator.$jsonSchema;
}

describe('migrations', () => {
  test('creates all collections with strict validators', async () => {
    const names = (await db.listCollections().toArray()).map((c) => c.name);
    for (const n of ['users', 'departments', 'categories', 'budgets', 'actuals', 'importbatches', 'alertrules', 'notifications', 'auditlogs']) {
      expect(names).toContain(n);
      const [info] = await db.listCollections({ name: n }).toArray();
      expect(info.options.validationLevel).toBe('strict');
      expect(info.options.validationAction).toBe('error');
    }
  });

  test('frozen migration enums match model enums', async () => {
    const users = await validatorOf('users');
    const budgets = await validatorOf('budgets');
    const categories = await validatorOf('categories');
    const actuals = await validatorOf('actuals');
    const imports = await validatorOf('importbatches');
    const rules = await validatorOf('alertrules');
    const notifications = await validatorOf('notifications');

    expect(users.properties.role.enum).toEqual([...enums.ROLES]);
    expect(budgets.properties.status.enum).toEqual([...enums.BUDGET_STATUSES]);
    expect(budgets.properties.approvalHistory.items.properties.action.enum).toEqual([...enums.APPROVAL_ACTIONS]);
    expect(categories.properties.type.enum).toEqual([...enums.CATEGORY_TYPES]);
    expect(actuals.properties.source.enum).toEqual([...enums.ACTUAL_SOURCES]);
    expect(imports.properties.status.enum).toEqual([...enums.IMPORT_STATUSES]);
    expect(rules.properties.scope.enum).toEqual([...enums.ALERT_SCOPES]);
    expect(rules.properties.period.enum).toEqual([...enums.ALERT_PERIODS]);
    expect(notifications.properties.type.enum).toEqual([...enums.NOTIFICATION_TYPES]);
  });

  test('database rejects a budget with 11 monthly values', async () => {
    const doc = {
      departmentId: new mongoose.Types.ObjectId(),
      fiscalYear: 2026,
      version: 1,
      status: 'DRAFT',
      isOpen: true,
      lines: [{ categoryId: new mongoose.Types.ObjectId(), monthly: Array(11).fill(100) }],
      totalAmount: 1100,
      approvalHistory: [],
    };
    await expect(db.collection('budgets').insertOne(doc)).rejects.toMatchObject({ code: 121 });
  });

  test('database rejects an unknown status and fractional paise', async () => {
    const base = {
      departmentId: new mongoose.Types.ObjectId(),
      fiscalYear: 2026,
      version: 1,
      isOpen: true,
      lines: [],
      approvalHistory: [],
    };
    await expect(db.collection('budgets').insertOne({ ...base, status: 'BOGUS', totalAmount: 0 })).rejects.toMatchObject({ code: 121 });
    await expect(db.collection('budgets').insertOne({ ...base, status: 'DRAFT', totalAmount: 10.5 })).rejects.toMatchObject({ code: 121 });
  });

  test('migration 003 seeds 7 categories, global alert rule and admin', async () => {
    expect(await db.collection('categories').countDocuments({ seeded: true })).toBe(7);
    expect(await db.collection('alertrules').findOne({ scope: 'GLOBAL' })).toMatchObject({ warnPct: 80, overPct: 100, period: 'MONTH' });
    expect(await db.collection('users').findOne({ email: 'admin@demo.com' })).toMatchObject({ role: 'ADMIN' });
  });

  test('down then up round-trips cleanly', async () => {
    const client = mongoose.connection.getClient();
    await migrateDown(db, client);
    const after = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => n !== 'changelog');
    expect(after).toEqual([]);
    await migrateUp(db, client);
    expect(await db.collection('categories').countDocuments()).toBe(7);
    const idx = await db.collection('budgets').indexes();
    expect(idx.map((i) => i.name)).toEqual(expect.arrayContaining(['dept_fy_version_unique', 'dept_fy_open_unique']));
  });
});
