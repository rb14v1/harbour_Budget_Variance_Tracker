import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { budgetsApi } from '../../api/resources';
import { errorMessage } from '../../api/client';
import { useFiscalYear } from '../../context/FiscalYearContext';
import { useSession, userDepartmentId } from '../../context/SessionContext';
import { useCategories } from '../../hooks/queries';
import { fiscalYearLabel } from '../../utils/fiscal';
import { can } from '../../routes/nav';
import BudgetGrid from '../../components/BudgetGrid';
import StatusChip from '../../components/StatusChip';
import PageHeader from '../../components/PageHeader';

const EDITABLE = ['DRAFT', 'REJECTED'];

function stripLines(lines) {
  return lines.map((l) => ({ categoryId: String(l.categoryId), monthly: [...l.monthly] }));
}

export default function BudgetEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { fiscalYear } = useFiscalYear();
  const categories = useCategories(true);
  const [lines, setLines] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [comment, setComment] = useState('');

  const budgetQuery = useQuery({ queryKey: ['budget', id], queryFn: () => budgetsApi.get(id), enabled: !isNew });
  const budget = budgetQuery.data;

  useEffect(() => {
    if (budget) {
      setLines(stripLines(budget.lines));
      setDirty(false);
    }
  }, [budget]);

  const ownDept = isNew || (budget && budget.departmentId?._id === userDepartmentId(user));
  const editable = can.editBudget(user.role) && ownDept && (isNew || EDITABLE.includes(budget?.status));

  const onDone = (msg) => (result) => {
    qc.invalidateQueries({ queryKey: ['budgets'] });
    qc.invalidateQueries({ queryKey: ['budget'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    setMessage({ severity: 'success', text: msg });
    setDialog(null);
    setComment('');
    if (result?._id && result._id !== id) navigate(`/budgets/${result._id}`, { replace: true });
  };
  const onError = (err) => setMessage({ severity: 'error', text: errorMessage(err) });

  const save = useMutation({
    mutationFn: () => (isNew ? budgetsApi.create({ fiscalYear, lines }) : budgetsApi.updateLines(id, lines)),
    onSuccess: onDone('Budget saved'),
    onError,
  });
  const action = useMutation({
    mutationFn: ({ kind, text }) => budgetsApi[kind](id, text || undefined),
    onSuccess: (result, { kind }) => onDone({ submit: 'Submitted for approval', approve: 'Approved', reject: 'Rejected', revise: 'New draft version created' }[kind])(result),
    onError,
  });

  if (!isNew && budgetQuery.isLoading) return <LinearProgress />;
  if (!isNew && budgetQuery.error) return <Alert severity="error">{errorMessage(budgetQuery.error)}</Alert>;

  const title = isNew ? `New budget · ${fiscalYearLabel(fiscalYear)}` : `${budget.departmentId.name} · ${fiscalYearLabel(budget.fiscalYear)} · v${budget.version}`;

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={!isNew && <StatusChip status={budget.status} />}
        actions={
          <>
            {editable && (
              <Button variant="outlined" disabled={save.isPending || (!dirty && !isNew)} onClick={() => save.mutate()}>
                Save
              </Button>
            )}
            {editable && !isNew && (
              <Button variant="contained" disabled={dirty || action.isPending || lines.length === 0} onClick={() => setDialog('submit')}>
                Submit for approval
              </Button>
            )}
            {!isNew && can.approveStatus(user.role, budget.status) && (
              <>
                <Button variant="contained" color="success" onClick={() => setDialog('approve')}>
                  Approve
                </Button>
                <Button variant="outlined" color="error" onClick={() => setDialog('reject')}>
                  Reject
                </Button>
              </>
            )}
            {!isNew && can.editBudget(user.role) && ownDept && budget.status === 'APPROVED' && (
              <Button variant="outlined" onClick={() => setDialog('revise')}>
                Revise
              </Button>
            )}
          </>
        }
      />

      {message && (
        <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {dirty && editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have unsaved changes. Save before submitting.
        </Alert>
      )}

      <BudgetGrid
        lines={lines}
        categories={categories.data}
        editable={editable}
        onChange={(next) => {
          setLines(next);
          setDirty(true);
        }}
      />

      {!isNew && (
        <Card sx={{ mt: 3 }}>
          <CardHeader title="Approval history" />
          <CardContent>
            <List dense>
              {budget.approvalHistory.map((h, i) => (
                <ListItem key={i} divider>
                  <ListItemText
                    primary={`${h.action}${h.toStatus ? ` → ${h.toStatus}` : ''} by ${h.byUserId?.name || 'unknown'} (${h.role})`}
                    secondary={
                      <>
                        {new Date(h.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        {h.comment && (
                          <Typography component="span" variant="body2" display="block" color="text.primary">
                            “{h.comment}”
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textTransform: 'capitalize' }}>{dialog} budget</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialog === 'revise' && <Typography>This creates a new draft version. The approved version stays effective until the new one is approved.</Typography>}
            {dialog !== 'revise' && (
              <TextField
                label={dialog === 'reject' ? 'Reason (required)' : 'Comment (optional)'}
                multiline
                minRows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                inputProps={{ maxLength: 1000 }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={dialog === 'reject' ? 'error' : 'primary'}
            disabled={action.isPending || (dialog === 'reject' && comment.trim().length < 3)}
            onClick={() => action.mutate({ kind: dialog, text: comment.trim() })}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
