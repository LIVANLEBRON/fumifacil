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
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';

export default function QuoteForm() {
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
    area: '',
    pest: '',
    frequency: 'unica',
    description: '',
    cost: 0,
    notes: '',
    status: 'pendiente',
    date: new Date()
  });
  
  // Estados adicionales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  
  // Cargar datos de cotización existente en modo edición
  useEffect(() => {
    if (isEditMode) {
      const fetchQuote = async () => {
        try {
          setLoading(true);
          const quoteDoc = await getDoc(doc(db, 'quotes', id));
          
          if (quoteDoc.exists()) {
            const quoteData = quoteDoc.data();
            setFormData({
              ...quoteData,
              date: quoteData.date ? quoteData.date.toDate() : new Date()
            });
            
            if (quoteData.pdfUrl) {
              setPdfUrl(quoteData.pdfUrl);
            }
          } else {
            setError('No se encontró la cotización solicitada.');
            navigate('/cotizaciones');
          }
        } catch (error) {
          console.error('Error al cargar la cotización:', error);
          setError('Error al cargar la cotización. Por favor, intenta nuevamente.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchQuote();
    }
  }, [id, isEditMode, navigate]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambio de fecha
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date
    }));
  };

  // Validar formulario antes de guardar
  const validateForm = () => {
    if (!formData.client.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return false;
    }
    
    if (!formData.area.trim()) {
      setError('El área a fumigar es obligatoria.');
      return false;
    }
    
    if (!formData.pest.trim()) {
      setError('El tipo de plaga es obligatorio.');
      return false;
    }
    
    if (formData.cost <= 0) {
      setError('El costo debe ser mayor que cero.');
      return false;
    }
    
    return true;
  };

  // Generar PDF de la cotización
  const generatePDF = async (quoteId) => {
    try {
      setLoading(true);
      
      // Llamar a Cloud Function para generar PDF
      const generateQuotePDF = httpsCallable(functions, 'generateQuotePDF');
      const result = await generateQuotePDF({ quoteId });
      
      if (result.data && result.data.pdfUrl) {
        setPdfUrl(result.data.pdfUrl);
        
        // Actualizar cotización con URL del PDF
        await updateDoc(doc(db, 'quotes', quoteId), {
          pdfUrl: result.data.pdfUrl
        });
        
        return result.data.pdfUrl;
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

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const quoteId = isEditMode ? id : uuidv4();
      
      const quoteData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode) {
        await updateDoc(doc(db, 'quotes', quoteId), quoteData);
        setSuccess('Cotización actualizada correctamente.');
      } else {
        quoteData.createdAt = serverTimestamp();
        await setDoc(doc(db, 'quotes', quoteId), quoteData);
        setSuccess('Cotización guardada correctamente.');
      }
      
      // Generar PDF
      await generatePDF(quoteId);
      
      setTimeout(() => {
        navigate(`/cotizaciones/${quoteId}`);
      }, 1500);
    } catch (error) {
      console.error('Error al guardar la cotización:', error);
      setError('Error al guardar la cotización. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/cotizaciones')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Editar Cotización' : 'Nueva Cotización'}
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
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
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
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Detalles del Servicio
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha"
                  value={formData.date}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Frecuencia</InputLabel>
                <Select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  label="Frecuencia"
                >
                  <MenuItem value="unica">Única</MenuItem>
                  <MenuItem value="semanal">Semanal</MenuItem>
                  <MenuItem value="quincenal">Quincenal</MenuItem>
                  <MenuItem value="mensual">Mensual</MenuItem>
                  <MenuItem value="trimestral">Trimestral</MenuItem>
                  <MenuItem value="semestral">Semestral</MenuItem>
                  <MenuItem value="anual">Anual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Área a Fumigar"
                name="area"
                value={formData.area}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Tipo de Plaga"
                name="pest"
                value={formData.pest}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción del Servicio"
                name="description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Costo (RD$)"
                name="cost"
                type="number"
                InputProps={{ 
                  inputProps: { min: 0 },
                  startAdornment: (
                    <InputAdornment position="start">
                      RD$
                    </InputAdornment>
                  )
                }}
                value={formData.cost}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Estado"
                >
                  <MenuItem value="pendiente">Pendiente</MenuItem>
                  <MenuItem value="aceptada">Aceptada</MenuItem>
                  <MenuItem value="rechazada">Rechazada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas Adicionales"
                name="notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/cotizaciones')}
                  sx={{ mr: 1 }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
