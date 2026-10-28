import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardContent, CardHeader, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { importsApi } from '../../api/resources';
import { errorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';

const STATUS_COLOR = { COMPLETED: 'success', PARTIAL: 'warning', FAILED: 'error', REVERTED: 'default' };

export default function ImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const batches = useQuery({ queryKey: ['imports'], queryFn: () => importsApi.list({ limit: 50 }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['imports'] });
    qc.invalidateQueries({ queryKey: ['actuals'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const upload = useMutation({
    mutationFn: (file) => importsApi.upload(file),
    onSuccess: (batch) => {
      setResult(batch);
      setMessage(null);
      refresh();
    },
    onError: (err) => setMessage({ severity: 'error', text: errorMessage(err) }),
  });

  const revert = useMutation({
    mutationFn: (id) => importsApi.revert(id),
    onSuccess: (r) => {
      setMessage({ severity: 'success', text: `Import reverted (${r.deletedCount} actuals removed)` });
      refresh();
    },
    onError: (err) => setMessage({ severity: 'error', text: errorMessage(err) }),
  });

  const columns = [
    { field: 'createdAt', headerName: 'Uploaded', width: 180, valueFormatter: (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { field: 'fileName', headerName: 'File', flex: 1 },
    { field: 'uploadedBy', headerName: 'By', width: 160, valueGetter: (_v, r) => r.uploadedBy?.name },
    { field: 'rows', headerName: 'Rows ok / total', width: 140, valueGetter: (_v, r) => `${r.successCount} / ${r.rowCount}` },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={STATUS_COLOR[p.value]} /> },
    {
      field: 'actions',
      headerName: '',
      width: 110,
      sortable: false,
      renderCell: (p) =>
        ['COMPLETED', 'PARTIAL'].includes(p.row.status) && (
          <Button
            size="small"
            color="error"
            onClick={() => {
              if (window.confirm(`Revert ${p.row.fileName}? All ${p.row.successCount} imported actuals will be deleted.`)) revert.mutate(p.row._id);
            }}
          >
            Revert
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="CSV import"
        subtitle="Columns: date (YYYY-MM-DD, IST), departmentCode, categoryCode, amount (₹, max 2 decimals), description, reference — max 2 MB"
        actions={
          <>
            <Button startIcon={<DownloadIcon />} href={importsApi.templateUrl}>
              Template
            </Button>
            <Button variant="contained" startIcon={<UploadFileIcon />} disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              {upload.isPending ? 'Uploading…' : 'Upload CSV'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = '';
              }}
            />
          </>
        }
      />
      {message && (
        <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {result && (
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={`Import result: ${result.fileName}`}
            subheader={
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip size="small" color="success" label={`${result.successCount} imported`} />
                <Chip size="small" color={result.rowErrors.length ? 'error' : 'default'} label={`${result.rowErrors.length} errors`} />
                <Chip size="small" color={STATUS_COLOR[result.status]} label={result.status} />
              </Stack>
            }
          />
          {result.rowErrors.length > 0 && (
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Rows that were skipped
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={80}>Row</TableCell>
                    <TableCell>Problem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.rowErrors.map((e) => (
                    <TableRow key={e.row}>
                      <TableCell>{e.row}</TableCell>
                      <TableCell>{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Import history
      </Typography>
      <Paper>
        <DataGrid rows={batches.data?.items || []} getRowId={(r) => r._id} columns={columns} loading={batches.isLoading} autoHeight disableRowSelectionOnClick />
      </Paper>
    </>
  );
}
