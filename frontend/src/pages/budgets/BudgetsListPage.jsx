import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, MenuItem, Paper, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { budgetsApi } from '../../api/resources';
import { useFiscalYear } from '../../context/FiscalYearContext';
import { useSession } from '../../context/SessionContext';
import { fiscalYearLabel } from '../../utils/fiscal';
import { formatPaise } from '../../utils/format';
import { can } from '../../routes/nav';
import StatusChip from '../../components/StatusChip';
import PageHeader from '../../components/PageHeader';

const STATUSES = ['', 'DRAFT', 'PENDING_FM', 'PENDING_CFO', 'APPROVED', 'REJECTED'];

export default function BudgetsListPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { fiscalYear } = useFiscalYear();
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['budgets', fiscalYear, status],
    queryFn: () => budgetsApi.list({ fiscalYear, status: status || undefined, limit: 100 }),
  });

  const columns = [
    { field: 'department', headerName: 'Department', flex: 1, valueGetter: (_v, row) => `${row.departmentId?.name} (${row.departmentId?.code})` },
    { field: 'fiscalYear', headerName: 'Fiscal year', width: 120, valueFormatter: (v) => fiscalYearLabel(v) },
    { field: 'version', headerName: 'Version', width: 90, valueFormatter: (v) => `v${v}` },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'totalAmount', headerName: 'Total', width: 180, type: 'number', valueFormatter: (v) => formatPaise(v) },
    { field: 'updatedAt', headerName: 'Updated', width: 180, valueFormatter: (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
  ];

  const hasBudgetForYear = (data?.items || []).length > 0;

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle={`${fiscalYearLabel(fiscalYear)} budgets${user.role === 'DEPT_HEAD' || user.role === 'VIEWER' ? ' for your department' : ''}`}
        actions={
          <>
            <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
              {STATUSES.map((s) => (
                <MenuItem key={s || 'all'} value={s}>
                  {s || 'All'}
                </MenuItem>
              ))}
            </TextField>
            {can.editBudget(user.role) && !hasBudgetForYear && !status && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/budgets/new')}>
                New budget
              </Button>
            )}
          </>
        }
      />
      {error && <Alert severity="error">Could not load budgets</Alert>}
      <Paper>
        <DataGrid
          rows={data?.items || []}
          getRowId={(r) => r._id}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(p) => navigate(`/budgets/${p.id}`)}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Paper>
    </>
  );
}
