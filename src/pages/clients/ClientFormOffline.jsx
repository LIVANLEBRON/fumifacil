import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { db } from '../../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useOffline } from '../../contexts/OfflineContext';
import { 
  createOfflineDocument, 
  updateOfflineDocument, 
  getDocument, 
  isOfflineId 
} from '../../utils/offline/offlineDataService';
import { COLLECTIONS } from '../../utils/offline/syncService';
import withOfflineSupport from '../../components/offline/withOfflineSupport';

// Esquema de validación
const schema = yup.object({
  name: yup.string().required('El nombre es obligatorio'),
  rnc: yup.string().required('El RNC/Cédula es obligatorio'),
  email: yup.string().email('Correo electrónico inválido').required('El correo es obligatorio'),
  phone: yup.string().required('El teléfono es obligatorio'),
  address: yup.string().required('La dirección es obligatoria'),
  contactPerson: yup.string(),
  notes: yup.string()
});

function ClientFormOffline({ isOnline, saveOffline }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isOfflineRecord, setIsOfflineRecord] = useState(false);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      rnc: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      notes: ''
    }
  });

  // Cargar datos del cliente si estamos editando
  useEffect(() => {
    const loadClient = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Intentar obtener el cliente (primero de IndexedDB, luego de Firestore)
        const client = await getDocument(COLLECTIONS.CLIENTS, id);
        
        if (client) {
          // Verificar si es un registro creado offline
          setIsOfflineRecord(isOfflineId(id) || client.offlineCreated);
          
          // Establecer los valores del formulario
          reset({
            name: client.name || '',
            rnc: client.rnc || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            contactPerson: client.contactPerson || '',
            notes: client.notes || ''
          });
        } else {
          setError('Cliente no encontrado');
        }
      } catch (error) {
        console.error('Error al cargar cliente:', error);
        setError(`Error al cargar cliente: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadClient();
  }, [id, reset]);

  // Guardar cliente
  const onSubmit = async (data) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      if (isOnline) {
        // Guardar en Firestore si hay conexión
        if (id) {
          // Actualizar cliente existente
          await updateDoc(doc(db, COLLECTIONS.CLIENTS, id), {
            ...data,
            updatedAt: serverTimestamp()
          });
        } else {
          // Crear nuevo cliente
          const docRef = doc(db, COLLECTIONS.CLIENTS);
          await setDoc(docRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // Guardar offline si no hay conexión
        if (id) {
          // Actualizar cliente existente
          await updateOfflineDocument(COLLECTIONS.CLIENTS, id, data);
        } else {
          // Crear nuevo cliente
          await createOfflineDocument(COLLECTIONS.CLIENTS, data);
        }
      }
      
      setSuccess(true);
      
      // Redirigir a la lista de clientes después de un breve retraso
      setTimeout(() => {
        navigate('/clientes');
      }, 1500);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setError(`Error al guardar cliente: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          {id ? 'Editar Cliente' : 'Nuevo Cliente'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/clientes')}
        >
          Volver
        </Button>
      </Box>
      
      {isOfflineRecord && (
        <Alert 
          severity="info" 
          icon={<CloudOffIcon />}
          sx={{ mb: 2 }}
        >
          Este cliente fue creado en modo offline y se sincronizará cuando se restablezca la conexión.
        </Alert>
      )}
      
      {!isOnline && (
        <Alert 
          severity="warning" 
          icon={<CloudOffIcon />}
          sx={{ mb: 2 }}
        >
          Estás trabajando en modo offline. Los cambios se guardarán localmente y se sincronizarán cuando se restablezca la conexión.
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Cliente guardado correctamente.
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre o Razón Social"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="rnc"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="RNC/Cédula"
                    fullWidth
                    error={!!errors.rnc}
                    helperText={errors.rnc?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Correo Electrónico"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Teléfono"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Dirección"
                    fullWidth
                    error={!!errors.address}
                    helperText={errors.address?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="contactPerson"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Persona de Contacto"
                    fullWidth
                    error={!!errors.contactPerson}
                    helperText={errors.contactPerson?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notas"
                    fullWidth
                    multiline
                    rows={4}
                    error={!!errors.notes}
                    helperText={errors.notes?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  type="submit"
                  disabled={saving}
                  sx={{ mt: 2 }}
                >
                  {saving ? 'Guardando...' : 'Guardar Cliente'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

// Envolver el componente con soporte offline
export default withOfflineSupport(ClientFormOffline, {
  collection: COLLECTIONS.CLIENTS
});
