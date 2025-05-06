import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Grid,
  Divider,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  // Cargar datos de la cotización
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        setError('');
        
        const quoteDoc = await getDoc(doc(db, 'quotes', id));
        
        if (quoteDoc.exists()) {
          const quoteData = quoteDoc.data();
          setQuote({
            id: quoteDoc.id,
            ...quoteData,
            date: quoteData.date ? quoteData.date.toDate() : new Date()
          });
        } else {
          setError('No se encontró la cotización solicitada.');
          navigate('/cotizaciones');
        }
      } catch (error) {
        console.error('Error al cargar la cotización:', error);
        setError('Error al cargar la cotización. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuote();
  }, [id, navigate]);

  // Función para descargar PDF
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      
      if (quote.pdfUrl) {
        window.open(quote.pdfUrl, '_blank');
      } else {
        const pdfRef = ref(storage, `quotes/${id}.pdf`);
        const url = await getDownloadURL(pdfRef);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      setError('Error al descargar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar cotización
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'quotes', id));
      setSuccess('Cotización eliminada correctamente.');
      setTimeout(() => {
        navigate('/cotizaciones');
      }, 2000);
    } catch (error) {
      console.error('Error al eliminar la cotización:', error);
      setError('Error al eliminar la cotización. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Función para cambiar estado de la cotización
  const handleStatusChange = async () => {
    try {
      setLoading(true);
      
      await updateDoc(doc(db, 'quotes', id), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Actualizar datos locales
      setQuote(prev => ({
        ...prev,
        status: newStatus
      }));
      
      setSuccess(`Cotización marcada como ${newStatus === 'aceptada' ? 'aceptada' : 'rechazada'}.`);
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      setError('Error al actualizar el estado. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
      setStatusDialogOpen(false);
    }
  };

  // Función para enviar cotización por correo
  const handleSendEmail = async () => {
    try {
      setLoading(true);
      
      // Llamar a Cloud Function para enviar por correo
      const sendQuoteByEmail = httpsCallable(functions, 'sendQuoteByEmail');
      const result = await sendQuoteByEmail({ 
        quoteId: id,
        email: quote.email
      });
      
      if (result.data && result.data.success) {
        setSuccess('Cotización enviada por correo correctamente.');
      } else {
        throw new Error(result.data?.error || 'Error al enviar por correo');
      }
    } catch (error) {
      console.error('Error al enviar por correo:', error);
      setError('Error al enviar la cotización por correo. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para convertir cotización a factura
  const handleConvertToInvoice = () => {
    navigate(`/facturas/nueva?quoteId=${id}`);
  };

  // Renderizar estado de la cotización
  const renderStatus = (status) => {
    let color;
    let label;
    
    switch (status) {
      case 'aceptada':
        color = 'success';
        label = 'Aceptada';
        break;
      case 'pendiente':
        color = 'warning';
        label = 'Pendiente';
        break;
      case 'rechazada':
        color = 'error';
        label = 'Rechazada';
        break;
      default:
        color = 'default';
        label = status;
    }
    
    return <Chip label={label} color={color} />;
  };

  // Renderizar frecuencia en formato legible
  const renderFrequency = (frequency) => {
    const frequencies = {
      'unica': 'Única',
      'semanal': 'Semanal',
      'quincenal': 'Quincenal',
      'mensual': 'Mensual',
      'trimestral': 'Trimestral',
      'semestral': 'Semestral',
      'anual': 'Anual'
    };
    
    return frequencies[frequency] || frequency;
  };

  if (loading && !quote) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!quote) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          {error || 'No se pudo cargar la cotización.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/cotizaciones')}
          sx={{ mt: 2 }}
        >
          Volver a Cotizaciones
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/cotizaciones')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Cotización #{quote.id.substring(0, 8)}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ mr: 2 }}>
              Estado:
            </Typography>
            {renderStatus(quote.status)}
          </Box>
          <Box>
            <Button
              startIcon={<EditIcon />}
              onClick={() => navigate(`/cotizaciones/editar/${id}`)}
              sx={{ mr: 1 }}
            >
              Editar
            </Button>
            <Button
              startIcon={<FileDownloadIcon />}
              onClick={handleDownloadPDF}
              sx={{ mr: 1 }}
            >
              Descargar PDF
            </Button>
            <Button
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              sx={{ mr: 1 }}
            >
              Imprimir
            </Button>
            {quote.email && (
              <Button
                startIcon={<EmailIcon />}
                onClick={handleSendEmail}
                sx={{ mr: 1 }}
              >
                Enviar por Correo
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Eliminar
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Datos del Cliente
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Cliente:</strong> {quote.client}
                    </Typography>
                  </Grid>
                  {quote.rnc && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>RNC/Cédula:</strong> {quote.rnc}
                      </Typography>
                    </Grid>
                  )}
                  {quote.address && (
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Dirección:</strong> {quote.address}
                      </Typography>
                    </Grid>
                  )}
                  {quote.email && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>Correo:</strong> {quote.email}
                      </Typography>
                    </Grid>
                  )}
                  {quote.phone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>Teléfono:</strong> {quote.phone}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detalles del Servicio
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Área a Fumigar:</strong> {quote.area}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Tipo de Plaga:</strong> {quote.pest}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Frecuencia:</strong> {renderFrequency(quote.frequency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Fecha:</strong> {format(quote.date, 'dd/MM/yyyy', { locale: es })}
                    </Typography>
                  </Grid>
                  {quote.description && (
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Descripción:</strong> {quote.description}
                      </Typography>
                    </Grid>
                  )}
                  {quote.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Notas Adicionales:</strong> {quote.notes}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">
                        Costo Total:
                      </Typography>
                      <Typography variant="h6">
                        RD$ {quote.cost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Acciones
                </Typography>
                {quote.status === 'pendiente' && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setNewStatus('aceptada');
                        setStatusDialogOpen(true);
                      }}
                      sx={{ mb: 1 }}
                    >
                      Marcar como Aceptada
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={() => {
                        setNewStatus('rechazada');
                        setStatusDialogOpen(true);
                      }}
                    >
                      Marcar como Rechazada
                    </Button>
                  </Box>
                )}
                {quote.status === 'aceptada' && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ReceiptIcon />}
                    onClick={handleConvertToInvoice}
                    sx={{ mb: 2 }}
                  >
                    Convertir a Factura
                  </Button>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Cotización creada el {quote.createdAt ? format(quote.createdAt.toDate(), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                </Typography>
                {quote.updatedAt && (
                  <Typography variant="body2" color="text.secondary">
                    Última actualización: {format(quote.updatedAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de cambio de estado */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
      >
        <DialogTitle>Confirmar cambio de estado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas marcar esta cotización como {newStatus === 'aceptada' ? 'aceptada' : 'rechazada'}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleStatusChange} 
            color={newStatus === 'aceptada' ? 'success' : 'error'} 
            autoFocus
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
