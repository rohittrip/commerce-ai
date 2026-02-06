import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import type { SessionInfo } from '@/api';

interface SessionSidebarProps {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  isAuthenticated: boolean;
  username?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

const DRAWER_WIDTH = 280;

const formatSessionDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const SessionSidebar = ({
  sessions,
  currentSessionId,
  isAuthenticated,
  username,
  onSelectSession,
  onNewSession,
  onLogin,
  onLogout,
}: SessionSidebarProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSessionClick = (sessionId: string) => {
    onSelectSession(sessionId);
    if (isMobile) setMobileOpen(false);
  };

  const handleNewSessionClick = () => {
    onNewSession();
    if (isMobile) setMobileOpen(false);
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={600}>
          Conversations
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* New Session Button */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          fullWidth
          onClick={handleNewSessionClick}
          sx={{ borderRadius: 2 }}
        >
          New Chat
        </Button>
      </Box>

      <Divider />

      {/* Sessions List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {sessions.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No previous conversations
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 1 }}>
            {sessions.map((session) => (
              <ListItemButton
                key={session.id}
                selected={session.id === currentSessionId}
                onClick={() => handleSessionClick(session.id)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <ChatBubbleOutlineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={`Chat ${session.id.slice(0, 8)}...`}
                  secondary={formatSessionDate(session.last_active_at || session.created_at)}
                  primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                  secondaryTypographyProps={{ 
                    fontSize: 12,
                    sx: { 
                      color: session.id === currentSessionId ? 'inherit' : 'text.secondary',
                      opacity: session.id === currentSessionId ? 0.8 : 1,
                    }
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      <Divider />

      {/* Auth Section */}
      <Box sx={{ p: 2 }}>
        {isAuthenticated ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Signed in as <strong>{username}</strong>
            </Typography>
            <Button
              variant="text"
              startIcon={<LogoutIcon />}
              onClick={onLogout}
              size="small"
              color="inherit"
            >
              Sign Out
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={onLogin}
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Sign In
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default SessionSidebar;
