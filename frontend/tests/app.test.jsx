import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { computeTotals } from '../src/utils/budget';
import { varianceLevel } from '../src/utils/variance';
import { rupeesToPaise } from '../src/utils/format';
import { toFiscal } from '../src/utils/fiscal';
import { navItemsFor } from '../src/routes/nav';
import { BudgetTotalsFooter } from '../src/components/BudgetGrid';
import VarianceCell from '../src/components/VarianceCell';
import { SideNav } from '../src/layouts/AppLayout';

describe('budget grid totals', () => {
  const lines = [
    { categoryId: 'a', monthly: [100, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50] },
    { categoryId: 'b', monthly: Array(12).fill(1000) },
  ];

  it('computes row, month and grand totals in paise', () => {
    const t = computeTotals(lines);
    expect(t.rowTotals).toEqual([350, 12000]);
    expect(t.monthTotals[0]).toBe(1100);
    expect(t.monthTotals[1]).toBe(1200);
    expect(t.monthTotals[11]).toBe(1050);
    expect(t.grandTotal).toBe(12350);
  });

  it('handles an empty budget', () => {
    expect(computeTotals([])).toEqual({ monthTotals: Array(12).fill(0), rowTotals: [], grandTotal: 0 });
  });

  it('renders the totals footer in INR', () => {
    render(<BudgetTotalsFooter totals={computeTotals(lines)} />);
    const footer = screen.getByTestId('budget-totals');
    expect(within(footer).getByText('Apr')).toBeInTheDocument();
    expect(screen.getByTestId('grand-total')).toHaveTextContent('₹123.50');
  });
});

describe('variance colour thresholds', () => {
  const thresholds = { warnPct: 80, overPct: 100 };

  it.each([
    [0, 'ok'],
    [79.99, 'ok'],
    [80, 'warn'],
    [99.5, 'warn'],
    [100, 'warn'],
    [100.01, 'over'],
    [150, 'over'],
    [null, 'none'],
  ])('%p%% → %s', (pct, level) => {
    expect(varianceLevel(pct, thresholds)).toBe(level);
  });

  it('respects department-specific thresholds', () => {
    expect(varianceLevel(76, { warnPct: 75, overPct: 100 })).toBe('warn');
  });

  it('VarianceCell exposes the level for styling', () => {
    render(<VarianceCell pct={115} thresholds={thresholds} />);
    expect(screen.getByText('115.0%')).toHaveAttribute('data-level', 'over');
  });
});

describe('role-based navigation', () => {
  const labels = (role) => navItemsFor(role).map((i) => i.label);

  it('admin sees admin pages but no approvals inbox', () => {
    expect(labels('ADMIN')).toEqual(expect.arrayContaining(['Users', 'Departments', 'Categories', 'CSV Import']));
    expect(labels('ADMIN')).not.toContain('Approvals');
  });

  it('finance manager sees approvals and import, not admin', () => {
    expect(labels('FINANCE_MANAGER')).toEqual(expect.arrayContaining(['Approvals', 'CSV Import']));
    expect(labels('FINANCE_MANAGER')).not.toContain('Users');
  });

  it('CFO sees approvals but not import', () => {
    expect(labels('CFO')).toContain('Approvals');
    expect(labels('CFO')).not.toContain('CSV Import');
  });

  it('dept head and viewer see only the common pages', () => {
    for (const role of ['DEPT_HEAD', 'VIEWER']) {
      expect(labels(role)).toEqual(['Dashboard', 'Budgets', 'Actuals', 'Variance Report', 'Alerts']);
    }
  });

  it('renders only permitted links', () => {
    render(
      <MemoryRouter>
        <SideNav role="VIEWER" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Budgets/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Users/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Approvals/ })).not.toBeInTheDocument();
  });
});

describe('client money and fiscal helpers', () => {
  it('converts rupee strings to paise without float error', () => {
    expect(rupeesToPaise('1.15')).toBe(115);
    expect(rupeesToPaise('1,20,000.00')).toBe(12000000);
    expect(rupeesToPaise('1.005')).toBeNull();
    expect(rupeesToPaise('-5')).toBeNull();
  });

  it('uses IST for fiscal boundaries', () => {
    expect(toFiscal(new Date('2027-03-31T18:00:00Z'))).toEqual({ fiscalYear: 2026, fiscalMonth: 11 });
    expect(toFiscal(new Date('2027-03-31T18:40:00Z'))).toEqual({ fiscalYear: 2027, fiscalMonth: 0 });
  });
});
