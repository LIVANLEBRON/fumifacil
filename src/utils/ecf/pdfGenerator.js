/**
 * Utilidades para la generación de PDF de facturas electrónicas (e-CF)
 * según los requisitos de la DGII (Dirección General de Impuestos Internos) de República Dominicana
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Genera un PDF para una factura electrónica
 * @param {Object} invoice - Datos de la factura
 * @param {Object} company - Datos de la empresa emisora
 * @param {Object} client - Datos del cliente
 * @returns {Promise<Blob>} - PDF generado como Blob
 */
export const generateInvoicePDF = async (invoice, company, client) => {
  // Crear un nuevo documento PDF
  const doc = new jsPDF();
  
  // Configurar fuentes y estilos
  const titleFontSize = 16;
  const headerFontSize = 12;
  const normalFontSize = 10;
  const smallFontSize = 8;
  
  // Márgenes
  const margin = 15;
  let y = margin;
  
  // Ancho útil
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - (2 * margin);
  
  // Colores
  const primaryColor = [0, 51, 102]; // Azul oscuro
  
  // Fecha de la factura
  const invoiceDate = invoice.date ? new Date(invoice.date) : new Date();
  const formattedDate = invoiceDate.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // Calcular totales
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price * (item.taxRate || 0.18)), 0);
  const total = subtotal + taxAmount;
  
  // Generar código QR con información de la factura
  const qrData = `ECF:${invoice.invoiceNumber}|RNC:${company.rnc}|FECHA:${formattedDate}|TOTAL:${total.toFixed(2)}`;
  const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 100 });
  
  // Encabezado con logo de la empresa (si existe)
  if (company.logoUrl) {
    doc.addImage(company.logoUrl, 'PNG', margin, y, 40, 20, undefined, 'FAST');
    y += 22;
  } else {
    // Si no hay logo, mostrar el nombre de la empresa en grande
    doc.setFontSize(titleFontSize);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(company.name, margin, y + 10);
    y += 15;
  }
  
  // Información de la empresa
  doc.setFontSize(normalFontSize);
  doc.setTextColor(0, 0, 0);
  doc.text(`RNC: ${company.rnc}`, margin, y);
  doc.text(`${company.address}`, margin, y + 5);
  if (company.phone) doc.text(`Tel: ${company.phone}`, margin, y + 10);
  if (company.email) doc.text(`Email: ${company.email}`, margin, y + 15);
  y += 20;
  
  // Título de la factura
  doc.setFontSize(titleFontSize);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('FACTURA ELECTRÓNICA (e-CF)', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Información de la factura
  doc.setFontSize(headerFontSize);
  doc.setTextColor(0, 0, 0);
  doc.text(`No. Factura: ECF${invoice.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.text(`Fecha: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
  y += 10;
  
  // Información del cliente
  doc.setFontSize(headerFontSize);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CLIENTE', margin, y);
  y += 5;
  
  doc.setFontSize(normalFontSize);
  doc.setTextColor(0, 0, 0);
  doc.text(`${client.name}`, margin, y);
  y += 5;
  doc.text(`RNC/Cédula: ${client.rnc}`, margin, y);
  y += 5;
  if (client.address) {
    doc.text(`Dirección: ${client.address}`, margin, y);
    y += 5;
  }
  if (client.phone) {
    doc.text(`Teléfono: ${client.phone}`, margin, y);
    y += 5;
  }
  if (client.email) {
    doc.text(`Email: ${client.email}`, margin, y);
    y += 5;
  }
  
  y += 10;
  
  // Tabla de ítems
  doc.autoTable({
    startY: y,
    head: [['Cant.', 'Descripción', 'Precio Unit.', 'ITBIS', 'Total']],
    body: invoice.items.map(item => {
      const lineTotal = item.quantity * item.price;
      const lineTax = lineTotal * (item.taxRate || 0.18);
      return [
        item.quantity.toString(),
        item.description,
        `RD$ ${item.price.toFixed(2)}`,
        `RD$ ${lineTax.toFixed(2)}`,
        `RD$ ${(lineTotal + lineTax).toFixed(2)}`
      ];
    }),
    theme: 'striped',
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });
  
  // Actualizar la posición Y después de la tabla
  y = doc.lastAutoTable.finalY + 10;
  
  // Resumen de totales
  doc.setFontSize(normalFontSize);
  doc.setTextColor(0, 0, 0);
  
  const totalsX = pageWidth - margin - 80;
  const totalsLabelX = totalsX;
  const totalsValueX = pageWidth - margin;
  
  doc.text('Subtotal:', totalsLabelX, y, { align: 'left' });
  doc.text(`RD$ ${subtotal.toFixed(2)}`, totalsValueX, y, { align: 'right' });
  y += 5;
  
  doc.text('ITBIS (18%):', totalsLabelX, y, { align: 'left' });
  doc.text(`RD$ ${taxAmount.toFixed(2)}`, totalsValueX, y, { align: 'right' });
  y += 5;
  
  doc.setFontSize(headerFontSize);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TOTAL:', totalsLabelX, y, { align: 'left' });
  doc.text(`RD$ ${total.toFixed(2)}`, totalsValueX, y, { align: 'right' });
  y += 15;
  
  // Agregar código QR
  doc.addImage(qrCodeDataURL, 'PNG', margin, y, 30, 30);
  
  // Información adicional y notas
  doc.setFontSize(smallFontSize);
  doc.setTextColor(0, 0, 0);
  doc.text('Este documento es una representación impresa de un e-CF.', margin + 35, y + 10);
  doc.text('Verifique su validez en el portal de la DGII.', margin + 35, y + 15);
  
  // Términos y condiciones
  y += 40;
  if (company.termsAndConditions) {
    doc.setFontSize(smallFontSize);
    doc.setTextColor(100, 100, 100);
    doc.text('Términos y Condiciones:', margin, y);
    y += 5;
    
    // Dividir los términos en líneas para que quepan en el ancho de la página
    const splitTerms = doc.splitTextToSize(company.termsAndConditions, contentWidth);
    doc.text(splitTerms, margin, y);
  }
  
  // Devolver el PDF como Blob
  return doc.output('blob');
};

/**
 * Genera un nombre de archivo para el PDF
 * @param {Object} invoice - Datos de la factura
 * @param {Object} company - Datos de la empresa emisora
 * @returns {String} - Nombre del archivo PDF
 */
export const generatePDFFilename = (invoice, company) => {
  const date = new Date(invoice.date || new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `Factura_ECF${invoice.invoiceNumber}_${company.name.replace(/\s+/g, '_')}_${year}${month}${day}.pdf`;
};

/**
 * Abre el PDF en una nueva ventana para su visualización o descarga
 * @param {Blob} pdfBlob - PDF generado como Blob
 * @param {String} filename - Nombre del archivo PDF
 */
export const openPDF = (pdfBlob, filename) => {
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Abrir en una nueva ventana
  const newWindow = window.open(pdfUrl, '_blank');
  
  // Si el navegador bloqueó la apertura de la ventana, crear un enlace para descargar
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.click();
  }
  
  // Liberar el objeto URL después de un tiempo
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 100);
};
