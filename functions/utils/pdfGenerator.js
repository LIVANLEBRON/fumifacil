/**
 * Utilidad para generar PDFs de facturas
 * Utiliza jsPDF y jspdf-autotable para crear PDFs profesionales
 */

const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Genera un PDF de factura electrónica
 * @param {Object} invoiceData - Datos de la factura
 * @param {Object} companyData - Datos de la empresa
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
async function generateInvoicePDF(invoiceData, companyData, clientData) {
  // Crear un nuevo documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configurar fuentes
  doc.setFont('helvetica');
  
  // Margen superior
  const marginTop = 15;
  let currentY = marginTop;
  
  // Ancho de página útil
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - 40; // 20mm de margen a cada lado
  
  // Encabezado - Logo y datos de la empresa
  if (companyData.logoUrl) {
    try {
      // En un entorno serverless, no podemos usar URLs directamente
      // Aquí se implementaría la lógica para obtener el logo
      // Para este ejemplo, simplemente dejamos un espacio para el logo
      doc.rect(20, currentY, 40, 20);
      doc.text('LOGO', 40, currentY + 10, { align: 'center' });
    } catch (error) {
      console.error('Error al cargar el logo:', error);
    }
  }
  
  // Datos de la empresa
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyData.name || 'Empresa de Fumigación', pageWidth - 20, currentY + 5, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  currentY += 5;
  doc.text(`RNC: ${companyData.rnc || 'N/A'}`, pageWidth - 20, currentY + 5, { align: 'right' });
  currentY += 5;
  doc.text(companyData.address || 'Dirección no disponible', pageWidth - 20, currentY + 5, { align: 'right' });
  currentY += 5;
  doc.text(`Tel: ${companyData.phone || 'N/A'}`, pageWidth - 20, currentY + 5, { align: 'right' });
  currentY += 5;
  doc.text(companyData.email || 'correo@ejemplo.com', pageWidth - 20, currentY + 5, { align: 'right' });
  
  // Título de la factura
  currentY += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA ELECTRÓNICA DE CONSUMO (e-CF)', pageWidth / 2, currentY, { align: 'center' });
  
  // Información de la factura
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Número de Comprobante: ${invoiceData.invoiceNumber || 'N/A'}`, 20, currentY);
  currentY += 5;
  doc.text(`Fecha de Emisión: ${formatDate(invoiceData.date)}`, 20, currentY);
  
  if (invoiceData.trackId) {
    currentY += 5;
    doc.text(`Track ID DGII: ${invoiceData.trackId}`, 20, currentY);
  }
  
  // Datos del cliente
  currentY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 20, currentY);
  
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre/Razón Social: ${clientData.name || 'N/A'}`, 20, currentY);
  currentY += 5;
  doc.text(`RNC/Cédula: ${clientData.rnc || 'N/A'}`, 20, currentY);
  currentY += 5;
  doc.text(`Dirección: ${clientData.address || 'N/A'}`, 20, currentY);
  currentY += 5;
  doc.text(`Teléfono: ${clientData.phone || 'N/A'}`, 20, currentY);
  currentY += 5;
  doc.text(`Correo: ${clientData.email || 'N/A'}`, 20, currentY);
  
  // Detalles de la factura
  currentY += 10;
  
  // Preparar los datos para la tabla
  const tableColumn = ["Descripción", "Cantidad", "Precio Unitario", "ITBIS", "Subtotal"];
  const tableRows = [];
  
  // Agregar los items de la factura a la tabla
  if (invoiceData.items && invoiceData.items.length > 0) {
    invoiceData.items.forEach(item => {
      const subtotal = (item.quantity || 0) * (item.price || 0);
      const itbis = subtotal * (item.taxRate || 0.18);
      
      tableRows.push([
        item.description || 'N/A',
        item.quantity ? item.quantity.toString() : '0',
        formatCurrency(item.price || 0),
        formatCurrency(itbis),
        formatCurrency(subtotal)
      ]);
    });
  } else {
    tableRows.push(['No hay items en esta factura', '', '', '', '']);
  }
  
  // Generar la tabla
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });
  
  // Actualizar la posición Y después de la tabla
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Resumen de la factura
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Subtotal
  doc.text('Subtotal:', pageWidth - 60, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(invoiceData.subtotal || 0), pageWidth - 20, currentY, { align: 'right' });
  currentY += 5;
  
  // ITBIS
  doc.setFont('helvetica', 'bold');
  doc.text('ITBIS (18%):', pageWidth - 60, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(invoiceData.tax || 0), pageWidth - 20, currentY, { align: 'right' });
  currentY += 5;
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 60, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(invoiceData.total || 0), pageWidth - 20, currentY, { align: 'right' });
  
  // Generar código QR con la información de la factura
  try {
    const qrData = JSON.stringify({
      invoiceNumber: invoiceData.invoiceNumber,
      date: formatDate(invoiceData.date),
      total: invoiceData.total,
      rnc: companyData.rnc,
      clientRnc: clientData.rnc
    });
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    const qrImageData = qrCodeDataUrl.split(',')[1];
    
    // Agregar el código QR en la esquina inferior izquierda
    doc.addImage(
      Buffer.from(qrImageData, 'base64'),
      'PNG',
      20,
      doc.internal.pageSize.height - 40,
      30,
      30
    );
  } catch (error) {
    console.error('Error al generar código QR:', error);
  }
  
  // Pie de página
  const footerY = doc.internal.pageSize.height - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento es una representación impresa de un e-CF', pageWidth / 2, footerY, { align: 'center' });
  
  // Convertir el PDF a un buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  
  return pdfBuffer;
}

/**
 * Formatea una fecha para mostrarla en el PDF
 * @param {Date|Object|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
  if (!date) return 'N/A';
  
  try {
    let dateObj;
    
    if (date.toDate && typeof date.toDate === 'function') {
      // Es un timestamp de Firestore
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'N/A';
  }
}

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como moneda
 */
function formatCurrency(amount) {
  return `RD$ ${Number(amount).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

module.exports = {
  generateInvoicePDF
};
