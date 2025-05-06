import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  LinearProgress
} from '@mui/material';
import { DataGrid, esES } from '@mui/x-data-grid';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Cargar clientes al montar el componente
  useEffect(() => {
    fetchClients();
  }, []);

  // Filtrar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.rnc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.phone && client.phone.includes(searchTerm))
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  // Función para cargar clientes desde Firestore
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      
      const clientsQuery = query(
        collection(db, 'clients'),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(clientsQuery);
      const clientsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        clientsData.push({
          id: doc.id,
          ...data
        });
      });
      
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('Error al cargar los clientes:', error);
      setError('Error al cargar los clientes. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir diálogo de confirmación de eliminación
  const handleDeleteClick = (client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  // Función para eliminar cliente
  const handleDeleteConfirm = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'clients', selectedClient.id));
      
      // Actualizar lista de clientes
      setClients(prevClients => 
        prevClients.filter(client => client.id !== selectedClient.id)
      );
      
      setSuccess('Cliente eliminado correctamente.');
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error al eliminar el cliente:', error);
      setError('Error al eliminar el cliente. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Columnas para la tabla de clientes
  const columns = [
    { 
      field: 'name', 
      headerName: 'Nombre', 
      width: 200,
      flex: 1
    },
    { 
      field: 'rnc', 
      headerName: 'RNC/Cédula', 
      width: 150 
    },
    { 
      field: 'email', 
      headerName: 'Correo', 
      width: 200
    },
    { 
      field: 'phone', 
      headerName: 'Teléfono', 
      width: 150
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Ver detalles">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/clientes/${params.row.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/clientes/editar/${params.row.id}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton 
              size="small" 
              onClick={() => handleDeleteClick(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/clientes/nuevo')}
        >
          Nuevo Cliente
        </Button>
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

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Buscar por nombre, RNC, correo o teléfono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '40%' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <Box>
            <Tooltip title="Filtros avanzados">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Actualizar">
              <IconButton onClick={fetchClients}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <div style={{ height: 500, width: '100%' }}>
          {loading && <LinearProgress />}
          <DataGrid
            rows={filteredClients}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            localeText={esES.components.MuiDataGrid.defaultProps.localeText}
            loading={loading}
          />
        </div>
      </Paper>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el cliente "{selectedClient?.name}"? Esta acción no se puede deshacer.
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
