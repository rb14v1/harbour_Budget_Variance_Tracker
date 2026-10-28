// Enum values are frozen copies on purpose: applied migrations must never change.
const ROLES = ['ADMIN', 'DEPT_HEAD', 'FINANCE_MANAGER', 'CFO', 'VIEWER'];
const BUDGET_STATUSES = ['DRAFT', 'PENDING_FM', 'PENDING_CFO', 'APPROVED', 'REJECTED'];
const APPROVAL_ACTIONS = ['CREATE', 'SUBMIT', 'APPROVE', 'REJECT', 'REVISE'];
const CATEGORY_TYPES = ['OPEX', 'CAPEX'];
const ACTUAL_SOURCES = ['MANUAL', 'CSV'];
const IMPORT_STATUSES = ['COMPLETED', 'PARTIAL', 'FAILED', 'REVERTED'];
const ALERT_SCOPES = ['GLOBAL', 'DEPARTMENT'];
const ALERT_PERIODS = ['MONTH', 'QUARTER', 'YEAR'];
const NOTIFICATION_TYPES = ['WARN', 'OVER', 'APPROVAL'];

const NUM = ['int', 'long', 'double'];
const paise = (min = 0) => ({ bsonType: NUM, minimum: min, multipleOf: 1 });
const optionalObjectId = { bsonType: ['objectId', 'null'] };
const timestamps = { createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' } };

const validators = {
  users: {
    bsonType: 'object',
    required: ['name', 'email', 'passwordHash', 'role', 'isActive'],
    properties: {
      name: { bsonType: 'string', minLength: 1, maxLength: 100 },
      email: { bsonType: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
      passwordHash: { bsonType: 'string', minLength: 20 },
      role: { enum: ROLES },
      departmentId: optionalObjectId,
      isActive: { bsonType: 'bool' },
      seeded: { bsonType: 'bool' },
      ...timestamps,
    },
  },
  departments: {
    bsonType: 'object',
    required: ['name', 'code', 'isActive'],
    properties: {
      name: { bsonType: 'string', minLength: 1, maxLength: 100 },
      code: { bsonType: 'string', pattern: '^[A-Z0-9_]{2,10}$' },
      isActive: { bsonType: 'bool' },
      seeded: { bsonType: 'bool' },
      ...timestamps,
    },
  },
  categories: {
    bsonType: 'object',
    required: ['name', 'code', 'type', 'isActive'],
    properties: {
      name: { bsonType: 'string', minLength: 1, maxLength: 100 },
      code: { bsonType: 'string', pattern: '^[A-Z0-9_]{2,20}$' },
      type: { enum: CATEGORY_TYPES },
      isActive: { bsonType: 'bool' },
      seeded: { bsonType: 'bool' },
      ...timestamps,
    },
  },
  budgets: {
    bsonType: 'object',
    required: ['departmentId', 'fiscalYear', 'version', 'status', 'isOpen', 'lines', 'totalAmount', 'approvalHistory'],
    properties: {
      departmentId: { bsonType: 'objectId' },
      fiscalYear: { bsonType: NUM, minimum: 2000, maximum: 2100, multipleOf: 1 },
      version: { bsonType: NUM, minimum: 1, multipleOf: 1 },
      status: { enum: BUDGET_STATUSES },
      isOpen: { bsonType: 'bool' },
      lines: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['categoryId', 'monthly'],
          properties: {
            categoryId: { bsonType: 'objectId' },
            monthly: { bsonType: 'array', minItems: 12, maxItems: 12, items: paise(0) },
          },
        },
      },
      totalAmount: paise(0),
      approvalHistory: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['action', 'byUserId', 'role', 'at'],
          properties: {
            action: { enum: APPROVAL_ACTIONS },
            byUserId: { bsonType: 'objectId' },
            role: { enum: ROLES },
            fromStatus: { bsonType: ['string', 'null'] },
            toStatus: { bsonType: ['string', 'null'] },
            comment: { bsonType: ['string', 'null'], maxLength: 1000 },
            at: { bsonType: 'date' },
          },
        },
      },
      ...timestamps,
    },
  },
  actuals: {
    bsonType: 'object',
    required: ['departmentId', 'categoryId', 'date', 'fiscalYear', 'fiscalMonth', 'amount', 'source', 'createdBy'],
    properties: {
      departmentId: { bsonType: 'objectId' },
      categoryId: { bsonType: 'objectId' },
      date: { bsonType: 'date' },
      fiscalYear: { bsonType: NUM, minimum: 2000, maximum: 2100, multipleOf: 1 },
      fiscalMonth: { bsonType: NUM, minimum: 0, maximum: 11, multipleOf: 1 },
      amount: paise(1),
      description: { bsonType: ['string', 'null'], maxLength: 500 },
      reference: { bsonType: ['string', 'null'], maxLength: 100 },
      source: { enum: ACTUAL_SOURCES },
      importBatchId: optionalObjectId,
      createdBy: { bsonType: 'objectId' },
      ...timestamps,
    },
  },
  importbatches: {
    bsonType: 'object',
    required: ['fileName', 'uploadedBy', 'rowCount', 'successCount', 'rowErrors', 'status'],
    properties: {
      fileName: { bsonType: 'string', maxLength: 255 },
      uploadedBy: { bsonType: 'objectId' },
      rowCount: { bsonType: NUM, minimum: 0 },
      successCount: { bsonType: NUM, minimum: 0 },
      rowErrors: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['row', 'message'],
          properties: { row: { bsonType: NUM }, message: { bsonType: 'string' } },
        },
      },
      status: { enum: IMPORT_STATUSES },
      ...timestamps,
    },
  },
  alertrules: {
    bsonType: 'object',
    required: ['scope', 'warnPct', 'overPct', 'period'],
    properties: {
      scope: { enum: ALERT_SCOPES },
      departmentId: optionalObjectId,
      warnPct: { bsonType: NUM, minimum: 1, maximum: 1000 },
      overPct: { bsonType: NUM, minimum: 1, maximum: 1000 },
      period: { enum: ALERT_PERIODS },
      seeded: { bsonType: 'bool' },
      ...timestamps,
    },
  },
  notifications: {
    bsonType: 'object',
    required: ['userId', 'type', 'message', 'isRead'],
    properties: {
      userId: { bsonType: 'objectId' },
      type: { enum: NOTIFICATION_TYPES },
      message: { bsonType: 'string', maxLength: 500 },
      link: { bsonType: ['string', 'null'], maxLength: 300 },
      isRead: { bsonType: 'bool' },
      dedupeKey: { bsonType: 'string' },
      ...timestamps,
    },
  },
  auditlogs: {
    bsonType: 'object',
    required: ['entity', 'entityId', 'action', 'at'],
    properties: {
      entity: { bsonType: 'string' },
      entityId: { bsonType: 'objectId' },
      action: { bsonType: 'string' },
      userId: optionalObjectId,
      at: { bsonType: 'date' },
    },
  },
};

module.exports = {
  validators,
  async up(db) {
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    for (const [name, schema] of Object.entries(validators)) {
      const options = { validator: { $jsonSchema: schema }, validationLevel: 'strict', validationAction: 'error' };
      if (existing.has(name)) {
        await db.command({ collMod: name, ...options });
      } else {
        await db.createCollection(name, options);
      }
    }
  },

  async down(db) {
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    for (const name of Object.keys(validators)) {
      if (existing.has(name)) await db.collection(name).drop();
    }
  },
};
