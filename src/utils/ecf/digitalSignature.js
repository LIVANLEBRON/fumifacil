/**
 * Utilidades para la firma digital de documentos XML para facturas electrónicas (e-CF)
 * según los requisitos de la DGII (Dirección General de Impuestos Internos) de República Dominicana
 * y la Ley 32-23 de Facturación Electrónica
 */

import { SignedXml } from 'xml-crypto';
import CryptoJS from 'crypto-js';

/**
 * Firma digitalmente un documento XML utilizando un certificado digital
 * @param {String} xml - XML en formato UBL a firmar
 * @param {Object} certificate - Certificado digital (clave privada y certificado)
 * @returns {String} - XML firmado digitalmente
 */
export const signXML = async (xml, certificate) => {
  try {
    // En un entorno real, aquí se utilizaría la biblioteca xml-crypto para firmar el XML
    // con el certificado digital proporcionado por la DGII
    
    // Para este ejemplo, simularemos el proceso de firma
    // En producción, se debe implementar la firma real según las especificaciones de la DGII
    
    // Crear un objeto SignedXml
    const sig = new SignedXml();
    
    // Configurar el certificado y la clave privada
    sig.signingKey = certificate.privateKey;
    
    // Configurar las referencias a firmar
    sig.addReference(
      "//*[local-name(.)='Invoice']",
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ],
      "http://www.w3.org/2000/09/xmldsig#sha256"
    );
    
    // Configurar la información del certificado
    sig.keyInfoProvider = {
      getKeyInfo: () => {
        return `<X509Data><X509Certificate>${certificate.cert}</X509Certificate></X509Data>`;
      }
    };
    
    // Firmar el XML
    sig.computeSignature(xml);
    
    // Obtener el XML firmado
    return sig.getSignedXml();
  } catch (error) {
    console.error('Error al firmar el XML:', error);
    throw new Error('No se pudo firmar el documento XML');
  }
};

/**
 * Verifica la firma digital de un documento XML
 * @param {String} signedXml - XML firmado digitalmente
 * @param {Object} certificate - Certificado digital (certificado público)
 * @returns {Boolean} - True si la firma es válida
 */
export const verifySignature = (signedXml, certificate) => {
  try {
    // En un entorno real, aquí se utilizaría la biblioteca xml-crypto para verificar la firma
    
    // Para este ejemplo, simularemos la verificación
    const sig = new SignedXml();
    
    // Verificar la firma
    return sig.checkSignature(signedXml, certificate.publicKey);
  } catch (error) {
    console.error('Error al verificar la firma del XML:', error);
    return false;
  }
};

/**
 * Cifra un certificado digital para almacenamiento seguro
 * @param {Object} certificate - Certificado digital
 * @param {String} password - Contraseña para cifrar el certificado
 * @returns {String} - Certificado cifrado
 */
export const encryptCertificate = (certificate, password) => {
  try {
    // Convertir el certificado a JSON
    const certificateJSON = JSON.stringify(certificate);
    
    // Cifrar el certificado con AES
    return CryptoJS.AES.encrypt(certificateJSON, password).toString();
  } catch (error) {
    console.error('Error al cifrar el certificado:', error);
    throw new Error('No se pudo cifrar el certificado');
  }
};

/**
 * Descifra un certificado digital
 * @param {String} encryptedCertificate - Certificado cifrado
 * @param {String} password - Contraseña para descifrar el certificado
 * @returns {Object} - Certificado descifrado
 */
export const decryptCertificate = (encryptedCertificate, password) => {
  try {
    // Descifrar el certificado
    const decrypted = CryptoJS.AES.decrypt(encryptedCertificate, password);
    
    // Convertir el resultado a texto
    const certificateJSON = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Convertir el JSON a objeto
    return JSON.parse(certificateJSON);
  } catch (error) {
    console.error('Error al descifrar el certificado:', error);
    throw new Error('No se pudo descifrar el certificado. Contraseña incorrecta o certificado inválido.');
  }
};

/**
 * Carga un certificado desde un archivo
 * @param {File} file - Archivo del certificado
 * @returns {Promise<Object>} - Certificado cargado
 */
export const loadCertificateFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        // En un entorno real, aquí se procesaría el archivo del certificado
        // según su formato (PFX, P12, etc.)
        
        // Para este ejemplo, simularemos el proceso
        const certificate = {
          cert: "CERTIFICADO_SIMULADO",
          privateKey: "CLAVE_PRIVADA_SIMULADA",
          publicKey: "CLAVE_PUBLICA_SIMULADA"
        };
        
        resolve(certificate);
      } catch (error) {
        reject(new Error('Formato de certificado no válido'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo del certificado'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};
