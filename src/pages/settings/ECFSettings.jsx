import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Save as SaveIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import CryptoJS from 'crypto-js';
import CertificateManager from '../../components/ecf/CertificateManager';

/**
 * Componente para la configuración de facturación electrónica (e-CF)
 * Permite gestionar certificados digitales y configuración para la DGII
 */
export default function ECFSettings() {
  // Referencia para el input de archivo
  const fileInputRef = useRef(null);
  
  // Estados para el formulario
  const [formData, setFormData] = useState({
    rnc: '',
    companyName: '',
    certificatePassword: '',
    dgiiUsername: '',
    dgiiPassword: '',
    autoSendToDGII: false,
    testMode: true,
    encryptionKey: ''
  });
  
  // Estados para el certificado
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateInfo, setCertificateInfo] = useState(null);
  const [hasCertificate, setHasCertificate] = useState(false);
  
  // Estados adicionales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDgiiPassword, setShowDgiiPassword] = useState(false);
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  
  // Cargar configuración existente
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Cargar configuración de la empresa
        const companyDoc = await getDoc(doc(db, 'settings', 'company'));
        
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          setFormData(prev => ({
            ...prev,
            rnc: companyData.rnc || '',
            companyName: companyData.name || ''
          }));
        }
        
        // Cargar configuración de e-CF
        const ecfDoc = await getDoc(doc(db, 'settings', 'ecf'));
        
        if (ecfDoc.exists()) {
          const ecfData = ecfDoc.data();
          setFormData(prev => ({
            ...prev,
            dgiiUsername: ecfData.dgiiUsername || '',
            dgiiPassword: ecfData.dgiiPassword || '',
            autoSendToDGII: ecfData.autoSendToDGII || false,
            testMode: ecfData.testMode !== false, // Por defecto true
            encryptionKey: ecfData.encryptionKey || ''
          }));
        }
        
        // Verificar si existe certificado
        const certificateDoc = await getDoc(doc(db, 'settings', 'certificate'));
        
        if (certificateDoc.exists()) {
          setHasCertificate(true);
          setCertificateInfo({
            issuer: certificateDoc.data().issuer || 'No disponible',
            validUntil: certificateDoc.data().validUntil || 'No disponible',
            subject: certificateDoc.data().subject || 'No disponible'
          });
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
        setError('Error al cargar la configuración. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'autoSendToDGII' || name === 'testMode' ? checked : value
    }));
  };
  
  // Manejar selección de archivo de certificado
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCertificateFile(e.target.files[0]);
    }
  };
  
  // Abrir diálogo de selección de archivo
  const handleSelectFile = () => {
    fileInputRef.current.click();
  };
  
  // Encriptar certificado para almacenamiento seguro
  const encryptCertificate = (buffer) => {
    if (!formData.encryptionKey) {
      throw new Error('Se requiere una clave de encriptación');
    }
    
    // Generar un IV aleatorio
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Convertir buffer a WordArray
    const wordArray = CryptoJS.lib.WordArray.create(buffer);
    
    // Encriptar
    const encrypted = CryptoJS.AES.encrypt(wordArray, formData.encryptionKey, {
      iv: iv
    });
    
    // Devolver IV + contenido encriptado
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
  };
  
  // Guardar configuración
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Validar campos requeridos
      if (!formData.rnc) {
        throw new Error('El RNC es obligatorio');
      }
      
      if (!formData.companyName) {
        throw new Error('El nombre de la empresa es obligatorio');
      }
      
      if (!formData.encryptionKey) {
        throw new Error('La clave de encriptación es obligatoria');
      }
      
      // Si hay un certificado nuevo, procesarlo
      if (certificateFile) {
        if (!formData.certificatePassword) {
          throw new Error('La contraseña del certificado es obligatoria');
        }
        
        // Leer el archivo como ArrayBuffer
        const fileBuffer = await certificateFile.arrayBuffer();
        
        // Encriptar el certificado
        const encryptedCertificate = encryptCertificate(fileBuffer);
        
        // Extraer información del certificado (en un entorno real, esto se haría con una biblioteca de certificados)
        // Para este ejemplo, usamos información básica
        const certificateInfo = {
          issuer: 'Cámara de Comercio de República Dominicana',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
          subject: `CN=${formData.companyName}, O=${formData.companyName}, C=DO`,
          fileName: certificateFile.name,
          uploadDate: new Date().toISOString()
        };
        
        // Guardar certificado en Firestore
        await setDoc(doc(db, 'settings', 'certificate'), {
          certificate: encryptedCertificate,
          privateKey: encryptedCertificate, // En un caso real, serían diferentes
          password: formData.certificatePassword,
          ...certificateInfo
        });
        
        setCertificateInfo(certificateInfo);
        setHasCertificate(true);
      }
      
      // Guardar configuración de la empresa
      await setDoc(doc(db, 'settings', 'company'), {
        rnc: formData.rnc,
        name: formData.companyName
      }, { merge: true });
      
      // Guardar configuración de e-CF
      await setDoc(doc(db, 'settings', 'ecf'), {
        dgiiUsername: formData.dgiiUsername,
        dgiiPassword: formData.dgiiPassword,
        autoSendToDGII: formData.autoSendToDGII,
        testMode: formData.testMode,
        encryptionKey: formData.encryptionKey
      });
      
      setSuccess('Configuración guardada correctamente');
      
      // Limpiar campo de contraseña del certificado
      setFormData(prev => ({
        ...prev,
        certificatePassword: ''
      }));
      
      // Limpiar archivo seleccionado
      setCertificateFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      setError(`Error al guardar la configuración: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 30, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Configuración de Facturación Electrónica
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
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Información de la Empresa
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="RNC"
                name="rnc"
                value={formData.rnc}
                onChange={handleChange}
                fullWidth
                required
                helperText="RNC de la empresa registrado en la DGII"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre de la Empresa"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                fullWidth
                required
                helperText="Nombre registrado en la DGII"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Certificado Digital
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            {hasCertificate && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Certificado digital actual:
                  </Typography>
                  <Typography variant="body2">
                    <strong>Emisor:</strong> {certificateInfo?.issuer}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Válido hasta:</strong> {certificateInfo?.validUntil}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Sujeto:</strong> {certificateInfo?.subject}
                  </Typography>
                </Alert>
              </Grid>
            )}
            
            <Grid item xs={12} md={8}>
              <TextField
                label="Seleccionar Certificado Digital"
                value={certificateFile ? certificateFile.name : 'Ningún archivo seleccionado'}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        component="span"
                        onClick={handleSelectFile}
                        startIcon={<UploadIcon />}
                      >
                        Seleccionar
                      </Button>
                    </InputAdornment>
                  )
                }}
                fullWidth
                helperText="Archivo .p12 o .pfx emitido por la DGII"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".p12,.pfx"
                style={{ display: 'none' }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Contraseña del Certificado"
                name="certificatePassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.certificatePassword}
                onChange={handleChange}
                fullWidth
                required={Boolean(certificateFile)}
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
                helperText="Contraseña proporcionada con el certificado"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Configuración DGII
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Usuario DGII"
                name="dgiiUsername"
                value={formData.dgiiUsername}
                onChange={handleChange}
                fullWidth
                helperText="Usuario para acceder a la API de la DGII"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Contraseña DGII"
                name="dgiiPassword"
                type={showDgiiPassword ? 'text' : 'password'}
                value={formData.dgiiPassword}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowDgiiPassword(!showDgiiPassword)}
                        edge="end"
                      >
                        {showDgiiPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Contraseña para acceder a la API de la DGII"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.testMode}
                    onChange={handleChange}
                    name="testMode"
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Modo de Pruebas
                    <Tooltip title="En modo de pruebas, las facturas no se envían realmente a la DGII. Útil para desarrollo y pruebas.">
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoSendToDGII}
                    onChange={handleChange}
                    name="autoSendToDGII"
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Envío Automático a DGII
                    <Tooltip title="Si está activado, las facturas se enviarán automáticamente a la DGII al ser creadas.">
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Seguridad
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Clave de Encriptación"
                name="encryptionKey"
                type={showEncryptionKey ? 'text' : 'password'}
                value={formData.encryptionKey}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowEncryptionKey(!showEncryptionKey)}
                        edge="end"
                      >
                        {showEncryptionKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Clave para encriptar el certificado digital. IMPORTANTE: Guarde esta clave en un lugar seguro, si la pierde no podrá recuperar el certificado."
              />
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>IMPORTANTE:</strong> La información de esta página es altamente sensible. Asegúrate de que solo personal autorizado tenga acceso a esta configuración.
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
                  disabled={loading}
                >
                  Guardar Configuración
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <CertificateManager />
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
