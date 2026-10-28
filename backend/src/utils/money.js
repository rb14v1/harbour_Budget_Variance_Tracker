// Rupee strings → integer paise using string arithmetic only (no float rounding errors).
function parseRupees(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    input = String(input);
  }
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/,/g, '');
  const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const [, sign, whole, frac = ''] = m;
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) return null;
  return sign ? -paise : paise;
}

function paiseToRupeeString(paise) {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function formatPaise(paise) {
  return inrFormatter.format(paise / 100);
}

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

module.exports = { parseRupees, paiseToRupeeString, formatPaise, sum };
