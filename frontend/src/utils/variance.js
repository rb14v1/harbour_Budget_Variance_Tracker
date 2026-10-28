// Green below warn, amber from warn up to and including over, red strictly above over.
export function varianceLevel(pct, { warnPct, overPct }) {
  if (pct === null || pct === undefined) return 'none';
  if (pct > overPct) return 'over';
  if (pct >= warnPct) return 'warn';
  return 'ok';
}

export const LEVEL_COLORS = {
  ok: 'success.main',
  warn: 'warning.main',
  over: 'error.main',
  none: 'text.secondary',
};
