import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Alert, 
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function ClientForm() {
  const [formData, setFormData] = useState({
    name: '',
    rnc: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      fetchClientData(id);
    }
  }, [id]);

  const fetchClientData = async (clientId) => {
    try {
      setLoading(true);
      const clientDoc = doc(db, 'clients', clientId);
      const clientSnapshot = await getDoc(clientDoc);
      
      if (clientSnapshot.exists()) {
        setFormData(clientSnapshot.data());
      } else {
        setError('Cliente no encontrado');
        navigate('/clientes');
      }
    } catch (err) {
      console.error('Error al cargar datos del cliente:', err);
      setError('Error al cargar datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validación básica
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      setLoading(false);
      return;
    }

    try {
      if (isEditing) {
        // Actualizar cliente existente
        const clientRef = doc(db, 'clients', id);
        await updateDoc(clientRef, formData);
        setSuccess('Cliente actualizado correctamente');
      } else {
        // Crear nuevo cliente
        await addDoc(collection(db, 'clients'), formData);
        setSuccess('Cliente creado correctamente');
      }
      
      setTimeout(() => {
        navigate('/clientes');
      }, 2000);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setError('Error al guardar cliente. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          onClick={() => navigate('/clientes')} 
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Nombre o Razón Social"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="RNC / Cédula"
            name="rnc"
            value={formData.rnc}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Correo Electrónico"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Teléfono"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Dirección"
            name="address"
            multiline
            rows={2}
            value={formData.address}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Notas"
            name="notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={handleChange}
          />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              type="button" 
              variant="outlined" 
              onClick={() => navigate('/clientes')}
              sx={{ mr: 2 }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : isEditing ? 'Actualizar' : 'Guardar'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
