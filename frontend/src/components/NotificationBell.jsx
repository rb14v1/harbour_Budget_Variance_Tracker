import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Divider, IconButton, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useMarkNotificationRead, useNotifications } from '../hooks/queries';

export default function NotificationBell() {
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  const { data } = useNotifications({ limit: 10 });
  const markRead = useMarkNotificationRead();

  const open = (n) => {
    if (!n.isRead) markRead.mutate(n._id);
    setAnchor(null);
    if (n.link) navigate(n.link);
  };

  return (
    <>
      <IconButton color="inherit" aria-label="notifications" onClick={(e) => setAnchor(e.currentTarget)}>
        <Badge badgeContent={data?.unreadCount || 0} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 380, maxHeight: 480 } } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1">Notifications</Typography>
          <Button size="small" onClick={() => markRead.mutate(null)} disabled={!data?.unreadCount}>
            Mark all read
          </Button>
        </Box>
        <Divider />
        {(data?.items || []).length === 0 && <MenuItem disabled>No notifications</MenuItem>}
        {(data?.items || []).map((n) => (
          <MenuItem key={n._id} onClick={() => open(n)} sx={{ whiteSpace: 'normal', bgcolor: n.isRead ? undefined : 'action.hover' }}>
            <ListItemText
              primary={n.message}
              secondary={new Date(n.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              primaryTypographyProps={{ variant: 'body2', fontWeight: n.isRead ? 400 : 600 }}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate('/alerts');
          }}
        >
          View all
        </MenuItem>
      </Menu>
    </>
  );
}
