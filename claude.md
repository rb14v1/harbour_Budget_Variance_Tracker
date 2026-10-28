# Budget Planning & Variance Tracker

Finance-department app: departments create monthly budgets per category for an April–March fiscal year, budgets pass a 3-level approval (Dept Head → Finance Manager → CFO), actual spend is recorded manually or via CSV import, and the app reports budget-vs-actual variance by month / quarter / year with over-budget alerts and charts.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 22 LTS (>= 20 required by migrate-mongo) |
| Backend | Express 5, Mongoose 8, zod, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, multer, csv-parse, dayjs (utc + timezone) |
| Database | MongoDB 7 (docker-compose). No replica set required |
| Migrations | migrate-mongo (CommonJS), changelog collection `changelog` |
| Frontend | React 18 + Vite, MUI, MUI X DataGrid (Community), Recharts, TanStack Query, axios, react-router-dom, react-hook-form + zod |
| Tests | Backend: Jest + supertest + mongodb-memory-server (7.0.x). Frontend: Vitest + React Testing Library |
| Language | JavaScript only (backend CommonJS, frontend ESM) |

## Setup & commands (run from repo root)

```
copy .env.example .env          # then adjust values
npm install                     # installs both workspaces
npm run db:up                   # docker compose up -d (MongoDB 7 on 27017)
                                # no Docker? use `npm run db:local` in its own terminal instead
npm run db:setup                # migrate:up + seed:dummy
npm run dev                     # backend :4000 + frontend :5173
npm test                        # backend + frontend tests
```

Other scripts: `migrate:up`, `migrate:down`, `migrate:status`, `seed:dummy`, `seed:reset`, `db:down`.

## Folder structure

```
/                       package.json (npm workspaces), docker-compose.yml, .env.example, claude.md
backend/
  migrate-mongo-config.js
  migrations/           001 validators, 002 indexes, 003 default reference data
  seed/                 seedDummyData.js, factories/, samples/actuals-sample.csv
  src/
    app.js, server.js
    config/             env.js (zod-validated), db.js
    constants/          enums.js, budgetTransitions.js
    middleware/         auth, rbac, validate, originCheck, upload, errorHandler
    models/             User, Department, Category, Budget, Actual, ImportBatch, AlertRule, Notification, AuditLog
    modules/<feature>/  <feature>.routes.js / .controller.js / .service.js / .schema.js
    utils/              fiscal, money, audit, ApiError, csvSafe
  tests/
frontend/
  src/
    api/ hooks/ context/ routes/ layouts/ pages/ components/ utils/
  tests/
```

## Conventions

- Layering: routes → controllers (thin, HTTP only) → services (all business logic) → models. Controllers never touch models directly.
- Request validation with zod schemas in `<feature>.schema.js` via `validate` middleware.
- Errors: throw `ApiError(status, message, details?)`; `errorHandler` formats `{ error: { message, details } }`. Express 5 forwards async errors automatically.
- API base path `/api/v1`. List endpoints paginate with `page` and `limit` (max 100), responding `{ items, total, page, limit }`.
- Every financial mutation writes an audit log via `utils/audit.record()`.
- Only short comments that explain *why*.

## Money & time rules (critical)

- **Money is always an integer in paise** (INR). Never store or compute with floating rupees. Parse user/CSV rupee strings with `money.parseRupees()` (string-based, max 2 decimals). Format with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- **Fiscal year starts April.** `fiscalYear = 2026` means 1 Apr 2026 – 31 Mar 2027. `fiscalMonth` 0 = April … 11 = March. Quarters: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar.
- **Org time zone `Asia/Kolkata`** (`ORG_TIMEZONE`) decides fiscal year/month. Dates are stored as UTC `Date`. CSV/manual dates `YYYY-MM-DD` are interpreted as IST calendar dates. `fiscalYear`/`fiscalMonth` are computed server-side on write and stored on each actual.

## Roles & permissions

