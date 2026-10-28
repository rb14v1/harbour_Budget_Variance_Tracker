import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Card, CardContent, CardHeader, Grid, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { dashboardApi } from '../api/resources';
import { useFiscalYear } from '../context/FiscalYearContext';
import { useSession } from '../context/SessionContext';
import { useAlertRules } from '../hooks/queries';
import { fiscalYearLabel } from '../utils/fiscal';
import { formatPaise } from '../utils/format';
import { TrendChart, BudgetActualBarChart } from '../components/Charts';
import VarianceCell from '../components/VarianceCell';
import PageHeader from '../components/PageHeader';

function Kpi({ label, value, hint }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { fiscalYear } = useFiscalYear();
  const { user } = useSession();
  const rules = useAlertRules();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', fiscalYear],
    queryFn: () => dashboardApi.summary({ fiscalYear }),
  });
  const global = rules.data?.find((r) => r.scope === 'GLOBAL') || { warnPct: 80, overPct: 100 };

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle={`${fiscalYearLabel(fiscalYear)} · signed in as ${user.name}`} />
      {isLoading && <LinearProgress />}
      {error && <Alert severity="error">Could not load dashboard</Alert>}
      {data && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Kpi label="Annual approved budget" value={formatPaise(data.totals.budget)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Kpi label="Budget to date" value={formatPaise(data.totals.budgetYtd)} hint={`${data.ytdMonths} month(s) elapsed`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Kpi label="Actual to date" value={formatPaise(data.totals.actualYtd)} hint={<VarianceCell pct={data.totals.variancePctYtd} thresholds={global} />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Kpi
              label="Pending approvals"
              value={data.pendingApprovals}
              hint={data.departmentsWithoutApprovedBudget ? `${data.departmentsWithoutApprovedBudget} dept(s) without approved budget` : 'All departments approved'}
            />
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card>
              <CardHeader title="Budget vs actual by month" />
              <CardContent>
                <TrendChart data={data.trend} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={5}>
            <Card>
              <CardHeader title="Year-to-date by category" />
              <CardContent>
                <BudgetActualBarChart data={data.categoryVariance} labelKey="category" />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader title="Top overspends (year to date)" />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Budget</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Over by</TableCell>
                    <TableCell align="right">% used</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.topOverspends.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>No overspends — nice.</TableCell>
                    </TableRow>
                  )}
                  {data.topOverspends.map((r) => (
                    <TableRow key={`${r.departmentId}-${r.categoryId}`}>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell align="right">{formatPaise(r.budget)}</TableCell>
                      <TableCell align="right">{formatPaise(r.actual)}</TableCell>
                      <TableCell align="right">{formatPaise(r.overBy)}</TableCell>
                      <TableCell align="right">
                        <VarianceCell pct={r.variancePct} thresholds={global} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
