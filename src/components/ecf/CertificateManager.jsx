import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  IconButton,
  Chip
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { hasCertificate, loadECFConfig, saveCertificate, saveECFConfig } from '../../utils/ecf/certificateService';

/**
 * Componente para gestionar certificados digitales para e-CF
 */
export default function CertificateManager() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasCert, setHasCert] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [autoSend, setAutoSend] = useState(false);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    certificateFile: null,
    password: '',
    encryptionKey: '',
    issuer: '',
    validUntil: '',
    subject: ''
  });
  
  // Cargar estado inicial
  useEffect(() => {
    const checkCertificate = async () => {
      try {
        const certExists = await hasCertificate();
        setHasCert(certExists);
        
        // Cargar configuración de e-CF
        const config = await loadECFConfig();
        setTestMode(config.testMode);
        setAutoSend(config.autoSendToDGII);
      } catch (error) {
        console.error('Error al verificar certificado:', error);
      }
    };
    
    checkCertificate();
  }, []);
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Manejar cambio de archivo
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        certificateFile: e.target.files[0]
      }));
    }
  };
  
  // Manejar cambio en configuración
  const handleConfigChange = async (key, value) => {
    try {
      setLoading(true);
      
      // Actualizar estado local
      if (key === 'testMode') {
        setTestMode(value);
      } else if (key === 'autoSend') {
        setAutoSend(value);
      }
      
      // Guardar configuración
      await saveECFConfig({
        testMode: key === 'testMode' ? value : testMode,
        autoSendToDGII: key === 'autoSend' ? value : autoSend
      });
      
      setSuccess('Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      setError('Error al actualizar configuración');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulario
    if (!formData.certificateFile) {
      setError('Debe seleccionar un archivo de certificado');
      return;
    }
    
    if (!formData.password) {
      setError('Debe ingresar la contraseña del certificado');
      return;
    }
    
    if (!formData.encryptionKey) {
      setError('Debe ingresar una clave de encriptación');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Leer archivo como ArrayBuffer
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          
          // Guardar certificado
          await saveCertificate(
            buffer,
            formData.password,
            formData.encryptionKey,
            {
              issuer: formData.issuer || 'DGII',
              validUntil: formData.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              subject: formData.subject || 'Certificado Digital e-CF'
            }
          );
          
          setSuccess('Certificado guardado correctamente');
          setHasCert(true);
          
          // Limpiar formulario
          setFormData({
            certificateFile: null,
            password: '',
            encryptionKey: '',
            issuer: '',
            validUntil: '',
            subject: ''
          });
        } catch (error) {
          console.error('Error al guardar certificado:', error);
          setError(`Error al guardar certificado: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      
      fileReader.onerror = () => {
        setError('Error al leer el archivo');
        setLoading(false);
      };
      
      fileReader.readAsArrayBuffer(formData.certificateFile);
    } catch (error) {
      console.error('Error al procesar certificado:', error);
      setError(`Error al procesar certificado: ${error.message}`);
      setLoading(false);
    }
  };
  
  // Manejar eliminación de certificado
  const handleDeleteCertificate = async () => {
    // Implementación pendiente - En una aplicación real, se eliminaría el certificado
    setDeleteDialogOpen(false);
    setError('Función no implementada. Por razones de seguridad, contacte al administrador para eliminar certificados.');
  };
  
  return (
    <Box>
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configuración de Facturación Electrónica (e-CF)
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Modo de operación
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant={testMode ? "contained" : "outlined"} 
                color="primary"
                onClick={() => handleConfigChange('testMode', true)}
                disabled={loading || testMode}
              >
                Modo de prueba
              </Button>
              <Button 
                variant={!testMode ? "contained" : "outlined"} 
                color="primary"
                onClick={() => handleConfigChange('testMode', false)}
                disabled={loading || !testMode}
              >
                Modo de producción
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {testMode 
                ? "En modo de prueba, las facturas se envían al ambiente de pruebas de la DGII." 
                : "En modo de producción, las facturas se envían al ambiente real de la DGII."}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Envío automático a DGII
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant={autoSend ? "contained" : "outlined"} 
                color="primary"
                onClick={() => handleConfigChange('autoSend', true)}
                disabled={loading || autoSend}
              >
                Activado
              </Button>
              <Button 
                variant={!autoSend ? "contained" : "outlined"} 
                color="primary"
                onClick={() => handleConfigChange('autoSend', false)}
                disabled={loading || !autoSend}
              >
                Desactivado
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {autoSend 
                ? "Las facturas se enviarán automáticamente a la DGII al ser creadas." 
                : "Las facturas deberán enviarse manualmente a la DGII."}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Certificado Digital
          </Typography>
          
          {hasCert && (
            <Chip 
              icon={<CheckCircleIcon />} 
              label="Certificado configurado" 
              color="success" 
              variant="outlined" 
            />
          )}
        </Box>
        
        {hasCert ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              El certificado digital está configurado y listo para usar.
            </Alert>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Eliminar certificado
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
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
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  Seleccionar certificado (.p12)
                  <input
                    type="file"
                    accept=".p12,.pfx"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                {formData.certificateFile && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Archivo seleccionado: {formData.certificateFile.name}
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="password"
                  label="Contraseña del certificado"
                  value={formData.password}
                  onChange={handleChange}
                  fullWidth
                  required
                  type={showPassword ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="encryptionKey"
                  label="Clave de encriptación"
                  value={formData.encryptionKey}
                  onChange={handleChange}
                  fullWidth
                  required
                  type={showPassword ? 'text' : 'password'}
                  helperText="Esta clave se usará para encriptar el certificado. Guárdela en un lugar seguro."
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="issuer"
                  label="Emisor del certificado"
                  value={formData.issuer}
                  onChange={handleChange}
                  fullWidth
                  placeholder="DGII"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="validUntil"
                  label="Válido hasta"
                  type="date"
                  value={formData.validUntil}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="subject"
                  label="Asunto del certificado"
                  value={formData.subject}
                  onChange={handleChange}
                  fullWidth
                  placeholder="Certificado Digital e-CF"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SecurityIcon />}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Guardando...
                    </>
                  ) : (
                    'Guardar certificado'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
      
      {/* Diálogo de confirmación para eliminar certificado */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Eliminar certificado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea eliminar el certificado digital? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteCertificate} color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