| Action | ADMIN | DEPT_HEAD | FINANCE_MANAGER | CFO | VIEWER |
|---|---|---|---|---|---|
| Manage users, departments, categories | ✓ | | | | |
| Create / edit / submit / revise budget | | own dept | | | |
| Approve or reject at FM stage | | | ✓ | | |
| Approve or reject at CFO stage | | | | ✓ | |
| Enter / import / delete actuals | ✓ | | ✓ | | |
| View budgets, actuals, reports | all | own dept | all | all | own dept |
| Edit alert rules | ✓ | | ✓ | | |

`scopeToDepartment` middleware forces the department filter for DEPT_HEAD and VIEWER regardless of query params (prevents IDOR).

## Budget workflow

Statuses: `DRAFT`, `PENDING_FM`, `PENDING_CFO`, `APPROVED`, `REJECTED`.

| From | To | Who |
|---|---|---|
| DRAFT, REJECTED | PENDING_FM | DEPT_HEAD (own dept) |
| PENDING_FM | PENDING_CFO / REJECTED | FINANCE_MANAGER |
| PENDING_CFO | APPROVED / REJECTED | CFO |

- Rejection requires a comment. Every transition appends to `approvalHistory`, writes an audit log and notifies the next actor.
- Lines are editable only in `DRAFT` or `REJECTED`.
- **Versioning:** "Revise" on an APPROVED budget creates version n+1 as DRAFT. The *effective* budget for a dept + fiscal year is the **highest-version APPROVED** budget — there is no `isCurrent` flag.
- `isOpen = true` for DRAFT / PENDING_FM / PENDING_CFO / REJECTED; a partial unique index on `{departmentId, fiscalYear}` where `isOpen: true` guarantees at most one in-progress version.
- Transitions are a single atomic `findOneAndUpdate` filtered on the expected current status; a `null` result → HTTP 409. No multi-document transactions, so no replica set is needed.

## Data model

| Collection | Key fields | Indexes |
|---|---|---|
| users | name, email, passwordHash, role, departmentId, isActive | email unique |
| departments | name, code, isActive | code unique |
| categories | name, code, type (OPEX/CAPEX), isActive | code unique |
| budgets | departmentId, fiscalYear, version, status, isOpen, lines[{categoryId, monthly[12]}], totalAmount, approvalHistory[] | {departmentId, fiscalYear, version} unique; {departmentId, fiscalYear} partial unique isOpen:true; {status} |
| actuals | departmentId, categoryId, date, fiscalYear, fiscalMonth, amount, description, reference, source (MANUAL/CSV), importBatchId, createdBy | {departmentId, fiscalYear, fiscalMonth, categoryId}; {importBatchId} |
| importbatches | fileName, uploadedBy, rowCount, successCount, rowErrors[], status | {createdAt} |
| alertrules | scope (GLOBAL/DEPARTMENT), departmentId, warnPct, overPct, period | {scope, departmentId} unique |
| notifications | userId, type (WARN/OVER/APPROVAL), message, link, isRead, dedupeKey | {userId, isRead, createdAt}; {userId, dedupeKey} unique |
| auditlogs | entity, entityId, action, userId, before, after, at | {entity, entityId} |

Collections use `$jsonSchema` validators with `validationLevel: strict`, `validationAction: error`.

## Migrations rules

- Schema validators and indexes are created **only** by migrations. Mongoose `autoIndex` is off.
- **Never edit a migration that has been applied.** Every schema/index change gets a new migration file with a working `down`.
- Migrations keep a frozen copy of enum values; models import from `src/constants/enums.js`. A test asserts they match.
- Migration 003 inserts reference data (7 categories, global alert rule 80/100 monthly, admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) tagged `seeded: true`; its `down` removes only those documents.
- Dummy/demo data **never** goes in migrations — only in `backend/seed/`.

## Alerts

