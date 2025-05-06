import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  FormHelperText
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/firebase';

/**
 * Componente para gestionar la anulación de facturas electrónicas
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.open - Controla si el diálogo está abierto
 * @param {Function} props.onClose - Función para cerrar el diálogo
 * @param {Object} props.invoice - Datos de la factura a anular
 * @param {Function} props.onCancellationComplete - Función a llamar cuando se completa la anulación
 */
export default function InvoiceCancellation({ open, onClose, invoice, onCancellationComplete }) {
  const [reason, setReason] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lista de motivos de anulación según la DGII
  const cancellationReasons = [
    { code: '01', description: 'Factura emitida con errores' },
    { code: '02', description: 'Factura con datos incorrectos' },
    { code: '03', description: 'Factura duplicada' },
    { code: '04', description: 'Orden de compra cancelada' },
    { code: '05', description: 'Otros' }
  ];

  // Validar formulario
  const isFormValid = () => {
    if (!reasonCode) {
      setError('Debe seleccionar un motivo de anulación');
      return false;
    }
    
    if (reasonCode === '05' && !reason.trim()) {
      setError('Debe especificar el motivo de anulación');
      return false;
    }
    
    return true;
  };

  // Manejar cambio de motivo
  const handleReasonCodeChange = (event) => {
    setReasonCode(event.target.value);
    setError('');
  };

  // Manejar cambio de descripción
  const handleReasonChange = (event) => {
    setReason(event.target.value);
    setError('');
  };

  // Manejar anulación
  const handleCancellation = async () => {
    if (!isFormValid()) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Preparar datos para la anulación
      const cancellationData = {
        invoiceId: invoice.id,
        reasonCode,
        reason: reasonCode === '05' ? reason : cancellationReasons.find(r => r.code === reasonCode)?.description
      };
      
      // Llamar a la Cloud Function para anular la factura
      const cancelInvoiceFn = httpsCallable(functions, 'cancelInvoice');
      const result = await cancelInvoiceFn(cancellationData);
      
      if (result.data && result.data.success) {
        setSuccess('Factura anulada correctamente');
        
        // Esperar un momento antes de cerrar el diálogo
        setTimeout(() => {
          onClose();
          if (onCancellationComplete) {
            onCancellationComplete(result.data);
          }
        }, 2000);
      } else {
        setError(result.data?.error || 'Error al anular la factura');
      }
    } catch (error) {
      console.error('Error al anular factura:', error);
      setError(error.message || 'Error al anular la factura');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar estado al cerrar
  const handleClose = () => {
    setReason('');
    setReasonCode('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={loading ? null : handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Anular Factura Electrónica</DialogTitle>
      
      <DialogContent>
        {invoice && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Factura: {invoice.ncf || invoice.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cliente: {invoice.client || 'Sin nombre'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monto: {new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: 'DOP'
              }).format(invoice.total || 0)}
            </Typography>
          </Box>
        )}
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          La anulación de una factura electrónica es un proceso irreversible y será reportado a la DGII.
        </Alert>
        
        <FormControl fullWidth sx={{ mb: 3 }} error={error && !reasonCode}>
          <InputLabel>Motivo de Anulación</InputLabel>
          <Select
            value={reasonCode}
            label="Motivo de Anulación"
            onChange={handleReasonCodeChange}
            disabled={loading}
          >
            {cancellationReasons.map((reason) => (
              <MenuItem key={reason.code} value={reason.code}>
                {reason.code} - {reason.description}
              </MenuItem>
            ))}
          </Select>
          {error && !reasonCode && (
            <FormHelperText>{error}</FormHelperText>
          )}
        </FormControl>
        
        {reasonCode === '05' && (
          <TextField
            label="Especifique el motivo"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={handleReasonChange}
            disabled={loading}
            error={error && !reason.trim()}
            helperText={error && !reason.trim() ? error : ''}
            sx={{ mb: 2 }}
          />
        )}
        
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
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleCancellation} 
          variant="contained" 
          color="error" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Procesando...' : 'Anular Factura'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
