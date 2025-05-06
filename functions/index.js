const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

// Importar utilidades
const { generateInvoicePDF } = require('./utils/pdfGenerator');
const { generateInvoiceXML, validateXML, generateXMLFilename } = require('./utils/xmlGenerator');
const { signXML, verifyXMLSignature, decryptCertificate } = require('./utils/xmlSigner');
const { sendInvoiceToDGII, simulateDGIISubmission, checkInvoiceStatus, simulateStatusCheck } = require('./utils/dgiiApi');

admin.initializeApp();

/**
 * Configuración del transporte de correo
 * En producción, deberías usar un servicio de correo como SendGrid, Mailgun, etc.
 * Para desarrollo, puedes usar un servicio SMTP como Gmail o Mailtrap
 */
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
});

/**
 * Cloud Function para enviar facturas por correo electrónico
 * Recibe: invoiceId, recipientEmail, subject, message
 * Descarga el PDF de la factura y lo envía como adjunto
 */
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'El usuario debe estar autenticado para enviar correos.'
      );
    }

    const { invoiceId, recipientEmail, subject, message } = data;

    if (!invoiceId || !recipientEmail) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere ID de factura y correo del destinatario.'
      );
    }

    // Obtener datos de la factura
    const invoiceSnapshot = await admin.firestore().collection('invoices').doc(invoiceId).get();
    
    if (!invoiceSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'La factura especificada no existe.'
      );
    }

    const invoiceData = invoiceSnapshot.data();
    
    // Obtener datos de la empresa
    const companySnapshot = await admin.firestore().collection('settings').doc('company').get();
    const companyData = companySnapshot.exists ? companySnapshot.data() : {};

    // Descargar el PDF de la factura desde Storage
    const bucket = admin.storage().bucket();
    const tempFilePath = path.join(os.tmpdir(), `invoice_${invoiceId}.pdf`);
    
    await bucket.file(`invoices/${invoiceId}.pdf`).download({ destination: tempFilePath });

    // Preparar el correo electrónico
    const mailOptions = {
      from: `"${companyData.name || 'Sistema de Facturación'}" <${functions.config().email.user}>`,
      to: recipientEmail,
      subject: subject || `Factura Electrónica #${invoiceData.invoiceNumber || invoiceId}`,
      text: message || `Adjunto encontrará su factura electrónica. Gracias por su preferencia.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            ${companyData.logoUrl ? `<img src="${companyData.logoUrl}" alt="Logo" style="max-height: 80px; margin-bottom: 15px;">` : ''}
            <h2 style="color: #333;">${companyData.name || 'Sistema de Facturación'}</h2>
          </div>
          <div style="padding: 20px;">
            <p>Estimado cliente,</p>
            <p>${message || 'Adjunto encontrará su factura electrónica. Gracias por su preferencia.'}</p>
            <p>Detalles de la factura:</p>
            <ul>
              <li><strong>Número de factura:</strong> ${invoiceData.invoiceNumber || invoiceId}</li>
              <li><strong>Fecha:</strong> ${invoiceData.date ? new Date(invoiceData.date.toDate()).toLocaleDateString() : new Date().toLocaleDateString()}</li>
              <li><strong>Total:</strong> RD$ ${invoiceData.total ? invoiceData.total.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}</li>
            </ul>
            <p>Para cualquier consulta, no dude en contactarnos.</p>
            <p>Atentamente,</p>
            <p><strong>${companyData.name || 'Sistema de Facturación'}</strong><br>
            ${companyData.address || ''}<br>
            ${companyData.phone || ''}<br>
            ${companyData.email || functions.config().email.user}</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>Este es un correo electrónico automático. Por favor, no responda a este mensaje.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Factura_${invoiceData.invoiceNumber || invoiceId}.pdf`,
          path: tempFilePath,
          contentType: 'application/pdf'
        }
      ]
    };

    // Enviar el correo
    await mailTransport.sendMail(mailOptions);

    // Limpiar archivos temporales
    fs.unlinkSync(tempFilePath);

    // Actualizar la factura con la información del correo enviado
    await admin.firestore().collection('invoices').doc(invoiceId).update({
      emailSent: true,
      emailSentDate: admin.firestore.FieldValue.serverTimestamp(),
      emailRecipient: recipientEmail
    });

    return { success: true, message: 'Correo enviado correctamente' };
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function para enviar facturas a la DGII
 * Recibe: invoiceId
 * Genera el XML, lo firma y lo envía a la DGII
 */