- After any actual create/update/delete/import, `alerts.service.evaluate(keys)` runs once per affected `(departmentId, fiscalYear, fiscalMonth)`.
- Rule resolution: department rule overrides the global rule. Compares spend vs effective budget per category for the rule's period (MONTH / QUARTER / YEAR).
- Notifies the dept's DEPT_HEAD and all FINANCE_MANAGERs. `dedupeKey` (`LEVEL:dept:category:fy:period`) + unique index ensures one alert per level per period; duplicate-key errors are ignored.

## Variance report

`GET /api/v1/reports/variance?fiscalYear&departmentId&period=month|quarter|year&groupBy=category|department` → rows `{ key, label, budget, actual, variance (budget - actual), variancePct (actual / budget * 100) }`. Departments without an approved budget have budget 0 and `noApprovedBudget: true`. CSV export escapes cells starting with `= + - @` (formula injection).

Frontend colour thresholds: green < warnPct, amber warnPct–overPct, red > overPct.

## Dummy database (dev only)

`npm run seed:dummy` (idempotent) / `npm run seed:reset` (wipe dummy data and reseed). Refuses to run when `NODE_ENV=production` or when migrations are pending. Uses a fixed faker seed.

- Departments: ENG, MKT, SAL, HR, OPS.
- Demo accounts (password `Password@123`, dev only): `admin@demo.com`, `cfo@demo.com`, `fm@demo.com`, `viewer@demo.com` (ENG), `head.eng@demo.com`, `head.mkt@demo.com`, `head.sal@demo.com`, `head.hr@demo.com`, `head.ops@demo.com`.
- FY2025: all departments APPROVED, actuals for all 12 months.
- FY2026: ENG, SAL, MKT v1 APPROVED; ENG v2 DRAFT and MKT v2 PENDING_CFO (revisions in progress); HR PENDING_FM; OPS REJECTED. Actuals Apr–Oct 2026 (Sep 2026 rows belong to a sample PARTIAL import batch).
- Planned overspend: ENG Software ~115%, MKT Marketing ~90% (MKT dept rule warns at 75%), SAL Travel ~105%. Alerts are produced by the real alert service.
- `backend/seed/samples/actuals-sample.csv`: 20 valid rows + 3 invalid (unknown dept, negative amount, bad date).

CSV import: `POST /api/v1/imports` (multipart field `file`), `DELETE /api/v1/imports/:id` reverts a batch, `GET /api/v1/imports/template`. Columns: `date,departmentCode,categoryCode,amount,description,reference` (amount in rupees, e.g. `1234.50` or `1,20,000.00`).

API amounts are always integer paise in JSON; only CSV files and UI inputs use rupees.

## Security rules

- helmet; CORS only `CLIENT_ORIGIN` with credentials; JSON body limit 1 MB.
- JWT (8 h) in httpOnly, SameSite=Lax cookie (Secure in production); no refresh token.
- `originCheck` rejects mutating requests whose `Origin` isn't `CLIENT_ORIGIN`.
- Login rate limit: 10 attempts / 15 min / IP. bcrypt cost 12.
- Uploads: `.csv` only, 2 MB max, in memory.
- Never return `passwordHash`. Never log secrets.

## Testing

- Backend `tests/globalSetup.js` starts mongodb-memory-server; `tests/helpers/db.js` gives each test file its own database and applies the real migration files (recording them in `changelog`).
- Must cover: fiscal boundaries (31 Mar 23:30 IST vs 1 Apr 00:10 IST), `parseRupees` edge cases, every workflow transition per role, concurrent approval → one 409, single open version, department scoping 403, CSV mixed import, variance math, alert dedupe, validator/enum parity, full seed run.
- Frontend: budget grid totals, variance colour thresholds, role-based navigation.

## Notes for AI assistants

- Files whose path contains `auth` (e.g. `backend/src/middleware/auth.js`, `backend/src/modules/auth/*`) are excluded from Copilot by a content-exclusion policy; edit them by hand.
- The frontend login state lives in `frontend/src/context/SessionContext.jsx` and `frontend/src/api/session.js` for the same reason.

## Out of scope

Email notifications, multi-currency, ERP integration, SSO, refresh tokens, production deployment, CI.
