import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Security as SecurityIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useNavigate } from 'react-router-dom';

export default function InvoiceSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    nextInvoiceNumber: 1,
    invoicePrefix: 'ECF',
    defaultTaxRate: 18,
    invoiceNotes: '',
    autoSendEmail: false,
    defaultEmailSubject: 'Factura Electrónica (e-CF) - {company}',
    defaultEmailBody: 'Estimado/a {client},\n\nAdjunto encontrará la Factura Electrónica (e-CF) #{number} por un monto de RD$ {total}, emitida el {date}.\n\nEste documento cumple con los requisitos establecidos por la DGII según la Ley 32-23 de Facturación Electrónica.\n\nAtentamente,\n{company}\nRNC: {rnc}',
    invoiceSequenceType: 'automatic',
    defaultDueDate: 30, // días
    defaultCurrency: 'DOP',
    showLogo: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const settingsDoc = doc(db, 'settings', 'invoice');
      const settingsSnapshot = await getDoc(settingsDoc);
      
      if (settingsSnapshot.exists()) {
        const data = settingsSnapshot.data();
        setSettings(prevSettings => ({
          ...prevSettings,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error al cargar configuración de facturación:', error);
      setError('Error al cargar datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Validar que el número de factura sea un número positivo
      if (settings.nextInvoiceNumber <= 0) {
        setError('El número de factura debe ser mayor que cero');
        setSaving(false);
        return;
      }
      
      // Guardar configuración
      await setDoc(doc(db, 'settings', 'invoice'), settings);
      
      setSuccess('Configuración de facturación guardada correctamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setError('Error al guardar configuración. Por favor, intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de Facturación
      </Typography>
      
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
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
                Configuración de e-CF (Facturación Electrónica)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure los parámetros para la facturación electrónica según la Ley 32-23 de la DGII
              </Typography>
            </Box>
          </Box>
          <Typography variant="body1" paragraph>
            En esta sección puede configurar los parámetros necesarios para la facturación electrónica, incluyendo:
          </Typography>
          <ul>
            <li>Certificado digital para firma electrónica</li>
            <li>Credenciales de acceso a la API de la DGII</li>
            <li>Configuración de seguridad para la encriptación de certificados</li>
            <li>Modo de prueba o producción</li>
          </ul>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/configuracion/ecf')}
          >
            Configurar e-CF
          </Button>
        </CardActions>
      </Card>
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            Configuración General
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prefijo de Factura"
                name="invoicePrefix"
                value={settings.invoicePrefix}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Próximo Número de Factura"
                name="nextInvoiceNumber"
                type="number"
                value={settings.nextInvoiceNumber}
                onChange={handleChange}
                margin="normal"
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="sequence-type-label">Tipo de Secuencia</InputLabel>
                <Select
                  labelId="sequence-type-label"
                  name="invoiceSequenceType"
                  value={settings.invoiceSequenceType}
                  onChange={handleChange}
                  label="Tipo de Secuencia"
                >
                  <MenuItem value="automatic">Automática</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tasa de Impuesto Predeterminada (%)"
                name="defaultTaxRate"
                type="number"
                value={settings.defaultTaxRate}
                onChange={handleChange}
                margin="normal"
                required
                inputProps={{ min: 0, max: 100, step: 0.01 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plazo de Pago Predeterminado (días)"
                name="defaultDueDate"
                type="number"
                value={settings.defaultDueDate}
                onChange={handleChange}
                margin="normal"
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="currency-label">Moneda Predeterminada</InputLabel>
                <Select
                  labelId="currency-label"
                  name="defaultCurrency"
                  value={settings.defaultCurrency}
                  onChange={handleChange}
                  label="Moneda Predeterminada"
                >
                  <MenuItem value="DOP">Peso Dominicano (DOP)</MenuItem>
                  <MenuItem value="USD">Dólar Estadounidense (USD)</MenuItem>
                  <MenuItem value="EUR">Euro (EUR)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showLogo}
                    onChange={handleChange}
                    name="showLogo"
                  />
                }
                label="Mostrar logo de la empresa en las facturas"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Notas y Términos
          </Typography>
          
          <TextField
            fullWidth
            label="Notas Predeterminadas para Facturas"
            name="invoiceNotes"
            value={settings.invoiceNotes}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={4}
            helperText="Estas notas aparecerán en todas las facturas"
          />
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Configuración de Correo Electrónico
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSendEmail}
                onChange={handleChange}
                name="autoSendEmail"
              />
            }
            label="Enviar automáticamente por correo electrónico al generar una factura"
          />
          
          <TextField
            fullWidth
            label="Asunto Predeterminado"
            name="defaultEmailSubject"
            value={settings.defaultEmailSubject}
            onChange={handleChange}
            margin="normal"
            helperText="Puedes usar {company}, {number}, {date}, {total} como variables"
          />
          
          <TextField
            fullWidth
            label="Cuerpo Predeterminado"
            name="defaultEmailBody"
            value={settings.defaultEmailBody}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={6}
            helperText="Puedes usar {client}, {company}, {number}, {date}, {total}, {rnc} como variables"
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : 'Guardar Configuración'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
