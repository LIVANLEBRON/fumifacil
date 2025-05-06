/**
 * Utilidades para la generación de XML en formato UBL para facturas electrónicas (e-CF)
 * según los requisitos de la DGII (Dirección General de Impuestos Internos) de República Dominicana
 * y la Ley 32-23 de Facturación Electrónica
 */

/**
 * Genera el XML en formato UBL para una factura electrónica
 * @param {Object} invoice - Datos de la factura
 * @param {Object} company - Datos de la empresa emisora
 * @param {Object} client - Datos del cliente
 * @returns {String} - XML en formato UBL
 */
export const generateInvoiceXML = (invoice, company, client) => {
  // Obtener la fecha actual en formato ISO
  const currentDate = new Date().toISOString();
  const invoiceDate = invoice.date ? new Date(invoice.date).toISOString() : currentDate;
  
  // Generar ID único para el documento
  const documentId = `ECF${invoice.invoiceNumber}`;
  
  // Calcular totales
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price * (item.taxRate || 0.18)), 0);
  const total = subtotal + taxAmount;
  
  // Crear el XML en formato UBL
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>DGII</cbc:CustomizationID>
  <cbc:ID>${documentId}</cbc:ID>
  <cbc:IssueDate>${invoiceDate.substring(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${invoiceDate.substring(11, 19)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>31</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>DOP</cbc:DocumentCurrencyCode>
  
  <!-- Emisor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="1">${company.rnc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${company.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${company.address}</cbc:StreetName>
        <cac:Country>
          <cbc:IdentificationCode>DO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${company.rnc}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>RNC</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${company.name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${company.email}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Receptor -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="1">${client.rnc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${client.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${client.address || 'N/A'}</cbc:StreetName>
        <cac:Country>
          <cbc:IdentificationCode>DO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${client.rnc}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>RNC</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${client.name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${client.email || 'N/A'}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Información de Pago -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
    <cbc:PaymentID>${invoice.paymentReference || 'N/A'}</cbc:PaymentID>
  </cac:PaymentMeans>
  
  <!-- Información de Impuestos -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="DOP">${taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="DOP">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="DOP">${taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>18.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>ITBIS</cbc:ID>
          <cbc:Name>ITBIS</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Totales -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="DOP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="DOP">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="DOP">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="DOP">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Líneas de Detalle -->
  ${invoice.items.map((item, index) => {
    const lineTotal = item.quantity * item.price;
    const lineTax = lineTotal * (item.taxRate || 0.18);
    
    return `<cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unit || 'EA'}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="DOP">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${item.description}</cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>${item.id || `ITEM-${index + 1}`}</cbc:ID>
      </cac:SellersItemIdentification>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${((item.taxRate || 0.18) * 100).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>ITBIS</cbc:ID>
          <cbc:Name>ITBIS</cbc:Name>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="DOP">${item.price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="DOP">${lineTax.toFixed(2)}</cbc:TaxAmount>
    </cac:TaxTotal>
  </cac:InvoiceLine>`;
  }).join('\n  ')}
</Invoice>`;

  return xml;
};

/**
 * Valida el XML generado contra el esquema UBL
 * @param {String} xml - XML en formato UBL
 * @returns {Boolean} - True si el XML es válido
 */
export const validateXML = (xml) => {
  // Esta función debería implementar la validación del XML contra el esquema UBL
  // Requiere una biblioteca de validación XML o una API externa
  
  // Por ahora, simplemente verificamos que el XML contenga los elementos básicos
  const requiredElements = [
    '<Invoice', 
    '<cbc:UBLVersionID>', 
    '<cac:AccountingSupplierParty>', 
    '<cac:AccountingCustomerParty>',
    '<cac:InvoiceLine>'
  ];
  
  return requiredElements.every(element => xml.includes(element));
};

/**
 * Prepara el XML para ser firmado digitalmente
 * @param {String} xml - XML en formato UBL
 * @returns {String} - XML preparado para firma
 */
export const prepareXMLForSigning = (xml) => {
  // Esta función debería preparar el XML para ser firmado digitalmente
  // según los requisitos de la DGII
  
  // Por ahora, simplemente devolvemos el XML original
  return xml;
};

/**
 * Genera un nombre de archivo para el XML
 * @param {Object} invoice - Datos de la factura
 * @param {Object} company - Datos de la empresa emisora
 * @returns {String} - Nombre del archivo XML
 */
export const generateXMLFilename = (invoice, company) => {
  const date = new Date(invoice.date || new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `ECF_${company.rnc}_${year}${month}${day}_${invoice.invoiceNumber}.xml`;
};
