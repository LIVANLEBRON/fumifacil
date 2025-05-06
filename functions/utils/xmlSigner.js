/**
 * Utilidad para firmar digitalmente documentos XML
 * Implementa la firma digital requerida por la DGII para los e-CF
 */

const { SignedXml } = require('xml-crypto');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Firma un documento XML utilizando un certificado digital
 * @param {string} xmlString - Documento XML a firmar
 * @param {Buffer|string} certificate - Certificado digital en formato PEM
 * @param {Buffer|string} privateKey - Clave privada en formato PEM
 * @param {string} password - Contraseña del certificado (si aplica)
 * @returns {string} - Documento XML firmado
 */
function signXML(xmlString, certificate, privateKey, password = '') {
  try {
    // Crear instancia de SignedXml
    const sig = new SignedXml();
    
    // Configurar la firma según los requisitos de la DGII
    sig.signingKey = privateKey;
    sig.keyInfoProvider = {
      getKeyInfo: () => {
        return `<X509Data><X509Certificate>${certificate.toString('base64')}</X509Certificate></X509Data>`;
      }
    };
    
    // Configurar la referencia al documento
    sig.addReference(
      "//*[local-name(.)='ECF']",
      [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#'
      ],
      'http://www.w3.org/2001/04/xmlenc#sha256'
    );
    
    // Configurar el algoritmo de canonicalización
    sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    
    // Configurar el algoritmo de firma
    sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    
    // Firmar el documento
    sig.computeSignature(xmlString);
    
    // Obtener el documento firmado
    return sig.getSignedXml();
  } catch (error) {
    console.error('Error al firmar XML:', error);
    throw error;
  }
}

/**
 * Verifica la firma de un documento XML
 * @param {string} signedXmlString - Documento XML firmado
 * @param {Buffer|string} certificate - Certificado digital en formato PEM
 * @returns {boolean} - True si la firma es válida
 */
function verifyXMLSignature(signedXmlString, certificate) {
  try {
    // Extraer la firma del documento
    const doc = new DOMParser().parseFromString(signedXmlString);
    const signature = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0];
    
    // Crear instancia de SignedXml
    const sig = new SignedXml();
    
    // Cargar la firma
    sig.loadSignature(signature);
    
    // Verificar la firma
    return sig.checkSignature(signedXmlString);
  } catch (error) {
    console.error('Error al verificar firma XML:', error);
    return false;
  }
}

/**
 * Carga un certificado desde un archivo
 * @param {string} certPath - Ruta al archivo del certificado
 * @param {string} password - Contraseña del certificado (si aplica)
 * @returns {Object} - Objeto con el certificado y la clave privada
 */
function loadCertificateFromFile(certPath, password = '') {
  try {
    // Leer el archivo del certificado
    const certBuffer = fs.readFileSync(certPath);
    
    // Extraer el certificado y la clave privada
    // Esta implementación depende del formato del certificado
    // Para un certificado PFX/P12, se necesitaría una biblioteca adicional
    
    return {
      certificate: certBuffer,
      privateKey: certBuffer // En un caso real, esto sería diferente
    };
  } catch (error) {
    console.error('Error al cargar certificado:', error);
    throw error;
  }
}

/**
 * Encripta un certificado para almacenamiento seguro
 * @param {Buffer} certBuffer - Buffer del certificado
 * @param {string} encryptionKey - Clave de encriptación
 * @returns {string} - Certificado encriptado en formato base64
 */
function encryptCertificate(certBuffer, encryptionKey) {
  try {
    // Generar un IV aleatorio
    const iv = crypto.randomBytes(16);
    
    // Crear el cifrador
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    
    // Cifrar el certificado
    let encrypted = cipher.update(certBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Devolver el IV y el certificado cifrado en formato base64
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Error al encriptar certificado:', error);
    throw error;
  }
}

/**
 * Desencripta un certificado
 * @param {string} encryptedCert - Certificado encriptado en formato base64
 * @param {string} encryptionKey - Clave de encriptación
 * @returns {Buffer} - Buffer del certificado desencriptado
 */
function decryptCertificate(encryptedCert, encryptionKey) {
  try {
    // Separar el IV y el certificado cifrado
    const textParts = encryptedCert.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    // Crear el descifrador
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    
    // Descifrar el certificado
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  } catch (error) {
    console.error('Error al desencriptar certificado:', error);
    throw error;
  }
}

module.exports = {
  signXML,
  verifyXMLSignature,
  loadCertificateFromFile,
  encryptCertificate,
  decryptCertificate
};
