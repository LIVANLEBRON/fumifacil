import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Button,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/firebase';

/**
 * Componente para monitorear el estado de la conexión con la DGII
 * Muestra si el servicio de facturación electrónica está disponible
 */
export default function DGIIStatusMonitor() {
  const [status, setStatus] = useState('unknown'); // unknown, online, offline, degraded
  const [lastCheck, setLastCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({
    responseTime: null,
    testMode: true,
    message: ''
  });

  // Verificar estado al cargar el componente
  useEffect(() => {
    checkDGIIStatus();
  }, []);

  // Verificar estado de la DGII
  const checkDGIIStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Llamar a la Cloud Function para verificar el estado
      const checkDGIIStatusFn = httpsCallable(functions, 'checkDGIIStatus');
      const startTime = Date.now();
      const result = await checkDGIIStatusFn();
      const endTime = Date.now();
      
      // Calcular tiempo de respuesta
      const responseTime = endTime - startTime;
      
      // Actualizar estado
      if (result.data && result.data.status) {
        setStatus(result.data.status);
        setDetails({
          responseTime,
          testMode: result.data.testMode || true,
          message: result.data.message || ''
        });
      } else {
        setStatus('unknown');
        setDetails({
          responseTime,
          testMode: true,
          message: 'No se pudo determinar el estado'
        });
      }
      
      // Actualizar fecha de última verificación
      setLastCheck(new Date());
    } catch (error) {
      console.error('Error al verificar estado de DGII:', error);
      setError('Error al verificar estado de DGII');
      setStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar chip de estado
  const renderStatusChip = () => {
    switch (status) {
      case 'online':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="En línea" 
            color="success" 
            variant="outlined" 
          />
        );
      case 'offline':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Fuera de línea" 
            color="error" 
            variant="outlined" 
          />
        );
      case 'degraded':
        return (
          <Chip 
            icon={<WarningIcon />} 
            label="Servicio degradado" 
            color="warning" 
            variant="outlined" 
          />
        );
      default:
        return (
          <Chip 
            icon={<InfoIcon />} 
            label="Desconocido" 
            color="default" 
            variant="outlined" 
          />
        );
    }
  };

  // Formatear fecha
  const formatDateTime = (date) => {
    if (!date) return 'Nunca';
    
    return date.toLocaleString('es-DO', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Estado de Servicios DGII
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {loading ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : (
            renderStatusChip()
          )}
          
          <Tooltip title="Verificar estado">
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={checkDGIIStatus}
              disabled={loading}
              sx={{ ml: 1 }}
            >
              Actualizar
            </Button>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Última verificación: {formatDateTime(lastCheck)}
        </Typography>
        
        {details.testMode && (
          <Chip 
            label="Modo de prueba" 
            color="info" 
            size="small"
            variant="outlined" 
          />
        )}
      </Box>
      
      {details.responseTime && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Tiempo de respuesta: {details.responseTime}ms
        </Typography>
      )}
      
      {details.message && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {details.message}
        </Typography>
      )}
    </Paper>
  );
}
