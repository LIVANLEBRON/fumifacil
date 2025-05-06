import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  hasPendingOperations, 
  getPendingOperationsCount, 
  setupConnectivityListeners,
  syncPendingOperations,
  initDB
} from '../utils/offline/syncService';

// Crear el contexto
const OfflineContext = createContext();

// Hook personalizado para usar el contexto
export function useOffline() {
  return useContext(OfflineContext);
}

// Proveedor del contexto
export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Inicializar la base de datos IndexedDB
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        setDbInitialized(true);
        console.log('IndexedDB inicializada correctamente');
      } catch (error) {
        console.error('Error al inicializar IndexedDB:', error);
      }
    };

    initialize();
  }, []);

  // Verificar operaciones pendientes
  const checkPendingOperations = useCallback(async () => {
    if (!dbInitialized) return;
    
    try {
      const count = await getPendingOperationsCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error al verificar operaciones pendientes:', error);
    }
  }, [dbInitialized]);

  // Manejar cambio de estado de conexión
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    checkPendingOperations();
  }, [checkPendingOperations]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  // Configurar listeners de conectividad
  useEffect(() => {
    const cleanup = setupConnectivityListeners(handleOnline, handleOffline);
    
    return cleanup;
  }, [handleOnline, handleOffline]);

  // Verificar operaciones pendientes periódicamente
  useEffect(() => {
    if (!dbInitialized) return;
    
    checkPendingOperations();
    
    const interval = setInterval(() => {
      checkPendingOperations();
    }, 60000); // Verificar cada minuto
    
    return () => clearInterval(interval);
  }, [checkPendingOperations, dbInitialized]);

  // Sincronizar operaciones pendientes
  const syncData = async () => {
    if (!isOnline || isSyncing || !dbInitialized) {
      return { success: false, message: 'No se puede sincronizar en este momento' };
    }
    
    try {
      setIsSyncing(true);
      
      const result = await syncPendingOperations();
      setLastSyncResult(result);
      
      // Actualizar contador de operaciones pendientes
      await checkPendingOperations();
      
      return result;
    } catch (error) {
      console.error('Error al sincronizar:', error);
      const errorResult = {
        success: false,
        message: `Error al sincronizar: ${error.message}`,
        errors: [error.message]
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  };

  // Valor del contexto
  const value = {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    dbInitialized,
    syncData,
    checkPendingOperations
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}