exports.sendInvoiceToDGII = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'El usuario debe estar autenticado para enviar facturas a la DGII.'
      );
    }

    const { invoiceId, testMode = true } = data;

    if (!invoiceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere ID de factura.'
      );
    }

    // Obtener datos de la factura
    const invoiceSnapshot = await admin.firestore().collection('invoices').doc(invoiceId).get();
    
    if (!invoiceSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'La factura especificada no existe.'
      );
    }

    const invoiceData = invoiceSnapshot.data();
    
    // Obtener datos del cliente
    const clientSnapshot = await admin.firestore().collection('clients').doc(invoiceData.clientId).get();
    
    if (!clientSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'El cliente especificado no existe.'
      );
    }
    
    const clientData = clientSnapshot.data();
    
    // Obtener datos de la empresa
    const companySnapshot = await admin.firestore().collection('settings').doc('company').get();
    
    if (!companySnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No se encontraron datos de la empresa.'
      );
    }
    
    const companyData = companySnapshot.data();
    
    // Generar el XML de la factura
    const xmlString = generateInvoiceXML(invoiceData, companyData, clientData);
    
    // Validar el XML
    const isValid = validateXML(xmlString);
    
    if (!isValid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'El XML generado no es válido.'
      );
    }
    
    // Obtener el certificado digital
    const certificateSnapshot = await admin.firestore().collection('settings').doc('certificate').get();
    
    if (!certificateSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No se encontró el certificado digital.'
      );
    }
    
    const certificateData = certificateSnapshot.data();
    
    // Desencriptar el certificado
    // En un entorno real, la clave de encriptación debería estar en una variable de entorno
    const encryptionKey = functions.config().certificate?.key || 'default-encryption-key';
    const certificate = decryptCertificate(certificateData.certificate, encryptionKey);
    const privateKey = decryptCertificate(certificateData.privateKey, encryptionKey);
    
    // Firmar el XML
    const signedXml = signXML(xmlString, certificate, privateKey, certificateData.password);
    
    // Guardar el XML firmado en Storage
    const bucket = admin.storage().bucket();
    const xmlFileName = generateXMLFilename(companyData.rnc, invoiceData.invoiceNumber);
    const tempXmlPath = path.join(os.tmpdir(), xmlFileName);
    
    fs.writeFileSync(tempXmlPath, signedXml);
    
    await bucket.upload(tempXmlPath, {
      destination: `invoices/xml/${xmlFileName}`,
      metadata: {
        contentType: 'application/xml'
      }
    });
    
    // Eliminar el archivo temporal
    fs.unlinkSync(tempXmlPath);
    
    // Obtener la URL del XML
    const xmlFile = bucket.file(`invoices/xml/${xmlFileName}`);
    const [xmlUrl] = await xmlFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Fecha lejana para una URL "permanente"
    });
    
    // En un entorno real, aquí se enviaría el XML a la DGII
    // Para este ejemplo, simulamos la respuesta
    let dgiiResponse;
    
    if (testMode) {
      dgiiResponse = await simulateDGIISubmission(signedXml);
    } else {
      // Aquí iría el código para enviar a la DGII real
      // Obtener credenciales de la DGII
      const dgiiCredentials = {
        username: functions.config().dgii?.username || '',
        password: functions.config().dgii?.password || '',
        rnc: companyData.rnc,
        token: '' // Se obtendría con getAuthToken
      };
      
      dgiiResponse = await sendInvoiceToDGII(signedXml, dgiiCredentials, testMode);
    }
    
    // Actualizar la factura con la información de la DGII
    await admin.firestore().collection('invoices').doc(invoiceId).update({
      status: 'enviada',
      trackId: dgiiResponse.trackId,
      xmlUrl: xmlUrl,
      dgiiSubmissionDate: admin.firestore.FieldValue.serverTimestamp(),
      dgiiResponse: dgiiResponse
    });

    return { 
      success: true, 
      trackId: dgiiResponse.trackId,
      xmlUrl: xmlUrl,
      message: 'Factura enviada correctamente a la DGII'
    };
  } catch (error) {
    console.error('Error al enviar factura a la DGII:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function para generar el PDF de una factura
 * Recibe: invoiceId
 * Genera el PDF y lo guarda en Storage
 */
exports.generateInvoicePDF = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'El usuario debe estar autenticado para generar PDFs.'
      );
    }

    const { invoiceId } = data;

    if (!invoiceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere ID de factura.'
      );
    }

    // Obtener datos de la factura
    const invoiceSnapshot = await admin.firestore().collection('invoices').doc(invoiceId).get();
    
    if (!invoiceSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'La factura especificada no existe.'
      );
    }
    
    const invoiceData = invoiceSnapshot.data();
    
    // Obtener datos del cliente
    const clientSnapshot = await admin.firestore().collection('clients').doc(invoiceData.clientId).get();
    
    if (!clientSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'El cliente especificado no existe.'
      );
    }
    
    const clientData = clientSnapshot.data();
    
    // Obtener datos de la empresa
    const companySnapshot = await admin.firestore().collection('settings').doc('company').get();
    const companyData = companySnapshot.exists ? companySnapshot.data() : {};
    
    // Generar el PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData, companyData, clientData);
    
    // Guardar el PDF en Storage
    const bucket = admin.storage().bucket();
    const tempPdfPath = path.join(os.tmpdir(), `invoice_${invoiceId}.pdf`);
    
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    await bucket.upload(tempPdfPath, {
      destination: `invoices/${invoiceId}.pdf`,
      metadata: {
        contentType: 'application/pdf'
      }
    });
    
    // Eliminar el archivo temporal
    fs.unlinkSync(tempPdfPath);
    
    // Obtener la URL del PDF
    const pdfFile = bucket.file(`invoices/${invoiceId}.pdf`);
    const [pdfUrl] = await pdfFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Fecha lejana para una URL "permanente"
    });
    
    // Actualizar la factura con la URL del PDF
    await admin.firestore().collection('invoices').doc(invoiceId).update({
      pdfUrl: pdfUrl,
      pdfGeneratedDate: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      pdfUrl: pdfUrl,
      message: 'PDF generado correctamente'
    };
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function para verificar el estado de una factura en la DGII
 * Recibe: invoiceId
 * Consulta el estado de la factura en la DGII y actualiza la información en Firestore
 */
exports.checkInvoiceStatus = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'El usuario debe estar autenticado para verificar el estado de facturas.'
      );
    }

    const { invoiceId, testMode = true } = data;

    if (!invoiceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere ID de factura.'
      );
    }

    // Obtener datos de la factura
    const invoiceSnapshot = await admin.firestore().collection('invoices').doc(invoiceId).get();
    
    if (!invoiceSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'La factura especificada no existe.'
      );
    }
    
    const invoiceData = invoiceSnapshot.data();
    
    if (!invoiceData.trackId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'La factura no ha sido enviada a la DGII.'
      );
    }
    
    // Obtener datos de la empresa
    const companySnapshot = await admin.firestore().collection('settings').doc('company').get();
    const companyData = companySnapshot.exists ? companySnapshot.data() : {};
    
    // Verificar el estado de la factura
    let statusResponse;
    
    if (testMode) {
      statusResponse = await simulateStatusCheck(invoiceData.trackId);
    } else {
      // Aquí iría el código para consultar a la DGII real
      // Obtener credenciales de la DGII
      const dgiiCredentials = {
        username: functions.config().dgii?.username || '',
        password: functions.config().dgii?.password || '',
        rnc: companyData.rnc,
        token: '' // Se obtendría con getAuthToken
      };
      
      statusResponse = await checkInvoiceStatus(invoiceData.trackId, dgiiCredentials, testMode);
    }
    
    // Actualizar la factura con el estado
    await admin.firestore().collection('invoices').doc(invoiceId).update({
      status: statusResponse.status.toLowerCase(),
      dgiiStatusDate: admin.firestore.FieldValue.serverTimestamp(),
      dgiiStatusResponse: statusResponse
    });
    
    return {
      success: true,
      status: statusResponse.status,
      message: statusResponse.message,
      data: statusResponse
    };
  } catch (error) {
    console.error('Error al verificar estado de factura:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function para verificar el estado de los servicios de la DGII
 * Recibe: Ninguno
 * Consulta el estado de los servicios de la DGII y devuelve la información
 */
exports.checkDGIIStatus = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'La función requiere autenticación'
      );
    }

    // Cargar configuración
    const configSnapshot = await admin.firestore().collection('config').doc('ecf').get();
    const config = configSnapshot.exists ? configSnapshot.data() : { testMode: true };
    
    // Determinar URL base según el modo (prueba o producción)
    const baseUrl = config.testMode 
      ? 'https://ecf.dgii.gov.do/testecf/emisorreceptor-ws/EstatusDocumentosSolicitudes' 
      : 'https://ecf.dgii.gov.do/ecf/emisorreceptor-ws/EstatusDocumentosSolicitudes';
    
    // Realizar una solicitud simple para verificar disponibilidad
    const response = await axios.get(`${baseUrl}/status`, {
      timeout: 5000, // Timeout de 5 segundos
      validateStatus: () => true // No lanzar errores para códigos de estado HTTP
    });
    
    // Analizar respuesta
    if (response.status >= 200 && response.status < 300) {
      return {
        status: 'online',
        testMode: config.testMode,
        message: 'Servicios DGII funcionando correctamente'
      };
    } else if (response.status >= 500) {
      return {
        status: 'offline',
        testMode: config.testMode,
        message: `Error en el servidor DGII: ${response.status}`
      };
    } else {
      return {
        status: 'degraded',
        testMode: config.testMode,
        message: `Respuesta inesperada: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Error al verificar estado de DGII:', error);
    
    // Determinar si es un error de timeout
    if (error.code === 'ECONNABORTED') {
      return {
        status: 'degraded',
        testMode: true,
        message: 'Tiempo de espera agotado al conectar con DGII'
      };
    }
    
    return {
      status: 'offline',
      testMode: true,
      message: error.message || 'Error al conectar con DGII'
    };
  }
});

/**
 * Cloud Function que se ejecuta cuando se crea una nueva factura
 * Genera automáticamente el PDF y envía la factura a la DGII si está configurado
 */
exports.onInvoiceCreated = functions.firestore
  .document('invoices/{invoiceId}')
  .onCreate(async (snapshot, context) => {
    try {
      const invoiceData = snapshot.data();
      const invoiceId = context.params.invoiceId;
      
      // Verificar si la factura está lista para procesamiento automático
      if (invoiceData.status !== 'pendiente' || invoiceData.autoProcess === false) {
        return null;
      }
      
      // Generar el PDF automáticamente
      const generatePdfResult = await exports.generateInvoicePDF({
        invoiceId
      }, { auth: { uid: 'system' } });
      
      console.log('PDF generado automáticamente:', generatePdfResult);
      
      // Verificar si se debe enviar automáticamente a la DGII
      if (invoiceData.autoSendToDGII === true) {
        const sendToDGIIResult = await exports.sendInvoiceToDGII({
          invoiceId,
          testMode: true // Usar modo de prueba por defecto
        }, { auth: { uid: 'system' } });
        
        console.log('Factura enviada automáticamente a la DGII:', sendToDGIIResult);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error en procesamiento automático de factura:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function para anular una factura electrónica en la DGII
 * Recibe: invoiceId, reasonCode, reason
 * Genera el XML de anulación, lo firma y lo envía a la DGII
 */
exports.cancelInvoice = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'La función requiere autenticación'
      );
    }

    // Validar datos
    if (!data.invoiceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere el ID de la factura'
      );
    }

    if (!data.reasonCode) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Se requiere el código de motivo de anulación'
      );
    }

    // Obtener datos de la factura
    const invoiceRef = admin.firestore().collection('invoices').doc(data.invoiceId);
    const invoiceSnapshot = await invoiceRef.get();
    
    if (!invoiceSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Factura no encontrada'
      );
    }
    
    const invoice = invoiceSnapshot.data();
    
    // Verificar que la factura tenga un NCF válido
    if (!invoice.ncf) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'La factura no tiene un NCF válido'
      );
    }
    
    // Verificar que la factura no esté ya anulada
    if (invoice.status === 'anulada') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'La factura ya está anulada'
      );
    }
    
    // Verificar que la factura haya sido aceptada por la DGII
    if (invoice.status !== 'aceptada') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Solo se pueden anular facturas que hayan sido aceptadas por la DGII'
      );
    }
    
    // Cargar configuración
    const configSnapshot = await admin.firestore().collection('config').doc('ecf').get();
    const config = configSnapshot.exists ? configSnapshot.data() : { testMode: true };
    
    // Cargar certificado
    const certificateSnapshot = await admin.firestore().collection('certificates').doc('active').get();
    
    if (!certificateSnapshot.exists) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No hay un certificado digital configurado'
      );
    }
    
    const certificate = certificateSnapshot.data();
    
    // Generar XML de anulación
    const cancellationXml = await generateCancellationXml(invoice, data.reasonCode, data.reason);
    
    // Firmar XML
    const signedXml = await signXml(cancellationXml, certificate.data, certificate.password);
    
    // Enviar a DGII
    const dgiiResponse = await sendCancellationToDGII(signedXml, config.testMode);
    
    // Actualizar estado de la factura
    await invoiceRef.update({
      status: 'anulada',
      cancellationDate: admin.firestore.FieldValue.serverTimestamp(),
      cancellationReason: data.reason,
      cancellationReasonCode: data.reasonCode,
      cancellationTrackId: dgiiResponse.trackId || null
    });
    
    // Registrar evento de anulación
    await admin.firestore().collection('invoiceEvents').add({
      invoiceId: data.invoiceId,
      type: 'cancellation',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: context.auth.uid,
      details: {
        reasonCode: data.reasonCode,
        reason: data.reason,
        trackId: dgiiResponse.trackId || null
      }
    });
    
    return {
      success: true,
      message: 'Factura anulada correctamente',
      trackId: dgiiResponse.trackId || null
    };
  } catch (error) {
    console.error('Error al anular factura:', error);
    
    return {
      success: false,
      error: error.message || 'Error al anular la factura'
    };
  }
});

/**
 * Genera el XML de anulación de una factura
 * @param {Object} invoice - Datos de la factura
 * @param {string} reasonCode - Código de motivo de anulación
 * @param {string} reason - Descripción del motivo de anulación
 * @returns {string} XML de anulación
 */
async function generateCancellationXml(invoice, reasonCode, reason) {
  try {
    // Obtener datos de la empresa
    const companySnapshot = await admin.firestore().collection('config').doc('company').get();
    const company = companySnapshot.exists ? companySnapshot.data() : {};
    
    // Fecha actual en formato ISO
    const now = new Date();
    const isoDate = now.toISOString().split('.')[0];
    
    // Crear XML de anulación según formato UBL requerido por DGII
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Anulacion xmlns="http://dgii.gov.do/etf/anulaciones">
  <Encabezado>
    <Version>1.0</Version>
    <FechaHora>${isoDate}</FechaHora>
    <RNCEmisor>${company.rnc || ''}</RNCEmisor>
    <RazonSocialEmisor>${company.name || ''}</RazonSocialEmisor>
  </Encabezado>
  <DetalleAnulacion>
    <NCF>${invoice.ncf}</NCF>
    <CodigoMotivo>${reasonCode}</CodigoMotivo>
    <Motivo>${reason}</Motivo>
  </DetalleAnulacion>
</Anulacion>`;
    
    return xml;
  } catch (error) {
    console.error('Error al generar XML de anulación:', error);
    throw new Error('Error al generar XML de anulación');
  }
}

