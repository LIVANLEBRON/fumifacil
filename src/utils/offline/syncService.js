/**
 * Servicio de sincronización para funcionalidad offline
 * Utiliza IndexedDB para almacenar datos localmente cuando no hay conexión
 * y sincroniza con Firebase cuando se recupera la conexión
 */

import { openDB } from 'idb';
import { db } from '../../firebase/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

// Nombre de la base de datos IndexedDB
const DB_NAME = 'fumifacil-offline-db';
const DB_VERSION = 1;

// Nombres de los almacenes (tablas) en IndexedDB
const PENDING_OPERATIONS_STORE = 'pendingOperations';
const CLIENTS_STORE = 'clients';
const QUOTES_STORE = 'quotes';
const INVOICES_STORE = 'invoices';
const INVENTORY_STORE = 'inventory';

// Tipos de operaciones
export const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

// Colecciones de Firestore
export const COLLECTIONS = {
  CLIENTS: 'clients',
  QUOTES: 'quotes',
  INVOICES: 'invoices',
  INVENTORY: 'inventory',
  INVENTORY_MOVEMENTS: 'inventory_movements'
};

/**
 * Inicializa la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>} - Instancia de la base de datos
 */
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Crear almacén para operaciones pendientes
      if (!db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
        db.createObjectStore(PENDING_OPERATIONS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      
      // Crear almacenes para datos offline
      if (!db.objectStoreNames.contains(CLIENTS_STORE)) {
        const clientsStore = db.createObjectStore(CLIENTS_STORE, { keyPath: 'id' });
        clientsStore.createIndex('name', 'name', { unique: false });
        clientsStore.createIndex('rnc', 'rnc', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(QUOTES_STORE)) {
        const quotesStore = db.createObjectStore(QUOTES_STORE, { keyPath: 'id' });
        quotesStore.createIndex('clientId', 'clientId', { unique: false });
        quotesStore.createIndex('date', 'date', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(INVOICES_STORE)) {
        const invoicesStore = db.createObjectStore(INVOICES_STORE, { keyPath: 'id' });
        invoicesStore.createIndex('clientId', 'clientId', { unique: false });
        invoicesStore.createIndex('date', 'date', { unique: false });
        invoicesStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(INVENTORY_STORE)) {
        const inventoryStore = db.createObjectStore(INVENTORY_STORE, { keyPath: 'id' });
        inventoryStore.createIndex('name', 'name', { unique: false });
        inventoryStore.createIndex('quantity', 'quantity', { unique: false });
      }
    }
  });
};

/**
 * Guarda una operación pendiente para sincronizar cuando haya conexión
 * @param {String} collection - Nombre de la colección de Firestore
 * @param {String} operationType - Tipo de operación (create, update, delete)
 * @param {Object} data - Datos de la operación
 * @param {String} docId - ID del documento (opcional, para update y delete)
 * @returns {Promise<Number>} - ID de la operación pendiente
 */
export const savePendingOperation = async (collection, operationType, data, docId = null) => {
  const db = await initDB();
  
  const pendingOperation = {
    collection,
    operationType,
    data,
    docId,
    timestamp: new Date().toISOString(),
    attempts: 0
  };
  
  return db.add(PENDING_OPERATIONS_STORE, pendingOperation);
};

/**
 * Guarda datos en IndexedDB para acceso offline
 * @param {String} storeName - Nombre del almacén
 * @param {Object} data - Datos a guardar
 * @returns {Promise<String>} - ID del documento guardado
 */
export const saveOfflineData = async (storeName, data) => {
  const db = await initDB();
  return db.put(storeName, data);
};

/**
 * Obtiene datos de IndexedDB
 * @param {String} storeName - Nombre del almacén
 * @param {String} id - ID del documento
 * @returns {Promise<Object>} - Datos del documento
 */
export const getOfflineData = async (storeName, id) => {
  const db = await initDB();
  return db.get(storeName, id);
};

/**
 * Obtiene todos los datos de un almacén
 * @param {String} storeName - Nombre del almacén
 * @returns {Promise<Array>} - Array de documentos
 */
export const getAllOfflineData = async (storeName) => {
  const db = await initDB();
  return db.getAll(storeName);
};

/**
 * Elimina datos de IndexedDB
 * @param {String} storeName - Nombre del almacén
 * @param {String} id - ID del documento
 * @returns {Promise<undefined>}
 */
export const deleteOfflineData = async (storeName, id) => {
  const db = await initDB();
  return db.delete(storeName, id);
};

