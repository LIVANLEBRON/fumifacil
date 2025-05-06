import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  InputAdornment
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Upload as UploadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';
import { v4 as uuidv4 } from 'uuid';

export default function CompanySettings() {
  const [companyData, setCompanyData] = useState({
    name: '',
    rnc: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    taxRate: 18,
    bankInfo: '',
    termsAndConditions: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const companyDoc = doc(db, 'settings', 'company');
      const companySnapshot = await getDoc(companyDoc);
      
      if (companySnapshot.exists()) {
        const data = companySnapshot.data();
        setCompanyData(data);
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos de la empresa:', error);
      setError('Error al cargar datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Crear URL para previsualización
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setCompanyData(prev => ({
      ...prev,
      logoUrl: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      let updatedCompanyData = { ...companyData };
      
      // Si hay un nuevo logo, subirlo a Firebase Storage
      if (logoFile) {
        // Si ya existe un logo anterior, eliminarlo
        if (companyData.logoUrl) {
          try {
            const oldLogoRef = ref(storage, companyData.logoUrl);
            await deleteObject(oldLogoRef);
          } catch (error) {
            console.error('Error al eliminar logo anterior:', error);
          }
        }
        
        // Subir nuevo logo
        const logoFileName = `company_logos/${uuidv4()}_${logoFile.name}`;
        const logoRef = ref(storage, logoFileName);
        await uploadBytes(logoRef, logoFile);
        
        // Obtener URL del logo subido
        const logoUrl = await getDownloadURL(logoRef);
        updatedCompanyData.logoUrl = logoUrl;
      }
      
      // Guardar datos de la empresa
      await setDoc(doc(db, 'settings', 'company'), updatedCompanyData);
      
      setSuccess('Configuración de la empresa guardada correctamente');
      setLogoFile(null);
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
        Configuración de la Empresa
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
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nombre de la Empresa"
                name="name"
                value={companyData.name}
                onChange={handleChange}
                required
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="RNC"
                name="rnc"
                value={companyData.rnc}
                onChange={handleChange}
                required
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Dirección"
                name="address"
                value={companyData.address}
                onChange={handleChange}
                required
                multiline
                rows={2}
                margin="normal"
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    name="phone"
                    value={companyData.phone}
                    onChange={handleChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={companyData.email}
                    onChange={handleChange}
                    margin="normal"
                  />
                </Grid>
              </Grid>
              
              <TextField
                fullWidth
                label="Sitio Web"
                name="website"
                value={companyData.website}
                onChange={handleChange}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Tasa de Impuesto (%)"
                name="taxRate"
                type="number"
                value={companyData.taxRate}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Logo de la Empresa
                  </Typography>
                  
                  {logoPreview ? (
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <CardMedia
                        component="img"
                        image={logoPreview}
                        alt="Logo de la empresa"
                        sx={{ 
                          height: 150, 
                          objectFit: 'contain',
                          border: '1px solid #eee',
                          borderRadius: 1
                        }}
                      />
                      <IconButton
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bgcolor: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          }
                        }}
                        onClick={handleDeleteLogo}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box 
                      sx={{ 
                        height: 150, 
                        border: '1px dashed #ccc',
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mb: 2
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Sin logo
                      </Typography>
                    </Box>
                  )}
                  
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    fullWidth
                  >
                    Subir Logo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              
              <TextField
                fullWidth
                label="Información Bancaria"
                name="bankInfo"
                value={companyData.bankInfo}
                onChange={handleChange}
                multiline
                rows={3}
                margin="normal"
                placeholder="Detalles de cuenta bancaria para pagos"
              />
              
              <TextField
                fullWidth
                label="Términos y Condiciones"
                name="termsAndConditions"
                value={companyData.termsAndConditions}
                onChange={handleChange}
                multiline
                rows={4}
                margin="normal"
                placeholder="Términos y condiciones que aparecerán en facturas y cotizaciones"
              />
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                sx={{ mt: 2 }}
              >
                {saving ? <CircularProgress size={24} /> : 'Guardar Configuración'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
