import { MenuItem, TextField } from '@mui/material';
import { useFiscalYear } from '../context/FiscalYearContext';
import { currentFiscalYear, fiscalYearLabel } from '../utils/fiscal';

export default function FiscalYearPicker({ size = 'small', sx }) {
  const { fiscalYear, setFiscalYear } = useFiscalYear();
  const current = currentFiscalYear();
  const years = [current + 1, current, current - 1, current - 2];
  return (
    <TextField select size={size} label="Fiscal year" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} sx={{ minWidth: 140, ...sx }}>
      {years.map((y) => (
        <MenuItem key={y} value={y}>
          {fiscalYearLabel(y)}
        </MenuItem>
      ))}
    </TextField>
  );
}
