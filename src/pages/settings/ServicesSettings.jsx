import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { collection, addDoc, doc, deleteDoc, updateDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function ServicesSettings() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    unit: 'servicio',
    category: 'fumigacion'
  });
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      
      const servicesQuery = query(
        collection(db, 'services'),
        orderBy('name', 'asc')
      );
      
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = [];
      
      servicesSnapshot.forEach((doc) => {
        servicesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setServices(servicesData);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      setError('Error al cargar datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.name.trim() || !formData.basePrice) {
      setError('El nombre y el precio base son requeridos');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const serviceData = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        createdAt: new Date()
      };
      
      if (editingId) {
        // Actualizar servicio existente
        const serviceRef = doc(db, 'services', editingId);
        await updateDoc(serviceRef, {
          ...serviceData,
          updatedAt: new Date()
        });
        setSuccess('Servicio actualizado correctamente');
        setEditingId(null);
      } else {
        // Crear nuevo servicio
        await addDoc(collection(db, 'services'), serviceData);
        setSuccess('Servicio agregado correctamente');
      }
      
      // Limpiar formulario y recargar datos
      setFormData({
        name: '',
        description: '',
        basePrice: '',
        unit: 'servicio',
        category: 'fumigacion'
      });
      fetchServices();
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      setError('Error al guardar servicio. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      basePrice: service.basePrice.toString(),
      unit: service.unit || 'servicio',
      category: service.category || 'fumigacion'
    });
    setEditingId(service.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      description: '',
      basePrice: '',
      unit: 'servicio',
      category: 'fumigacion'
    });
    setEditingId(null);
  };

  const handleDeleteClick = (service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;
    
    try {
      setLoading(true);
      setError('');
      
      await deleteDoc(doc(db, 'services', serviceToDelete.id));
      
      setServiceToDelete(null);
      setDeleteDialogOpen(false);
      setSuccess('Servicio eliminado correctamente');
      fetchServices();
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      setError('Error al eliminar servicio. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestión de Servicios
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
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {editingId ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Servicio"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio Base"
                name="basePrice"
                type="number"
                value={formData.basePrice}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: <InputAdornment position="start">RD$</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="unit-label">Unidad</InputLabel>
                <Select
                  labelId="unit-label"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  label="Unidad"
                >
                  <MenuItem value="servicio">Servicio</MenuItem>
                  <MenuItem value="m2">Metro Cuadrado (m²)</MenuItem>
                  <MenuItem value="hora">Hora</MenuItem>
                  <MenuItem value="visita">Visita</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="category-label">Categoría</InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  label="Categoría"
                >
                  <MenuItem value="fumigacion">Fumigación</MenuItem>
                  <MenuItem value="desinfeccion">Desinfección</MenuItem>
                  <MenuItem value="control">Control de Plagas</MenuItem>
                  <MenuItem value="prevencion">Prevención</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {editingId && (
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleCancelEdit}
                  startIcon={<CancelIcon />}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                startIcon={editingId ? <SaveIcon /> : <AddIcon />}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : editingId ? 'Actualizar Servicio' : 'Agregar Servicio'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Lista de Servicios
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        {loading && !services.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {services.map((service) => (
              <ListItem key={service.id} sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemText 
                  primary={service.name} 
                  secondary={
                    <Box>
                      <Typography variant="body2" component="span">
                        Precio: RD$ {service.basePrice.toFixed(2)} / {service.unit}
                      </Typography>
                      {service.description && (
                        <Typography variant="body2" color="text.secondary">
                          {service.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="edit" 
                    onClick={() => handleEdit(service)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeleteClick(service)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {!services.length && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No hay servicios registrados
              </Typography>
            )}
          </List>
        )}
      </Paper>
      
      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el servicio "{serviceToDelete?.name}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
