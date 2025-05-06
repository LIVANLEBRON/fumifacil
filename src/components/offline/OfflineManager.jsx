import { useState } from 'react';
import { 
  Snackbar, 
  Alert, 
  Badge, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Box,
  Tooltip
} from '@mui/material';
import { 
  CloudOff as CloudOffIcon,
  Sync as SyncIcon,
  CloudDone as CloudDoneIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useOffline } from '../../contexts/OfflineContext';

/**
 * Componente para gestionar la conectividad y sincronización offline
 * Muestra el estado de la conexión y permite sincronizar manualmente
 */
export default function OfflineManager() {
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    lastSyncResult, 
    syncData 
  } = useOffline();
  
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  // Abrir diálogo de sincronización
  const handleOpenSyncDialog = () => {
    setSyncDialogOpen(true);
  };

  // Cerrar diálogo de sincronización
  const handleCloseSyncDialog = () => {
    setSyncDialogOpen(false);
  };

  // Sincronizar operaciones pendientes
  const handleSync = async () => {
    if (!isOnline) {
      return;
    }
    
    await syncData();
  };

  // Renderizar resultado de sincronización
  const renderSyncResult = () => {
    if (!lastSyncResult) return null;
    
    return (
      <>
        <Alert 
          severity={lastSyncResult.success ? 'success' : 'error'} 
          sx={{ mb: 2 }}
        >
          {lastSyncResult.success 
            ? `Sincronización completada. ${lastSyncResult.success} operaciones sincronizadas.`
            : `Sincronización con errores. ${lastSyncResult.failed} operaciones fallidas.`
          }
        </Alert>
        
        {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
          <List dense>
            {lastSyncResult.errors.map((error, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <ErrorIcon color="error" />
                </ListItemIcon>
                <ListItemText primary={error} />
              </ListItem>
            ))}
          </List>
        )}
      </>
    );
  };

  return (
    <>
      {/* Indicador de estado de conexión */}
      <Tooltip title={isOnline ? 'Conectado' : 'Sin conexión'}>
        <Badge badgeContent={pendingCount} color="error" max={99}>
          <IconButton 
            color={isOnline ? 'primary' : 'error'} 
            onClick={handleOpenSyncDialog}
            disabled={!isOnline && pendingCount === 0}
          >
            {isOnline ? <CloudDoneIcon /> : <CloudOffIcon />}
          </IconButton>
        </Badge>
      </Tooltip>
      
      {/* Alertas de estado de conexión */}
      <Snackbar
        open={showOfflineAlert}
        autoHideDuration={6000}
        onClose={() => setShowOfflineAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowOfflineAlert(false)} 
          severity="warning" 
          sx={{ width: '100%' }}
        >
          Sin conexión. Los cambios se guardarán localmente y se sincronizarán cuando vuelva la conexión.
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={showOnlineAlert}
        autoHideDuration={6000}
        onClose={() => setShowOnlineAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowOnlineAlert(false)} 
          severity="success" 
          sx={{ width: '100%' }}
          action={
            pendingCount > 0 ? (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  setShowOnlineAlert(false);
                  handleOpenSyncDialog();
                }}
              >
                Sincronizar
              </Button>
            ) : null
          }
        >
          Conexión restablecida.
          {pendingCount > 0 && ` Hay ${pendingCount} operaciones pendientes de sincronizar.`}
        </Alert>
      </Snackbar>
      
      {/* Diálogo de sincronización */}
      <Dialog
        open={syncDialogOpen}
        onClose={handleCloseSyncDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Sincronización
        </DialogTitle>
        <DialogContent>
          {isOnline ? (
            <>
              <Typography variant="body1" gutterBottom>
                {pendingCount > 0 
                  ? `Hay ${pendingCount} operaciones pendientes de sincronizar.`
                  : 'No hay operaciones pendientes de sincronizar.'
                }
              </Typography>
              
              {isSyncing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography variant="body2">
                    Sincronizando...
                  </Typography>
                </Box>
              ) : (
                renderSyncResult()
              )}
            </>
          ) : (
            <Alert severity="warning">
              No hay conexión a internet. La sincronización no es posible en este momento.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSyncDialog}>
            Cerrar
          </Button>
          {isOnline && pendingCount > 0 && !isSyncing && (
            <Button 
              onClick={handleSync} 
              variant="contained" 
              startIcon={<SyncIcon />}
            >
              Sincronizar ahora
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
