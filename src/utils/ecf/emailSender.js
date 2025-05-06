/**
 * Utilidades para el envío de facturas electrónicas por correo electrónico
 */

import { functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Envía una factura electrónica por correo electrónico
 * @param {String} invoiceId - ID de la factura en Firestore
 * @param {String} recipientEmail - Correo electrónico del destinatario
 * @param {String} subject - Asunto del correo (opcional)
 * @param {String} message - Mensaje personalizado (opcional)
 * @returns {Promise<Object>} - Resultado del envío
 */
export const sendInvoiceByEmail = async (invoiceId, recipientEmail, subject = '', message = '') => {
  try {
    // Verificar parámetros requeridos
    if (!invoiceId || !recipientEmail) {
      throw new Error('Se requiere ID de factura y correo del destinatario.');
    }
    
    // Llamar a la función de Cloud Functions
    const sendEmail = httpsCallable(functions, 'sendInvoiceEmail');
    const result = await sendEmail({
      invoiceId,
      recipientEmail,
      subject,
      message
    });
    
    return result.data;
  } catch (error) {
    console.error('Error al enviar la factura por correo electrónico:', error);
    throw new Error('No se pudo enviar la factura por correo electrónico: ' + error.message);
  }
};

/**
 * Genera un asunto predeterminado para el correo electrónico
 * @param {Object} invoice - Datos de la factura
 * @param {Object} company - Datos de la empresa emisora
 * @returns {String} - Asunto del correo electrónico
 */
export const generateEmailSubject = (invoice, company) => {
  return `Factura Electrónica (e-CF) #${invoice.invoiceNumber} - ${company.name}`;
};

/**
 * Genera un cuerpo predeterminado para el correo electrónico
 * @param {Object} invoice - Datos de la factura
 * @param {Object} company - Datos de la empresa emisora
 * @param {Object} client - Datos del cliente
 * @returns {String} - Cuerpo del correo electrónico
 */
export const generateEmailBody = (invoice, company, client) => {
  const date = invoice.date instanceof Date 
    ? invoice.date.toLocaleDateString('es-DO') 
    : new Date().toLocaleDateString('es-DO');
  
  const total = typeof invoice.total === 'number' 
    ? invoice.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })
    : invoice.items?.reduce((sum, item) => sum + (item.quantity * item.price * (1 + (item.tax / 100 || 0.18))), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00';
  
  return `Estimado/a ${client.name},

Adjunto encontrará la Factura Electrónica (e-CF) #${invoice.invoiceNumber} por un monto de RD$ ${total}, emitida el ${date}.

Este documento cumple con los requisitos establecidos por la DGII según la Ley 32-23 de Facturación Electrónica.

Para cualquier consulta relacionada con esta factura, no dude en contactarnos:
Teléfono: ${company.phone || 'N/A'}
Correo: ${company.email || 'N/A'}

Atentamente,
${company.name}
RNC: ${company.rnc}`;
};
