import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import { 
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapHorizIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  where,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de movimientos
const MOVEMENT_TYPES = {
  ENTRY: 'entry',
  EXIT: 'exit',
  ADJUSTMENT: 'adjustment'
};

// Razones de movimientos
const MOVEMENT_REASONS = {
  [MOVEMENT_TYPES.ENTRY]: [
    { value: 'purchase', label: 'Compra' },
    { value: 'return', label: 'Devolución de cliente' },
    { value: 'initialStock', label: 'Inventario inicial' }
  ],
  [MOVEMENT_TYPES.EXIT]: [
    { value: 'sale', label: 'Venta' },
    { value: 'service', label: 'Servicio de fumigación' },
    { value: 'damage', label: 'Producto dañado' },
    { value: 'expired', label: 'Producto vencido' }
  ],
  [MOVEMENT_TYPES.ADJUSTMENT]: [
    { value: 'inventory', label: 'Ajuste de inventario' },
    { value: 'correction', label: 'Corrección de error' }
  ]
};

export default function InventoryMovements() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState(MOVEMENT_TYPES.ENTRY);
  const [reason, setReason] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    try {
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
          ...data
        });
      });
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error al cargar los productos:', error);
      setError('Error al cargar los productos. Por favor, intenta nuevamente.');
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError('');
      
      let movementsQuery;
      
      // Aplicar filtros si existen
      if (filterType !== 'all' || dateFrom || dateTo) {
        const filters = [];
        
        if (filterType !== 'all') {
          filters.push(where('type', '==', filterType));
        }
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          filters.push(where('timestamp', '>=', Timestamp.fromDate(fromDate)));
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          filters.push(where('timestamp', '<=', Timestamp.fromDate(toDate)));
        }
        
        movementsQuery = query(
          collection(db, 'inventory_movements'),
          ...filters,
          orderBy('timestamp', 'desc')
        );
      } else {
        movementsQuery = query(
          collection(db, 'inventory_movements'),
          orderBy('timestamp', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(movementsQuery);
      const movementsData = [];
      
      // Obtener detalles de productos para cada movimiento
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        
        // Obtener detalles del producto
        let productDetails = { name: 'Producto no encontrado' };
        
        try {
          const productDoc = await getDoc(doc(db, 'inventory', data.productId));
          if (productDoc.exists()) {
            productDetails = productDoc.data();
          }
        } catch (error) {
          console.error('Error al obtener detalles del producto:', error);
        }
        
        movementsData.push({
          id: docSnapshot.id,
          ...data,
          productName: productDetails.name,
          productLot: productDetails.lot
        });
      }
      
      setMovements(movementsData);
    } catch (error) {
      console.error('Error al cargar los movimientos:', error);
      setError('Error al cargar los movimientos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type) => {
    setMovementType(type);
    setReason(MOVEMENT_REASONS[type][0].value);
    setSelectedProduct(null);
    setQuantity(1);
    setNotes('');
    setReference('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validar campos
    if (!selectedProduct || !reason || quantity <= 0) {
      setError('Todos los campos marcados con * son obligatorios y la cantidad debe ser mayor a 0.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      await runTransaction(db, async (transaction) => {
        // Obtener el documento del producto para verificar el stock actual
        const productRef = doc(db, 'inventory', selectedProduct.id);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists()) {
          throw new Error('El producto seleccionado no existe.');
        }
        
        const productData = productDoc.data();
        let newQuantity = productData.quantity;
        
        // Calcular la nueva cantidad según el tipo de movimiento
        switch (movementType) {
          case MOVEMENT_TYPES.ENTRY:
            newQuantity += quantity;
            break;
          case MOVEMENT_TYPES.EXIT:
            if (productData.quantity < quantity) {
              throw new Error(`Stock insuficiente. Stock actual: ${productData.quantity}`);
            }
            newQuantity -= quantity;
            break;
          case MOVEMENT_TYPES.ADJUSTMENT:
            // Para ajustes, la cantidad ingresada es el nuevo valor absoluto
            newQuantity = quantity;
            break;
        }
        
        // Actualizar el stock del producto
        transaction.update(productRef, { 
          quantity: newQuantity,
          lastUpdate: serverTimestamp()
        });
        
        // Crear el registro de movimiento
        const movementData = {
          productId: selectedProduct.id,
          type: movementType,
          reason: reason,
          quantity: quantity,
          previousQuantity: productData.quantity,
          newQuantity: newQuantity,
          notes: notes,
          reference: reference,
          timestamp: serverTimestamp(),
          userId: 'usuario_actual' // Reemplazar con el ID del usuario autenticado
        };
        
        const movementRef = collection(db, 'inventory_movements');
        transaction.set(doc(movementRef), movementData);
      });
      
      setSuccess('Movimiento registrado correctamente.');
      setDialogOpen(false);
      
      // Recargar los movimientos y productos
      fetchMovements();
      fetchProducts();
      
      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error al registrar el movimiento:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleApplyFilters = () => {
    fetchMovements();
    setFilterDialogOpen(false);
  };

  const handleResetFilters = () => {
    setFilterType('all');
    setDateFrom('');
    setDateTo('');
    fetchMovements();
    setFilterDialogOpen(false);
  };

  const getMovementTypeLabel = (type) => {
    switch (type) {
      case MOVEMENT_TYPES.ENTRY:
        return 'Entrada';
      case MOVEMENT_TYPES.EXIT:
        return 'Salida';
      case MOVEMENT_TYPES.ADJUSTMENT:
        return 'Ajuste';
      default:
        return type;
    }
  };

  const getReasonLabel = (type, reasonValue) => {
    const reasons = MOVEMENT_REASONS[type] || [];
    const reason = reasons.find(r => r.value === reasonValue);
    return reason ? reason.label : reasonValue;
  };

  const getMovementTypeColor = (type) => {
    switch (type) {
      case MOVEMENT_TYPES.ENTRY:
        return 'success.main';
      case MOVEMENT_TYPES.EXIT:
        return 'error.main';
      case MOVEMENT_TYPES.ADJUSTMENT:
        return 'warning.main';
      default:
        return 'text.primary';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Movimientos de Inventario
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog(MOVEMENT_TYPES.ENTRY)}
            sx={{ mr: 1 }}
          >
            Entrada
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveIcon />}
            onClick={() => handleOpenDialog(MOVEMENT_TYPES.EXIT)}
            sx={{ mr: 1 }}
          >
            Salida
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<SwapHorizIcon />}
            onClick={() => handleOpenDialog(MOVEMENT_TYPES.ADJUSTMENT)}
          >
            Ajuste
          </Button>
        </Box>
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

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Historial de Movimientos
          </Typography>
          <Box>
            <Tooltip title="Filtros">
              <IconButton onClick={() => setFilterDialogOpen(true)}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Actualizar">
              <IconButton onClick={fetchMovements}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider />
        
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="tabla de movimientos">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Razón</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cantidad Anterior</TableCell>
                <TableCell align="right">Cambio</TableCell>
                <TableCell align="right">Nueva Cantidad</TableCell>
                <TableCell>Referencia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                movements
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {movement.timestamp ? 
                          format(movement.timestamp.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) : 
                          'Fecha no disponible'}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: getMovementTypeColor(movement.type) }}>
                          {getMovementTypeLabel(movement.type)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getReasonLabel(movement.type, movement.reason)}</TableCell>
                      <TableCell>
                        <Tooltip title={`Lote: ${movement.productLot || 'N/A'}`}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              '&:hover': { color: 'primary.main' }
                            }}
                            onClick={() => navigate(`/inventario/${movement.productId}`)}
                          >
                            {movement.productName}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">{movement.previousQuantity}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ 
                          color: movement.type === MOVEMENT_TYPES.ENTRY ? 'success.main' : 
                                 movement.type === MOVEMENT_TYPES.EXIT ? 'error.main' : 'warning.main',
                          fontWeight: 'bold'
                        }}>
                          {movement.type === MOVEMENT_TYPES.ENTRY ? '+' : 
                           movement.type === MOVEMENT_TYPES.EXIT ? '-' : '→'} 
                          {movement.type === MOVEMENT_TYPES.ADJUSTMENT ? 
                            `${movement.previousQuantity} → ${movement.newQuantity}` : 
                            movement.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{movement.newQuantity}</TableCell>
                      <TableCell>{movement.reference || '-'}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
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
      </Paper>

      {/* Diálogo para registrar movimiento */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {movementType === MOVEMENT_TYPES.ENTRY ? 'Registrar Entrada' : 
           movementType === MOVEMENT_TYPES.EXIT ? 'Registrar Salida' : 
           'Registrar Ajuste'} de Inventario
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Complete los siguientes campos para registrar el movimiento de inventario.
          </DialogContentText>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => `${option.name} (Lote: ${option.lot})`}
                value={selectedProduct}
                onChange={(event, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Producto *"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Razón *</InputLabel>
                <Select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  label="Razón *"
                >
                  {MOVEMENT_REASONS[movementType].map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={movementType === MOVEMENT_TYPES.ADJUSTMENT ? "Nueva Cantidad *" : "Cantidad *"}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                margin="normal"
                required
                InputProps={{
                  inputProps: { min: 0 }
                }}
                helperText={
                  selectedProduct && movementType === MOVEMENT_TYPES.EXIT
                    ? `Stock actual: ${selectedProduct.quantity}`
                    : movementType === MOVEMENT_TYPES.ADJUSTMENT && selectedProduct
                    ? `Stock actual: ${selectedProduct.quantity}`
                    : ''
                }
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Referencia"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                margin="normal"
                placeholder="Ej: Factura #123, Servicio #456"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                margin="normal"
                multiline
                rows={3}
                placeholder="Información adicional sobre este movimiento"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)} 
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={submitting || !selectedProduct || !reason || quantity <= 0}
          >
            {submitting ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de filtros */}
      <Dialog 
        open={filterDialogOpen} 
        onClose={() => setFilterDialogOpen(false)}
      >
        <DialogTitle>Filtrar Movimientos</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Tipo de Movimiento</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Tipo de Movimiento"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value={MOVEMENT_TYPES.ENTRY}>Entradas</MenuItem>
              <MenuItem value={MOVEMENT_TYPES.EXIT}>Salidas</MenuItem>
              <MenuItem value={MOVEMENT_TYPES.ADJUSTMENT}>Ajustes</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Desde"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            fullWidth
            label="Hasta"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetFilters}>Limpiar Filtros</Button>
          <Button onClick={handleApplyFilters} variant="contained">
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
