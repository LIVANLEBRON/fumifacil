/**
 * Utilidades para crear certificados digitales falsos para desarrollo
 * IMPORTANTE: Este módulo solo debe usarse en entornos de desarrollo
 */
import { saveCertificate, saveECFConfig } from './certificateService';
import CryptoJS from 'crypto-js';

/**
 * Genera un buffer aleatorio que simula un certificado digital
 * @param {number} size - Tamaño del buffer en bytes
 * @returns {ArrayBuffer} - Buffer aleatorio
 */
const generateRandomBuffer = (size = 1024) => {
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr.buffer;
};

/**
 * Crea y guarda un certificado digital falso para desarrollo
 * @returns {Promise<void>}
 */
export const createMockCertificate = async () => {
  try {
    // Generar datos aleatorios para el certificado
    const certificateBuffer = generateRandomBuffer(2048);
    
    // Clave de encriptación simple para desarrollo
    const encryptionKey = 'CLAVE_DESARROLLO_TEMPORAL';
    
    // Contraseña del certificado falso
    const password = 'password123';
    
    // Información del certificado falso
    const certificateInfo = {
      issuer: 'Entidad Certificadora de Prueba',
      subject: 'Certificado de Desarrollo',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Válido por 1 año
      serialNumber: CryptoJS.lib.WordArray.random(16).toString(),
      type: 'DESARROLLO'
    };
    
    // Guardar el certificado falso
    await saveCertificate(certificateBuffer, password, encryptionKey, certificateInfo);
    
    // Guardar configuración e-CF básica
    await saveECFConfig({
      rnc: '123456789',
      razonSocial: 'Empresa de Prueba',
      nombreComercial: 'Empresa de Prueba',
      ambiente: 'DESARROLLO',
      tipoComprobante: '31', // Factura de Crédito Fiscal Electrónica
      sucursal: '1',
      punto: '1'
    });
    
    console.log('Certificado de desarrollo creado exitosamente');
    return true;
  } catch (error) {
    console.error('Error al crear certificado de desarrollo:', error);
    throw error;
  }
};

/**
 * Verifica si el certificado actual es un certificado de desarrollo
 * @param {Object} certificateInfo - Información del certificado
 * @returns {boolean} - True si es un certificado de desarrollo
 */
export const isDevelopmentCertificate = (certificateInfo) => {
  return certificateInfo && certificateInfo.type === 'DESARROLLO';
};
