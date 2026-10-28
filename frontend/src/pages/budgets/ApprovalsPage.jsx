import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { budgetsApi } from '../../api/resources';
import { useSession } from '../../context/SessionContext';
import { fiscalYearLabel } from '../../utils/fiscal';
import { formatPaise } from '../../utils/format';
import StatusChip from '../../components/StatusChip';
import PageHeader from '../../components/PageHeader';

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const status = user.role === 'CFO' ? 'PENDING_CFO' : 'PENDING_FM';
  const { data, isLoading, error } = useQuery({
    queryKey: ['budgets', 'approvals', status],
    queryFn: () => budgetsApi.list({ status, limit: 100 }),
  });

  const columns = [
    { field: 'department', headerName: 'Department', flex: 1, valueGetter: (_v, row) => `${row.departmentId?.name} (${row.departmentId?.code})` },
    { field: 'fiscalYear', headerName: 'Fiscal year', width: 120, valueFormatter: (v) => fiscalYearLabel(v) },
    { field: 'version', headerName: 'Version', width: 90, valueFormatter: (v) => `v${v}` },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'totalAmount', headerName: 'Total', width: 180, type: 'number', valueFormatter: (v) => formatPaise(v) },
  ];

  return (
    <>
      <PageHeader title="Approvals inbox" subtitle={`Budgets waiting for ${user.role === 'CFO' ? 'CFO' : 'Finance Manager'} review — click a row to review`} />
      {error && <Alert severity="error">Could not load approvals</Alert>}
      <Paper>
        <DataGrid
          rows={data?.items || []}
          getRowId={(r) => r._id}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(p) => navigate(`/budgets/${p.id}`)}
          localeText={{ noRowsLabel: 'Nothing waiting for you' }}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Paper>
    </>
  );
}
