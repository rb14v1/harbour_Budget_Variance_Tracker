import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SessionProvider } from './context/SessionContext';
import { FiscalYearProvider } from './context/FiscalYearContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BudgetsListPage from './pages/budgets/BudgetsListPage';
import BudgetEditorPage from './pages/budgets/BudgetEditorPage';
import ApprovalsPage from './pages/budgets/ApprovalsPage';
import ActualsPage from './pages/actuals/ActualsPage';
import ImportPage from './pages/actuals/ImportPage';
import VariancePage from './pages/reports/VariancePage';
import AlertsPage from './pages/alerts/AlertsPage';
import UsersPage from './pages/admin/UsersPage';
import { CategoriesPage, DepartmentsPage } from './pages/admin/ReferencePages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => count < 2 && ![401, 403, 404].includes(err?.response?.status),
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: { primary: { main: '#1d4ed8' } },
  shape: { borderRadius: 8 },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SessionProvider>
            <FiscalYearProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="budgets" element={<BudgetsListPage />} />
                    <Route path="budgets/:id" element={<BudgetEditorPage />} />
                    <Route path="actuals" element={<ActualsPage />} />
                    <Route path="reports/variance" element={<VariancePage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route element={<ProtectedRoute roles={['FINANCE_MANAGER', 'CFO']} />}>
                      <Route path="approvals" element={<ApprovalsPage />} />
                    </Route>
                    <Route element={<ProtectedRoute roles={['ADMIN', 'FINANCE_MANAGER']} />}>
                      <Route path="imports" element={<ImportPage />} />
                    </Route>
                    <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                      <Route path="admin/users" element={<UsersPage />} />
                      <Route path="admin/departments" element={<DepartmentsPage />} />
                      <Route path="admin/categories" element={<CategoriesPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
            </FiscalYearProvider>
          </SessionProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
