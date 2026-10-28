import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Chip, MenuItem, Paper, Stack, Switch, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { errorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';

// Shared CRUD screen for departments and categories (name/code/+type, active toggle).
export default function ReferenceDataPage({ title, queryKey, list, create, update, typeOptions }) {
  const qc = useQueryClient();
  const empty = { name: '', code: '', ...(typeOptions ? { type: typeOptions[0] } : {}) };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: [queryKey, true], queryFn: () => list({ includeInactive: 'true' }) });

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });
  const onError = (err) => setMessage({ severity: 'error', text: errorMessage(err) });
  const createMut = useMutation({
    mutationFn: () => create(form),
    onSuccess: () => {
      setForm(empty);
      setMessage({ severity: 'success', text: `${title.slice(0, -1)} created` });
      invalidate();
    },
    onError,
  });
  const updateMut = useMutation({ mutationFn: ({ id, body }) => update(id, body), onSuccess: invalidate, onError });

  const columns = [
    { field: 'code', headerName: 'Code', width: 140 },
    { field: 'name', headerName: 'Name', flex: 1, editable: true },
    ...(typeOptions ? [{ field: 'type', headerName: 'Type', width: 120 }] : []),
    {
      field: 'isActive',
      headerName: 'Active',
      width: 120,
      renderCell: (p) => (
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <Switch size="small" checked={p.value} onChange={(e) => updateMut.mutate({ id: p.row._id, body: { isActive: e.target.checked } })} />
          {!p.value && <Chip size="small" label="inactive" />}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={title} subtitle="Edit a name by double-clicking it. Inactive items are hidden from new entries but kept for history." />
      {message && (
        <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
          <TextField size="small" label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {typeOptions && (
            <TextField select size="small" label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} sx={{ width: 120 }}>
              {typeOptions.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button variant="contained" disabled={!form.code || !form.name || createMut.isPending} onClick={() => createMut.mutate()}>
            Add
          </Button>
        </Stack>
      </Paper>
      <Paper>
        <DataGrid
          rows={data || []}
          getRowId={(r) => r._id}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          processRowUpdate={async (row, old) => {
            if (row.name === old.name) return row;
            await updateMut.mutateAsync({ id: row._id, body: { name: row.name } });
            return row;
          }}
          onProcessRowUpdateError={onError}
        />
      </Paper>
    </>
  );
}
