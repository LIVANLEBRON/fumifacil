import { useState, useEffect } from 'react';
import { useOffline } from '../../contexts/OfflineContext';
import { 
  savePendingOperation, 
  saveOfflineData,
  OPERATION_TYPES,
  COLLECTIONS
} from '../../utils/offline/syncService';
import { Alert, Snackbar } from '@mui/material';

/**
 * HOC (High Order Component) que agrega soporte offline a cualquier componente
 * @param {React.Component} WrappedComponent - Componente a envolver
 * @param {Object} options - Opciones de configuración
 * @param {String} options.collection - Nombre de la colección de Firestore
 * @param {Function} options.generateOfflineId - Función para generar un ID offline
 * @returns {React.Component} - Componente con soporte offline
 */
export default function withOfflineSupport(WrappedComponent, options = {}) {
  const {
    collection,
    generateOfflineId = () => `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  } = options;
  
  return function WithOfflineSupportComponent(props) {
    const { isOnline, pendingCount, checkPendingOperations } = useOffline();
    const [showOfflineAlert, setShowOfflineAlert] = useState(false);
    const [offlineMessage, setOfflineMessage] = useState('');
    
    // Función para guardar datos offline
    const saveOffline = async (data, operationType = OPERATION_TYPES.CREATE, docId = null) => {
      try {
        // Si no se especificó una colección, no podemos guardar offline
        if (!collection) {
          console.error('No se especificó una colección para guardar offline');
          return { success: false, error: 'No se especificó una colección' };
        }
        
        // Generar un ID offline si es una operación de creación
        const offlineId = operationType === OPERATION_TYPES.CREATE 
          ? generateOfflineId() 
          : docId;
        
        // Guardar la operación pendiente
        await savePendingOperation(
          collection,
          operationType,
          { ...data, offlineCreated: true },
          docId
        );
        
        // Guardar los datos en IndexedDB para acceso offline
        if (operationType !== OPERATION_TYPES.DELETE) {
          await saveOfflineData(
            getStoreNameFromCollection(collection),
            { ...data, id: offlineId, offlineCreated: true }
          );
        }
        
        // Actualizar el contador de operaciones pendientes
        await checkPendingOperations();
        
        // Mostrar mensaje de éxito
        setOfflineMessage('Datos guardados localmente. Se sincronizarán cuando vuelva la conexión.');
        setShowOfflineAlert(true);
        
        return { 
          success: true, 
          id: offlineId,
          message: 'Datos guardados localmente'
        };
      } catch (error) {
        console.error('Error al guardar datos offline:', error);
        
        // Mostrar mensaje de error
        setOfflineMessage(`Error al guardar datos localmente: ${error.message}`);
        setShowOfflineAlert(true);
        
        return { 
          success: false, 
          error: error.message
        };
      }
    };
    
    // Obtener el nombre del almacén a partir del nombre de la colección
    const getStoreNameFromCollection = (collectionName) => {
      switch (collectionName) {
        case COLLECTIONS.CLIENTS:
          return 'clients';
        case COLLECTIONS.QUOTES:
          return 'quotes';
        case COLLECTIONS.INVOICES:
          return 'invoices';
        case COLLECTIONS.INVENTORY:
        case COLLECTIONS.INVENTORY_MOVEMENTS:
          return 'inventory';
        default:
          return collectionName;
      }
    };
    
    return (
      <>
        <WrappedComponent 
          {...props} 
          isOnline={isOnline}
          saveOffline={saveOffline}
          pendingOperations={pendingCount}
        />
        
        <Snackbar
          open={showOfflineAlert}
          autoHideDuration={6000}
          onClose={() => setShowOfflineAlert(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={() => setShowOfflineAlert(false)} 
            severity="info" 
            sx={{ width: '100%' }}
          >
            {offlineMessage}
          </Alert>
        </Snackbar>
      </>
    );
  };
}
