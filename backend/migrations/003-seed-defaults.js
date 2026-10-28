const bcrypt = require('bcryptjs');

const CATEGORIES = [
  { code: 'SALARIES', name: 'Salaries', type: 'OPEX' },
  { code: 'TRAVEL', name: 'Travel', type: 'OPEX' },
  { code: 'SOFTWARE', name: 'Software', type: 'OPEX' },
  { code: 'MARKETING', name: 'Marketing', type: 'OPEX' },
  { code: 'OFFICE', name: 'Office', type: 'OPEX' },
  { code: 'TRAINING', name: 'Training', type: 'OPEX' },
  { code: 'CAPEX_EQUIP', name: 'Capex - Equipment', type: 'CAPEX' },
];

module.exports = {
  CATEGORIES,
  async up(db) {
    const now = new Date();

    for (const c of CATEGORIES) {
      await db.collection('categories').updateOne(
        { code: c.code },
        { $setOnInsert: { ...c, isActive: true, seeded: true, createdAt: now, updatedAt: now } },
        { upsert: true }
      );
    }

    await db.collection('alertrules').updateOne(
      { scope: 'GLOBAL', departmentId: null },
      {
        $setOnInsert: {
          scope: 'GLOBAL',
          departmentId: null,
          warnPct: 80,
          overPct: 100,
          period: 'MONTH',
          seeded: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || '';
    if (!email || password.length < 8) {
      throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) must be set to run migration 003');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await db.collection('users').updateOne(
      { email },
      {
        $setOnInsert: {
          name: 'System Admin',
          email,
          passwordHash,
          role: 'ADMIN',
          departmentId: null,
          isActive: true,
          seeded: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  },

  async down(db) {
    await db.collection('users').deleteMany({ seeded: true });
    await db.collection('alertrules').deleteMany({ seeded: true });
    await db.collection('categories').deleteMany({ seeded: true });
  },
};