/**
 * Sincroniza las operaciones pendientes con Firestore
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
export const syncPendingOperations = async () => {
  // Verificar si hay conexión a internet
  if (!navigator.onLine) {
    return { success: false, message: 'No hay conexión a internet' };
  }
  
  const db = await initDB();
  const pendingOperations = await db.getAll(PENDING_OPERATIONS_STORE);
  
  if (pendingOperations.length === 0) {
    return { success: true, message: 'No hay operaciones pendientes' };
  }
  
  const results = {
    total: pendingOperations.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const operation of pendingOperations) {
    try {
      let success = false;
      
      switch (operation.operationType) {
        case OPERATION_TYPES.CREATE:
          // Agregar documento a Firestore
          const docRef = await addDoc(collection(db, operation.collection), {
            ...operation.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            syncedFromOffline: true
          });
          
          // Si la operación es exitosa, guardar el ID del documento en IndexedDB
          if (docRef.id) {
            // Actualizar datos offline con el ID real de Firestore
            const offlineData = await getOfflineData(getStoreNameFromCollection(operation.collection), operation.data.id);
            if (offlineData) {
              await deleteOfflineData(getStoreNameFromCollection(operation.collection), operation.data.id);
              offlineData.id = docRef.id;
              await saveOfflineData(getStoreNameFromCollection(operation.collection), offlineData);
            }
            success = true;
          }
          break;
          
        case OPERATION_TYPES.UPDATE:
          // Actualizar documento en Firestore
          if (operation.docId) {
            await updateDoc(doc(db, operation.collection, operation.docId), {
              ...operation.data,
              updatedAt: serverTimestamp(),
              syncedFromOffline: true
            });
            success = true;
          }
          break;
          
        case OPERATION_TYPES.DELETE:
          // Eliminar documento en Firestore
          if (operation.docId) {
            await updateDoc(doc(db, operation.collection, operation.docId), {
              deleted: true,
              updatedAt: serverTimestamp(),
              syncedFromOffline: true
            });
            success = true;
          }
          break;
      }
      
      if (success) {
        // Eliminar la operación pendiente si fue exitosa
        await db.delete(PENDING_OPERATIONS_STORE, operation.id);
        results.success++;
      } else {
        // Incrementar el contador de intentos
        operation.attempts++;
        await db.put(PENDING_OPERATIONS_STORE, operation);
        results.failed++;
        results.errors.push(`Operación ${operation.id} fallida: ${operation.operationType} en ${operation.collection}`);
      }
    } catch (error) {
      console.error('Error al sincronizar operación:', error);
      
      // Incrementar el contador de intentos
      operation.attempts++;
      operation.lastError = error.message;
      await db.put(PENDING_OPERATIONS_STORE, operation);
      
      results.failed++;
      results.errors.push(`Error en operación ${operation.id}: ${error.message}`);
    }
  }
  
  return {
    success: results.failed === 0,
    ...results
  };
};

/**
 * Obtiene el nombre del almacén a partir del nombre de la colección
 * @param {String} collection - Nombre de la colección
 * @returns {String} - Nombre del almacén
 */
const getStoreNameFromCollection = (collection) => {
  switch (collection) {
    case COLLECTIONS.CLIENTS:
      return CLIENTS_STORE;
    case COLLECTIONS.QUOTES:
      return QUOTES_STORE;
    case COLLECTIONS.INVOICES:
      return INVOICES_STORE;
    case COLLECTIONS.INVENTORY:
    case COLLECTIONS.INVENTORY_MOVEMENTS:
      return INVENTORY_STORE;
    default:
      return collection;
  }
};

/**
 * Descarga datos de Firestore para acceso offline
 * @param {String} collectionName - Nombre de la colección
 * @param {Function} queryBuilder - Función para construir la consulta (opcional)
 * @returns {Promise<Array>} - Datos descargados
 */
export const downloadDataForOffline = async (collectionName, queryBuilder = null) => {
  try {
    let queryRef;
    
    if (queryBuilder) {
      queryRef = queryBuilder(collection(db, collectionName));
    } else {
      queryRef = query(
        collection(db, collectionName),
        orderBy('updatedAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(queryRef);
    const data = [];
    
    querySnapshot.forEach((doc) => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Guardar datos en IndexedDB
    const storeName = getStoreNameFromCollection(collectionName);
    const db = await initDB();
    
    // Usar una transacción para guardar todos los documentos
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    for (const item of data) {
      await store.put(item);
    }
    
    await tx.done;
    
    return data;
  } catch (error) {
    console.error(`Error al descargar datos de ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Configura listeners para eventos de conexión
 * @param {Function} onOnline - Función a ejecutar cuando se recupera la conexión
 * @param {Function} onOffline - Función a ejecutar cuando se pierde la conexión
 */
export const setupConnectivityListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * Verifica si hay operaciones pendientes
 * @returns {Promise<Boolean>} - True si hay operaciones pendientes
 */
export const hasPendingOperations = async () => {
  const db = await initDB();
  const count = await db.count(PENDING_OPERATIONS_STORE);
  return count > 0;
};

/**
 * Obtiene el número de operaciones pendientes
 * @returns {Promise<Number>} - Número de operaciones pendientes
 */
export const getPendingOperationsCount = async () => {
  const db = await initDB();
  return db.count(PENDING_OPERATIONS_STORE);
};
