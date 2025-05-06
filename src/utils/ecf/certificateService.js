/**
 * Servicio para manejar certificados digitales para e-CF
 * Proporciona funciones para cargar, encriptar, desencriptar y validar certificados
 */
import CryptoJS from 'crypto-js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

/**
 * Encripta un certificado digital usando AES
 * @param {ArrayBuffer} buffer - Buffer del archivo de certificado
 * @param {string} encryptionKey - Clave de encriptación
 * @returns {string} Certificado encriptado en formato string
 */
export const encryptCertificate = (buffer, encryptionKey) => {
  if (!encryptionKey) {
    throw new Error('Se requiere una clave de encriptación');
  }
  
  // Generar un IV aleatorio
  const iv = CryptoJS.lib.WordArray.random(16);
  
  // Convertir buffer a WordArray
  const wordArray = CryptoJS.lib.WordArray.create(buffer);
  
  // Encriptar
  const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey, {
    iv: iv
  });
  
  // Devolver IV + contenido encriptado
  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
};

/**
 * Desencripta un certificado digital
 * @param {string} encryptedData - Certificado encriptado
 * @param {string} encryptionKey - Clave de encriptación
 * @returns {ArrayBuffer} Buffer del certificado desencriptado
 */
export const decryptCertificate = (encryptedData, encryptionKey) => {
  if (!encryptionKey) {
    throw new Error('Se requiere una clave de encriptación');
  }
  
  // Separar IV y datos encriptados
  const [ivHex, encryptedContent] = encryptedData.split(':');
  
  if (!ivHex || !encryptedContent) {
    throw new Error('Formato de datos encriptados inválido');
  }
  
  // Convertir IV de hex a WordArray
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  
  // Desencriptar
  const decrypted = CryptoJS.AES.decrypt(encryptedContent, encryptionKey, {
    iv: iv
  });
  
  // Convertir WordArray a ArrayBuffer
  const arrayBuffer = wordArrayToArrayBuffer(decrypted);
  
  return arrayBuffer;
};

/**
 * Convierte un WordArray de CryptoJS a ArrayBuffer
 * @param {CryptoJS.lib.WordArray} wordArray - WordArray de CryptoJS
 * @returns {ArrayBuffer} ArrayBuffer resultante
 */
const wordArrayToArrayBuffer = (wordArray) => {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  
  const u8 = new Uint8Array(sigBytes);
  
  for (let i = 0; i < sigBytes; i++) {
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    u8[i] = byte;
  }
  
  return u8.buffer;
};

/**
 * Carga la configuración de e-CF desde Firestore
 * @returns {Promise<Object>} Configuración de e-CF
 */
export const loadECFConfig = async () => {
  try {
    // Cargar configuración de e-CF
    const ecfDoc = await getDoc(doc(db, 'settings', 'ecf'));
    
    if (ecfDoc.exists()) {
      return ecfDoc.data();
    }
    
    return {
      testMode: true, // Por defecto en modo de prueba
      autoSendToDGII: false
    };
  } catch (error) {
    console.error('Error al cargar configuración de e-CF:', error);
    throw error;
  }
};

/**
 * Carga el certificado digital desde Firestore
 * @param {string} encryptionKey - Clave para desencriptar el certificado
 * @returns {Promise<Object>} Certificado y su información
 */
export const loadCertificate = async (encryptionKey) => {
  try {
    // Cargar certificado
    const certificateDoc = await getDoc(doc(db, 'settings', 'certificate'));
    
    if (!certificateDoc.exists()) {
      throw new Error('No se encontró un certificado digital');
    }
    
    const certificateData = certificateDoc.data();
    
    // Desencriptar certificado
    const decryptedCertificate = decryptCertificate(
      certificateData.certificate,
      encryptionKey
    );
    
    // Desencriptar clave privada
    const decryptedPrivateKey = decryptCertificate(
      certificateData.privateKey,
      encryptionKey
    );
    
    return {
      certificate: decryptedCertificate,
      privateKey: decryptedPrivateKey,
      password: certificateData.password,
      info: {
        issuer: certificateData.issuer,
        validUntil: certificateData.validUntil,
        subject: certificateData.subject
      }
    };
  } catch (error) {
    console.error('Error al cargar certificado digital:', error);
    throw error;
  }
};

/**
 * Verifica si existe un certificado digital configurado
 * @returns {Promise<boolean>} True si existe un certificado
 */
export const hasCertificate = async () => {
  try {
    const certificateDoc = await getDoc(doc(db, 'settings', 'certificate'));
    return certificateDoc.exists();
  } catch (error) {
    console.error('Error al verificar certificado:', error);
    return false;
  }
};

/**
 * Guarda la configuración de e-CF en Firestore
 * @param {Object} config - Configuración de e-CF
 * @returns {Promise<void>}
 */
export const saveECFConfig = async (config) => {
  try {
    await setDoc(doc(db, 'settings', 'ecf'), config);
  } catch (error) {
    console.error('Error al guardar configuración de e-CF:', error);
    throw error;
  }
};

/**
 * Guarda un certificado digital en Firestore
 * @param {ArrayBuffer} certificateBuffer - Buffer del certificado
 * @param {string} password - Contraseña del certificado
 * @param {string} encryptionKey - Clave de encriptación
 * @param {Object} info - Información adicional del certificado
 * @returns {Promise<void>}
 */
export const saveCertificate = async (certificateBuffer, password, encryptionKey, info) => {
  try {
    // Encriptar certificado
    const encryptedCertificate = encryptCertificate(certificateBuffer, encryptionKey);
    
    // En un caso real, la clave privada sería extraída del certificado
    // Para este ejemplo, usamos el mismo buffer
    const encryptedPrivateKey = encryptCertificate(certificateBuffer, encryptionKey);
    
    // Guardar en Firestore
    await setDoc(doc(db, 'settings', 'certificate'), {
      certificate: encryptedCertificate,
      privateKey: encryptedPrivateKey,
      password,
      ...info
    });
  } catch (error) {
    console.error('Error al guardar certificado digital:', error);
    throw error;
  }
};
