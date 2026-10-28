import { Box } from '@mui/material';
import { formatPct } from '../utils/format';
import { LEVEL_COLORS, varianceLevel } from '../utils/variance';

export default function VarianceCell({ pct, thresholds }) {
  const level = varianceLevel(pct, thresholds);
  return (
    <Box component="span" data-level={level} sx={{ color: LEVEL_COLORS[level], fontWeight: level === 'ok' || level === 'none' ? 400 : 600 }}>
      {formatPct(pct)}
    </Box>
  );
}
