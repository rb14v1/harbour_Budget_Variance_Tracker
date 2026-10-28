const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = 'Asia/Kolkata';
const FISCAL_MONTH_LABELS = Object.freeze(['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']);

function orgTz() {
  return process.env.ORG_TIMEZONE || DEFAULT_TZ;
}

function toFiscal(date, tz = orgTz()) {
  const d = dayjs(date).tz(tz);
  const calMonth = d.month();
  const fiscalYear = calMonth >= 3 ? d.year() : d.year() - 1;
  const fiscalMonth = (calMonth + 9) % 12;
  return { fiscalYear, fiscalMonth, quarter: Math.floor(fiscalMonth / 3) + 1 };
}

// Interprets 'YYYY-MM-DD' as a calendar date in the org time zone; returns null when invalid.
function parseOrgDate(value, tz = orgTz()) {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return dayjs.tz(`${m[1]}-${m[2]}-${m[3]}T00:00:00`, tz).toDate();
}

function formatOrgDate(date, tz = orgTz()) {
  return dayjs(date).tz(tz).format('YYYY-MM-DD');
}

function currentFiscalYear(now = new Date(), tz = orgTz()) {
  return toFiscal(now, tz).fiscalYear;
}

function quarterMonths(quarter) {
  const start = (quarter - 1) * 3;
  return [start, start + 1, start + 2];
}

function monthsForPeriod(period, fiscalMonth) {
  switch (period) {
    case 'MONTH':
      return [fiscalMonth];
    case 'QUARTER':
      return quarterMonths(Math.floor(fiscalMonth / 3) + 1);
    case 'YEAR':
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    default:
      throw new Error(`Unknown period ${period}`);
  }
}

function periodKey(period, fiscalMonth) {
  if (period === 'MONTH') return `M${fiscalMonth}`;
  if (period === 'QUARTER') return `Q${Math.floor(fiscalMonth / 3) + 1}`;
  return 'Y';
}

function periodLabel(period, fiscalMonth, fiscalYear) {
  const fy = `FY${fiscalYear}-${String((fiscalYear + 1) % 100).padStart(2, '0')}`;
  if (period === 'MONTH') return `${FISCAL_MONTH_LABELS[fiscalMonth]} ${fy}`;
  if (period === 'QUARTER') return `Q${Math.floor(fiscalMonth / 3) + 1} ${fy}`;
  return fy;
}

module.exports = {
  FISCAL_MONTH_LABELS,
  toFiscal,
  parseOrgDate,
  formatOrgDate,
  currentFiscalYear,
  quarterMonths,
  monthsForPeriod,
  periodKey,
  periodLabel,
};
