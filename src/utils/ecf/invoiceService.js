/**
 * Servicio para manejar la generación y procesamiento de facturas electrónicas (e-CF)
 * según los requisitos de la DGII y la Ley 32-23
 */
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { db, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { validateInvoice, generateNCF } from './validationService';
import { loadECFConfig, hasCertificate } from './certificateService';
import { format } from 'date-fns';

/**
 * Genera un número de secuencia para la factura
 * @returns {Promise<number>} Número de secuencia
 */
const getNextInvoiceNumber = async () => {
  try {
    // Obtener configuración de facturación
    const invoiceSettingsDoc = await getDoc(doc(db, 'settings', 'invoice'));
    
    if (!invoiceSettingsDoc.exists()) {
      // Si no existe, crear con valor inicial
      await setDoc(doc(db, 'settings', 'invoice'), {
        nextInvoiceNumber: 2
      });
      return 1;
    }
    
    const { nextInvoiceNumber } = invoiceSettingsDoc.data();
    
    // Incrementar el contador para la próxima factura
    await updateDoc(doc(db, 'settings', 'invoice'), {
      nextInvoiceNumber: increment(1)
    });
    
    return nextInvoiceNumber;
  } catch (error) {
    console.error('Error al obtener número de factura:', error);
    throw error;
  }
};

/**
 * Genera un NCF para la factura
 * @param {string} type - Tipo de comprobante
 * @returns {Promise<string>} NCF generado
 */
const generateInvoiceNCF = async (type = '01') => {
  const sequence = await getNextInvoiceNumber();
  return generateNCF(type, sequence);
};

/**
 * Prepara los datos de la factura para enviar a la DGII
 * @param {Object} invoice - Datos de la factura
 * @param {Object} companyData - Datos de la empresa
 * @returns {Object} Datos preparados para la DGII
 */
const prepareInvoiceForDGII = (invoice, companyData) => {
  // Obtener fecha actual en formato ISO
  const currentDate = new Date().toISOString();
  
  // Formatear fecha de la factura
  const invoiceDate = format(invoice.date, 'yyyy-MM-dd');
  
  return {
    // Datos del encabezado
    header: {
      id: invoice.id,
      ncf: invoice.ncf,
      issueDate: invoiceDate,
      issueTime: format(invoice.date, 'HH:mm:ss'),
      documentType: '01', // 01: Factura
      currency: invoice.currency || 'DOP',
      paymentMethod: invoice.paymentMethod || 'efectivo'
    },
    // Datos del emisor (la empresa)
    issuer: {
      rnc: companyData.rnc,
      name: companyData.name,
      address: companyData.address || '',
      email: companyData.email || '',
      phone: companyData.phone || ''
    },
    // Datos del receptor (el cliente)
    recipient: {
      rnc: invoice.rnc,
      name: invoice.client,
      address: invoice.address || '',
      email: invoice.email || '',
      phone: invoice.phone || ''
    },
    // Detalles de los items
    items: invoice.items.map((item, index) => ({
      id: (index + 1).toString(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.price,
      taxRate: item.tax || 18,
      taxAmount: (item.quantity * item.price * (item.tax / 100)),
      subtotal: (item.quantity * item.price),
      total: (item.quantity * item.price) + (item.quantity * item.price * (item.tax / 100))
    })),
    // Totales
    totals: {
      subtotal: invoice.subtotal,
      taxTotal: invoice.tax,
      grandTotal: invoice.total
    },
    // Metadatos
    metadata: {
      createdAt: currentDate,
      updatedAt: currentDate,
      version: '1.0'
    }
  };
};

/**
 * Crea una nueva factura electrónica
 * @param {Object} invoiceData - Datos de la factura
 * @returns {Promise<Object>} Factura creada
 */
export const createInvoice = async (invoiceData) => {
  try {
    // Validar datos de la factura
    const validation = validateInvoice(invoiceData);
    
    if (!validation.isValid) {
      throw new Error('Datos de factura inválidos: ' + JSON.stringify(validation.errors));
    }
    
    // Verificar si hay certificado digital configurado
    const certificateExists = await hasCertificate();
    
    if (!certificateExists) {
      throw new Error('No hay certificado digital configurado. Configure un certificado en la sección de configuración de e-CF.');
    }
    
    // Cargar configuración de e-CF
    const ecfConfig = await loadECFConfig();
    
    // Cargar datos de la empresa
    const companyDoc = await getDoc(doc(db, 'settings', 'company'));
    
    if (!companyDoc.exists()) {
      throw new Error('No hay datos de empresa configurados. Configure los datos de la empresa en la sección de configuración.');
    }
    
    const companyData = companyDoc.data();
    
    // Generar NCF
    const ncf = await generateInvoiceNCF();
    
    // Preparar datos de la factura
    const invoice = {
      ...invoiceData,
      ncf,
      status: 'pendiente', // pendiente, enviada, aceptada, rechazada
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Guardar factura en Firestore
    const invoiceRef = doc(collection(db, 'invoices'));
    await setDoc(invoiceRef, invoice);
    
    // Si está configurado el envío automático a la DGII
    if (ecfConfig.autoSendToDGII) {
      // Preparar datos para la DGII
      const dgiiData = prepareInvoiceForDGII(
        { ...invoice, id: invoiceRef.id },
        companyData
      );
      
      // Llamar a Cloud Function para enviar a la DGII
      const sendInvoiceToDGII = httpsCallable(functions, 'sendInvoiceToDGII');
      const result = await sendInvoiceToDGII({ 
        invoiceId: invoiceRef.id,
        invoiceData: dgiiData
      });
      
      if (result.data && result.data.success) {
        // Actualizar estado de la factura
        await updateDoc(invoiceRef, {
          status: 'enviada',
          trackId: result.data.trackId,
          dgiiSubmissionDate: new Date(),
          dgiiResponse: result.data
        });
        
        return {
          id: invoiceRef.id,
          ...invoice,
          status: 'enviada',
          trackId: result.data.trackId,
          dgiiSubmissionDate: new Date(),
          dgiiResponse: result.data
        };
      }
    }
    
    return {
      id: invoiceRef.id,
      ...invoice
    };
  } catch (error) {
    console.error('Error al crear factura:', error);
    throw error;
  }
};

/**
 * Envía una factura existente a la DGII
 * @param {string} invoiceId - ID de la factura
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendInvoiceToDGII = async (invoiceId) => {
  try {
    // Obtener datos de la factura
    const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
    
    if (!invoiceDoc.exists()) {
      throw new Error('Factura no encontrada');
    }
    
    const invoice = {
      id: invoiceDoc.id,
      ...invoiceDoc.data()
    };
    
    // Verificar si la factura ya fue enviada
    if (invoice.status !== 'pendiente') {
      throw new Error(`La factura ya ha sido ${invoice.status === 'enviada' ? 'enviada' : invoice.status}`);
    }
    
    // Cargar datos de la empresa
    const companyDoc = await getDoc(doc(db, 'settings', 'company'));
    
    if (!companyDoc.exists()) {
      throw new Error('No hay datos de empresa configurados');
    }
    
    const companyData = companyDoc.data();
    
    // Preparar datos para la DGII
    const dgiiData = prepareInvoiceForDGII(invoice, companyData);
    
    // Llamar a Cloud Function para enviar a la DGII
    const sendToDGII = httpsCallable(functions, 'sendInvoiceToDGII');
    const result = await sendToDGII({ 
      invoiceId,
      invoiceData: dgiiData
    });
    
    if (result.data && result.data.success) {
      // Actualizar estado de la factura
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'enviada',
        trackId: result.data.trackId,
        dgiiSubmissionDate: new Date(),
        dgiiResponse: result.data
      });
      
      return {
        success: true,
        trackId: result.data.trackId,
        message: 'Factura enviada correctamente a la DGII'
      };
    } else {
      throw new Error(result.data?.error || 'Error al enviar factura a la DGII');
    }
  } catch (error) {
    console.error('Error al enviar factura a la DGII:', error);
    throw error;
  }
};

/**
 * Verifica el estado de una factura en la DGII
 * @param {string} invoiceId - ID de la factura
 * @returns {Promise<Object>} Estado de la factura
 */
export const checkInvoiceStatus = async (invoiceId) => {
  try {
    // Obtener datos de la factura
    const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
    
    if (!invoiceDoc.exists()) {
      throw new Error('Factura no encontrada');
    }
    
    const invoice = invoiceDoc.data();
    
    // Verificar si la factura tiene trackId
    if (!invoice.trackId) {
      throw new Error('La factura no tiene un TrackID asignado. Debe enviarla primero a la DGII.');
    }
    
    // Llamar a Cloud Function para verificar estado
    const checkStatus = httpsCallable(functions, 'checkInvoiceStatus');
    const result = await checkStatus({ 
      invoiceId,
      trackId: invoice.trackId
    });
    
    if (result.data && result.data.status) {
      // Determinar el nuevo estado
      const newStatus = result.data.status === 'Aceptado' ? 'aceptada' : 
                       result.data.status === 'Rechazado' ? 'rechazada' : 'enviada';
      
      // Actualizar estado de la factura
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: newStatus,
        dgiiStatusDetail: result.data.statusDetail || '',
        dgiiLastCheck: new Date()
      });
      
      return {
        status: result.data.status,
        statusDetail: result.data.statusDetail,
        lastCheck: new Date()
      };
    } else {
      throw new Error(result.data?.error || 'No se pudo verificar el estado');
    }
  } catch (error) {
    console.error('Error al verificar estado de factura:', error);
    throw error;
  }
};

/**
 * Genera un PDF para una factura
 * @param {string} invoiceId - ID de la factura
 * @returns {Promise<string>} URL del PDF generado
 */
export const generateInvoicePDF = async (invoiceId) => {
  try {
    // Llamar a Cloud Function para generar PDF
    const generatePDF = httpsCallable(functions, 'generateInvoicePDF');
    const result = await generatePDF({ invoiceId });
    
    if (result.data && result.data.pdfUrl) {
      // Actualizar la factura con la URL del PDF
      await updateDoc(doc(db, 'invoices', invoiceId), {
        pdfUrl: result.data.pdfUrl
      });
      
      return result.data.pdfUrl;
    } else {
      throw new Error(result.data?.error || 'No se pudo generar el PDF');
    }
  } catch (error) {
    console.error('Error al generar PDF de factura:', error);
    throw error;
  }
};

/**
 * Envía una factura por correo electrónico
 * @param {string} invoiceId - ID de la factura
 * @param {string} email - Correo electrónico opcional (si no se proporciona, se usa el del cliente)
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendInvoiceByEmail = async (invoiceId, email = null) => {
  try {
    // Llamar a Cloud Function para enviar correo
    const sendEmail = httpsCallable(functions, 'sendInvoiceEmail');
    const result = await sendEmail({ 
      invoiceId,
      email
    });
    
    if (result.data && result.data.success) {
      // Actualizar la factura con información del envío
      await updateDoc(doc(db, 'invoices', invoiceId), {
        emailSent: true,
        emailSentDate: new Date(),
        emailSentTo: email
      });
      
      return {
        success: true,
        message: 'Factura enviada por correo correctamente'
      };
    } else {
      throw new Error(result.data?.error || 'No se pudo enviar el correo');
    }
  } catch (error) {
    console.error('Error al enviar factura por correo:', error);
    throw error;
  }
};

/**
 * Busca facturas por diferentes criterios
 * @param {Object} filters - Filtros a aplicar
 * @returns {Promise<Array>} Facturas encontradas
 */
export const searchInvoices = async (filters = {}) => {
  try {
    let q = collection(db, 'invoices');
    
    // Aplicar filtros
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters.client) {
      q = query(q, where('client', '==', filters.client));
    }
    
    if (filters.rnc) {
      q = query(q, where('rnc', '==', filters.rnc));
    }
    
    if (filters.trackId) {
      q = query(q, where('trackId', '==', filters.trackId));
    }
    
    // Ejecutar consulta
    const querySnapshot = await getDocs(q);
    
    // Procesar resultados
    const invoices = [];
    querySnapshot.forEach((doc) => {
      invoices.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return invoices;
  } catch (error) {
    console.error('Error al buscar facturas:', error);
    throw error;
  }
};
