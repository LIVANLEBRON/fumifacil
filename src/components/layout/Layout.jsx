import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography, 
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle,
  ExpandLess,
  ExpandMore,
  ReceiptLong as ReceiptLongIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSubMenuToggle = () => {
    setOpenSubMenu(!openSubMenu);
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
    { text: 'Facturación', icon: <ReceiptIcon />, path: '/facturas' },
    { 
      text: 'Facturación Electrónica', 
      icon: <ReceiptLongIcon />, 
      hasSubMenu: true,
      subMenuItems: [
        { text: 'Dashboard e-CF', path: '/dashboard/ecf' },
        { text: 'Configuración e-CF', path: '/configuracion/ecf' }
      ]
    },
    { text: 'Inventario', icon: <InventoryIcon />, path: '/productos' },
    { text: 'Cotizaciones', icon: <DescriptionIcon />, path: '/cotizaciones' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion' }
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center', py: 1 }}>
        <Typography variant="h6" noWrap component="div">
          FumiFacil
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <div key={item.text}>
            <ListItem disablePadding>
              {item.hasSubMenu ? (
                <ListItemButton onClick={handleSubMenuToggle}>
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                  {openSubMenu ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              ) : (
                <ListItemButton 
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              )}
            </ListItem>
            
            {item.hasSubMenu && (
              <Collapse in={openSubMenu} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.subMenuItems.map((subItem) => (
                    <ListItemButton 
                      key={subItem.text}
                      sx={{ pl: 4 }}
                      selected={location.pathname === subItem.path}
                      onClick={() => {
                        navigate(subItem.path);
                        setMobileOpen(false);
                      }}
                    >
                      <ListItemText primary={subItem.text} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </div>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'FumiFacil'}
          </Typography>
          {currentUser && (
            <div>
              <Tooltip title="Cuenta">
                <IconButton
                  size="large"
                  aria-label="cuenta del usuario"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                >
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={() => {
                  handleClose();
                  navigate('/perfil');
                }}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  Perfil
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Cerrar Sesión
                </MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="carpetas"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Mejor rendimiento en dispositivos móviles
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
