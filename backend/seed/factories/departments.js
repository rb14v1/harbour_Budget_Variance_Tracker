// Monthly budget base per category in rupees; FY2026 applies growth on top.
const DEPARTMENTS = [
  {
    code: 'ENG',
    name: 'Engineering',
    profile: { SALARIES: 4000000, SOFTWARE: 500000, TRAVEL: 100000, TRAINING: 100000, OFFICE: 50000, CAPEX_EQUIP: 300000 },
  },
  {
    code: 'MKT',
    name: 'Marketing',
    profile: { SALARIES: 1500000, MARKETING: 1000000, TRAVEL: 150000, SOFTWARE: 100000, OFFICE: 30000 },
  },
  {
    code: 'SAL',
    name: 'Sales',
    profile: { SALARIES: 2500000, TRAVEL: 400000, MARKETING: 200000, SOFTWARE: 80000, OFFICE: 40000 },
  },
  {
    code: 'HR',
    name: 'Human Resources',
    profile: { SALARIES: 800000, TRAINING: 200000, SOFTWARE: 50000, OFFICE: 30000, TRAVEL: 40000 },
  },
  {
    code: 'OPS',
    name: 'Operations',
    profile: { SALARIES: 1200000, OFFICE: 200000, SOFTWARE: 100000, CAPEX_EQUIP: 200000, TRAVEL: 60000 },
  },
];

module.exports = { DEPARTMENTS };
