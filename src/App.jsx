import { useState } from 'react';
import { 
  Box, 
  CssBaseline, 
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
  Container,
  useMediaQuery,
  useTheme,
  Button,
  Collapse
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  RequestQuote as RequestQuoteIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  SwapHoriz as SwapHorizIcon,
  List as ListIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import OfflineManager from './components/offline/OfflineManager';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Componente interno que usa el contexto de autenticación
function AppContent() {
  const [open, setOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleInventoryClick = () => {
    setInventoryOpen(!inventoryOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Clientes', icon: <PeopleIcon />, path: '/clientes' },
    { text: 'Cotizaciones', icon: <RequestQuoteIcon />, path: '/cotizaciones' },
    { text: 'Facturas', icon: <ReceiptIcon />, path: '/facturas' },
    { 
      text: 'Inventario', 
      icon: <InventoryIcon />, 
      path: '/inventario',
      submenu: true,
      submenuItems: [
        { text: 'Productos', icon: <ListIcon />, path: '/inventario' },
        { text: 'Alertas', icon: <NotificationsIcon />, path: '/inventario/alertas' },
        { text: 'Movimientos', icon: <SwapHorizIcon />, path: '/inventario/movimientos' }
      ]
    },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  // Si estamos en una ruta de inventario, expandimos el submenú
  useState(() => {
    if (location.pathname.startsWith('/inventario')) {
      setInventoryOpen(true);
    }
  }, [location.pathname]);

  // Si estamos en una ruta de autenticación, no mostramos el layout principal
  const authRoutes = ['/login', '/register', '/forgot-password'];
  if (authRoutes.includes(location.pathname)) {
    return (
      <Box>
        <AppRoutes />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            FumiFácil
          </Typography>
          {currentUser && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Componente de gestión offline */}
              <OfflineManager />
              
              <Typography variant="body2" sx={{ mx: 2 }}>
                {currentUser.email}
              </Typography>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
              >
                Salir
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBarStyled>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => (
            item.submenu ? (
              <div key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton 
                    onClick={handleInventoryClick}
                    selected={location.pathname.startsWith(item.path)}
                  >
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                    {inventoryOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={inventoryOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenuItems.map((subItem) => (
                      <ListItemButton 
                        key={subItem.text}
                        sx={{ pl: 4 }}
                        onClick={() => handleNavigation(subItem.path)}
                        selected={
                          (subItem.path === '/inventario' && location.pathname === '/inventario') ||
                          (subItem.path !== '/inventario' && location.pathname === subItem.path)
                        }
                      >
                        <ListItemIcon>
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText primary={subItem.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </div>
            ) : (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path))}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Cerrar Sesión" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <AppRoutes />
        </Container>
      </Main>
    </Box>
  );
}

// Componente principal que envuelve todo con el AuthProvider
function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <AppContent />
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App;
