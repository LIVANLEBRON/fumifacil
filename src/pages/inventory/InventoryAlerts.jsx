import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemSecondaryAction,
  IconButton, 
  Divider, 
  Tabs, 
  Tab, 
  Chip, 
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function InventoryAlerts() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener productos con stock bajo
      const lowStockQuery = query(
        collection(db, 'inventory'),
        where('quantity', '<', 10),
        orderBy('quantity', 'asc')
      );
      
      const lowStockSnapshot = await getDocs(lowStockQuery);
      const lowStockData = [];
      
      lowStockSnapshot.forEach((doc) => {
        const data = doc.data();
        lowStockData.push({
          id: doc.id,
          ...data
        });
      });
      
      setLowStockProducts(lowStockData);
      
      // Obtener productos próximos a vencer
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const expiringQuery = query(
        collection(db, 'inventory'),
        where('expiration', '<=', thirtyDaysFromNow),
        orderBy('expiration', 'asc')
      );
      
      const expiringSnapshot = await getDocs(expiringQuery);
      const expiringData = [];
      
      expiringSnapshot.forEach((doc) => {
        const data = doc.data();
        // Solo incluir productos que no hayan vencido aún
        if (data.expiration.toDate() >= today) {
          expiringData.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      setExpiringProducts(expiringData);
    } catch (error) {
      console.error('Error al cargar alertas de inventario:', error);
      setError('Error al cargar alertas. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEmailClick = (product) => {
    setSelectedProduct(product);
    
    // Preparar el asunto y mensaje predeterminados según el tipo de alerta
    const isLowStock = product.quantity < 10;
    const subject = isLowStock 
      ? `Alerta de Stock Bajo: ${product.name}`
      : `Alerta de Producto por Vencer: ${product.name}`;
    
    let message = '';
    if (isLowStock) {
      message = `Estimado proveedor,\n\nLe informamos que el producto "${product.name}" (Lote: ${product.lot}) tiene un stock bajo de ${product.quantity} unidades.\n\nSolicitamos su cotización para realizar un nuevo pedido lo antes posible.\n\nGracias por su atención.`;
    } else {
      const expirationDate = format(product.expiration.toDate(), 'dd/MM/yyyy', { locale: es });
      message = `Estimado proveedor,\n\nLe informamos que el producto "${product.name}" (Lote: ${product.lot}) está próximo a vencer el ${expirationDate}.\n\nPor favor, indíquenos si es posible realizar un cambio o si tiene recomendaciones para el uso del producto antes de su vencimiento.\n\nGracias por su atención.`;
    }
    
    setEmailSubject(subject);
    setEmailMessage(message);
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailRecipient || !emailSubject || !emailMessage || !selectedProduct) {
      setError('Todos los campos son requeridos');
      return;
    }
    
    try {
      setSendingEmail(true);
      
      // Aquí se implementaría la lógica para enviar el correo electrónico
      // Usando Firebase Functions o un servicio de correo electrónico
      
      // Simular envío exitoso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Actualizar el producto para registrar la notificación
      const productRef = doc(db, 'inventory', selectedProduct.id);
      const now = new Date();
      
      await updateDoc(productRef, {
        lastNotification: now,
        notifications: [...(selectedProduct.notifications || []), {
          type: tabValue === 0 ? 'lowStock' : 'expiring',
          date: now,
          recipient: emailRecipient,
          subject: emailSubject
        }]
      });
      
      // Limpiar y cerrar el diálogo
      setEmailDialogOpen(false);
      setEmailRecipient('');
      setEmailSubject('');
      setEmailMessage('');
      setSelectedProduct(null);
      
      // Recargar alertas
      fetchAlerts();
    } catch (error) {
      console.error('Error al enviar correo electrónico:', error);
      setError('Error al enviar correo electrónico. Por favor, intenta nuevamente.');
    } finally {
      setSendingEmail(false);
    }
  };

  const getDaysUntilExpiration = (expirationDate) => {
    const today = new Date();
    return differenceInDays(expirationDate.toDate(), today);
  };

  const getExpirationStatus = (expirationDate) => {
    const daysLeft = getDaysUntilExpiration(expirationDate);
    
    if (daysLeft <= 7) {
      return { color: 'error', label: 'Crítico' };
    } else if (daysLeft <= 15) {
      return { color: 'warning', label: 'Urgente' };
    } else {
      return { color: 'info', label: 'Próximo' };
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Alertas de Inventario
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/inventario/nuevo')}
        >
          Nuevo Producto
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="alertas de inventario tabs"
          >
            <Tab 
              icon={<ErrorIcon />} 
              iconPosition="start" 
              label={`Stock Bajo (${lowStockProducts.length})`} 
              id="inventory-tab-0" 
            />
            <Tab 
              icon={<WarningIcon />} 
              iconPosition="start" 
              label={`Por Vencer (${expiringProducts.length})`} 
              id="inventory-tab-1" 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {lowStockProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No hay productos con stock bajo
              </Typography>
            </Box>
          ) : (
            <List>
              {lowStockProducts.map((product) => (
                <ListItem key={product.id} sx={{ borderBottom: '1px solid #eee' }}>
                  <ListItemIcon>
                    <ErrorIcon color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1" component="span">
                          {product.name}
                        </Typography>
                        <Chip 
                          label={`${product.quantity} unidades`} 
                          color="error" 
                          size="small" 
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          Lote: {product.lot}
                        </Typography>
                        {product.lastNotification && (
                          <Typography variant="body2" color="text.secondary" component="div">
                            Última notificación: {format(product.lastNotification.toDate(), 'dd/MM/yyyy', { locale: es })}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="view" 
                      onClick={() => navigate(`/inventario/${product.id}`)}
                      sx={{ mr: 1 }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="edit" 
                      onClick={() => navigate(`/inventario/editar/${product.id}`)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="notify" 
                      onClick={() => handleEmailClick(product)}
                    >
                      <EmailIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {expiringProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No hay productos próximos a vencer
              </Typography>
            </Box>
          ) : (
            <List>
              {expiringProducts.map((product) => {
                const expirationStatus = getExpirationStatus(product.expiration);
                const daysLeft = getDaysUntilExpiration(product.expiration);
                
                return (
                  <ListItem key={product.id} sx={{ borderBottom: '1px solid #eee' }}>
                    <ListItemIcon>
                      <WarningIcon color={expirationStatus.color} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" component="span">
                            {product.name}
                          </Typography>
                          <Chip 
                            label={expirationStatus.label} 
                            color={expirationStatus.color} 
                            size="small" 
                            sx={{ ml: 2 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" component="span">
                            Vence: {format(product.expiration.toDate(), 'dd/MM/yyyy', { locale: es })}
                            {' '}({daysLeft} días)
                          </Typography>
                          <Typography variant="body2" component="div">
                            Lote: {product.lot} - Stock: {product.quantity} unidades
                          </Typography>
                          {product.lastNotification && (
                            <Typography variant="body2" color="text.secondary" component="div">
                              Última notificación: {format(product.lastNotification.toDate(), 'dd/MM/yyyy', { locale: es })}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="view" 
                        onClick={() => navigate(`/inventario/${product.id}`)}
                        sx={{ mr: 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="edit" 
                        onClick={() => navigate(`/inventario/editar/${product.id}`)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="notify" 
                        onClick={() => handleEmailClick(product)}
                      >
                        <EmailIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </TabPanel>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          startIcon={<NotificationsIcon />}
          onClick={fetchAlerts}
        >
          Actualizar Alertas
        </Button>
      </Box>
      
      {/* Diálogo para enviar correo electrónico */}
      <Dialog 
        open={emailDialogOpen} 
        onClose={() => setEmailDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Enviar Notificación por Correo Electrónico
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Complete los siguientes campos para enviar una notificación sobre el producto "{selectedProduct?.name}".
          </DialogContentText>
          
          <TextField
            fullWidth
            label="Destinatario"
            type="email"
            value={emailRecipient}
            onChange={(e) => setEmailRecipient(e.target.value)}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            fullWidth
            label="Asunto"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Mensaje"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            margin="normal"
            multiline
            rows={8}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleSendEmail} 
            variant="contained" 
            startIcon={<SendIcon />}
            disabled={sendingEmail || !emailRecipient || !emailSubject || !emailMessage}
          >
            {sendingEmail ? <CircularProgress size={24} /> : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
