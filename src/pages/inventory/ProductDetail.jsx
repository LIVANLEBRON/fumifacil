import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Grid,
  Divider,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { doc, getDoc, deleteDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Cargar datos del producto
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError('');
        
        const productDoc = await getDoc(doc(db, 'inventory', id));
        
        if (productDoc.exists()) {
          const productData = productDoc.data();
          setProduct({
            id: productDoc.id,
            ...productData,
            expiration: productData.expiration.toDate()
          });
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
  }, [id, navigate]);

  // Cargar historial de movimientos
  useEffect(() => {
    const fetchMovements = async () => {
      if (!id) return;
      
      try {
        setMovementsLoading(true);
        
        const movementsQuery = query(
          collection(db, 'inventory_movements'),
          where('productId', '==', id),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(movementsQuery);
        const movementsData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          movementsData.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
          });
        });
        
        setMovements(movementsData);
      } catch (error) {
        console.error('Error al cargar los movimientos:', error);
      } finally {
        setMovementsLoading(false);
      }
    };
    
    fetchMovements();
  }, [id]);

  // Función para eliminar producto
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // Eliminar documento de Firestore
      await deleteDoc(doc(db, 'inventory', id));
      
      // Eliminar imagen de Storage si existe
      if (product.imageUrl) {
        try {
          const imageRef = ref(storage, `inventory/${id}.jpg`);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.error('Error al eliminar la imagen:', storageError);
          // Continuar aunque falle la eliminación de la imagen
        }
      }
      
      setSuccess('Producto eliminado correctamente.');
      setTimeout(() => {
        navigate('/inventario');
      }, 2000);
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
      setError('Error al eliminar el producto. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Verificar si el producto está próximo a vencer o con stock bajo
  const getProductStatus = () => {
    if (!product) return { lowStock: false, expiringSoon: false, expired: false };
    
    const today = new Date();
    const daysToExpiration = differenceInDays(product.expiration, today);
    
    return {
      lowStock: product.quantity < 10,
      expiringSoon: daysToExpiration <= 30 && daysToExpiration > 0,
      expired: daysToExpiration < 0
    };
  };

  // Obtener etiqueta para tipo de movimiento
  const getMovementTypeLabel = (type) => {
    switch (type) {
      case 'entry':
        return 'Entrada';
      case 'exit':
        return 'Salida';
      case 'adjustment':
        return 'Ajuste';
      default:
        return type;
    }
  };

  // Obtener etiqueta para razón de movimiento
  const getReasonLabel = (reason) => {
    const reasonMap = {
      // Entradas
      'purchase': 'Compra',
      'return': 'Devolución de cliente',
      'initialStock': 'Inventario inicial',
      // Salidas
      'sale': 'Venta',
      'service': 'Servicio de fumigación',
      'damage': 'Producto dañado',
      'expired': 'Producto vencido',
      // Ajustes
      'inventory': 'Ajuste de inventario',
      'correction': 'Corrección de error'
    };
    
    return reasonMap[reason] || reason;
  };

  // Obtener icono para tipo de movimiento
  const getMovementIcon = (type) => {
    switch (type) {
      case 'entry':
        return <TrendingUpIcon color="success" />;
      case 'exit':
        return <TrendingDownIcon color="error" />;
      case 'adjustment':
        return <SwapHorizIcon color="warning" />;
      default:
        return <HistoryIcon />;
    }
  };

  // Manejar cambio de página
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Manejar cambio de filas por página
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && !product) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          {error || 'No se pudo cargar el producto.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/inventario')}
          sx={{ mt: 2 }}
        >
          Volver a Inventario
        </Button>
      </Container>
    );
  }

  const { lowStock, expiringSoon, expired } = getProductStatus();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/inventario')}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1">
          Detalles del Producto
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="h2">
                    {product.name}
                  </Typography>
                  <Box>
                    {lowStock && (
                      <Tooltip title="Stock bajo">
                        <Chip 
                          icon={<WarningIcon />} 
                          label="Stock Bajo" 
                          color="error" 
                          size="small" 
                          sx={{ mr: 1 }} 
                        />
                      </Tooltip>
                    )}
                    {expiringSoon && !expired && (
                      <Tooltip title="Próximo a vencer">
                        <Chip 
                          icon={<WarningIcon />} 
                          label="Por Vencer" 
                          color="warning" 
                          size="small" 
                          sx={{ mr: 1 }} 
                        />
                      </Tooltip>
                    )}
                    {expired && (
                      <Tooltip title="Producto vencido">
                        <Chip 
                          icon={<WarningIcon />} 
                          label="Vencido" 
                          color="error" 
                          size="small" 
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Cantidad:</strong> {product.quantity} {product.unit}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Lote:</strong> {product.lot}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Fecha de Vencimiento:</strong> {format(product.expiration, 'dd/MM/yyyy', { locale: es })}
                      {expired && (
                        <Chip 
                          label="Vencido" 
                          color="error" 
                          size="small" 
                          sx={{ ml: 1 }} 
                        />
                      )}
                      {expiringSoon && !expired && (
                        <Chip 
                          label="Próximo a vencer" 
                          color="warning" 
                          size="small" 
                          sx={{ ml: 1 }} 
                        />
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Última Actualización:</strong> {product.lastUpdate ? 
                        format(product.lastUpdate.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) : 
                        'No disponible'}
                    </Typography>
                  </Grid>
                  {product.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Notas:</strong> {product.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Historial de Movimientos
                  </Typography>
                </Box>
                
                <TableContainer>
                  {movementsLoading ? (
                    <LinearProgress />
                  ) : movements.length === 0 ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay movimientos registrados para este producto
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Razón</TableCell>
                            <TableCell align="right">Cantidad Anterior</TableCell>
                            <TableCell align="right">Cambio</TableCell>
                            <TableCell align="right">Nueva Cantidad</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {movements
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((movement) => (
                              <TableRow key={movement.id}>
                                <TableCell>
                                  {format(movement.timestamp, 'dd/MM/yyyy HH:mm', { locale: es })}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {getMovementIcon(movement.type)}
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                      {getMovementTypeLabel(movement.type)}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>{getReasonLabel(movement.reason)}</TableCell>
                                <TableCell align="right">{movement.previousQuantity}</TableCell>
                                <TableCell align="right">
                                  <Typography sx={{ 
                                    color: movement.type === 'entry' ? 'success.main' : 
                                           movement.type === 'exit' ? 'error.main' : 'warning.main',
                                    fontWeight: 'bold'
                                  }}>
                                    {movement.type === 'entry' ? '+' : 
                                     movement.type === 'exit' ? '-' : '→'} 
                                    {movement.type === 'adjustment' ? 
                                      `${movement.previousQuantity} → ${movement.newQuantity}` : 
                                      movement.quantity}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{movement.newQuantity}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={movements.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Filas por página"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                      />
                    </>
                  )}
                </TableContainer>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/inventario/editar/${id}`)}
                sx={{ mr: 1 }}
              >
                Editar
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Eliminar
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            {product.imageUrl ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Imagen del Producto
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }} 
                    />
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Imagen del Producto
                  </Typography>
                  <Box 
                    sx={{ 
                      height: '200px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: '#f5f5f5',
                      borderRadius: '4px'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No hay imagen disponible
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el producto "{product.name}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
