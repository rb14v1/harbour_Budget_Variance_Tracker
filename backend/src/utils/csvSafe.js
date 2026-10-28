const NUMERIC = /^-?\d+(\.\d+)?$/;

// Prevents spreadsheet formula injection; plain numbers can never be formulas.
function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (!NUMERIC.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

module.exports = { csvCell, toCsv };
