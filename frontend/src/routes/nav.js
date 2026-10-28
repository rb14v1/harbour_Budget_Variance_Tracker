import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CategoryIcon from '@mui/icons-material/Category';

const ALL = ['ADMIN', 'DEPT_HEAD', 'FINANCE_MANAGER', 'CFO', 'VIEWER'];

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: DashboardIcon, roles: ALL },
  { path: '/budgets', label: 'Budgets', icon: AccountBalanceWalletIcon, roles: ALL },
  { path: '/approvals', label: 'Approvals', icon: FactCheckIcon, roles: ['FINANCE_MANAGER', 'CFO'] },
  { path: '/actuals', label: 'Actuals', icon: ReceiptLongIcon, roles: ALL },
  { path: '/imports', label: 'CSV Import', icon: UploadFileIcon, roles: ['ADMIN', 'FINANCE_MANAGER'] },
  { path: '/reports/variance', label: 'Variance Report', icon: AssessmentIcon, roles: ALL },
  { path: '/alerts', label: 'Alerts', icon: NotificationsIcon, roles: ALL },
  { path: '/admin/users', label: 'Users', icon: PeopleIcon, roles: ['ADMIN'] },
  { path: '/admin/departments', label: 'Departments', icon: ApartmentIcon, roles: ['ADMIN'] },
  { path: '/admin/categories', label: 'Categories', icon: CategoryIcon, roles: ['ADMIN'] },
];

export function navItemsFor(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const can = {
  editBudget: (role) => role === 'DEPT_HEAD',
  writeActuals: (role) => role === 'ADMIN' || role === 'FINANCE_MANAGER',
  editAlertRules: (role) => role === 'ADMIN' || role === 'FINANCE_MANAGER',
  approveStatus: (role, status) => (role === 'FINANCE_MANAGER' && status === 'PENDING_FM') || (role === 'CFO' && status === 'PENDING_CFO'),
};
