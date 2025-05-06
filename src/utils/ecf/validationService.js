/**
 * Servicio de validación para e-CF según requisitos de la DGII
 * Proporciona funciones para validar RNC, NCF y otros datos requeridos por la DGII
 * según la Ley 32-23 de Facturación Electrónica
 */

/**
 * Valida un RNC (Registro Nacional del Contribuyente) dominicano
 * @param {string} rnc - RNC a validar
 * @returns {boolean} True si el RNC es válido
 */
export const validateRNC = (rnc) => {
  // Eliminar espacios y guiones
  rnc = rnc.replace(/[\s-]/g, '');
  
  // RNC debe tener 9 dígitos
  if (!/^\d{9}$/.test(rnc)) {
    return false;
  }
  
  // Algoritmo de validación del RNC
  // Los primeros 8 dígitos son la base y el último es el dígito verificador
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  const base = rnc.substring(0, 8);
  const check = parseInt(rnc.substring(8, 9));
  
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(base.charAt(i)) * weights[i];
  }
  
  const remainder = sum % 11;
  const expectedCheck = remainder === 0 ? 2 : remainder === 1 ? 1 : 11 - remainder;
  
  return check === expectedCheck;
};

/**
 * Valida una cédula dominicana
 * @param {string} cedula - Cédula a validar
 * @returns {boolean} True si la cédula es válida
 */
export const validateCedula = (cedula) => {
  // Eliminar espacios y guiones
  cedula = cedula.replace(/[\s-]/g, '');
  
  // Cédula debe tener 11 dígitos
  if (!/^\d{11}$/.test(cedula)) {
    return false;
  }
  
  // Algoritmo de validación de la cédula
  // Los primeros 10 dígitos son la base y el último es el dígito verificador
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  const base = cedula.substring(0, 10);
  const check = parseInt(cedula.substring(10, 11));
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(base.charAt(i)) * weights[i];
    sum += digit > 9 ? Math.floor(digit / 10) + (digit % 10) : digit;
  }
  
  const remainder = sum % 10;
  const expectedCheck = remainder === 0 ? 0 : 10 - remainder;
  
  return check === expectedCheck;
};

/**
 * Valida un identificador fiscal (RNC o Cédula)
 * @param {string} id - Identificador a validar
 * @returns {boolean} True si el identificador es válido
 */
export const validateFiscalId = (id) => {
  // Eliminar espacios y guiones
  id = id.replace(/[\s-]/g, '');
  
  // Determinar si es RNC o Cédula por la longitud
  if (id.length === 9) {
    return validateRNC(id);
  } else if (id.length === 11) {
    return validateCedula(id);
  }
  
  return false;
};

/**
 * Valida un NCF (Número de Comprobante Fiscal) para e-CF
 * @param {string} ncf - NCF a validar
 * @returns {boolean} True si el NCF es válido
 */
export const validateNCF = (ncf) => {
  // Eliminar espacios
  ncf = ncf.replace(/\s/g, '');
  
  // Validar formato de e-CF: E + 2 letras + 10 dígitos
  return /^E[A-Z]{2}\d{10}$/.test(ncf);
};

/**
 * Valida una dirección de correo electrónico
 * @param {string} email - Correo electrónico a validar
 * @returns {boolean} True si el correo es válido
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida un número de teléfono dominicano
 * @param {string} phone - Número de teléfono a validar
 * @returns {boolean} True si el teléfono es válido
 */
export const validatePhone = (phone) => {
  // Eliminar espacios, guiones y paréntesis
  phone = phone.replace(/[\s\-()]/g, '');
  
  // Validar formato dominicano: 10 dígitos, puede empezar con +1 o 1
  return /^(\+?1)?8[0-9]{9}$/.test(phone);
};

/**
 * Valida los datos de una factura según requisitos de la DGII
 * @param {Object} invoice - Datos de la factura
 * @returns {Object} Resultado de la validación con errores si los hay
 */
export const validateInvoice = (invoice) => {
  const errors = {};
  
  // Validar datos del emisor
  if (!invoice.issuer) {
    errors.issuer = 'Se requieren los datos del emisor';
  } else {
    if (!invoice.issuer.rnc || !validateRNC(invoice.issuer.rnc)) {
      errors.issuerRnc = 'RNC del emisor inválido';
    }
    
    if (!invoice.issuer.name) {
      errors.issuerName = 'Se requiere el nombre del emisor';
    }
    
    if (!invoice.issuer.address) {
      errors.issuerAddress = 'Se requiere la dirección del emisor';
    }
  }
  
  // Validar datos del receptor
  if (!invoice.client) {
    errors.client = 'Se requieren los datos del cliente';
  } else {
    if (!invoice.client.rnc || !validateFiscalId(invoice.client.rnc)) {
      errors.clientRnc = 'RNC/Cédula del cliente inválido';
    }
    
    if (!invoice.client.name) {
      errors.clientName = 'Se requiere el nombre del cliente';
    }
  }
  
  // Validar items de la factura
  if (!invoice.items || invoice.items.length === 0) {
    errors.items = 'La factura debe tener al menos un item';
  } else {
    const itemErrors = [];
    
    invoice.items.forEach((item, index) => {
      const itemError = {};
      
      if (!item.description) {
        itemError.description = 'Se requiere la descripción del item';
      }
      
      if (!item.quantity || item.quantity <= 0) {
        itemError.quantity = 'La cantidad debe ser mayor que cero';
      }
      
      if (!item.price || item.price < 0) {
        itemError.price = 'El precio debe ser mayor o igual a cero';
      }
      
      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });
    
    if (itemErrors.length > 0) {
      errors.itemErrors = itemErrors;
    }
  }
  
  // Validar totales
  if (!invoice.subtotal && invoice.subtotal !== 0) {
    errors.subtotal = 'Se requiere el subtotal';
  }
  
  if (!invoice.tax && invoice.tax !== 0) {
    errors.tax = 'Se requiere el impuesto';
  }
  
  if (!invoice.total && invoice.total !== 0) {
    errors.total = 'Se requiere el total';
  }
  
  // Validar fecha
  if (!invoice.date) {
    errors.date = 'Se requiere la fecha de la factura';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Genera un NCF (Número de Comprobante Fiscal) para e-CF
 * @param {string} type - Tipo de comprobante (01: Factura, 02: Nota de Crédito, etc.)
 * @param {number} sequence - Número de secuencia
 * @returns {string} NCF generado
 */
export const generateNCF = (type, sequence) => {
  // Tipos de comprobantes según la DGII
  const validTypes = ['01', '02', '03', '04'];
  
  if (!validTypes.includes(type)) {
    throw new Error('Tipo de comprobante inválido');
  }
  
  // Formato: E + tipo (2 dígitos) + secuencia (8 dígitos)
  const sequenceStr = sequence.toString().padStart(8, '0');
  
  return `E${type}${sequenceStr}`;
};

/**
 * Formatea un RNC o Cédula para mostrar
 * @param {string} id - RNC o Cédula
 * @returns {string} RNC o Cédula formateada
 */
export const formatFiscalId = (id) => {
  if (!id) return '';
  
  // Eliminar espacios y guiones
  id = id.replace(/[\s-]/g, '');
  
  // Formatear según longitud
  if (id.length === 9) {
    // RNC: XXX-XXXXXX-X
    return `${id.substring(0, 3)}-${id.substring(3, 9)}-${id.substring(9)}`;
  } else if (id.length === 11) {
    // Cédula: XXX-XXXXXXX-X
    return `${id.substring(0, 3)}-${id.substring(3, 10)}-${id.substring(10)}`;
  }
  
  return id;
};
