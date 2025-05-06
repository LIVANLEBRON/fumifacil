/**
 * Servicio para gestionar datos offline
 * Proporciona métodos para crear, leer, actualizar y eliminar datos en IndexedDB
 * y sincronizarlos con Firestore cuando se recupera la conexión
 */

import { 
  initDB, 
  saveOfflineData, 
  getOfflineData, 
  getAllOfflineData, 
  deleteOfflineData,
  savePendingOperation,
  OPERATION_TYPES,
  COLLECTIONS
} from './syncService';
import { db } from '../../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Nombres de los almacenes en IndexedDB
const CLIENTS_STORE = 'clients';
const QUOTES_STORE = 'quotes';
const INVOICES_STORE = 'invoices';
const INVENTORY_STORE = 'inventory';

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
 * Genera un ID único para documentos creados offline
 * @returns {String} - ID único
 */
export const generateOfflineId = () => {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Verifica si un ID es un ID offline
 * @param {String} id - ID a verificar
 * @returns {Boolean} - True si es un ID offline
 */
export const isOfflineId = (id) => {
  return id && id.startsWith('offline_');
};

/**
 * Crea un documento en IndexedDB y registra la operación pendiente
 * @param {String} collectionName - Nombre de la colección
 * @param {Object} data - Datos a guardar
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const createOfflineDocument = async (collectionName, data) => {
  try {
    await initDB();
    
    const offlineId = generateOfflineId();
    const storeName = getStoreNameFromCollection(collectionName);
    
    // Agregar metadatos
    const documentData = {
      ...data,
      id: offlineId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      offlineCreated: true
    };
    
    // Guardar en IndexedDB
    await saveOfflineData(storeName, documentData);
    
    // Registrar operación pendiente
    await savePendingOperation(
      collectionName,
      OPERATION_TYPES.CREATE,
      documentData
    );
    
    return {
      success: true,
      id: offlineId,
      data: documentData
    };
  } catch (error) {
    console.error(`Error al crear documento offline en ${collectionName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Actualiza un documento en IndexedDB y registra la operación pendiente
 * @param {String} collectionName - Nombre de la colección
 * @param {String} docId - ID del documento
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const updateOfflineDocument = async (collectionName, docId, data) => {
  try {
    await initDB();
    
    const storeName = getStoreNameFromCollection(collectionName);
    
    // Obtener documento actual
    const existingDoc = await getOfflineData(storeName, docId);
    
    if (!existingDoc) {
      throw new Error(`Documento con ID ${docId} no encontrado`);
    }
    
    // Actualizar datos
    const updatedData = {
      ...existingDoc,
      ...data,
      updatedAt: new Date().toISOString(),
      offlineUpdated: true
    };
    
    // Guardar en IndexedDB
    await saveOfflineData(storeName, updatedData);
    
    // Registrar operación pendiente
    await savePendingOperation(
      collectionName,
      OPERATION_TYPES.UPDATE,
      updatedData,
      docId
    );
    
    return {
      success: true,
      id: docId,
      data: updatedData
    };
  } catch (error) {
    console.error(`Error al actualizar documento offline en ${collectionName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Elimina un documento en IndexedDB y registra la operación pendiente
 * @param {String} collectionName - Nombre de la colección
 * @param {String} docId - ID del documento
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const deleteOfflineDocument = async (collectionName, docId) => {
  try {
    await initDB();
    
    const storeName = getStoreNameFromCollection(collectionName);
    
    // Obtener documento actual
    const existingDoc = await getOfflineData(storeName, docId);
    
    if (!existingDoc) {
      throw new Error(`Documento con ID ${docId} no encontrado`);
    }
    
    // Eliminar de IndexedDB
    await deleteOfflineData(storeName, docId);
    
    // Registrar operación pendiente
    await savePendingOperation(
      collectionName,
      OPERATION_TYPES.DELETE,
      { id: docId },
      docId
    );
    
    return {
      success: true,
      id: docId
    };
  } catch (error) {
    console.error(`Error al eliminar documento offline en ${collectionName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtiene un documento de IndexedDB o Firestore
 * @param {String} collectionName - Nombre de la colección
 * @param {String} docId - ID del documento
 * @param {Boolean} forceOnline - Si es true, intenta obtener el documento de Firestore incluso si hay una versión offline
 * @returns {Promise<Object>} - Documento
 */
export const getDocument = async (collectionName, docId, forceOnline = false) => {
  try {
    await initDB();
    
    const storeName = getStoreNameFromCollection(collectionName);
    let document = null;
    
    // Primero intentamos obtener el documento de IndexedDB
    if (!forceOnline) {
      document = await getOfflineData(storeName, docId);
    }
    
    // Si no lo encontramos o se fuerza online, intentamos obtenerlo de Firestore
    if (!document && navigator.onLine) {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        document = {
          id: docSnap.id,
          ...docSnap.data()
        };
        
        // Guardamos el documento en IndexedDB para acceso offline
        await saveOfflineData(storeName, document);
      }
    }
    
    return document;
  } catch (error) {
    console.error(`Error al obtener documento de ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Obtiene todos los documentos de una colección de IndexedDB o Firestore
 * @param {String} collectionName - Nombre de la colección
 * @param {Function} queryBuilder - Función para construir la consulta (opcional)
 * @param {Boolean} forceOnline - Si es true, intenta obtener los documentos de Firestore incluso si hay versiones offline
 * @returns {Promise<Array>} - Array de documentos
 */
export const getDocuments = async (collectionName, queryBuilder = null, forceOnline = false) => {
  try {
    await initDB();
    
    const storeName = getStoreNameFromCollection(collectionName);
    let documents = [];
    
    // Primero intentamos obtener los documentos de IndexedDB
    if (!forceOnline) {
      documents = await getAllOfflineData(storeName);
    }
    
    // Si no hay documentos offline o se fuerza online, intentamos obtenerlos de Firestore
    if ((documents.length === 0 || forceOnline) && navigator.onLine) {
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
      documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Guardamos los documentos en IndexedDB para acceso offline
      for (const doc of documents) {
        await saveOfflineData(storeName, doc);
      }
    }
    
    return documents;
  } catch (error) {
    console.error(`Error al obtener documentos de ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Busca documentos en IndexedDB o Firestore
 * @param {String} collectionName - Nombre de la colección
 * @param {String} field - Campo por el que buscar
 * @param {*} value - Valor a buscar
 * @param {Boolean} forceOnline - Si es true, intenta buscar en Firestore incluso si hay versiones offline
 * @returns {Promise<Array>} - Array de documentos
 */
export const searchDocuments = async (collectionName, field, value, forceOnline = false) => {
  try {
    await initDB();
    
    const storeName = getStoreNameFromCollection(collectionName);
    let documents = [];
    
    // Primero intentamos buscar en IndexedDB
    if (!forceOnline) {
      const allDocs = await getAllOfflineData(storeName);
      documents = allDocs.filter(doc => doc[field] === value);
    }
    
    // Si no hay resultados o se fuerza online, intentamos buscar en Firestore
    if ((documents.length === 0 || forceOnline) && navigator.onLine) {
      const queryRef = query(
        collection(db, collectionName),
        where(field, '==', value)
      );
      
      const querySnapshot = await getDocs(queryRef);
      documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Guardamos los documentos en IndexedDB para acceso offline
      for (const doc of documents) {
        await saveOfflineData(storeName, doc);
      }
    }
    
    return documents;
  } catch (error) {
    console.error(`Error al buscar documentos en ${collectionName}:`, error);
    throw error;
  }
};
