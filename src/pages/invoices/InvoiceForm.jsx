import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  TextField,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
// Importar servicios de facturación electrónica
import { createInvoice, sendInvoiceToDGII, generateInvoicePDF } from '../../utils/ecf/invoiceService';
import { validateInvoice, validateFiscalId, formatFiscalId } from '../../utils/ecf/validationService';
import { hasCertificate, loadECFConfig } from '../../utils/ecf/certificateService';

// Componente principal para crear/editar facturas
export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    client: '',
    rnc: '',
    address: '',
    email: '',
    phone: '',
    items: [{ description: '', quantity: 1, price: 0, tax: 18 }],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    paymentMethod: 'efectivo',
    status: 'pendiente'
  });
  
  // Estados adicionales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [pdfUrl, setPdfUrl] = useState('');
  
  // Pasos del proceso de facturación
  const steps = ['Datos del cliente', 'Productos/Servicios', 'Revisión y envío'];

  // Cargar datos de factura existente en modo edición
  useEffect(() => {
    if (isEditMode) {
      const fetchInvoice = async () => {
        try {
          setLoading(true);
          const invoiceDoc = await getDoc(doc(db, 'invoices', id));
          
          if (invoiceDoc.exists()) {
            const invoiceData = invoiceDoc.data();
            setFormData({
              ...invoiceData,
              date: invoiceData.date ? invoiceData.date.toDate() : new Date()
            });
            
            if (invoiceData.pdfUrl) {
              setPdfUrl(invoiceData.pdfUrl);
            }
          } else {
            setError('No se encontró la factura solicitada.');
            navigate('/facturas');
          }
        } catch (error) {
          console.error('Error al cargar la factura:', error);
          setError('Error al cargar la factura. Por favor, intenta nuevamente.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchInvoice();
    }
  }, [id, isEditMode, navigate]);

  // Calcular subtotal, impuestos y total cuando cambian los items
  useEffect(() => {
    const calculateTotals = () => {
      const subtotal = formData.items.reduce((sum, item) => 
        sum + (item.quantity * item.price), 0);
      
      const tax = formData.items.reduce((sum, item) => 
        sum + (item.quantity * item.price * (item.tax / 100)), 0);
      
      setFormData(prev => ({
        ...prev,
        subtotal,
        tax,
        total: subtotal + tax
      }));
    };
    
    calculateTotals();
  }, [formData.items]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambios en los items
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = field === 'quantity' || field === 'price' || field === 'tax' 
      ? parseFloat(value) || 0 
      : value;
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // Agregar nuevo item
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0, tax: 18 }]
    }));
  };

  // Eliminar item
  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      return; // Mantener al menos un item
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // Navegar entre pasos
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Validar formulario antes de guardar
  const validateForm = () => {
    // Validar datos del cliente
    if (!formData.client) {
      setError('El nombre del cliente es obligatorio');
      return false;
    }
    
    // Validar RNC/Cédula
    if (!formData.rnc) {
      setError('El RNC/Cédula del cliente es obligatorio');
      return false;
    }
    
    // Validar RNC/Cédula con el nuevo servicio de validación
    if (!validateFiscalId(formData.rnc)) {
      setError('El RNC/Cédula del cliente no es válido. Verifique el formato.');
      return false;
    }
    
    // Validar que haya al menos un item
    if (formData.items.length === 0) {
      setError('Debe agregar al menos un producto o servicio');
      return false;
    }
    
    // Validar que los items tengan descripción, cantidad y precio
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      
      if (!item.description) {
        setError(`El item #${i + 1} debe tener una descripción`);
        return false;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        setError(`El item #${i + 1} debe tener una cantidad mayor a cero`);
        return false;
      }
      
      if (!item.price || item.price < 0) {
        setError(`El item #${i + 1} debe tener un precio válido`);
        return false;
      }
    }
    
    // Validar que los totales sean correctos
    if (formData.subtotal <= 0) {
      setError('El subtotal debe ser mayor a cero');
      return false;
    }
    
    // Validar que haya un certificado digital configurado
    hasCertificate().then(exists => {
      if (!exists) {
        setError('No hay un certificado digital configurado. Configure uno en la sección de configuración de e-CF antes de crear facturas.');
        return false;
      }
    }).catch(error => {
      console.error('Error al verificar certificado:', error);
    });
    
    return true;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      // Validar formulario
      if (!validateForm()) return;
      
      setLoading(true);
      setError('');
      
      // Verificar si hay certificado digital configurado
      const certificateExists = await hasCertificate();
      
      if (!certificateExists) {
        setError('No hay un certificado digital configurado. Configure uno en la sección de configuración de e-CF antes de crear facturas.');
        setLoading(false);
        return;
      }
      
      // Cargar configuración de e-CF
      const ecfConfig = await loadECFConfig();
      
      // Guardar factura
      const invoiceId = await saveInvoice('pendiente');
      
      if (!invoiceId) {
        setError('Error al guardar la factura');
        setLoading(false);
        return;
      }
      
      // Generar PDF
      await generatePDF(invoiceId);
      
      // Si está configurado para envío automático o el usuario hizo clic en "Enviar a DGII"
      if (ecfConfig.autoSendToDGII || e && e.nativeEvent && e.nativeEvent.submitter && e.nativeEvent.submitter.innerText === 'Enviar a DGII') {
        await sendToDGII(invoiceId);
      }
      
      // Redirigir a la página de detalles de la factura
      setTimeout(() => {
        navigate(`/facturas/${invoiceId}`);
      }, 2000);
    } catch (error) {
      console.error('Error al procesar la factura:', error);
      setError(`Error al procesar la factura: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Guardar factura en Firestore
  const saveInvoice = async (status = 'pendiente') => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const invoiceId = isEditMode ? id : uuidv4();
      const trackId = isEditMode && formData.trackId ? formData.trackId : `ECF-${Date.now()}`;
      
      const invoiceData = {
        ...formData,
        status,
        trackId,
        date: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Crear factura electrónica
      const ecfInvoice = await createInvoice(invoiceData);
      
      if (isEditMode) {
        await updateDoc(doc(db, 'invoices', invoiceId), ecfInvoice);
        setSuccess('Factura actualizada correctamente.');
      } else {
        await setDoc(doc(db, 'invoices', invoiceId), ecfInvoice);
        setSuccess('Factura guardada correctamente.');
      }
      
      return invoiceId;
    } catch (error) {
      console.error('Error al guardar la factura:', error);
      setError('Error al guardar la factura. Por favor, intenta nuevamente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generar PDF de la factura
  const generatePDF = async (invoiceId) => {
    try {
      setLoading(true);
      
      // Generar PDF de la factura electrónica
      const pdfUrl = await generateInvoicePDF(invoiceId);
      
      if (pdfUrl) {
        setPdfUrl(pdfUrl);
        
        // Actualizar factura con URL del PDF
        await updateDoc(doc(db, 'invoices', invoiceId), {
          pdfUrl
        });
        
        return pdfUrl;
      } else {
        throw new Error('No se pudo generar el PDF');
      }
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      setError('Error al generar el PDF. Por favor, intenta nuevamente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Enviar factura a la DGII
  const sendToDGII = async (invoiceId) => {
    try {
      setLoading(true);
      
      // Enviar factura electrónica a la DGII
      const sent = await sendInvoiceToDGII(invoiceId);
      
      if (sent) {
        // Actualizar estado de la factura
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: 'enviada',
          dgiiResponse: sent
        });
        
        setSuccess('Factura enviada correctamente a la DGII.');
        return true;
      } else {
        throw new Error('Error al enviar a DGII');
      }
    } catch (error) {
      console.error('Error al enviar a DGII:', error);
      setError('Error al enviar a DGII. La factura se guardará como pendiente para reintento automático.');
      
      // Actualizar estado para reintento
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'pendiente',
        lastRetryAttempt: serverTimestamp()
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Renderizar paso actual
  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return renderClientForm();
      case 1:
        return renderItemsForm();
      case 2:
        return renderReview();
      default:
        return null;
    }
  };

  // Formulario de datos del cliente
  const renderClientForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Datos del Cliente
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Nombre/Razón Social"
          name="client"
          value={formData.client}
          onChange={handleChange}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="RNC/Cédula"
          name="rnc"
          value={formData.rnc}
          onChange={handleChange}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Dirección"
          name="address"
          value={formData.address}
          onChange={handleChange}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Correo Electrónico"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Teléfono"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Método de Pago</InputLabel>
          <Select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            label="Método de Pago"
          >
            <MenuItem value="efectivo">Efectivo</MenuItem>
            <MenuItem value="tarjeta">Tarjeta de Crédito/Débito</MenuItem>
            <MenuItem value="transferencia">Transferencia Bancaria</MenuItem>
            <MenuItem value="cheque">Cheque</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  // Formulario de productos/servicios
  const renderItemsForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Productos/Servicios
          </Typography>
          <Button 
            startIcon={<AddIcon />} 
            onClick={handleAddItem}
            variant="outlined"
            size="small"
          >
            Agregar
          </Button>
        </Box>
      </Grid>
      
      {formData.items.map((item, index) => (
        <Grid item xs={12} key={index}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Descripción"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="Cantidad"
                  type="number"
                  InputProps={{ inputProps: { min: 1 } }}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="Precio Unitario (RD$)"
                  type="number"
                  InputProps={{ inputProps: { min: 0 } }}
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  required
                  fullWidth
                  label="ITBIS (%)"
                  type="number"
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                  value={item.tax}
                  onChange={(e) => handleItemChange(index, 'tax', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconButton 
                  color="error" 
                  onClick={() => handleRemoveItem(index)}
                  disabled={formData.items.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      ))}
      
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1">
                Subtotal: RD$ {formData.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1">
                ITBIS: RD$ {formData.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h6">
                Total: RD$ {formData.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Notas"
          name="notes"
          multiline
          rows={3}
          value={formData.notes}
          onChange={handleChange}
        />
      </Grid>
    </Grid>
  );

  // Revisión final
  const renderReview = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Revisión de Factura
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Datos del Cliente
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Cliente:</strong> {formData.client}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>RNC/Cédula:</strong> {formData.rnc}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                <strong>Dirección:</strong> {formData.address || 'No especificada'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Correo:</strong> {formData.email || 'No especificado'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Teléfono:</strong> {formData.phone || 'No especificado'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                <strong>Método de Pago:</strong> {
                  {
                    'efectivo': 'Efectivo',
                    'tarjeta': 'Tarjeta de Crédito/Débito',
                    'transferencia': 'Transferencia Bancaria',
                    'cheque': 'Cheque'
                  }[formData.paymentMethod]
                }
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      <Grid item xs={12}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Productos/Servicios
          </Typography>
          <Grid container spacing={2}>
            {formData.items.map((item, index) => (
              <Grid item xs={12} key={index}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {item.description}
                  </Typography>
                  <Typography variant="body2">
                    {item.quantity} x RD$ {item.price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    ITBIS ({item.tax}%)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    RD$ {(item.quantity * item.price * (item.tax / 100)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">
                  Subtotal
                </Typography>
                <Typography variant="body1">
                  RD$ {formData.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">
                  ITBIS Total
                </Typography>
                <Typography variant="body1">
                  RD$ {formData.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">
                  Total
                </Typography>
                <Typography variant="h6">
                  RD$ {formData.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {formData.notes && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Notas
            </Typography>
            <Typography variant="body2">
              {formData.notes}
            </Typography>
          </Paper>
        </Grid>
      )}
      
      <Grid item xs={12}>
        <Alert severity="info">
          Al enviar esta factura, se generará un e-CF que será transmitido a la DGII. Asegúrate de que todos los datos sean correctos.
        </Alert>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/facturas')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Editar Factura' : 'Nueva Factura'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit}>
          {renderStep()}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Atrás
            </Button>
            <Box>
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Siguiente
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Enviar a DGII'}
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
