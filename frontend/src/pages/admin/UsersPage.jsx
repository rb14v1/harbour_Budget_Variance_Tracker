import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Switch, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { adminApi } from '../../api/resources';
import { errorMessage } from '../../api/client';
import { useSession } from '../../context/SessionContext';
import { useDepartments } from '../../hooks/queries';
import PageHeader from '../../components/PageHeader';

const ROLES = ['ADMIN', 'DEPT_HEAD', 'FINANCE_MANAGER', 'CFO', 'VIEWER'];
const NEEDS_DEPT = ['DEPT_HEAD', 'VIEWER'];

function UserDialog({ open, initial, onClose, onSaved }) {
  const departments = useDepartments();
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [lastInitial, setLastInitial] = useState(undefined);

  if (open && initial !== lastInitial) {
    setLastInitial(initial);
    setForm(
      initial
        ? { name: initial.name, email: initial.email, role: initial.role, departmentId: initial.departmentId?._id || '', password: '' }
        : { name: '', email: '', role: 'VIEWER', departmentId: '', password: '' }
    );
    setError(null);
  }

  const save = useMutation({
    mutationFn: () => {
      const departmentId = NEEDS_DEPT.includes(form.role) ? form.departmentId || null : null;
      if (initial) {
        const body = { name: form.name, role: form.role, departmentId };
        if (form.password) body.password = form.password;
        return adminApi.updateUser(initial._id, body);
      }
      return adminApi.createUser({ ...form, departmentId });
    },
    onSuccess: onSaved,
    onError: (err) => setError(errorMessage(err)),
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit user' : 'New user'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={form.name || ''} onChange={set('name')} />
          <TextField label="Email" value={form.email || ''} onChange={set('email')} disabled={Boolean(initial)} />
          <TextField select label="Role" value={form.role || 'VIEWER'} onChange={set('role')}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          {NEEDS_DEPT.includes(form.role) && (
            <TextField select label="Department" value={form.departmentId || ''} onChange={set('departmentId')}>
              {(departments.data || []).map((d) => (
                <MenuItem key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label={initial ? 'New password (leave blank to keep)' : 'Password'}
            type="password"
            autoComplete="new-password"
            value={form.password || ''}
            onChange={set('password')}
            helperText="Min 8 characters with a letter and a number"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useSession();
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [dialog, setDialog] = useState({ open: false, initial: null });
  const [message, setMessage] = useState(null);
  const params = { page: paginationModel.page + 1, limit: paginationModel.pageSize };
  const { data, isLoading } = useQuery({ queryKey: ['users', params], queryFn: () => adminApi.users(params) });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => adminApi.updateUser(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => setMessage(errorMessage(err)),
  });

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'department', headerName: 'Department', width: 120, valueGetter: (_v, r) => r.departmentId?.code || '—' },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 90,
      renderCell: (p) => (
        <Switch size="small" checked={p.value} disabled={p.row._id === me._id} onChange={(e) => toggle.mutate({ id: p.row._id, isActive: e.target.checked })} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (p) => (
        <Button size="small" onClick={() => setDialog({ open: true, initial: p.row })}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, initial: null })}>
            New user
          </Button>
        }
      />
      {message && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
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
      <UserDialog
        open={dialog.open}
        initial={dialog.initial}
        onClose={() => setDialog({ open: false, initial: null })}
        onSaved={() => {
          setDialog({ open: false, initial: null });
          qc.invalidateQueries({ queryKey: ['users'] });
        }}
      />
    </>
  );
}
