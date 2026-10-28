import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { actualsApi } from '../../api/resources';
import { errorMessage } from '../../api/client';
import { useFiscalYear } from '../../context/FiscalYearContext';
import { useSession } from '../../context/SessionContext';
import { useCategories, useDepartments } from '../../hooks/queries';
import { FISCAL_MONTH_LABELS, fiscalYearLabel, formatIstDate, todayIst } from '../../utils/fiscal';
import { formatPaise, rupeesToPaise } from '../../utils/format';
import { can } from '../../routes/nav';
import PageHeader from '../../components/PageHeader';

const formSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  departmentId: z.string().min(1, 'Required'),
  categoryId: z.string().min(1, 'Required'),
  amount: z.string().refine((v) => (rupeesToPaise(v) ?? 0) > 0, 'Enter an amount in rupees (max 2 decimals)'),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

function ActualDialog({ open, initial, onClose, onSaved }) {
  const departments = useDepartments();
  const categories = useCategories();
  const [error, setError] = useState(null);
  const { control, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(formSchema),
    values: initial
      ? {
          date: formatIstDate(initial.date),
          departmentId: initial.departmentId._id,
          categoryId: initial.categoryId._id,
          amount: (initial.amount / 100).toFixed(2),
          description: initial.description || '',
          reference: initial.reference || '',
        }
      : { date: todayIst(), departmentId: '', categoryId: '', amount: '', description: '', reference: '' },
  });

  const save = useMutation({
    mutationFn: (v) => {
      const body = { ...v, amount: rupeesToPaise(v.amount) };
      return initial ? actualsApi.update(initial._id, body) : actualsApi.create(body);
    },
    onSuccess: () => {
      reset();
      setError(null);
      onSaved();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const field = (name, label, props = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f, fieldState }) => <TextField {...f} label={label} fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} {...props} />}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit actual' : 'Record actual spend'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {field('date', 'Date (IST)', { type: 'date', InputLabelProps: { shrink: true } })}
          {field('departmentId', 'Department', {
            select: true,
            children: (departments.data || []).map((d) => (
              <MenuItem key={d._id} value={d._id}>
                {d.name} ({d.code})
              </MenuItem>
            )),
          })}
          {field('categoryId', 'Category', {
            select: true,
            children: (categories.data || []).map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            )),
          })}
          {field('amount', 'Amount (₹)', { inputProps: { inputMode: 'decimal' }, placeholder: '1234.50' })}
          {field('description', 'Description')}
          {field('reference', 'Reference / invoice no.')}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={formState.isSubmitting || save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ActualsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { fiscalYear } = useFiscalYear();
  const departments = useDepartments();
  const categories = useCategories();
  const [filters, setFilters] = useState({ fiscalMonth: '', departmentId: '', categoryId: '' });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [dialog, setDialog] = useState({ open: false, initial: null });
  const [message, setMessage] = useState(null);
  const writable = can.writeActuals(user.role);
  const scoped = user.role === 'DEPT_HEAD' || user.role === 'VIEWER';

  const params = {
    fiscalYear,
    fiscalMonth: filters.fiscalMonth === '' ? undefined : filters.fiscalMonth,
    departmentId: filters.departmentId || undefined,
    categoryId: filters.categoryId || undefined,
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  };
  const { data, isLoading } = useQuery({ queryKey: ['actuals', params], queryFn: () => actualsApi.list(params) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['actuals'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const remove = useMutation({
    mutationFn: (id) => actualsApi.remove(id),
    onSuccess: () => {
      setMessage({ severity: 'success', text: 'Actual deleted' });
      refresh();
    },
    onError: (err) => setMessage({ severity: 'error', text: errorMessage(err) }),
  });

  const columns = [
    { field: 'date', headerName: 'Date', width: 120, valueFormatter: (v) => formatIstDate(v) },
    { field: 'department', headerName: 'Dept', width: 90, valueGetter: (_v, r) => r.departmentId?.code },
    { field: 'category', headerName: 'Category', width: 160, valueGetter: (_v, r) => r.categoryId?.name },
    { field: 'amount', headerName: 'Amount', width: 160, type: 'number', valueFormatter: (v) => formatPaise(v) },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 160 },
    { field: 'reference', headerName: 'Reference', width: 140 },
    { field: 'source', headerName: 'Source', width: 90 },
    ...(writable
      ? [
          {
            field: 'actions',
            headerName: '',
            width: 100,
            sortable: false,
            renderCell: (p) => (
              <>
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label="edit" onClick={() => setDialog({ open: true, initial: p.row })}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    aria-label="delete"
                    onClick={() => {
                      if (window.confirm('Delete this actual?')) remove.mutate(p.row._id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ),
          },
        ]
      : []),
  ];

  const select = (key, label, options) => (
    <TextField
      select
      size="small"
      label={label}
      value={filters[key]}
      onChange={(e) => {
        setFilters((f) => ({ ...f, [key]: e.target.value }));
        setPaginationModel((m) => ({ ...m, page: 0 }));
      }}
      sx={{ minWidth: 150 }}
    >
      <MenuItem value="">All</MenuItem>
      {options}
    </TextField>
  );

  return (
    <>
      <PageHeader
        title="Actual spend"
        subtitle={fiscalYearLabel(fiscalYear)}
        actions={
          writable && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, initial: null })}>
              Record actual
            </Button>
          )
        }
      />
      {message && (
        <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {select(
          'fiscalMonth',
          'Month',
          FISCAL_MONTH_LABELS.map((m, i) => (
            <MenuItem key={m} value={i}>
              {m}
            </MenuItem>
          ))
        )}
        {!scoped &&
          select(
            'departmentId',
            'Department',
            (departments.data || []).map((d) => (
              <MenuItem key={d._id} value={d._id}>
                {d.code}
              </MenuItem>
            ))
          )}
        {select(
          'categoryId',
          'Category',
          (categories.data || []).map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.name}
            </MenuItem>
          ))
        )}
      </Stack>
      <Paper>
        <DataGrid
          rows={data?.items || []}
          getRowId={(r) => r._id}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          paginationMode="server"
          rowCount={data?.total || 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
        />
      </Paper>
      <ActualDialog
        open={dialog.open}
        initial={dialog.initial}
        onClose={() => setDialog({ open: false, initial: null })}
        onSaved={() => {
          setDialog({ open: false, initial: null });
          setMessage({ severity: 'success', text: 'Actual saved' });
          refresh();
        }}
      />
    </>
  );
}
