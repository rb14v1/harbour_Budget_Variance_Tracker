import { Chip } from '@mui/material';

const COLORS = {
  DRAFT: 'default',
  PENDING_FM: 'info',
  PENDING_CFO: 'secondary',
  APPROVED: 'success',
  REJECTED: 'error',
};

const LABELS = {
  DRAFT: 'Draft',
  PENDING_FM: 'Pending FM',
  PENDING_CFO: 'Pending CFO',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export default function StatusChip({ status, size = 'small' }) {
  return <Chip size={size} color={COLORS[status] || 'default'} label={LABELS[status] || status} />;
}
