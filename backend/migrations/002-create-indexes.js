const INDEXES = {
  users: [{ key: { email: 1 }, name: 'email_unique', unique: true }],
  departments: [{ key: { code: 1 }, name: 'code_unique', unique: true }],
  categories: [{ key: { code: 1 }, name: 'code_unique', unique: true }],
  budgets: [
    { key: { departmentId: 1, fiscalYear: 1, version: 1 }, name: 'dept_fy_version_unique', unique: true },
    // At most one in-progress (non-approved) version per department and fiscal year.
    {
      key: { departmentId: 1, fiscalYear: 1 },
      name: 'dept_fy_open_unique',
      unique: true,
      partialFilterExpression: { isOpen: true },
    },
    { key: { status: 1 }, name: 'status' },
  ],
  actuals: [
    { key: { departmentId: 1, fiscalYear: 1, fiscalMonth: 1, categoryId: 1 }, name: 'dept_fy_month_cat' },
    { key: { fiscalYear: 1, fiscalMonth: 1 }, name: 'fy_month' },
    { key: { importBatchId: 1 }, name: 'import_batch', sparse: true },
  ],
  importbatches: [{ key: { createdAt: -1 }, name: 'created_at' }],
  alertrules: [{ key: { scope: 1, departmentId: 1 }, name: 'scope_dept_unique', unique: true }],
  notifications: [
    { key: { userId: 1, isRead: 1, createdAt: -1 }, name: 'user_read_created' },
    {
      key: { userId: 1, dedupeKey: 1 },
      name: 'user_dedupe_unique',
      unique: true,
      partialFilterExpression: { dedupeKey: { $type: 'string' } },
    },
  ],
  auditlogs: [{ key: { entity: 1, entityId: 1 }, name: 'entity_entityId' }],
};

module.exports = {
  INDEXES,
  async up(db) {
    for (const [collection, specs] of Object.entries(INDEXES)) {
      await db.collection(collection).createIndexes(specs);
    }
  },

  async down(db) {
    for (const [collection, specs] of Object.entries(INDEXES)) {
      for (const spec of specs) {
        await db.collection(collection).dropIndex(spec.name).catch((err) => {
          if (err.codeName !== 'IndexNotFound' && err.codeName !== 'NamespaceNotFound') throw err;
        });
      }
    }
  },
};
