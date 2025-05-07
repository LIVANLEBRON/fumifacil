import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Paper, 
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Snackbar,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import { DataGrid, esES } from '@mui/x-data-grid';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc, where, limit } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  // Cargar facturas al montar el componente
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filtrar facturas cuando cambia el término de búsqueda o el filtro de estado
  useEffect(() => {
    let filtered = invoices;
    
    // Aplicar filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    // Aplicar filtro de búsqueda
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(invoice => 
        invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.trackId && invoice.trackId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.rnc && invoice.rnc.includes(searchTerm))
      );
    }
    
    setFilteredInvoices(filtered);
  }, [searchTerm, invoices, statusFilter]);

  // Función para cargar facturas desde Firestore
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      
      const invoicesQuery = query(
        collection(db, 'invoices'),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(invoicesQuery);
      const invoicesData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        invoicesData.push({
          id: doc.id,
          ...data,
          date: data.date ? data.date.toDate() : new Date(),
        });
      });
      
      setInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
    } catch (error) {
      console.error('Error al cargar las facturas:', error);
      setError('Error al cargar las facturas. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar PDF de factura
  const handleDownloadPDF = async (invoiceId, pdfUrl) => {
    try {
      if (!pdfUrl) {
        // Si no hay URL de PDF, generar uno nuevo
        await handleGeneratePDF(invoiceId);
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      setError('Error al descargar el PDF. Por favor, intenta nuevamente.');
    }
  };

  // Función para generar PDF de factura (con mejor manejo de errores)
  const handleGeneratePDF = async (invoiceId) => {
    try {
      setActionLoading(true);
      setError('');
      
      // Obtener datos de la factura
      const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
      if (!invoiceDoc.exists()) {
        throw new Error('La factura no existe');
      }
      const invoiceData = invoiceDoc.data();
      
      // Obtener datos de la empresa
      const companyDoc = await getDoc(doc(db, 'settings', 'company'));
      const companyData = companyDoc.exists() ? companyDoc.data() : {};
      
      console.log('Generando PDF para factura:', invoiceId);
      
      // Importar dinámicamente el generador de PDF
      const { generateInvoicePDF } = await import('../../utils/pdfGenerator');
      
      // Generar el PDF con manejo de errores mejorado
      const pdfUrl = await generateInvoicePDF({
        ...invoiceData,
        id: invoiceId
      }, companyData);
      
      console.log('PDF generado exitosamente');
      
      // Abrir el PDF en una nueva pestaña
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
        
        // Actualizar solo la factura específica en el estado local
        setInvoices(prevInvoices => 
          prevInvoices.map(invoice => 
            invoice.id === invoiceId 
              ? { ...invoice, pdfUrl: pdfUrl } 
              : invoice
          )
        );
        
        setSuccess('PDF generado correctamente');
      } else {
        throw new Error('No se pudo generar el PDF');
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setError('Error al generar PDF: ' + error.message);
      
      // Mostrar un mensaje más amigable al usuario
      if (error.message.includes('DOM')) {
        setError('Error al generar PDF: Problema con el navegador. Intente refrescar la página.');
      } else if (error.message.includes('memory') || error.message.includes('memoria')) {
        setError('Error al generar PDF: El navegador no tiene suficiente memoria. Intente cerrar otras pestañas o reiniciar el navegador.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Función para enviar factura por correo
  const handleSendEmail = async (invoiceId) => {
    try {
      setActionLoading(true);
      
      // Llamar a la Cloud Function para enviar el correo
      const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
      const result = await sendInvoiceEmail({ invoiceId });
      
      if (result.data && result.data.success) {
        setSuccess('Factura enviada por correo correctamente');
      } else {
        throw new Error(result.data.error || 'No se pudo enviar el correo');
      }
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setError(`Error al enviar el correo: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para enviar factura a la DGII
  const handleSendToDGII = async (invoiceId) => {
    try {
      setActionLoading(true);
      
      // Llamar a la Cloud Function para enviar a la DGII
      const sendInvoiceToDGII = httpsCallable(functions, 'sendInvoiceToDGII');
      const result = await sendInvoiceToDGII({ invoiceId });
      
      if (result.data && result.data.success) {
        // Actualizar la factura con el estado y el trackId
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: 'enviada',
          trackId: result.data.trackId,
          dgiiSubmissionDate: new Date()
        });
        
        // Actualizar la lista de facturas
        setInvoices(prevInvoices => 
          prevInvoices.map(invoice => 
            invoice.id === invoiceId 
              ? { 
                  ...invoice, 
                  status: 'enviada', 
                  trackId: result.data.trackId,
                  dgiiSubmissionDate: new Date()
                } 
              : invoice
          )
        );
        
        setSuccess(`Factura enviada a la DGII correctamente. TrackID: ${result.data.trackId}`);
      } else {
        throw new Error(result.data.error || 'No se pudo enviar a la DGII');
      }
    } catch (error) {
      console.error('Error al enviar a la DGII:', error);
      setError(`Error al enviar a la DGII: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para verificar el estado de la factura en la DGII
  const handleCheckStatus = async (invoiceId, trackId) => {
    if (!trackId) {
      setError('Esta factura no tiene un TrackID asignado. Debe enviarla primero a la DGII.');
      return;
    }
    
    try {
      setActionLoading(true);
      
      // Llamar a la Cloud Function para verificar el estado
      const checkInvoiceStatus = httpsCallable(functions, 'checkInvoiceStatus');
      const result = await checkInvoiceStatus({ invoiceId, trackId });
      
      if (result.data && result.data.status) {
        // Actualizar la factura con el estado
        const newStatus = result.data.status === 'Aceptado' ? 'aceptada' : 
                         result.data.status === 'Rechazado' ? 'rechazada' : 'enviada';
        
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: newStatus,
          dgiiStatusDetail: result.data.statusDetail || '',
          dgiiLastCheck: new Date()
        });
        
        // Actualizar la lista de facturas
        setInvoices(prevInvoices => 
          prevInvoices.map(invoice => 
            invoice.id === invoiceId 
              ? { 
                  ...invoice, 
                  status: newStatus,
                  dgiiStatusDetail: result.data.statusDetail || '',
                  dgiiLastCheck: new Date()
                } 
              : invoice
          )
        );
        
        setSuccess(`Estado de la factura: ${result.data.status}`);
      } else {
        throw new Error(result.data.error || 'No se pudo verificar el estado');
      }
    } catch (error) {
      console.error('Error al verificar el estado:', error);
      setError(`Error al verificar el estado: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para abrir diálogo de confirmación de eliminación
  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  // Función para eliminar factura
  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'invoices', selectedInvoice.id));
      
      // Actualizar lista de facturas
      setInvoices(prevInvoices => 
        prevInvoices.filter(invoice => invoice.id !== selectedInvoice.id)
      );
      
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
      setSuccess('Factura eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la factura:', error);
      setError('Error al eliminar la factura. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir menú de acciones
  const handleMenuOpen = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  // Función para cerrar menú de acciones
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Función para manejar acciones del menú
  const handleMenuAction = (action) => {
    if (!selectedInvoice) return;
    
    switch (action) {
      case 'view':
        navigate(`/facturas/${selectedInvoice.id}`);
        break;
      case 'edit':
        navigate(`/facturas/editar/${selectedInvoice.id}`);
        break;
      case 'pdf':
        handleDownloadPDF(selectedInvoice.id, selectedInvoice.pdfUrl);
        break;
      case 'email':
        handleSendEmail(selectedInvoice.id);
        break;
      case 'dgii':
        handleSendToDGII(selectedInvoice.id);
        break;
      case 'check':
        handleCheckStatus(selectedInvoice.id, selectedInvoice.trackId);
        break;
      case 'delete':
        handleDeleteClick(selectedInvoice);
        break;
      default:
        break;
    }
    
    handleMenuClose();
  };

  // Función para aplicar filtro de estado
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  // Columnas para la tabla de facturas
  const columns = [
    {
      field: 'id',
      headerName: 'Número',
      width: 100,
      valueFormatter: (params) => {
        // Mostrar solo los últimos 6 caracteres del ID
        return params.value.substring(params.value.length - 6).toUpperCase();
      }
    },
    {
      field: 'date',
      headerName: 'Fecha',
      width: 120,
      valueFormatter: (params) => {
        return format(new Date(params.value), 'dd/MM/yyyy', { locale: es });
      }
    },
    {
      field: 'client',
      headerName: 'Cliente',
      width: 200,
    },
    {
      field: 'rnc',
      headerName: 'RNC',
      width: 120,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 120,
      valueFormatter: (params) => {
        return `RD$ ${params.value.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
      }
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 130,
      renderCell: (params) => {
        let label = 'Desconocido';
        let color = 'default';
        
        switch (params.value) {
          case 'pendiente':
            label = 'Pendiente';
            color = 'warning';
            break;
          case 'enviada':
            label = 'Enviada';
            color = 'info';
            break;
          case 'aceptada':
            label = 'Aceptada';
            color = 'success';
            break;
          case 'rechazada':
            label = 'Rechazada';
            color = 'error';
            break;
          default:
            break;
        }
        
        return <Chip label={label} color={color} size="small" />;
      }
    },
    {
      field: 'trackId',
      headerName: 'TrackID DGII',
      width: 150,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Más acciones">
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuOpen(e, params.row)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <Grid container spacing={3} sx={{ maxWidth: '1200px' }}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Facturas
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/configuracion/ecf')}
                sx={{ borderRadius: 2 }}
              >
                CONFIGURACIÓN E-CF
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/facturas/nueva')}
                sx={{ borderRadius: 2 }}
              >
                NUEVA FACTURA
              </Button>
            </Box>
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
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Buscar por cliente, RNC, TrackID o estado"
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
                  <Tooltip title="Actualizar">
                    <IconButton onClick={fetchInvoices} disabled={loading || actionLoading}>
                      {(loading || actionLoading) ? <CircularProgress size={24} /> : <RefreshIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  label="Todas" 
                  onClick={() => handleStatusFilterChange('all')}
                  color={statusFilter === 'all' ? 'primary' : 'default'}
                  sx={{ borderRadius: 2 }}
                />
                <Chip 
                  label="Pendientes" 
                  onClick={() => handleStatusFilterChange('pendiente')}
                  color={statusFilter === 'pendiente' ? 'primary' : 'default'}
                  sx={{ borderRadius: 2 }}
                />
                <Chip 
                  label="Enviadas" 
                  onClick={() => handleStatusFilterChange('enviada')}
                  color={statusFilter === 'enviada' ? 'primary' : 'default'}
                  sx={{ borderRadius: 2 }}
                />
                <Chip 
                  label="Aceptadas" 
                  onClick={() => handleStatusFilterChange('aceptada')}
                  color={statusFilter === 'aceptada' ? 'primary' : 'default'}
                  sx={{ borderRadius: 2 }}
                />
                <Chip 
                  label="Rechazadas" 
                  onClick={() => handleStatusFilterChange('rechazada')}
                  color={statusFilter === 'rechazada' ? 'primary' : 'default'}
                  sx={{ borderRadius: 2 }}
                />
              </Stack>

              <Box sx={{ height: 500, width: '100%' }}>
                {loading && <LinearProgress />}
                {filteredInvoices.length > 0 ? (
                  <DataGrid
                    rows={filteredInvoices}
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
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron facturas
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Menú de acciones */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { borderRadius: 2 }
          }}
        >
        <MenuItem onClick={() => handleMenuAction('view')}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver detalles</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('pdf')}>
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Descargar PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('email')}>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Enviar por correo</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('dgii')}>
          <ListItemIcon>
            <SendIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Enviar a DGII</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('check')}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Verificar estado DGII</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

        {/* Diálogo de confirmación de eliminación */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar la factura para {selectedInvoice?.client}? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      </Grid>
    </Box>
  );
}
