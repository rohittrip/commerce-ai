import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Category as CategoryIcon,
  CloudQueue as ProvidersIcon,
  Build as BuildIcon,
  Monitor as MonitoringIcon,
  People as PeopleIcon,
  Brightness4,
  Brightness7,
  Logout,
  Api as ApiIcon,
  SmartToy as AgentsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'LLM Config', icon: <SettingsIcon />, path: '/llm-config' },
  { text: 'Taxonomy', icon: <CategoryIcon />, path: '/taxonomy' },
  { text: 'Providers', icon: <ProvidersIcon />, path: '/providers' },
  { text: 'UCP Tools', icon: <ApiIcon />, path: '/ucp-tools' },
  { text: 'Agents', icon: <AgentsIcon />, path: '/agents' },
  { text: 'Tool Tester', icon: <BuildIcon />, path: '/tools' },
  { text: 'Monitoring', icon: <MonitoringIcon />, path: '/monitoring' },
  { text: 'Users', icon: <PeopleIcon />, path: '/users' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Commerce AI
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Admin Panel
          </Typography>
          <IconButton onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <Typography variant="body2" sx={{ mx: 2 }}>
            {user?.username}
          </Typography>
          <IconButton onClick={logout} color="inherit">
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
