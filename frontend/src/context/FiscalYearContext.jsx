import { createContext, useContext, useMemo, useState } from 'react';
import { currentFiscalYear } from '../utils/fiscal';

const FiscalYearContext = createContext(null);

export function FiscalYearProvider({ children }) {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const value = useMemo(() => ({ fiscalYear, setFiscalYear }), [fiscalYear]);
  return <FiscalYearContext.Provider value={value}>{children}</FiscalYearContext.Provider>;
}

export function useFiscalYear() {
  const ctx = useContext(FiscalYearContext);
  if (!ctx) throw new Error('useFiscalYear must be used inside FiscalYearProvider');
  return ctx;
}
