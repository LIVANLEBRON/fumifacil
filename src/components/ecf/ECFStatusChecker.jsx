import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  HourglassEmpty as HourglassEmptyIcon
} from '@mui/icons-material';
import { checkInvoiceStatus } from '../../utils/ecf/invoiceService';

/**
 * Componente para verificar el estado de una factura electrónica en la DGII
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.invoice - Objeto de factura completo
 * @param {Function} props.onStatusUpdate - Función a llamar cuando se actualiza el estado
 */
export default function ECFStatusChecker({ invoice, onStatusUpdate }) {
  if (!invoice) return null;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(invoice.status || 'pendiente');
  const [details, setDetails] = useState(invoice.dgiiResponse || {});
  const [lastCheck, setLastCheck] = useState(invoice.dgiiLastCheck ? new Date(invoice.dgiiLastCheck.toDate()) : null);

  // Verificar estado de la factura en la DGII
  const checkStatus = async () => {
    try {
      setLoading(true);
      setError('');

      // Verificar estado en la DGII
      const result = await checkInvoiceStatus(invoice.id);
      
      // Actualizar estado local
      setStatus(result.status === 'Aceptado' ? 'aceptada' : 
                result.status === 'Rechazado' ? 'rechazada' : 'enviada');
      setDetails(result);
      setLastCheck(new Date());
      
      // Notificar al componente padre
      if (onStatusUpdate) {
        onStatusUpdate(result);
      }
    } catch (error) {
      console.error('Error al verificar estado:', error);
      setError(error.message || 'Error al verificar el estado de la factura');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar chip de estado
  const renderStatusChip = () => {
    switch (status) {
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
            icon={<HourglassEmptyIcon />} 
            label="Pendiente de envío" 
            color="default" 
            variant="outlined" 
          />
        );
    }
  };

  // Si la factura no tiene NCF, no mostrar el componente
  if (!invoice.ncf) {
    return null;
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Estado en DGII</Typography>
        {renderStatusChip()}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            NCF:
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {invoice.ncf}
          </Typography>
        </Grid>
        
        {invoice.trackId && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Track ID:
            </Typography>
            <Typography variant="body1">
              {invoice.trackId}
            </Typography>
          </Grid>
        )}
        
        {invoice.dgiiSubmissionDate && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Fecha de envío a DGII:
            </Typography>
            <Typography variant="body1">
              {invoice.dgiiSubmissionDate.toDate().toLocaleString()}
            </Typography>
          </Grid>
        )}
        
        {lastCheck && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Última verificación:
            </Typography>
            <Typography variant="body1">
              {lastCheck.toLocaleString()}
            </Typography>
          </Grid>
        )}
      </Grid>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {invoice.dgiiStatusDetail && (
        <Alert 
          severity={status === 'aceptada' ? 'success' : status === 'rechazada' ? 'error' : 'info'} 
          sx={{ mb: 2 }}
        >
          {invoice.dgiiStatusDetail}
        </Alert>
      )}
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={checkStatus}
          disabled={loading || status === 'pendiente' || !invoice.trackId}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Verificando...
            </>
          ) : (
            'Verificar estado'
          )}
        </Button>
      </Box>
    </Paper>
  );
}
