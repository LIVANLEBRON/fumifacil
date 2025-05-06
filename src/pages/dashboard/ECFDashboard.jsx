import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { hasCertificate, loadECFConfig } from '../../utils/ecf/certificateService';
import ECFStatistics from '../../components/ecf/ECFStatistics';
import DGIIStatusMonitor from '../../components/ecf/DGIIStatusMonitor';

/**
 * Dashboard para el sistema de facturación electrónica
 * Muestra estadísticas, facturas recientes y estado del sistema
 */
export default function ECFDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    certificateConfigured: false,
    testMode: true,
    autoSend: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Verificar certificado
        const certificateExists = await hasCertificate();
        
        // Cargar configuración de e-CF
        const ecfConfig = await loadECFConfig();
        
        // Actualizar estado del sistema
        setSystemStatus({
          certificateConfigured: certificateExists,
          testMode: ecfConfig.testMode,
          autoSend: ecfConfig.autoSendToDGII
        });
        
        // Cargar facturas recientes
        await fetchRecentInvoices();
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        setError('Error al cargar datos iniciales');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Cargar facturas recientes
  const fetchRecentInvoices = async () => {
    try {
      // Consultar las 5 facturas más recientes
      const q = query(
        collection(db, 'invoices'),
        orderBy('date', 'desc'),
        limit(5)
      );
      
      const querySnapshot = await getDocs(q);
      
      const invoices = [];
      querySnapshot.forEach((doc) => {
        invoices.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRecentInvoices(invoices);
    } catch (error) {
      console.error('Error al cargar facturas recientes:', error);
    }
  };

  // Manejar cambio de período
  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  // Renderizar chip de estado
  const renderStatusChip = (status) => {
    switch (status) {
      case 'aceptada':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Aceptada" 
            color="success" 
            size="small"
            variant="outlined" 
          />
        );
      case 'rechazada':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Rechazada" 
            color="error" 
            size="small"
            variant="outlined" 
          />
        );
      case 'enviada':
        return (
          <Chip 
            icon={<RefreshIcon />} 
            label="En proceso" 
            color="warning" 
            size="small"
            variant="outlined" 
          />
        );
      default:
        return (
          <Chip 
            icon={<WarningIcon />} 
            label="Pendiente" 
            color="default" 
            size="small"
            variant="outlined" 
          />
        );
    }
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  // Formatear monto como moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount || 0);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard de Facturación Electrónica
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            to="/facturas/nueva"
            sx={{ mr: 2 }}
          >
            Nueva Factura
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            component={Link}
            to="/configuracion/ecf"
          >
            Configuración
          </Button>
        </Box>
      </Box>
      
      {!systemStatus.certificateConfigured && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No hay un certificado digital configurado. Configure uno en la sección de configuración de e-CF antes de crear facturas electrónicas.
        </Alert>
      )}
      
      {systemStatus.testMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          El sistema está en modo de prueba. Las facturas no se enviarán al ambiente de producción de la DGII.
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={period}
                label="Período"
                onChange={handlePeriodChange}
              >
                <MenuItem value="week">Última Semana</MenuItem>
                <MenuItem value="month">Último Mes</MenuItem>
                <MenuItem value="year">Último Año</MenuItem>
                <MenuItem value="all">Todas</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <ECFStatistics period={period} />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Estado del Sistema
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            <List>
              <ListItem>
                <ListItemIcon>
                  {systemStatus.certificateConfigured ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary="Certificado Digital" 
                  secondary={systemStatus.certificateConfigured ? "Configurado" : "No configurado"} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {systemStatus.testMode ? (
                    <WarningIcon color="warning" />
                  ) : (
                    <CheckCircleIcon color="success" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary="Modo de Operación" 
                  secondary={systemStatus.testMode ? "Pruebas" : "Producción"} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {systemStatus.autoSend ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <WarningIcon color="warning" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary="Envío Automático" 
                  secondary={systemStatus.autoSend ? "Activado" : "Desactivado"} 
                />
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SettingsIcon />}
              component={Link}
              to="/configuracion/ecf"
            >
              Configurar
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Facturas Recientes
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {recentInvoices.length === 0 ? (
              <Alert severity="info">
                No hay facturas recientes. Cree una nueva factura para comenzar.
              </Alert>
            ) : (
              <List>
                {recentInvoices.map((invoice) => (
                  <ListItem 
                    key={invoice.id}
                    disablePadding
                    secondaryAction={renderStatusChip(invoice.status)}
                  >
                    <ListItemButton onClick={() => navigate(`/facturas/${invoice.id}`)}>
                      <ListItemIcon>
                        <ReceiptIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={invoice.client || 'Cliente sin nombre'} 
                        secondary={`${invoice.ncf || 'Sin NCF'} - ${formatDate(invoice.date)} - ${formatCurrency(invoice.total)}`} 
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                component={Link}
                to="/facturas"
              >
                Ver todas las facturas
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <DGIIStatusMonitor />
        </Grid>
      </Grid>
    </Container>
  );
}
