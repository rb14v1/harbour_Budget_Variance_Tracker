const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export function formatPaise(paise) {
  if (paise === null || paise === undefined) return '—';
  return inr.format(paise / 100);
}

export function formatPaiseCompact(paise) {
  return inrCompact.format((paise || 0) / 100);
}

// String-based so "1.15" becomes 115 paise exactly.
export function rupeesToPaise(input) {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/,/g, '');
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const paise = Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}

export function paiseToRupees(paise) {
  return paise / 100;
}

export function formatPct(pct) {
  return pct === null || pct === undefined ? '—' : `${pct.toFixed(1)}%`;
}
