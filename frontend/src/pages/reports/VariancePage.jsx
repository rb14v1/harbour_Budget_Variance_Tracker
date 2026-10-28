import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { reportsApi } from '../../api/resources';
import { errorMessage } from '../../api/client';
import { useFiscalYear } from '../../context/FiscalYearContext';
import { useSession } from '../../context/SessionContext';
import { useDepartments } from '../../hooks/queries';
import { FISCAL_MONTH_LABELS, fiscalYearLabel, toFiscal } from '../../utils/fiscal';
import { formatPaise } from '../../utils/format';
import { BudgetActualBarChart, TrendChart } from '../../components/Charts';
import VarianceCell from '../../components/VarianceCell';
import PageHeader from '../../components/PageHeader';

export default function VariancePage() {
  const [search] = useSearchParams();
  const { user } = useSession();
  const { fiscalYear, setFiscalYear } = useFiscalYear();
  const departments = useDepartments();
  const scoped = user.role === 'DEPT_HEAD' || user.role === 'VIEWER';

  const [period, setPeriod] = useState('year');
  const [periodIndex, setPeriodIndex] = useState(toFiscal(new Date()).fiscalMonth);
  const [groupBy, setGroupBy] = useState('category');
  const [departmentId, setDepartmentId] = useState(scoped ? '' : search.get('departmentId') || '');

  useEffect(() => {
    const fy = Number(search.get('fiscalYear'));
    if (fy) setFiscalYear(fy);
  }, [search, setFiscalYear]);

  const params = {
    fiscalYear,
    period,
    periodIndex: period === 'year' ? undefined : periodIndex,
    groupBy,
    departmentId: departmentId || undefined,
  };
  const { data, isLoading, error } = useQuery({ queryKey: ['variance', params], queryFn: () => reportsApi.variance(params) });

  const changePeriod = (p) => {
    setPeriod(p);
    if (p === 'quarter') setPeriodIndex(Math.floor(toFiscal(new Date()).fiscalMonth / 3) + 1);
    if (p === 'month') setPeriodIndex(toFiscal(new Date()).fiscalMonth);
  };

  return (
    <>
      <PageHeader
        title="Budget vs actual variance"
        subtitle={fiscalYearLabel(fiscalYear)}
        actions={
          <Button startIcon={<DownloadIcon />} href={reportsApi.exportUrl(params)}>
            Export CSV
          </Button>
        }
      />
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 2 }}>
        <TextField select size="small" label="Period" value={period} onChange={(e) => changePeriod(e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="month">Month</MenuItem>
          <MenuItem value="quarter">Quarter</MenuItem>
          <MenuItem value="year">Full year</MenuItem>
        </TextField>
        {period === 'month' && (
          <TextField select size="small" label="Month" value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))} sx={{ minWidth: 110 }}>
            {FISCAL_MONTH_LABELS.map((m, i) => (
              <MenuItem key={m} value={i}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        )}
        {period === 'quarter' && (
          <TextField select size="small" label="Quarter" value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))} sx={{ minWidth: 110 }}>
            {[1, 2, 3, 4].map((q) => (
              <MenuItem key={q} value={q}>
                Q{q}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField select size="small" label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="category">Category</MenuItem>
          <MenuItem value="department">Department</MenuItem>
        </TextField>
        {!scoped && (
          <TextField select size="small" label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All departments</MenuItem>
            {(departments.data || []).map((d) => (
              <MenuItem key={d._id} value={d._id}>
                {d.name} ({d.code})
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      {isLoading && <LinearProgress />}
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      {data?.noApprovedBudget && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This department has no approved budget for {fiscalYearLabel(fiscalYear)}; budget figures show as zero.
        </Alert>
      )}

      {data && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{groupBy === 'department' ? 'Department' : 'Category'}</TableCell>
                    <TableCell align="right">Budget</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Variance (budget − actual)</TableCell>
                    <TableCell align="right">% used</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell>
                        {r.label}
                        {r.noApprovedBudget && <Chip size="small" label="No approved budget" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell align="right">{formatPaise(r.budget)}</TableCell>
                      <TableCell align="right">{formatPaise(r.actual)}</TableCell>
                      <TableCell align="right" sx={{ color: r.variance < 0 ? 'error.main' : undefined }}>
                        {formatPaise(r.variance)}
                      </TableCell>
                      <TableCell align="right">
                        <VarianceCell pct={r.variancePct} thresholds={data.thresholds} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& td': { fontWeight: 600 } }}>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">{formatPaise(data.totals.budget)}</TableCell>
                    <TableCell align="right">{formatPaise(data.totals.actual)}</TableCell>
                    <TableCell align="right">{formatPaise(data.totals.variance)}</TableCell>
                    <TableCell align="right">
                      <VarianceCell pct={data.totals.variancePct} thresholds={data.thresholds} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <CardContent sx={{ pt: 1 }}>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" color="success" label={`< ${data.thresholds.warnPct}% on track`} />
                  <Chip size="small" color="warning" label={`${data.thresholds.warnPct}–${data.thresholds.overPct}% warning`} />
                  <Chip size="small" color="error" label={`> ${data.thresholds.overPct}% over budget`} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardHeader title="Budget vs actual" />
              <CardContent>
                <BudgetActualBarChart data={data.rows} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardHeader title="Monthly trend" />
              <CardContent>
                <TrendChart data={data.trend} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </>
  );
}
