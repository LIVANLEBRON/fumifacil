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
  DialogTitle,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Receipt as ReceiptIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  VerifiedUser as VerifiedUserIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode.react';
import { sendInvoiceToDGII, checkInvoiceStatus, generateInvoicePDF, sendInvoiceByEmail } from '../../utils/ecf/invoiceService';
import { formatFiscalId } from '../../utils/ecf/validationService';
import ECFStatusDetail from '../../components/ecf/ECFStatusDetail';
import InvoiceCancellation from '../../components/ecf/InvoiceCancellation';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  
  // Cargar datos de la factura
  useEffect(() => {
    fetchInvoice();
  }, [id, navigate]);
  
  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      
      const invoiceDoc = await getDoc(doc(db, 'invoices', id));
      
      if (invoiceDoc.exists()) {
        const invoiceData = invoiceDoc.data();
        setInvoice({
          id: invoiceDoc.id,
          ...invoiceData,
          date: invoiceData.date ? invoiceData.date.toDate() : new Date(),
          dgiiSubmissionDate: invoiceData.dgiiSubmissionDate ? invoiceData.dgiiSubmissionDate.toDate() : null,
          dgiiLastCheck: invoiceData.dgiiLastCheck ? invoiceData.dgiiLastCheck.toDate() : null
        });
      } else {
        setError('No se encontró la factura solicitada.');
        navigate('/facturas');
      }
    } catch (error) {
      console.error('Error al cargar la factura:', error);
      setError('Error al cargar la factura. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar actualización de estado de e-CF
  const handleECFStatusUpdate = async (statusData) => {
    try {
      // Actualizar datos de la factura
      await updateDoc(doc(db, 'invoices', id), {
        status: statusData.status === 'Aceptado' ? 'aceptada' : 
                statusData.status === 'Rechazado' ? 'rechazada' : 'enviada',
        dgiiStatusDetail: statusData.statusDetail || '',
        dgiiLastCheck: new Date()
      });
      
      // Actualizar datos locales
      setInvoice(prev => ({
        ...prev,
        status: statusData.status === 'Aceptado' ? 'aceptada' : 
                statusData.status === 'Rechazado' ? 'rechazada' : 'enviada',
        dgiiStatusDetail: statusData.statusDetail || '',
        dgiiLastCheck: new Date()
      }));
      
      setSuccess('Estado de la factura actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      setError('Error al actualizar estado de la factura');
    }
  };

  // Manejar envío a la DGII
  const handleSendToDGII = async (result) => {
    try {
      if (result && result.success) {
        // Actualizar datos de la factura
        await updateDoc(doc(db, 'invoices', id), {
          status: 'enviada',
          trackId: result.trackId || '',
          dgiiSubmissionDate: new Date(),
          dgiiResponse: result
        });
        
        // Actualizar datos locales
        setInvoice(prev => ({
          ...prev,
          status: 'enviada',
          trackId: result.trackId || '',
          dgiiSubmissionDate: new Date(),
          dgiiResponse: result
        }));
        
        setSuccess('Factura enviada correctamente a la DGII');
      } else {
        throw new Error(result?.message || 'Error al enviar la factura a la DGII');
      }
    } catch (error) {
      console.error('Error al enviar a DGII:', error);
      setError('Error al enviar la factura a la DGII');
    }
  };

  // Función para generar y descargar PDF
  const handleDownloadPDF = async () => {
    try {
      setActionLoading(true);
      
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
      } else {
        // Generar PDF usando Cloud Function
        const generateInvoicePDF = httpsCallable(functions, 'generateInvoicePDF');
        const result = await generateInvoicePDF({ invoiceId: id });
        
        if (result.data && result.data.pdfUrl) {
          // Actualizar la factura con la URL del PDF
          await updateDoc(doc(db, 'invoices', id), {
            pdfUrl: result.data.pdfUrl
          });
          
          // Actualizar datos locales
          setInvoice(prev => ({
            ...prev,
            pdfUrl: result.data.pdfUrl
          }));
          
          // Abrir el PDF
          window.open(result.data.pdfUrl, '_blank');
          
          setSuccess('PDF generado correctamente');
        } else {
          throw new Error('No se pudo generar el PDF');
        }
      }
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      setError('Error al descargar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar la anulación de factura
  const handleCancellationComplete = async (result) => {
    if (result && result.success) {
      setSuccess('Factura anulada correctamente');
      
      // Recargar datos de la factura
      fetchInvoice();
    }
  };

  // Función para eliminar factura
  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await deleteDoc(doc(db, 'invoices', id));
      setSuccess('Factura eliminada correctamente.');
      setTimeout(() => {
        navigate('/facturas');
      }, 2000);
    } catch (error) {
      console.error('Error al eliminar la factura:', error);
      setError('Error al eliminar la factura. Por favor, intenta nuevamente.');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Función para reenviar factura a la DGII
  const handleResend = async () => {
    try {
      setActionLoading(true);
      
      // Llamar a Cloud Function para enviar a DGII
      const sendInvoiceToDGII = httpsCallable(functions, 'sendInvoiceToDGII');
      const result = await sendInvoiceToDGII({ invoiceId: id });
      
      if (result.data && result.data.success) {
        // Actualizar estado de la factura
        await updateDoc(doc(db, 'invoices', id), {
          status: 'enviada',
          trackId: result.data.trackId,
          dgiiSubmissionDate: new Date(),
          dgiiResponse: result.data
        });
        
        // Actualizar datos locales
        setInvoice(prev => ({
          ...prev,
          status: 'enviada',
          trackId: result.data.trackId,
          dgiiSubmissionDate: new Date(),
          dgiiResponse: result.data
        }));
        
        setSuccess(`Factura enviada a la DGII correctamente. TrackID: ${result.data.trackId}`);
      } else {
        throw new Error(result.data.error || 'No se pudo enviar a la DGII');
      }
    } catch (error) {
      console.error('Error al enviar a la DGII:', error);
      setError(`Error al enviar a la DGII: ${error.message}`);
    } finally {
      setActionLoading(false);
      setResendDialogOpen(false);
    }
  };

  // Función para enviar factura por correo
  const handleSendEmail = async () => {
    try {
      setActionLoading(true);
      
      // Llamar a Cloud Function para enviar correo
      const sendInvoiceByEmail = httpsCallable(functions, 'sendInvoiceByEmail');
      const result = await sendInvoiceByEmail({ invoiceId: id });
      
      if (result.data && result.data.success) {
        // Actualizar estado de la factura
        await updateDoc(doc(db, 'invoices', id), {
          emailSent: true,
          emailSentDate: new Date()
        });
        
        // Actualizar datos locales
        setInvoice(prev => ({
          ...prev,
          emailSent: true,
          emailSentDate: new Date()
        }));
        
        setSuccess('Factura enviada por correo correctamente.');
      } else {
        throw new Error(result.data.error || 'No se pudo enviar el correo');
      }
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setError(`Error al enviar el correo: ${error.message}`);
    } finally {
      setActionLoading(false);
      setEmailDialogOpen(false);
    }
  };

  // Función para verificar el estado de la factura en la DGII
  const handleCheckStatus = async () => {
    if (!invoice.trackId) {
      setError('Esta factura no tiene un TrackID asignado. Debe enviarla primero a la DGII.');
      return;
    }
    
    try {
      setActionLoading(true);
      
      // Llamar a Cloud Function para verificar estado
      const checkInvoiceStatus = httpsCallable(functions, 'checkInvoiceStatus');
      const result = await checkInvoiceStatus({ invoiceId: id, trackId: invoice.trackId });
      
      if (result.data && result.data.status) {
        // Determinar el nuevo estado
        const newStatus = result.data.status === 'Aceptado' ? 'aceptada' : 
                         result.data.status === 'Rechazado' ? 'rechazada' : 'enviada';
        
        // Actualizar estado de la factura
        await updateDoc(doc(db, 'invoices', id), {
          status: newStatus,
          dgiiStatusDetail: result.data.statusDetail || '',
          dgiiLastCheck: new Date()
        });
        
        // Actualizar datos locales
        setInvoice(prev => ({
          ...prev,
          status: newStatus,
          dgiiStatusDetail: result.data.statusDetail || '',
          dgiiLastCheck: new Date()
        }));
        
        setSuccess(`Estado de la factura: ${result.data.status}`);
      } else {
        throw new Error(result.data.error || 'No se pudo verificar el estado');
      }
    } catch (error) {
      console.error('Error al verificar el estado:', error);
      setError(`Error al verificar el estado: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Renderizar estado de la factura
  const renderStatus = (status) => {
    let label = 'Desconocido';
    let color = 'default';
    let icon = <InfoIcon />;
    
    switch (status) {
      case 'pendiente':
        label = 'Pendiente';
        color = 'warning';
        icon = <WarningIcon />;
        break;
      case 'enviada':
        label = 'Enviada a DGII';
        color = 'info';
        icon = <SendIcon />;
        break;
      case 'aceptada':
        label = 'Aceptada por DGII';
        color = 'success';
        icon = <CheckCircleIcon />;
        break;
      case 'rechazada':
        label = 'Rechazada por DGII';
        color = 'error';
        icon = <ErrorIcon />;
        break;
      case 'anulada':
        label = 'Anulada';
        color = 'error';
        icon = <CancelIcon />;
        break;
      default:
        break;
    }
    
    return (
      <Chip 
        icon={icon}
        label={label} 
        color={color} 
        sx={{ fontWeight: 'bold', fontSize: '1rem', py: 2, px: 1 }} 
      />
    );
  };

  // Renderizar pasos del proceso de facturación electrónica
  const renderECFSteps = () => {
    const steps = [
      { label: 'Creada', completed: true },
      { label: 'Enviada a DGII', completed: invoice.status !== 'pendiente' },
      { label: 'Procesada por DGII', completed: invoice.status === 'aceptada' || invoice.status === 'rechazada' || invoice.status === 'anulada' },
      { label: 'Aceptada', completed: invoice.status === 'aceptada' }
    ];
    
    return (
      <Stepper activeStep={
        invoice.status === 'pendiente' ? 0 :
        invoice.status === 'enviada' ? 1 :
        invoice.status === 'rechazada' || invoice.status === 'anulada' ? 2 :
        invoice.status === 'aceptada' ? 3 : 0
      } alternativeLabel sx={{ mb: 3 }}>
        {steps.map((step, index) => (
          <Step key={step.label} completed={step.completed}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          No se pudo cargar la factura. Por favor, intenta nuevamente.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/facturas')}
          sx={{ mt: 2 }}
        >
          Volver a la lista
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/facturas')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Factura #{invoice.id.substring(invoice.id.length - 6).toUpperCase()}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/facturas/editar/${id}`)}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Eliminar
          </Button>
          {invoice.status !== 'anulada' && (
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              color="error"
              onClick={() => setCancellationDialogOpen(true)}
            >
              Anular
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Snackbar
          open={Boolean(success)}
          autoHideDuration={6000}
          onClose={() => setSuccess('')}
          message={success}
        />
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Estado de la Factura
          </Typography>
          <Box>
            {renderStatus(invoice.status)}
          </Box>
        </Box>

        {renderECFSteps()}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Descargar PDF'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Email />}
            onClick={() => setEmailDialogOpen(true)}
            disabled={actionLoading}
          >
            Enviar por Correo
          </Button>
          <Button
            variant="contained"
            color={invoice.status === 'pendiente' ? 'primary' : 'info'}
            startIcon={invoice.status === 'pendiente' ? <SendIcon /> : <CheckCircleIcon />}
            onClick={invoice.status === 'pendiente' ? () => setResendDialogOpen(true) : handleCheckStatus}
            disabled={actionLoading}
          >
            {invoice.status === 'pendiente' ? 'Enviar a DGII' : 'Verificar Estado DGII'}
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Datos del Cliente
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Cliente:</strong> {invoice.client}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>RNC/Cédula:</strong> {invoice.rnc}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Dirección:</strong> {invoice.address}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Email:</strong> {invoice.email}
                </Typography>
                <Typography variant="body1">
                  <strong>Teléfono:</strong> {invoice.phone}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Productos/Servicios
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {invoice.items.map((item, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body1">
                            {item.description}
                          </Typography>
                        </Grid>
                        <Grid item xs={2}>
                          <Typography variant="body1" align="right">
                            {item.quantity}
                          </Typography>
                        </Grid>
                        <Grid item xs={2}>
                          <Typography variant="body1" align="right">
                            RD$ {item.price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                        <Grid item xs={2}>
                          <Typography variant="body1" align="right">
                            RD$ {(item.quantity * item.price).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                      </Grid>
                      {index < invoice.items.length - 1 && <Divider sx={{ my: 1 }} />}
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">
                    Subtotal
                  </Typography>
                  <Typography variant="body1">
                    RD$ {invoice.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">
                    ITBIS Total
                  </Typography>
                  <Typography variant="body1">
                    RD$ {invoice.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">
                    Total
                  </Typography>
                  <Typography variant="h6">
                    RD$ {invoice.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información de la Factura
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Fecha:</strong> {format(invoice.date, 'dd/MM/yyyy', { locale: es })}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>TrackID DGII:</strong> {invoice.trackId || 'No disponible'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Método de Pago:</strong> {
                    {
                      'efectivo': 'Efectivo',
                      'tarjeta': 'Tarjeta de Crédito/Débito',
                      'transferencia': 'Transferencia Bancaria',
                      'cheque': 'Cheque'
                    }[invoice.paymentMethod] || invoice.paymentMethod
                  }
                </Typography>
                {invoice.notes && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Notas:</strong> {invoice.notes}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {invoice.trackId && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Código QR
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <QRCode 
                      value={`https://dgii.gov.do/ecf?id=${invoice.trackId}`} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Escanea este código para verificar la autenticidad de la factura en el portal de la DGII
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Historial de la Factura</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <ReceiptIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Creación de Factura" 
                      secondary={format(invoice.date, 'dd/MM/yyyy HH:mm', { locale: es })} 
                    />
                  </ListItem>
                  
                  {invoice.dgiiSubmissionDate && (
                    <ListItem>
                      <ListItemIcon>
                        <SendIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Enviada a DGII" 
                        secondary={format(invoice.dgiiSubmissionDate, 'dd/MM/yyyy HH:mm', { locale: es })} 
                      />
                    </ListItem>
                  )}
                  
                  {invoice.dgiiLastCheck && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Última verificación" 
                        secondary={format(invoice.dgiiLastCheck, 'dd/MM/yyyy HH:mm', { locale: es })} 
                      />
                    </ListItem>
                  )}
                  
                  {invoice.emailSentDate && (
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Enviada por correo" 
                        secondary={format(invoice.emailSentDate, 'dd/MM/yyyy HH:mm', { locale: es })} 
                      />
                    </ListItem>
                  )}
                </List>
                
                {invoice.dgiiStatusDetail && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Detalles del estado DGII:
                    </Typography>
                    <Alert severity={invoice.status === 'aceptada' ? 'success' : invoice.status === 'rechazada' ? 'error' : 'info'}>
                      {invoice.dgiiStatusDetail}
                    </Alert>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
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
            ¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de envío a DGII */}
      <Dialog
        open={resendDialogOpen}
        onClose={() => setResendDialogOpen(false)}
      >
        <DialogTitle>Confirmar envío a DGII</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas enviar esta factura a la DGII? Asegúrate de que todos los datos sean correctos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResendDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleResend} color="primary" autoFocus>
            Enviar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de envío por correo */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
      >
        <DialogTitle>Confirmar envío por correo</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas enviar esta factura por correo a {invoice.email}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSendEmail} color="primary" autoFocus>
            Enviar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de anulación de factura */}
      <InvoiceCancellation 
        open={cancellationDialogOpen} 
        onClose={() => setCancellationDialogOpen(false)} 
        invoice={invoice} 
        onCancellationComplete={handleCancellationComplete} 
      />

      <ECFStatusDetail invoice={invoice} onStatusUpdate={handleECFStatusUpdate} onSendToDGII={handleSendToDGII} />
    </Container>
  );
}
