const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const { Actual, AlertRule, AuditLog, Budget, Category, Department, ImportBatch, Notification, User } = require('../src/models');
const alerts = require('../src/modules/alerts/alerts.service');
const { DEPARTMENTS } = require('./factories/departments');
const { DEMO_PASSWORD, demoUsers } = require('./factories/users');
const { buildLines, scaleCategory, buildHistory, budgetDoc } = require('./factories/budgets');
const { monthActuals } = require('./factories/actuals');

const FAKER_SEED = 42;
const FY_PAST = 2025;
const FY_CURRENT = 2026;
const FY_CURRENT_MONTHS = 7; // Apr–Oct 2026
const CSV_MONTH = 5; // Sep 2026 actuals come from the sample import batch

const FY_CURRENT_STATUS = { ENG: 'APPROVED', SAL: 'APPROVED', MKT: 'APPROVED', HR: 'PENDING_FM', OPS: 'REJECTED' };

// Planned overspend ratios against the effective FY2026 budget.
const OVERRIDES = { 'ENG:SOFTWARE': 1.15, 'MKT:MARKETING': 0.9, 'SAL:TRAVEL': 1.05 };

async function pendingMigrations(db) {
  const dir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const applied = new Set((await db.collection('changelog').find({}).project({ fileName: 1 }).toArray()).map((d) => d.fileName));
  return files.filter((f) => !applied.has(f));
}

async function clearDummyData() {
  const db = mongoose.connection.db;
  await Promise.all([
    Actual.deleteMany({}),
    ImportBatch.deleteMany({}),
    Budget.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    Department.deleteMany({}),
    // Native driver so the `seeded` filter isn't stripped by Mongoose strictQuery.
    db.collection('alertrules').deleteMany({ seeded: { $ne: true } }),
    db.collection('users').deleteMany({ seeded: { $ne: true } }),
  ]);
}

