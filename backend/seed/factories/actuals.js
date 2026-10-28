const { parseOrgDate, toFiscal } = require('../../src/utils/fiscal');

const DESCRIPTIONS = {
  SALARIES: ['Monthly payroll', 'Contractor payment', 'Overtime payout'],
  TRAVEL: ['Client visit flights', 'Hotel stay', 'Cab reimbursements', 'Conference travel'],
  SOFTWARE: ['SaaS subscription', 'Cloud hosting invoice', 'Licence renewal', 'Developer tools'],
  MARKETING: ['Digital ad campaign', 'Event sponsorship', 'Content agency retainer', 'Print collateral'],
  OFFICE: ['Office supplies', 'Pantry and refreshments', 'Facility maintenance'],
  TRAINING: ['Certification course', 'Workshop fees', 'Online learning seats'],
  CAPEX_EQUIP: ['Laptops purchase', 'Server hardware', 'Office furniture'],
};

function isoDateFor(fiscalYear, fiscalMonth, day) {
  const calMonth = (fiscalMonth + 3) % 12;
  const year = fiscalMonth <= 8 ? fiscalYear : fiscalYear + 1;
  return `${year}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Splits a monthly target (paise) into n transactions with whole-rupee amounts that add up exactly.
function splitAmount(faker, target, n) {
  const weights = Array.from({ length: n }, () => faker.number.int({ min: 1, max: 10 }));
  const totalWeight = weights.reduce((a, w) => a + w, 0);
  const parts = weights.map((w) => Math.max(100, Math.floor((target * w) / totalWeight / 100) * 100));
  const allocated = parts.slice(0, -1).reduce((a, p) => a + p, 0);
  parts[n - 1] = Math.max(100, target - allocated);
  return parts;
}

function monthActuals(faker, { departmentId, categoryId, categoryCode, fiscalYear, fiscalMonth, target, createdBy, source = 'MANUAL', importBatchId = null }) {
  if (target < 100) return [];
  const n = categoryCode === 'SALARIES' ? faker.number.int({ min: 1, max: 2 }) : faker.number.int({ min: 2, max: 6 });
  const descriptions = DESCRIPTIONS[categoryCode] || ['Expense'];
  return splitAmount(faker, target, n).map((amount) => {
    const date = parseOrgDate(isoDateFor(fiscalYear, fiscalMonth, faker.number.int({ min: 1, max: 28 })));
    const f = toFiscal(date);
    return {
      departmentId,
      categoryId,
      date,
      fiscalYear: f.fiscalYear,
      fiscalMonth: f.fiscalMonth,
      amount,
      description: faker.helpers.arrayElement(descriptions),
      reference: `INV-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
      source,
      importBatchId,
      createdBy,
    };
  });
}

module.exports = { monthActuals, isoDateFor, splitAmount };
