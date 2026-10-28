export function computeTotals(lines) {
  const monthTotals = Array(12).fill(0);
  const rowTotals = lines.map((line) => {
    let total = 0;
    line.monthly.forEach((v, i) => {
      monthTotals[i] += v;
      total += v;
    });
    return total;
  });
  return { monthTotals, rowTotals, grandTotal: rowTotals.reduce((a, v) => a + v, 0) };
}
