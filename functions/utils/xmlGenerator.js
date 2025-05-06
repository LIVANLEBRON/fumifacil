/**
 * Utilidad para generar documentos XML en formato UBL para e-CF
 * Implementa la estructura requerida por la DGII según la Ley 32-23
 */

const moment = require('moment');
const xml2js = require('xml2js');

/**
 * Genera un documento XML en formato UBL para una factura electrónica
 * @param {Object} invoiceData - Datos de la factura
 * @param {Object} companyData - Datos de la empresa emisora
 * @param {Object} clientData - Datos del cliente
 * @returns {string} - Documento XML en formato UBL
 */
function generateInvoiceXML(invoiceData, companyData, clientData) {
  try {
    // Validar datos requeridos
    if (!invoiceData || !companyData || !clientData) {
      throw new Error('Se requieren datos de factura, empresa y cliente');
    }
    
    if (!companyData.rnc) {
      throw new Error('Se requiere el RNC de la empresa emisora');
    }
    
    if (!clientData.rnc) {
      throw new Error('Se requiere el RNC/Cédula del cliente');
    }
    
    // Crear estructura del XML según especificaciones de la DGII
    const invoiceDate = moment(invoiceData.date instanceof Date ? invoiceData.date : new Date(invoiceData.date));
    
    // Estructura base del documento
    const xmlObj = {
      'ECF': {
        '$': {
          'xmlns': 'https://dgii.gov.do/etrib/schema/ECF/1',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'https://dgii.gov.do/etrib/schema/ECF/1 ECF.xsd'
        },
        'Encabezado': {
          'IdDoc': {
            'TipoeCF': invoiceData.invoiceType || '31', // 31 = Factura de Consumo Electrónica
            'eNCF': invoiceData.invoiceNumber || '',
            'FechaVencimiento': invoiceDate.add(30, 'days').format('YYYY-MM-DD')
          },
          'Emisor': {
            'RNCEmisor': companyData.rnc,
            'NombreEmisor': companyData.name,
            'DireccionEmisor': companyData.address,
            'TelefonoEmisor': companyData.phone || '',
            'CorreoEmisor': companyData.email || ''
          },
          'Comprador': {
            'RNCComprador': clientData.rnc,
            'TipoID': clientData.rnc.length === 11 ? '1' : '2', // 1 = RNC, 2 = Cédula
            'NombreComprador': clientData.name,
            'DireccionComprador': clientData.address || '',
            'TelefonoComprador': clientData.phone || '',
            'CorreoComprador': clientData.email || ''
          },
          'Totales': {
            'MontoGravadoTotal': formatAmount(invoiceData.subtotal || 0),
            'ITBIS': formatAmount(invoiceData.tax || 0),
            'MontoTotal': formatAmount(invoiceData.total || 0)
          }
        },
        'Detalles': {
          'Item': []
        },
        'InformacionAdicional': {
          'Observaciones': invoiceData.notes || 'Servicio de fumigación'
        }
      }
    };
    
    // Agregar items de la factura
    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach((item, index) => {
        const subtotal = (item.quantity || 0) * (item.price || 0);
        const itbis = subtotal * (item.taxRate || 0.18);
        
        xmlObj.ECF.Detalles.Item.push({
          'NumeroLinea': (index + 1).toString(),
          'IndicadorFacturacion': '1', // 1 = Facturación de servicios
          'NombreItem': item.description || '',
          'CantidadItem': item.quantity ? item.quantity.toString() : '1',
          'PrecioUnitarioItem': formatAmount(item.price || 0),
          'MontoItem': formatAmount(subtotal),
          'MontoITBIS': formatAmount(itbis)
        });
      });
    }
    
    // Convertir objeto a XML
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ', newline: '\n' },
      headless: false
    });
    
    return builder.buildObject(xmlObj);
  } catch (error) {
    console.error('Error al generar XML:', error);
    throw error;
  }
}

/**
 * Valida un documento XML contra el esquema de la DGII
 * @param {string} xmlString - Documento XML a validar
 * @returns {boolean} - True si el documento es válido
 */
function validateXML(xmlString) {
  // En un entorno real, aquí se implementaría la validación contra el esquema XSD
  // Para este ejemplo, simplemente verificamos que el XML sea válido
  try {
    const parser = new xml2js.Parser();
    parser.parseString(xmlString);
    return true;
  } catch (error) {
    console.error('Error al validar XML:', error);
    return false;
  }
}

/**
 * Formatea un número para el XML
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada con 2 decimales
 */
function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

/**
 * Genera un nombre de archivo para el XML
 * @param {string} rnc - RNC de la empresa emisora
 * @param {string} invoiceNumber - Número de factura
 * @returns {string} - Nombre del archivo
 */
function generateXMLFilename(rnc, invoiceNumber) {
  const timestamp = moment().format('YYYYMMDDHHmmss');
  return `ECF_${rnc}_${invoiceNumber}_${timestamp}.xml`;
}

module.exports = {
  generateInvoiceXML,
  validateXML,
  generateXMLFilename
};
