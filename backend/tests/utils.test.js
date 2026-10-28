const { toFiscal, parseOrgDate, monthsForPeriod, periodKey, formatOrgDate } = require('../src/utils/fiscal');
const { parseRupees, paiseToRupeeString } = require('../src/utils/money');
const { csvCell } = require('../src/utils/csvSafe');

describe('fiscal year boundaries (Asia/Kolkata)', () => {
  test('31 Mar 2027 23:30 IST belongs to FY2026, month 11 (Mar), Q4', () => {
    expect(toFiscal(new Date('2027-03-31T18:00:00Z'))).toEqual({ fiscalYear: 2026, fiscalMonth: 11, quarter: 4 });
  });

  test('1 Apr 2027 00:10 IST belongs to FY2027, month 0 (Apr), Q1', () => {
    expect(toFiscal(new Date('2027-03-31T18:40:00Z'))).toEqual({ fiscalYear: 2027, fiscalMonth: 0, quarter: 1 });
  });

  test('UTC date that is already the next day in IST rolls over', () => {
    // 30 Jun 2026 20:00 UTC = 1 Jul 2026 01:30 IST → Jul = fiscal month 3, Q2
    expect(toFiscal(new Date('2026-06-30T20:00:00Z'))).toEqual({ fiscalYear: 2026, fiscalMonth: 3, quarter: 2 });
  });

  test('January falls in the previous fiscal year, Q4', () => {
    expect(toFiscal(parseOrgDate('2027-01-15'))).toEqual({ fiscalYear: 2026, fiscalMonth: 9, quarter: 4 });
  });

  test('parseOrgDate interprets YYYY-MM-DD as an IST calendar date', () => {
    const d = parseOrgDate('2026-04-01');
    expect(d.toISOString()).toBe('2026-03-31T18:30:00.000Z');
    expect(formatOrgDate(d)).toBe('2026-04-01');
    expect(toFiscal(d)).toEqual({ fiscalYear: 2026, fiscalMonth: 0, quarter: 1 });
  });

  test.each(['2026-02-30', '2026-13-01', '26-04-01', '2026/04/01', '', null, '2026-04-1'])('parseOrgDate rejects %p', (v) => {
    expect(parseOrgDate(v)).toBeNull();
  });

  test('period helpers', () => {
    expect(monthsForPeriod('MONTH', 4)).toEqual([4]);
    expect(monthsForPeriod('QUARTER', 4)).toEqual([3, 4, 5]);
    expect(monthsForPeriod('YEAR', 4)).toHaveLength(12);
    expect(periodKey('QUARTER', 11)).toBe('Q4');
    expect(periodKey('MONTH', 0)).toBe('M0');
  });
});

describe('parseRupees', () => {
  test.each([
    ['1234.50', 123450],
    ['1234.5', 123450],
    ['1234', 123400],
    ['0.01', 1],
    ['0.10', 10],
    ['  99.99 ', 9999],
    ['1,23,456.78', 12345678],
    ['-500.00', -50000],
    ['0.29', 29],
    ['1.005', null],
    ['abc', null],
    ['', null],
    ['12.', null],
    ['.5', null],
    ['1e5', null],
  ])('%p → %p', (input, expected) => {
    expect(parseRupees(input)).toBe(expected);
  });

  test('avoids float error that naive multiplication would cause', () => {
    // 1.15 * 100 === 114.99999999999999 in IEEE754
    expect(parseRupees('1.15')).toBe(115);
    expect(parseRupees('4.35')).toBe(435);
  });

  test('rejects values beyond safe integer range', () => {
    expect(parseRupees('999999999999999999')).toBeNull();
  });

  test('paiseToRupeeString', () => {
    expect(paiseToRupeeString(123405)).toBe('1234.05');
    expect(paiseToRupeeString(-50)).toBe('-0.50');
    expect(paiseToRupeeString(0)).toBe('0.00');
  });
});

describe('csvCell formula-injection guard', () => {
  test.each([
    ['=SUM(A1:A2)', "'=SUM(A1:A2)"],
    ['+1+2', "'+1+2"],
    ['-1+2', "'-1+2"],
    ['@cmd', "'@cmd"],
    ['-500.00', '-500.00'],
    ['Plain text', 'Plain text'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
  ])('%p → %p', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });
});
