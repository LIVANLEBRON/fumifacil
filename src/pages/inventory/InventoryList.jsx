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
  Chip,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  LinearProgress,
  Badge
} from '@mui/material';
import { DataGrid, esES } from '@mui/x-data-grid';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, deleteDoc, doc, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InventoryList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const navigate = useNavigate();

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtrar productos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.lot.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Contar productos con stock bajo y próximos a vencer
  useEffect(() => {
    const today = new Date();
    const lowStock = products.filter(product => product.quantity < 10).length;
    const expiring = products.filter(product => {
      const expirationDate = product.expiration.toDate();
      return differenceInDays(expirationDate, today) <= 30;
    }).length;
    
    setLowStockCount(lowStock);
    setExpiringCount(expiring);
  }, [products]);

  // Función para cargar productos desde Firestore
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const productsQuery = query(
        collection(db, 'inventory'),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const productsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          ...data,
          expiration: data.expiration
        });
      });
      
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error al cargar los productos:', error);
      setError('Error al cargar los productos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir diálogo de confirmación de eliminación
  const handleDeleteClick = (product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  // Función para eliminar producto
  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      
      // Eliminar documento de Firestore
      await deleteDoc(doc(db, 'inventory', selectedProduct.id));
      
      // Eliminar imagen de Storage si existe
      if (selectedProduct.imageUrl) {
        try {
          const imageRef = ref(storage, `inventory/${selectedProduct.id}.jpg`);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.error('Error al eliminar la imagen:', storageError);
          // Continuar aunque falle la eliminación de la imagen
        }
      }
      
      // Actualizar lista de productos
      setProducts(prevProducts => 
        prevProducts.filter(product => product.id !== selectedProduct.id)
      );
      
      setSuccess('Producto eliminado correctamente.');
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
      setError('Error al eliminar el producto. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar productos con stock bajo
  const handleFilterLowStock = async () => {
    try {
      setLoading(true);
      setError('');
      
      const productsQuery = query(
        collection(db, 'inventory'),
        where('quantity', '<', 10),
        orderBy('quantity', 'asc')
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const productsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          ...data,
          expiration: data.expiration
        });
      });
      
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error al filtrar productos:', error);
      setError('Error al filtrar productos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar productos próximos a vencer
  const handleFilterExpiring = async () => {
    try {
      setLoading(true);
      setError('');
      
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      const productsQuery = query(
        collection(db, 'inventory'),
        where('expiration', '<=', thirtyDaysLater),
        where('expiration', '>=', today),
        orderBy('expiration', 'asc')
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const productsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          ...data,
          expiration: data.expiration
        });
      });
      
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error al filtrar productos:', error);
      setError('Error al filtrar productos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Columnas para la tabla de productos
  const columns = [
    { 
      field: 'name', 
      headerName: 'Nombre', 
      width: 200,
      flex: 1
    },
    { 
      field: 'lot', 
      headerName: 'Lote', 
      width: 120 
    },
    { 
      field: 'quantity', 
      headerName: 'Cantidad', 
      width: 120,
      type: 'number',
      renderCell: (params) => {
        const isLowStock = params.value < 10;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ color: isLowStock ? 'error.main' : 'inherit' }}
            >
              {params.value}
            </Typography>
            {isLowStock && (
              <WarningIcon 
                color="error" 
                fontSize="small" 
                sx={{ ml: 1 }} 
              />
            )}
          </Box>
        );
      }
    },
    { 
      field: 'unit', 
      headerName: 'Unidad', 
      width: 120 
    },
    { 
      field: 'expiration', 
      headerName: 'Vencimiento', 
      width: 150,
      valueFormatter: (params) => format(params.value.toDate(), 'dd/MM/yyyy', { locale: es }),
      renderCell: (params) => {
        const today = new Date();
        const expirationDate = params.value.toDate();
        const daysToExpiration = differenceInDays(expirationDate, today);
        
        const isExpiringSoon = daysToExpiration <= 30;
        const isExpired = daysToExpiration < 0;
        
        let color = 'inherit';
        if (isExpired) {
          color = 'error.main';
        } else if (isExpiringSoon) {
          color = 'warning.main';
        }
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color }}>
              {format(expirationDate, 'dd/MM/yyyy', { locale: es })}
            </Typography>
            {(isExpiringSoon || isExpired) && (
              <WarningIcon 
                color={isExpired ? 'error' : 'warning'} 
                fontSize="small" 
                sx={{ ml: 1 }} 
              />
            )}
          </Box>
        );
      }
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
              onClick={() => navigate(`/inventario/${params.row.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/inventario/editar/${params.row.id}`)}
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
          Inventario
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/inventario/nuevo')}
        >
          Nuevo Producto
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

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Badge badgeContent={lowStockCount} color="error" max={99}>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleFilterLowStock}
          >
            Stock Bajo
          </Button>
        </Badge>
        <Badge badgeContent={expiringCount} color="warning" max={99}>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={handleFilterExpiring}
          >
            Próximos a Vencer
          </Button>
        </Badge>
        <Button 
          variant="outlined" 
          onClick={fetchProducts}
        >
          Ver Todos
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Buscar por nombre o lote"
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
              <IconButton onClick={fetchProducts}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <div style={{ height: 500, width: '100%' }}>
          {loading && <LinearProgress />}
          <DataGrid
            rows={filteredProducts}
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
            ¿Estás seguro de que deseas eliminar el producto "{selectedProduct?.name}"? Esta acción no se puede deshacer.
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
