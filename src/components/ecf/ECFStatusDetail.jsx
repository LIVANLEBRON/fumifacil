import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Send as SendIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { sendInvoiceToDGII, checkInvoiceStatus } from '../../utils/ecf/invoiceService';

/**
 * Componente para mostrar detalles del estado de una factura electrónica
 * Incluye un stepper para visualizar el proceso de facturación electrónica
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.invoice - Objeto de factura completo
 * @param {Function} props.onStatusUpdate - Función a llamar cuando se actualiza el estado
 * @param {Function} props.onSendToDGII - Función a llamar cuando se envía a la DGII
 */
export default function ECFStatusDetail({ invoice, onStatusUpdate, onSendToDGII }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!invoice) return null;

  // Determinar el paso activo según el estado de la factura
  const getActiveStep = () => {
    switch (invoice.status) {
      case 'aceptada':
        return 3;
      case 'rechazada':
        return 2;
      case 'enviada':
        return 2;
      case 'pendiente':
        return invoice.pdfUrl ? 1 : 0;
      default:
        return 0;
    }
  };

  // Verificar estado de la factura en la DGII
  const handleCheckStatus = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Verificar estado en la DGII
      const result = await checkInvoiceStatus(invoice.id);
      
      // Notificar al componente padre
      if (onStatusUpdate) {
        onStatusUpdate(result);
      }

      setSuccess('Estado actualizado correctamente');
    } catch (error) {
      console.error('Error al verificar estado:', error);
      setError(error.message || 'Error al verificar el estado de la factura');
    } finally {
      setLoading(false);
    }
  };

  // Enviar factura a la DGII
  const handleSendToDGII = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Enviar a la DGII
      const result = await sendInvoiceToDGII(invoice.id);
      
      // Notificar al componente padre
      if (onSendToDGII) {
        onSendToDGII(result);
      }

      setSuccess('Factura enviada correctamente a la DGII');
    } catch (error) {
      console.error('Error al enviar a DGII:', error);
      setError(error.message || 'Error al enviar la factura a la DGII');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar chip de estado
  const renderStatusChip = () => {
    switch (invoice.status) {
      case 'aceptada':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Aceptada por DGII" 
            color="success" 
            variant="outlined" 
          />
        );
      case 'rechazada':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Rechazada por DGII" 
            color="error" 
            variant="outlined" 
          />
        );
      case 'enviada':
        return (
          <Chip 
            icon={<HourglassEmptyIcon />} 
            label="En proceso en DGII" 
            color="warning" 
            variant="outlined" 
          />
        );
      default:
        return (
          <Chip 
            icon={<PendingIcon />} 
            label="Pendiente de envío" 
            color="default" 
            variant="outlined" 
          />
        );
    }
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Proceso de Facturación Electrónica</Typography>
        {renderStatusChip()}
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
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
      
      {invoice.dgiiStatusDetail && (
        <Alert 
          severity={invoice.status === 'aceptada' ? 'success' : invoice.status === 'rechazada' ? 'error' : 'info'} 
          sx={{ mb: 3 }}
        >
          {invoice.dgiiStatusDetail}
        </Alert>
      )}
      
      <Stepper activeStep={getActiveStep()} orientation="vertical" sx={{ mb: 3 }}>
        <Step>
          <StepLabel>Creación de Factura</StepLabel>
          <StepContent>
            <Typography variant="body2">
              La factura ha sido creada en el sistema.
            </Typography>
            <Box sx={{ mt: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Fecha de creación: {invoice.createdAt ? invoice.createdAt.toDate().toLocaleString() : 'No disponible'}
              </Typography>
            </Box>
          </StepContent>
        </Step>
        
        <Step>
          <StepLabel>Generación de PDF</StepLabel>
          <StepContent>
            <Typography variant="body2">
              Se ha generado el PDF de la factura.
            </Typography>
            {invoice.pdfUrl && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  href={invoice.pdfUrl} 
                  target="_blank"
                >
                  Ver PDF
                </Button>
              </Box>
            )}
          </StepContent>
        </Step>
        
        <Step>
          <StepLabel>Envío a la DGII</StepLabel>
          <StepContent>
            <Typography variant="body2">
              {invoice.status === 'enviada' 
                ? 'La factura ha sido enviada a la DGII y está en proceso de validación.' 
                : invoice.status === 'rechazada'
                ? 'La factura fue rechazada por la DGII. Verifique el motivo del rechazo.'
                : 'La factura debe ser enviada a la DGII para su validación.'}
            </Typography>
            {invoice.dgiiSubmissionDate && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Fecha de envío: {invoice.dgiiSubmissionDate.toDate().toLocaleString()}
                </Typography>
              </Box>
            )}
            {invoice.trackId && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Track ID: {invoice.trackId}
                </Typography>
              </Box>
            )}
          </StepContent>
        </Step>
        
        <Step>
          <StepLabel>Aceptación por la DGII</StepLabel>
          <StepContent>
            <Typography variant="body2">
              La factura ha sido aceptada por la DGII y es válida como comprobante fiscal electrónico.
            </Typography>
            {invoice.dgiiLastCheck && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Fecha de aceptación: {invoice.dgiiLastCheck.toDate().toLocaleString()}
                </Typography>
              </Box>
            )}
          </StepContent>
        </Step>
      </Stepper>
      
      <Grid container spacing={2} justifyContent="flex-end">
        {invoice.status === 'pendiente' && (
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSendToDGII}
              disabled={loading || !invoice.pdfUrl}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Enviando...
                </>
              ) : (
                'Enviar a DGII'
              )}
            </Button>
          </Grid>
        )}
        
        {(invoice.status === 'enviada' || invoice.status === 'aceptada' || invoice.status === 'rechazada') && (
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleCheckStatus}
              disabled={loading || !invoice.trackId}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Verificando...
                </>
              ) : (
                'Verificar Estado'
              )}
            </Button>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}
