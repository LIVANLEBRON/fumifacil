import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tab,
  Tabs
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  Description as DescriptionIcon,
  Receipt as ReceiptIcon,
  RequestQuote as RequestQuoteIcon
} from '@mui/icons-material';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ClientDetail() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [relatedDocsLoading, setRelatedDocsLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      fetchClientData(id);
    }
  }, [id]);

  const fetchClientData = async (clientId) => {
    try {
      setLoading(true);
      const clientDoc = doc(db, 'clients', clientId);
      const clientSnapshot = await getDoc(clientDoc);
      
      if (clientSnapshot.exists()) {
        setClient({
          id: clientSnapshot.id,
          ...clientSnapshot.data()
        });
        
        // Cargar documentos relacionados
        fetchRelatedDocuments(clientId);
      } else {
        setError('Cliente no encontrado');
        navigate('/clientes');
      }
    } catch (err) {
      console.error('Error al cargar datos del cliente:', err);
      setError('Error al cargar datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedDocuments = async (clientId) => {
    try {
      setRelatedDocsLoading(true);
      
      // Buscar facturas relacionadas
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('clientId', '==', clientId)
      );
      
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoicesData = [];
      
      invoicesSnapshot.forEach((doc) => {
        invoicesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setInvoices(invoicesData);
      
      // Buscar cotizaciones relacionadas
      const quotesQuery = query(
        collection(db, 'quotes'),
        where('clientId', '==', clientId)
      );
      
      const quotesSnapshot = await getDocs(quotesQuery);
      const quotesData = [];
      
      quotesSnapshot.forEach((doc) => {
        quotesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setQuotes(quotesData);
    } catch (error) {
      console.error('Error al cargar documentos relacionados:', error);
    } finally {
      setRelatedDocsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'clients', id));
      setDeleteDialogOpen(false);
      navigate('/clientes', { state: { message: 'Cliente eliminado correctamente' } });
    } catch (error) {
      console.error('Error al eliminar el cliente:', error);
      setError('Error al eliminar el cliente. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          onClick={() => navigate('/clientes')} 
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Volver a la lista de clientes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          onClick={() => navigate('/clientes')} 
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Detalles del Cliente
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              {client?.name}
            </Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />} 
                onClick={() => navigate(`/clientes/editar/${id}`)}
                sx={{ mr: 1 }}
              >
                Editar
              </Button>
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />} 
                onClick={handleDeleteClick}
              >
                Eliminar
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                {client?.rnc && (
                  <ListItem>
                    <ListItemText 
                      primary="RNC / Cédula" 
                      secondary={client.rnc} 
                    />
                  </ListItem>
                )}
                {client?.email && (
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                          Correo Electrónico
                        </Box>
                      } 
                      secondary={client.email} 
                    />
                  </ListItem>
                )}
                {client?.phone && (
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                          Teléfono
                        </Box>
                      } 
                      secondary={client.phone} 
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                {client?.address && (
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
                          Dirección
                        </Box>
                      } 
                      secondary={client.address} 
                    />
                  </ListItem>
                )}
                {client?.notes && (
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
                          Notas
                        </Box>
                      } 
                      secondary={client.notes} 
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="client tabs">
            <Tab 
              icon={<ReceiptIcon />} 
              iconPosition="start" 
              label={`Facturas (${invoices.length})`} 
              id="client-tab-0" 
              aria-controls="client-tabpanel-0" 
            />
            <Tab 
              icon={<RequestQuoteIcon />} 
              iconPosition="start" 
              label={`Cotizaciones (${quotes.length})`} 
              id="client-tab-1" 
              aria-controls="client-tabpanel-1" 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {relatedDocsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : invoices.length > 0 ? (
            <List>
              {invoices.map((invoice) => (
                <ListItem 
                  key={invoice.id}
                  secondaryAction={
                    <Button 
                      size="small" 
                      onClick={() => navigate(`/facturas/${invoice.id}`)}
                    >
                      Ver
                    </Button>
                  }
                >
                  <ListItemText
                    primary={`Factura #${invoice.invoiceNumber || invoice.id}`}
                    secondary={`Fecha: ${new Date(invoice.date?.toDate?.() || invoice.date).toLocaleDateString()} - Total: RD$ ${invoice.total?.toFixed(2) || 0}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No hay facturas asociadas a este cliente
              </Typography>
              <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/facturas/nueva', { state: { clientId: id } })}
              >
                Crear Factura
              </Button>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {relatedDocsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : quotes.length > 0 ? (
            <List>
              {quotes.map((quote) => (
                <ListItem 
                  key={quote.id}
                  secondaryAction={
                    <Button 
                      size="small" 
                      onClick={() => navigate(`/cotizaciones/${quote.id}`)}
                    >
                      Ver
                    </Button>
                  }
                >
                  <ListItemText
                    primary={`Cotización #${quote.quoteNumber || quote.id}`}
                    secondary={`Fecha: ${new Date(quote.date?.toDate?.() || quote.date).toLocaleDateString()} - Total: RD$ ${quote.total?.toFixed(2) || 0}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No hay cotizaciones asociadas a este cliente
              </Typography>
              <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/cotizaciones/nueva', { state: { clientId: id } })}
              >
                Crear Cotización
              </Button>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el cliente "{client?.name}"? Esta acción no se puede deshacer.
            {(invoices.length > 0 || quotes.length > 0) && (
              <Box sx={{ mt: 2, color: 'error.main' }}>
                <strong>Advertencia:</strong> Este cliente tiene {invoices.length > 0 ? `${invoices.length} facturas` : ''} 
                {invoices.length > 0 && quotes.length > 0 ? ' y ' : ''}
                {quotes.length > 0 ? `${quotes.length} cotizaciones` : ''} asociadas.
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
