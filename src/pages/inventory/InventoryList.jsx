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
  Badge,
  Grid,
  Card,
  CardContent
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
        } catch (error) {
          console.error('Error al eliminar la imagen:', error);
          // Continuar aunque falle la eliminación de la imagen
        }
      }
      
      // Actualizar estado local
      setProducts(products.filter(product => product.id !== selectedProduct.id));
      setFilteredProducts(filteredProducts.filter(product => product.id !== selectedProduct.id));
      setSuccess(`Producto "${selectedProduct.name}" eliminado correctamente.`);
      
      // Cerrar diálogo
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
      
      if (products.length === 0) {
        await fetchProducts();
      }
      
      // Filtrar productos con stock bajo (menos de 10 unidades)
      const lowStockProducts = products.filter(product => product.quantity < 10);
      
      if (lowStockProducts.length === 0) {
        setSuccess('No hay productos con stock bajo.');
      } else {
        setSuccess(`Se encontraron ${lowStockProducts.length} productos con stock bajo.`);
      }
      
      setFilteredProducts(lowStockProducts);
    } catch (error) {
      console.error('Error al filtrar productos con stock bajo:', error);
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
      
      if (products.length === 0) {
        await fetchProducts();
      }
      
      const today = new Date();
      
      // Filtrar productos que vencen en los próximos 30 días
      const expiringProducts = products.filter(product => {
        const expirationDate = product.expiration.toDate();
        return differenceInDays(expirationDate, today) <= 30;
      });
      
      if (expiringProducts.length === 0) {
        setSuccess('No hay productos próximos a vencer.');
      } else {
        setSuccess(`Se encontraron ${expiringProducts.length} productos próximos a vencer.`);
      }
      
      setFilteredProducts(expiringProducts);
    } catch (error) {
      console.error('Error al filtrar productos próximos a vencer:', error);
      setError('Error al filtrar productos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Definir columnas para la tabla
  const columns = [
    { 
      field: 'lot', 
      headerName: 'Lote', 
      width: 120 
    },
    { 
      field: 'name', 
      headerName: 'Nombre', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" component="div">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.description}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'quantity', 
      headerName: 'Cantidad', 
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    { 
      field: 'unit', 
      headerName: 'Unidad', 
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    { 
      field: 'expiration', 
      headerName: 'Vencimiento', 
      width: 150,
      valueFormatter: (params) => {
        return params.value ? format(params.value.toDate(), 'dd/MM/yyyy', { locale: es }) : 'N/A';
      },
      renderCell: (params) => {
        if (!params.value) return 'N/A';
        
        const expirationDate = params.value.toDate();
        const today = new Date();
        const daysToExpire = differenceInDays(expirationDate, today);
        
        let color = 'success.main';
        if (daysToExpire <= 30) {
          color = 'warning.main';
        }
        if (daysToExpire <= 7) {
          color = 'error.main';
        }
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {daysToExpire <= 30 && (
              <Tooltip title="Próximo a vencer">
                <WarningIcon fontSize="small" sx={{ color, mr: 1 }} />
              </Tooltip>
            )}
            <Typography sx={{ color }}>
              {format(expirationDate, 'dd/MM/yyyy', { locale: es })}
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'actions', 
      headerName: 'Acciones', 
      width: 150,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Ver detalles">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/inventario/ver/${params.row.id}`)}
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
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Grid container spacing={3} sx={{ maxWidth: '1200px' }}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Inventario
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/inventario/nuevo')}
              sx={{ borderRadius: 2 }}
            >
              Nuevo Producto
            </Button>
          </Box>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Badge badgeContent={lowStockCount} color="error" max={99}>
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={handleFilterLowStock}
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      Stock Bajo
                    </Button>
                  </Badge>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Badge badgeContent={expiringCount} color="warning" max={99}>
                    <Button 
                      variant="outlined" 
                      color="warning"
                      onClick={handleFilterExpiring}
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      Próximos a Vencer
                    </Button>
                  </Badge>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Button 
                    variant="outlined" 
                    onClick={fetchProducts}
                    fullWidth
                    sx={{ borderRadius: 2 }}
                  >
                    Ver Todos
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Buscar por nombre o lote"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: { xs: '100%', sm: '50%', md: '40%' } }}
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

            <Box sx={{ height: 500, width: '100%' }}>
              {loading && <LinearProgress />}
              <DataGrid
                rows={filteredProducts}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                localeText={esES.components.MuiDataGrid.defaultProps.localeText}
                loading={loading}
                sx={{
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

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
    </Box>
  );
}