async function seedDummyData({ reset = false, log = console.log } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed dummy data when NODE_ENV=production');

  if (await Department.exists({ code: 'ENG' })) {
    if (!reset) {
      log('Dummy data already present; nothing to do (use seed:reset to rebuild).');
      return { skipped: true };
    }
    log('Removing existing dummy data...');
  }
  if (reset) await clearDummyData();

  faker.seed(FAKER_SEED);

  const categories = await Category.find({ isActive: true }).lean();
  const catIdByCode = Object.fromEntries(categories.map((c) => [c.code, c._id]));
  const neededCodes = new Set(DEPARTMENTS.flatMap((d) => Object.keys(d.profile)));
  for (const code of neededCodes) {
    if (!catIdByCode[code]) throw new Error(`Category ${code} missing; run migrations first`);
  }

  const depts = await Department.insertMany(DEPARTMENTS.map(({ code, name }) => ({ code, name, isActive: true })));
  const deptIdByCode = Object.fromEntries(depts.map((d) => [d.code, d._id]));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = await User.insertMany(demoUsers(deptIdByCode).map((u) => ({ ...u, passwordHash, isActive: true })));
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u._id]));
  const fmId = byEmail['fm@demo.com'];
  const cfoId = byEmail['cfo@demo.com'];

  await AlertRule.create({ scope: 'DEPARTMENT', departmentId: deptIdByCode.MKT, warnPct: 75, overPct: 100, period: 'MONTH' });

  const budgetDocs = [];
  const actualBasis = {};
  for (const d of DEPARTMENTS) {
    const departmentId = deptIdByCode[d.code];
    const actors = { head: byEmail[`head.${d.code.toLowerCase()}@demo.com`], fm: fmId, cfo: cfoId };

    const pastLines = buildLines(faker, d.profile, catIdByCode, 1);
    budgetDocs.push(
      budgetDoc({ departmentId, fiscalYear: FY_PAST, version: 1, status: 'APPROVED', lines: pastLines, history: buildHistory('APPROVED', actors, new Date('2025-02-10T05:00:00Z')) })
    );

    const status = FY_CURRENT_STATUS[d.code];
    const currentLines = buildLines(faker, d.profile, catIdByCode, 1.08);
    budgetDocs.push(
      budgetDoc({
        departmentId,
        fiscalYear: FY_CURRENT,
        version: 1,
        status,
        lines: currentLines,
        history: buildHistory(status, actors, new Date('2026-02-10T05:00:00Z'), {
          rejectComment: 'Travel and capex are too high for this year; please reduce by 10% and resubmit.',
        }),
      })
    );

    if (d.code === 'ENG') {
      budgetDocs.push(
        budgetDoc({
          departmentId,
          fiscalYear: FY_CURRENT,
          version: 2,
          status: 'DRAFT',
          lines: scaleCategory(currentLines, catIdByCode.SOFTWARE, 1.2),
          history: buildHistory('DRAFT', actors, new Date('2026-10-05T05:00:00Z'), { firstAction: 'REVISE' }),
        })
      );
    }
    if (d.code === 'MKT') {
      budgetDocs.push(
        budgetDoc({
          departmentId,
          fiscalYear: FY_CURRENT,
          version: 2,
          status: 'PENDING_CFO',
          lines: scaleCategory(currentLines, catIdByCode.MARKETING, 1.1),
          history: buildHistory('PENDING_CFO', actors, new Date('2026-09-20T05:00:00Z'), { firstAction: 'REVISE' }),
        })
      );
    }

    actualBasis[d.code] = { departmentId, [FY_PAST]: pastLines, [FY_CURRENT]: currentLines };
  }
  const budgets = await Budget.insertMany(budgetDocs);

  const codeByCatId = Object.fromEntries(Object.entries(catIdByCode).map(([code, id]) => [String(id), code]));
  const importBatchId = new mongoose.Types.ObjectId();
  const actualDocs = [];
  for (const d of DEPARTMENTS) {
    const basis = actualBasis[d.code];
    for (const [fiscalYear, monthCount] of [[FY_PAST, 12], [FY_CURRENT, FY_CURRENT_MONTHS]]) {
      for (let m = 0; m < monthCount; m++) {
        const fromCsv = fiscalYear === FY_CURRENT && m === CSV_MONTH;
        for (const line of basis[fiscalYear]) {
          const categoryCode = codeByCatId[String(line.categoryId)];
          const override = fiscalYear === FY_CURRENT ? OVERRIDES[`${d.code}:${categoryCode}`] : undefined;
          const ratio = override ?? faker.number.float({ min: 0.55, max: 0.72, fractionDigits: 3 });
          actualDocs.push(
            ...monthActuals(faker, {
              departmentId: basis.departmentId,
              categoryId: line.categoryId,
              categoryCode,
              fiscalYear,
              fiscalMonth: m,
              target: Math.round((line.monthly[m] * ratio) / 100) * 100,
              createdBy: fmId,
              source: fromCsv ? 'CSV' : 'MANUAL',
              importBatchId: fromCsv ? importBatchId : null,
            })
          );
        }
      }
    }
  }
  await Actual.insertMany(actualDocs);

  const csvCount = actualDocs.filter((a) => a.source === 'CSV').length;
  await ImportBatch.create({
    _id: importBatchId,
    fileName: 'actuals-sep-2026.csv',
    uploadedBy: fmId,
    rowCount: csvCount + 2,
    successCount: csvCount,
    rowErrors: [
      { row: 7, message: 'unknown department code "FIN"' },
      { row: 19, message: 'amount must be greater than zero' },
    ],
    status: 'PARTIAL',
  });

  await AuditLog.insertMany(
    budgets.map((b) => ({ entity: 'Budget', entityId: b._id, action: 'SEED', userId: null, after: { status: b.status, version: b.version }, at: new Date() }))
  );

  const keys = new Map();
  for (const a of actualDocs) keys.set(`${a.departmentId}|${a.fiscalYear}|${a.fiscalMonth}`, a);
  const alertCount = await alerts.evaluate([...keys.values()].map((a) => ({ departmentId: a.departmentId, fiscalYear: a.fiscalYear, fiscalMonth: a.fiscalMonth })));

  const counts = {
    departments: depts.length,
    users: users.length,
    budgets: budgets.length,
    actuals: actualDocs.length,
    importBatches: 1,
    alertNotifications: alertCount,
  };
  log('Dummy data created:', counts);
  log(`Demo accounts (password ${DEMO_PASSWORD}): admin@demo.com, ${users.map((u) => u.email).join(', ')}`);
  return counts;
}

async function main() {
  const env = require('../src/config/env');
  const { connectDb, disconnectDb } = require('../src/config/db');
  if (env.isProduction) {
    console.error('Refusing to seed dummy data when NODE_ENV=production');
    process.exit(1);
  }
  await connectDb(env.MONGO_URI);
  try {
    const pending = await pendingMigrations(mongoose.connection.db);
    if (pending.length) {
      console.error(`Pending migrations: ${pending.join(', ')}. Run "npm run migrate:up" first.`);
      process.exitCode = 1;
      return;
    }
    await seedDummyData({ reset: process.argv.includes('--reset') });
  } finally {
    await disconnectDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seedDummyData, pendingMigrations, clearDummyData };
