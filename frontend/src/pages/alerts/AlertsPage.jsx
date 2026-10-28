import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { alertsApi } from '../../api/resources';
import { errorMessage } from '../../api/client';
import { useSession } from '../../context/SessionContext';
import { useAlertRules, useDepartments, useMarkNotificationRead, useNotifications } from '../../hooks/queries';
import { can } from '../../routes/nav';
import PageHeader from '../../components/PageHeader';

const TYPE_COLOR = { WARN: 'warning', OVER: 'error', APPROVAL: 'info' };

function RuleEditor({ onSaved }) {
  const departments = useDepartments();
  const [form, setForm] = useState({ scope: 'DEPARTMENT', departmentId: '', warnPct: 80, overPct: 100, period: 'MONTH' });
  const [error, setError] = useState(null);
  const save = useMutation({
    mutationFn: () => alertsApi.upsertRule({ ...form, departmentId: form.scope === 'GLOBAL' ? null : form.departmentId, warnPct: Number(form.warnPct), overPct: Number(form.overPct) }),
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
        <TextField select size="small" label="Scope" value={form.scope} onChange={set('scope')} sx={{ width: 140 }}>
          <MenuItem value="GLOBAL">Global</MenuItem>
          <MenuItem value="DEPARTMENT">Department</MenuItem>
        </TextField>
        {form.scope === 'DEPARTMENT' && (
          <TextField select size="small" label="Department" value={form.departmentId} onChange={set('departmentId')} sx={{ width: 160 }}>
            {(departments.data || []).map((d) => (
              <MenuItem key={d._id} value={d._id}>
                {d.code}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField size="small" type="number" label="Warn %" value={form.warnPct} onChange={set('warnPct')} sx={{ width: 100 }} />
        <TextField size="small" type="number" label="Over %" value={form.overPct} onChange={set('overPct')} sx={{ width: 100 }} />
        <TextField select size="small" label="Period" value={form.period} onChange={set('period')} sx={{ width: 120 }}>
          <MenuItem value="MONTH">Month</MenuItem>
          <MenuItem value="QUARTER">Quarter</MenuItem>
          <MenuItem value="YEAR">Year</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
          Save rule
        </Button>
      </Stack>
    </Box>
  );
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const notifications = useNotifications({ limit: 100 });
  const markRead = useMarkNotificationRead();
  const rules = useAlertRules();
  const [message, setMessage] = useState(null);
  const editable = can.editAlertRules(user.role);

  const del = useMutation({
    mutationFn: (id) => alertsApi.deleteRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
    onError: (err) => setMessage(errorMessage(err)),
  });

  return (
    <>
      <PageHeader title="Alerts" subtitle="Over-budget alerts and approval notifications" />
      {message && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardHeader
              title="Notifications"
              action={
                <Button size="small" onClick={() => markRead.mutate(null)} disabled={!notifications.data?.unreadCount}>
                  Mark all read
                </Button>
              }
            />
            <List dense>
              {(notifications.data?.items || []).length === 0 && (
                <ListItemButton disabled>
                  <ListItemText primary="No notifications" />
                </ListItemButton>
              )}
              {(notifications.data?.items || []).map((n) => (
                <ListItemButton
                  key={n._id}
                  divider
                  sx={{ bgcolor: n.isRead ? undefined : 'action.hover' }}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n._id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <Chip size="small" label={n.type} color={TYPE_COLOR[n.type]} sx={{ mr: 2, minWidth: 80 }} />
                  <ListItemText
                    primary={n.message}
                    secondary={new Date(n.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    primaryTypographyProps={{ fontWeight: n.isRead ? 400 : 600 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card>
            <CardHeader title="Alert rules" subheader="A department rule overrides the global rule" />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scope</TableCell>
                  <TableCell align="right">Warn</TableCell>
                  <TableCell align="right">Over</TableCell>
                  <TableCell>Period</TableCell>
                  {editable && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {(rules.data || []).map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>{r.scope === 'GLOBAL' ? 'Global' : r.departmentId?.code}</TableCell>
                    <TableCell align="right">{r.warnPct}%</TableCell>
                    <TableCell align="right">{r.overPct}%</TableCell>
                    <TableCell>{r.period}</TableCell>
                    {editable && (
                      <TableCell padding="checkbox">
                        {r.scope === 'DEPARTMENT' && (
                          <IconButton size="small" aria-label="delete rule" onClick={() => del.mutate(r._id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {editable && <RuleEditor onSaved={() => qc.invalidateQueries({ queryKey: ['alert-rules'] })} />}
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
