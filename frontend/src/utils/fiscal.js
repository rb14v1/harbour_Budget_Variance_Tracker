export const FISCAL_MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
export const ORG_TIMEZONE = 'Asia/Kolkata';

function istParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ORG_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { year: get('year'), month: get('month') - 1, day: get('day') };
}

export function toFiscal(date) {
  const { year, month } = istParts(new Date(date));
  return { fiscalYear: month >= 3 ? year : year - 1, fiscalMonth: (month + 9) % 12 };
}

export function currentFiscalYear(now = new Date()) {
  return toFiscal(now).fiscalYear;
}

export function fiscalYearLabel(fy) {
  return `FY${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
}

export function formatIstDate(date) {
  const { year, month, day } = istParts(new Date(date));
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayIst() {
  return formatIstDate(new Date());
}
