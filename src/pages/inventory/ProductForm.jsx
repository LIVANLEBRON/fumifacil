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
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useDropzone } from 'react-dropzone';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    name: '',
    lot: '',
    quantity: 0,
    unit: 'litros',
    expiration: new Date(new Date().setMonth(new Date().getMonth() + 6)), // 6 meses por defecto
    notes: ''
  });
  
  // Estados adicionales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [deleteImage, setDeleteImage] = useState(false);
  
  // Configuración de dropzone para subir imágenes
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/jpg': []
    },
    maxSize: 2097152, // 2MB
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setImageFile(file);
        
        // Generar vista previa
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
        
        setDeleteImage(false);
      }
    },
    onDropRejected: (rejectedFiles) => {
      if (rejectedFiles[0]?.errors[0]?.code === 'file-too-large') {
        setError('La imagen es demasiado grande. El tamaño máximo permitido es 2MB.');
      } else {
        setError('Formato de archivo no válido. Solo se permiten imágenes JPG y PNG.');
      }
    }
  });

  // Cargar datos del producto existente en modo edición
  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          const productDoc = await getDoc(doc(db, 'inventory', id));
          
          if (productDoc.exists()) {
            const productData = productDoc.data();
            setFormData({
              ...productData,
              expiration: productData.expiration.toDate()
            });
            
            if (productData.imageUrl) {
              setImagePreview(productData.imageUrl);
            }
          } else {
            setError('No se encontró el producto solicitado.');
            navigate('/inventario');
          }
        } catch (error) {
          console.error('Error al cargar el producto:', error);
          setError('Error al cargar el producto. Por favor, intenta nuevamente.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProduct();
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

  // Manejar cambio de fecha de vencimiento
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      expiration: date
    }));
  };

  // Validar formulario antes de guardar
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio.');
      return false;
    }
    
    if (!formData.lot.trim()) {
      setError('El número de lote es obligatorio.');
      return false;
    }
    
    if (formData.quantity <= 0) {
      setError('La cantidad debe ser mayor que cero.');
      return false;
    }
    
    if (!formData.unit) {
      setError('La unidad de medida es obligatoria.');
      return false;
    }
    
    if (!formData.expiration) {
      setError('La fecha de vencimiento es obligatoria.');
      return false;
    }
    
    return true;
  };

  // Subir imagen al Storage
  const uploadImage = async (productId) => {
    if (!imageFile) return null;
    
    try {
      // Comprimir imagen antes de subir (esto se haría idealmente con sharp en el servidor)
      const imageRef = ref(storage, `inventory/${productId}.jpg`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      return imageUrl;
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      throw error;
    }
  };

  // Eliminar imagen del Storage
  const deleteImageFromStorage = async (productId) => {
    try {
      const imageRef = ref(storage, `inventory/${productId}.jpg`);
      await deleteObject(imageRef);
      return true;
    } catch (error) {
      console.error('Error al eliminar la imagen:', error);
      return false;
    }
  };

  // Manejar eliminación de imagen
  const handleDeleteImage = () => {
    setImagePreview('');
    setImageFile(null);
    setDeleteImage(true);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const productId = isEditMode ? id : uuidv4();
      let imageUrl = null;
      
      // Manejar imagen
      if (isEditMode) {
        if (deleteImage) {
          // Eliminar imagen existente
          await deleteImageFromStorage(productId);
          imageUrl = null;
        } else if (imageFile) {
          // Actualizar imagen
          imageUrl = await uploadImage(productId);
        } else {
          // Mantener imagen existente
          imageUrl = imagePreview || null;
        }
      } else if (imageFile) {
        // Nueva imagen para producto nuevo
        imageUrl = await uploadImage(productId);
      }
      
      const productData = {
        ...formData,
        imageUrl,
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode) {
        await updateDoc(doc(db, 'inventory', productId), productData);
        setSuccess('Producto actualizado correctamente.');
      } else {
        productData.createdAt = serverTimestamp();
        await setDoc(doc(db, 'inventory', productId), productData);
        setSuccess('Producto agregado correctamente.');
      }
      
      setTimeout(() => {
        navigate('/inventario');
      }, 1500);
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      setError('Error al guardar el producto. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/inventario')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
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
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Nombre del Producto"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Número de Lote"
                    name="lot"
                    value={formData.lot}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha de Vencimiento"
                      value={formData.expiration}
                      onChange={handleDateChange}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Cantidad"
                    name="quantity"
                    type="number"
                    InputProps={{ 
                      inputProps: { min: 0 },
                      startAdornment: (
                        <InputAdornment position="start">
                          #
                        </InputAdornment>
                      )
                    }}
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Unidad</InputLabel>
                    <Select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      label="Unidad"
                    >
                      <MenuItem value="litros">Litros</MenuItem>
                      <MenuItem value="galones">Galones</MenuItem>
                      <MenuItem value="kilogramos">Kilogramos</MenuItem>
                      <MenuItem value="gramos">Gramos</MenuItem>
                      <MenuItem value="unidades">Unidades</MenuItem>
                      <MenuItem value="cajas">Cajas</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas"
                    name="notes"
                    multiline
                    rows={4}
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Imagen del Producto
              </Typography>
              {imagePreview ? (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <img 
                    src={imagePreview} 
                    alt="Vista previa" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '200px', 
                      objectFit: 'contain',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }} 
                  />
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                      }
                    }}
                    onClick={handleDeleteImage}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box 
                  {...getRootProps()} 
                  sx={{ 
                    border: '2px dashed #ccc', 
                    borderRadius: '4px',
                    p: 2,
                    mb: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <input {...getInputProps()} />
                  <PhotoCameraIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" gutterBottom>
                    Arrastra una imagen aquí o haz clic para seleccionar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Formatos: JPG, PNG (máx. 2MB)
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/inventario')}
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
