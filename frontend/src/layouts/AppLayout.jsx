import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSession } from '../context/SessionContext';
import { navItemsFor } from '../routes/nav';
import FiscalYearPicker from '../components/FiscalYearPicker';
import NotificationBell from '../components/NotificationBell';

const DRAWER_WIDTH = 230;

const ROLE_LABEL = {
  ADMIN: 'Admin',
  DEPT_HEAD: 'Dept Head',
  FINANCE_MANAGER: 'Finance Manager',
  CFO: 'CFO',
  VIEWER: 'Viewer',
};

export function SideNav({ role }) {
  return (
    <List component="nav" aria-label="main navigation">
      {navItemsFor(role).map(({ path, label, icon: Icon }) => (
        <ListItemButton key={path} component={NavLink} to={path} end={path === '/'} sx={{ '&.active': { bgcolor: 'action.selected' } }}>
          <ListItemIcon sx={{ minWidth: 38 }}>
            <Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={label} />
        </ListItemButton>
      ))}
    </List>
  );
}

export default function AppLayout() {
  const { user, logout } = useSession();
  const [busy, setBusy] = useState(false);
  const dept = typeof user.departmentId === 'object' && user.departmentId ? user.departmentId.code : null;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
            Budget & Variance Tracker
          </Typography>
          <FiscalYearPicker sx={{ bgcolor: 'background.paper', borderRadius: 1 }} />
          <NotificationBell />
          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
            <Typography variant="body2">{user.name}</Typography>
            <Chip size="small" label={dept ? `${ROLE_LABEL[user.role]} · ${dept}` : ROLE_LABEL[user.role]} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />
          </Box>
          <Tooltip title="Sign out">
            <IconButton
              color="inherit"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await logout();
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
        <Toolbar />
        <Divider />
        <SideNav role={user.role} />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
