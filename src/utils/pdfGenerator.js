/**
 * Utilidad para generar PDFs de facturas directamente desde el frontend
 * Utiliza jsPDF y jspdf-autotable para crear PDFs profesionales
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage, db } from '../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Genera un PDF de factura y lo guarda en Firebase Storage
 * @param {Object} invoiceData - Datos de la factura
 * @param {Object} companyData - Datos de la empresa
 * @returns {Promise<string>} - URL del PDF generado
 */
export const generateInvoicePDF = async (invoiceData, companyData) => {
  try {
    console.log('Iniciando generación de PDF para factura:', invoiceData.id);
    
    // Crear un nuevo documento PDF con manejo de errores
    let doc;
    try {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
    } catch (error) {
      console.error('Error al crear documento PDF:', error);
      throw new Error('No se pudo crear el documento PDF. Posible problema de memoria del navegador.');
    }

    // Configurar fuentes
    doc.setFont('helvetica');
    
    // Margen superior
    const marginTop = 15;
    let currentY = marginTop;
    
    // Ancho de página útil
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 40; // 20mm de margen a cada lado
    
    // Encabezado - Logo y datos de la empresa (con manejo de errores mejorado)
    if (companyData.logoUrl) {
      try {
        // Verificar si la URL del logo es válida
        if (typeof companyData.logoUrl !== 'string' || !companyData.logoUrl.startsWith('http')) {
          throw new Error('URL del logo inválida');
        }
        
        // Cargar logo desde URL con timeout
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Evitar problemas CORS
        
        const logoLoaded = await Promise.race([
          new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = companyData.logoUrl;
          }),
          new Promise((resolve) => setTimeout(() => resolve(false), 3000)) // Timeout de 3 segundos
        ]);
        
        if (logoLoaded) {
          doc.addImage(img, 'JPEG', 20, currentY, 40, 20);
        } else {
          throw new Error('Tiempo de espera agotado al cargar el logo');
        }
      } catch (error) {
        console.warn('No se pudo cargar el logo, usando placeholder:', error.message);
        // Si hay error, dibujar un rectángulo como placeholder
        doc.rect(20, currentY, 40, 20);
        doc.text('LOGO', 40, currentY + 10, { align: 'center' });
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
    doc.text('FACTURA', pageWidth / 2, currentY, { align: 'center' });
    
    // Información de la factura
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Número de Factura: ${invoiceData.invoiceNumber || invoiceData.id}`, 20, currentY);
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
    doc.text(`Nombre/Razón Social: ${invoiceData.client || 'N/A'}`, 20, currentY);
    currentY += 5;
    doc.text(`RNC/Cédula: ${invoiceData.rnc || 'N/A'}`, 20, currentY);
    currentY += 5;
    doc.text(`Dirección: ${invoiceData.address || 'N/A'}`, 20, currentY);
    currentY += 5;
    doc.text(`Teléfono: ${invoiceData.phone || 'N/A'}`, 20, currentY);
    currentY += 5;
    doc.text(`Correo: ${invoiceData.email || 'N/A'}`, 20, currentY);
    
    // Detalles de la factura
    currentY += 10;
    
    // Preparar los datos para la tabla
    const tableColumn = ["Descripción", "Cantidad", "Precio Unitario", "ITBIS", "Subtotal"];
    const tableRows = [];
    
    // Agregar los items de la factura a la tabla
    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach(item => {
        const subtotal = (item.quantity || 0) * (item.price || 0);
        const itbis = subtotal * (item.tax || 18) / 100;
        
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
    
    // Pie de página
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por su preferencia', pageWidth / 2, footerY, { align: 'center' });
    
    // Guardar el PDF en Firebase Storage con manejo de errores mejorado
    let pdfUrl;
    try {
      console.log('Generando blob del PDF...');
      const pdfBlob = doc.output('blob');
      
      console.log('Subiendo PDF a Firebase Storage...');
      const storageRef = ref(storage, `invoices/${invoiceData.id}.pdf`);
      
      // Intentar subir con reintentos
      let uploadSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!uploadSuccess && attempts < maxAttempts) {
        try {
          attempts++;
          await uploadBytes(storageRef, pdfBlob);
          uploadSuccess = true;
          console.log(`PDF subido exitosamente en el intento ${attempts}`);
        } catch (uploadError) {
          console.warn(`Error al subir PDF (intento ${attempts}/${maxAttempts}):`, uploadError);
          if (attempts >= maxAttempts) throw uploadError;
          // Esperar antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Obtener la URL de descarga
      pdfUrl = await getDownloadURL(storageRef);
      console.log('URL de descarga obtenida:', pdfUrl);
      
      // Actualizar la factura con la URL del PDF
      try {
        await updateDoc(doc(db, 'invoices', invoiceData.id), {
          pdfUrl: pdfUrl,
          pdfGeneratedDate: new Date()
        });
        console.log('Factura actualizada con URL del PDF');
      } catch (updateError) {
        console.error('Error al actualizar la factura con la URL del PDF:', updateError);
        // Continuamos para al menos retornar la URL del PDF aunque falle la actualización
      }
    } catch (storageError) {
      console.error('Error al guardar el PDF en Firebase Storage:', storageError);
      
      // Intentar generar una URL temporal como respaldo
      try {
        console.log('Intentando generar URL de datos como respaldo...');
        // Generar una URL de datos como respaldo (menos eficiente pero funcional)
        pdfUrl = URL.createObjectURL(doc.output('blob'));
        console.log('URL de datos generada como respaldo');
      } catch (fallbackError) {
        console.error('Error al generar URL de datos:', fallbackError);
        throw new Error('No se pudo guardar ni generar el PDF: ' + storageError.message);
      }
    }
    
    return pdfUrl;
  } catch (error) {
    console.error('Error al generar PDF:', error);
    // Agregar más contexto al error para facilitar la depuración
    if (error.message.includes('DOM')) {
      throw new Error('Error de manipulación del DOM al generar el PDF. Intente refrescar la página: ' + error.message);
    } else if (error.message.includes('memory') || error.message.includes('memoria')) {
      throw new Error('Error de memoria al generar el PDF. Intente cerrar otras pestañas o reiniciar el navegador: ' + error.message);
    } else {
      throw error;
    }
  }
};

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
    
    return format(dateObj, 'dd/MM/yyyy', { locale: es });
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