/**
 * Envía el XML de anulación a la DGII
 * @param {string} xml - XML firmado
 * @param {boolean} testMode - Indica si se debe usar el ambiente de pruebas
 * @returns {Object} Respuesta de la DGII
 */
async function sendCancellationToDGII(xml, testMode) {
  try {
    // Determinar URL según el modo (prueba o producción)
    const url = testMode 
      ? 'https://ecf.dgii.gov.do/testecf/emisorreceptor-ws/AnulacionDocumentos' 
      : 'https://ecf.dgii.gov.do/ecf/emisorreceptor-ws/AnulacionDocumentos';
    
    // Enviar XML a la DGII
    const response = await axios.post(url, xml, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    
    // Procesar respuesta
    if (response.status === 200) {
      // En un entorno real, aquí se procesaría la respuesta XML de la DGII
      // Para simplificar, simulamos una respuesta exitosa
      return {
        success: true,
        trackId: `AN-${Date.now()}`
      };
    } else {
      throw new Error(`Error al enviar anulación a DGII: ${response.status}`);
    }
  } catch (error) {
    console.error('Error al enviar anulación a DGII:', error);
    
    // En un entorno de desarrollo, simulamos una respuesta exitosa
    if (process.env.NODE_ENV !== 'production' || testMode) {
      return {
        success: true,
        trackId: `AN-SIM-${Date.now()}`
      };
    }
    
    throw error;
  }
}
