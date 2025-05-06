/**
 * Utilidad para la comunicación con la API de la DGII
 * Implementa los endpoints requeridos para el envío de e-CF según la Ley 32-23
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// URLs de la API de la DGII (estos son ejemplos, deben ser reemplazados por las URLs reales)
const DGII_API_BASE_URL = 'https://api.dgii.gov.do/ecf'; // URL de ejemplo
const DGII_API_TEST_URL = 'https://test-api.dgii.gov.do/ecf'; // URL de pruebas

/**
 * Envía una factura electrónica a la DGII
 * @param {string} xmlString - Documento XML firmado
 * @param {Object} credentials - Credenciales de autenticación
 * @param {boolean} testMode - Si es true, usa el entorno de pruebas
 * @returns {Promise<Object>} - Respuesta de la DGII
 */
async function sendInvoiceToDGII(xmlString, credentials, testMode = false) {
  try {
    // Determinar la URL base según el modo
    const baseUrl = testMode ? DGII_API_TEST_URL : DGII_API_BASE_URL;
    
    // Configurar headers de autenticación
    const headers = {
      'Content-Type': 'application/xml',
      'Authorization': `Bearer ${credentials.token}`,
      'X-DGII-RNC': credentials.rnc
    };
    
    // Enviar la factura a la DGII
    const response = await axios.post(
      `${baseUrl}/recepcion`,
      xmlString,
      { headers }
    );
    
    // Verificar la respuesta
    if (response.status === 200 || response.status === 202) {
      return {
        success: true,
        trackId: response.data.trackId || '',
        message: response.data.message || 'Factura recibida correctamente',
        data: response.data
      };
    } else {
      throw new Error(`Error al enviar factura: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error al enviar factura a la DGII:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Obtiene un token de autenticación de la DGII
 * @param {Object} credentials - Credenciales de autenticación
 * @param {boolean} testMode - Si es true, usa el entorno de pruebas
 * @returns {Promise<string>} - Token de autenticación
 */
async function getAuthToken(credentials, testMode = false) {
  try {
    // Determinar la URL base según el modo
    const baseUrl = testMode ? DGII_API_TEST_URL : DGII_API_BASE_URL;
    
    // Configurar headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Enviar solicitud de autenticación
    const response = await axios.post(
      `${baseUrl}/auth/token`,
      {
        username: credentials.username,
        password: credentials.password,
        rnc: credentials.rnc
      },
      { headers }
    );
    
    // Verificar la respuesta
    if (response.status === 200 && response.data.token) {
      return response.data.token;
    } else {
      throw new Error('No se pudo obtener el token de autenticación');
    }
  } catch (error) {
    console.error('Error al obtener token de autenticación:', error);
    throw error;
  }
}

/**
 * Consulta el estado de una factura enviada a la DGII
 * @param {string} trackId - ID de seguimiento de la factura
 * @param {Object} credentials - Credenciales de autenticación
 * @param {boolean} testMode - Si es true, usa el entorno de pruebas
 * @returns {Promise<Object>} - Estado de la factura
 */
async function checkInvoiceStatus(trackId, credentials, testMode = false) {
  try {
    // Determinar la URL base según el modo
    const baseUrl = testMode ? DGII_API_TEST_URL : DGII_API_BASE_URL;
    
    // Configurar headers de autenticación
    const headers = {
      'Authorization': `Bearer ${credentials.token}`,
      'X-DGII-RNC': credentials.rnc
    };
    
    // Consultar el estado de la factura
    const response = await axios.get(
      `${baseUrl}/consulta/${trackId}`,
      { headers }
    );
    
    // Verificar la respuesta
    if (response.status === 200) {
      return {
        success: true,
        status: response.data.status || 'PENDIENTE',
        message: response.data.message || '',
        data: response.data
      };
    } else {
      throw new Error(`Error al consultar estado: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error al consultar estado de factura:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Simula el envío de una factura a la DGII (para desarrollo)
 * @param {string} xmlString - Documento XML firmado
 * @returns {Object} - Respuesta simulada
 */
function simulateDGIISubmission(xmlString) {
  // Generar un TrackID único
  const trackId = `DGII-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Simular un retraso de red
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        trackId: trackId,
        message: 'Factura recibida correctamente (simulación)',
        status: 'RECIBIDO'
      });
    }, 1500);
  });
}

/**
 * Simula la consulta de estado de una factura (para desarrollo)
 * @param {string} trackId - ID de seguimiento de la factura
 * @returns {Object} - Estado simulado
 */
function simulateStatusCheck(trackId) {
  // Determinar un estado aleatorio
  const statuses = ['RECIBIDO', 'PROCESANDO', 'ACEPTADO', 'RECHAZADO'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  // Simular un retraso de red
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        trackId: trackId,
        status: randomStatus,
        message: `Factura en estado ${randomStatus} (simulación)`
      });
    }, 1000);
  });
}

module.exports = {
  sendInvoiceToDGII,
  getAuthToken,
  checkInvoiceStatus,
  simulateDGIISubmission,
  simulateStatusCheck
};
