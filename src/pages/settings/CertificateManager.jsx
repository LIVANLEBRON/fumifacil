import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  TextField, 
  Alert, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  InputAdornment
} from '@mui/material';
import { 
  Upload as UploadIcon, 
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { 
  loadCertificateFromFile, 
  encryptCertificate, 
  decryptCertificate 
} from '../../utils/ecf/digitalSignature';

export default function CertificateManager() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateName, setCertificateName] = useState('');
  const [certificatePassword, setCertificatePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError('');
      
      const certificatesDoc = doc(db, 'settings', 'certificates');
      const certificatesSnapshot = await getDoc(certificatesDoc);
      
      if (certificatesSnapshot.exists()) {
        const data = certificatesSnapshot.data();
        setCertificates(data.certificates || []);
      } else {
        // Si no existe el documento, crear uno vacío
        await setDoc(doc(db, 'settings', 'certificates'), { certificates: [] });
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error al cargar certificados:', error);
      setError('Error al cargar certificados. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    setCertificateFile(null);
    setCertificateName('');
    setCertificatePassword('');
    setUploadDialogOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setCertificateFile(e.target.files[0]);
      
      // Usar el nombre del archivo como nombre predeterminado del certificado
      if (!certificateName) {
        const fileName = e.target.files[0].name.split('.')[0];
        setCertificateName(fileName);
      }
    }
  };

  const handleUploadCertificate = async () => {
    if (!certificateFile || !certificateName || !certificatePassword) {
      setError('Todos los campos son requeridos');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Cargar el certificado desde el archivo
      const certificate = await loadCertificateFromFile(certificateFile);
      
      // Cifrar el certificado con la contraseña
      const encryptedCertificate = encryptCertificate(certificate, certificatePassword);
      
      // Obtener los certificados actuales
      const certificatesDoc = doc(db, 'settings', 'certificates');
      const certificatesSnapshot = await getDoc(certificatesDoc);
      
      let currentCertificates = [];
      if (certificatesSnapshot.exists()) {
        currentCertificates = certificatesSnapshot.data().certificates || [];
      }
      
      // Agregar el nuevo certificado
      const newCertificate = {
        id: Date.now().toString(),
        name: certificateName,
        encryptedData: encryptedCertificate,
        createdAt: new Date()
      };
      
      // Actualizar la lista de certificados
      const updatedCertificates = [...currentCertificates, newCertificate];
      await setDoc(doc(db, 'settings', 'certificates'), { certificates: updatedCertificates });
      
      // Actualizar el estado
      setCertificates(updatedCertificates);
      setSuccess('Certificado cargado correctamente');
      setUploadDialogOpen(false);
      
      // Limpiar el formulario
      setCertificateFile(null);
      setCertificateName('');
      setCertificatePassword('');
    } catch (error) {
      console.error('Error al cargar el certificado:', error);
      setError('Error al cargar el certificado. Por favor, verifica el archivo y la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (certificate) => {
    setSelectedCertificate(certificate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCertificate = async () => {
    if (!selectedCertificate) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Obtener los certificados actuales
      const certificatesDoc = doc(db, 'settings', 'certificates');
      const certificatesSnapshot = await getDoc(certificatesDoc);
      
      if (certificatesSnapshot.exists()) {
        const currentCertificates = certificatesSnapshot.data().certificates || [];
        
        // Filtrar el certificado a eliminar
        const updatedCertificates = currentCertificates.filter(
          cert => cert.id !== selectedCertificate.id
        );
        
        // Actualizar la lista de certificados
        await setDoc(doc(db, 'settings', 'certificates'), { certificates: updatedCertificates });
        
        // Actualizar el estado
        setCertificates(updatedCertificates);
        setSuccess('Certificado eliminado correctamente');
        setDeleteDialogOpen(false);
        setSelectedCertificate(null);
      }
    } catch (error) {
      console.error('Error al eliminar el certificado:', error);
      setError('Error al eliminar el certificado. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockClick = (certificate) => {
    setSelectedCertificate(certificate);
    setUnlockPassword('');
    setUnlockDialogOpen(true);
  };

  const handleUnlockCertificate = async () => {
    if (!selectedCertificate || !unlockPassword) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Intentar descifrar el certificado
      const decryptedCertificate = decryptCertificate(
        selectedCertificate.encryptedData,
        unlockPassword
      );
      
      // Si llegamos aquí, el descifrado fue exitoso
      setSuccess('Certificado desbloqueado correctamente');
      
      // Aquí podrías hacer algo con el certificado desbloqueado,
      // como almacenarlo temporalmente en el estado para su uso
      
      setUnlockDialogOpen(false);
      setUnlockPassword('');
    } catch (error) {
      console.error('Error al desbloquear el certificado:', error);
      setError('Contraseña incorrecta o certificado inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestión de Certificados Digitales
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" paragraph>
          Los certificados digitales son necesarios para firmar las facturas electrónicas (e-CF) 
          según los requisitos de la DGII. Estos certificados son emitidos por entidades certificadoras 
          autorizadas por la DGII.
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
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Certificados Disponibles
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUploadClick}
          >
            Cargar Certificado
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {loading && !certificates.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {certificates.map((cert) => (
              <ListItem key={cert.id} sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemText 
                  primary={cert.name} 
                  secondary={`Creado: ${new Date(cert.createdAt.seconds * 1000).toLocaleDateString()}`} 
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="unlock" 
                    onClick={() => handleUnlockClick(cert)}
                    sx={{ mr: 1 }}
                  >
                    <SecurityIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeleteClick(cert)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {!certificates.length && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No hay certificados registrados
              </Typography>
            )}
          </List>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información Importante
        </Typography>
        
        <Typography variant="body2" paragraph>
          <strong>Seguridad:</strong> Los certificados se almacenan cifrados y solo se pueden utilizar 
          proporcionando la contraseña correcta. Nunca compartimos ni almacenamos su contraseña.
        </Typography>
        
        <Typography variant="body2" paragraph>
          <strong>Validez:</strong> Asegúrese de que su certificado digital esté vigente y haya sido 
          emitido por una entidad certificadora autorizada por la DGII.
        </Typography>
        
        <Typography variant="body2">
          <strong>Soporte:</strong> Para obtener un certificado digital, contacte a una entidad 
          certificadora autorizada o visite el portal de la DGII.
        </Typography>
      </Paper>
      
      {/* Diálogo para cargar certificado */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
        <DialogTitle>Cargar Certificado Digital</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Seleccione el archivo del certificado digital y proporcione una contraseña para protegerlo.
            Esta contraseña será necesaria cada vez que se utilice el certificado para firmar documentos.
          </DialogContentText>
          
          <TextField
            fullWidth
            label="Nombre del Certificado"
            value={certificateName}
            onChange={(e) => setCertificateName(e.target.value)}
            margin="normal"
            required
          />
          
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          >
            Seleccionar Archivo
            <input
              type="file"
              hidden
              accept=".p12,.pfx,.cer,.crt"
              onChange={handleFileChange}
            />
          </Button>
          
          {certificateFile && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Archivo seleccionado: {certificateFile.name}
            </Typography>
          )}
          
          <TextField
            fullWidth
            label="Contraseña del Certificado"
            type={showPassword ? 'text' : 'password'}
            value={certificatePassword}
            onChange={(e) => setCertificatePassword(e.target.value)}
            margin="normal"
            required
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleUploadCertificate} 
            disabled={!certificateFile || !certificateName || !certificatePassword || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Cargar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para eliminar certificado */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea eliminar el certificado "{selectedCertificate?.name}"?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteCertificate} color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para desbloquear certificado */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)}>
        <DialogTitle>Desbloquear Certificado</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Ingrese la contraseña para desbloquear el certificado "{selectedCertificate?.name}".
          </DialogContentText>
          
          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
            margin="normal"
            required
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleUnlockCertificate} 
            disabled={!unlockPassword || loading}
            color="primary"
          >
            {loading ? <CircularProgress size={24} /> : 'Desbloquear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
