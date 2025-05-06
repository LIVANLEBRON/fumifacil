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
  LinearProgress
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
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function QuoteList() {
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Cargar cotizaciones al montar el componente
  useEffect(() => {
    fetchQuotes();
  }, []);

  // Filtrar cotizaciones cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredQuotes(quotes);
    } else {
      const filtered = quotes.filter(quote => 
        quote.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.pest.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredQuotes(filtered);
    }
  }, [searchTerm, quotes]);

  // Función para cargar cotizaciones desde Firestore
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const quotesQuery = query(
        collection(db, 'quotes'),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(quotesQuery);
      const quotesData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        quotesData.push({
          id: doc.id,
          ...data,
          date: data.date ? data.date.toDate() : new Date(),
        });
      });
      
      setQuotes(quotesData);
      setFilteredQuotes(quotesData);
    } catch (error) {
      console.error('Error al cargar las cotizaciones:', error);
      setError('Error al cargar las cotizaciones. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar PDF de cotización
  const handleDownloadPDF = async (quoteId, pdfUrl) => {
    try {
      if (!pdfUrl) {
        const pdfRef = ref(storage, `quotes/${quoteId}.pdf`);
        const url = await getDownloadURL(pdfRef);
        window.open(url, '_blank');
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      setError('Error al descargar el PDF. Por favor, intenta nuevamente.');
    }
  };

  // Función para abrir diálogo de confirmación de eliminación
  const handleDeleteClick = (quote) => {
    setSelectedQuote(quote);
    setDeleteDialogOpen(true);
  };

  // Función para eliminar cotización
  const handleDeleteConfirm = async () => {
    if (!selectedQuote) return;
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'quotes', selectedQuote.id));
      
      // Actualizar lista de cotizaciones
      setQuotes(prevQuotes => 
        prevQuotes.filter(quote => quote.id !== selectedQuote.id)
      );
      
      setSuccess('Cotización eliminada correctamente.');
      setDeleteDialogOpen(false);
      setSelectedQuote(null);
    } catch (error) {
      console.error('Error al eliminar la cotización:', error);
      setError('Error al eliminar la cotización. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Columnas para la tabla de cotizaciones
  const columns = [
    { 
      field: 'date', 
      headerName: 'Fecha', 
      width: 120,
      valueFormatter: (params) => format(params.value, 'dd/MM/yyyy', { locale: es })
    },
    { 
      field: 'client', 
      headerName: 'Cliente', 
      width: 200,
      flex: 1
    },
    { 
      field: 'area', 
      headerName: 'Área', 
      width: 150 
    },
    { 
      field: 'pest', 
      headerName: 'Plaga', 
      width: 150 
    },
    { 
      field: 'frequency', 
      headerName: 'Frecuencia', 
      width: 150 
    },
    { 
      field: 'cost', 
      headerName: 'Costo', 
      width: 150,
      type: 'number',
      valueFormatter: (params) => `RD$ ${params.value.toLocaleString('es-DO')}`
    },
    { 
      field: 'status', 
      headerName: 'Estado', 
      width: 150,
      renderCell: (params) => {
        let color;
        let label;
        
        switch (params.value) {
          case 'pendiente':
            color = 'warning';
            label = 'Pendiente';
            break;
          case 'aceptada':
            color = 'success';
            label = 'Aceptada';
            break;
          case 'rechazada':
            color = 'error';
            label = 'Rechazada';
            break;
          default:
            color = 'default';
            label = params.value;
        }
        
        return <Chip label={label} color={color} size="small" />;
      }
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Ver detalles">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/cotizaciones/${params.row.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/cotizaciones/editar/${params.row.id}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Descargar PDF">
            <IconButton 
              size="small" 
              onClick={() => handleDownloadPDF(params.row.id, params.row.pdfUrl)}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === 'aceptada' && (
            <Tooltip title="Convertir a Factura">
              <IconButton 
                size="small" 
                onClick={() => navigate(`/facturas/nueva?quoteId=${params.row.id}`)}
              >
                <ReceiptIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
          Cotizaciones
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/cotizaciones/nueva')}
        >
          Nueva Cotización
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
            placeholder="Buscar por cliente, área, plaga o estado"
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
              <IconButton onClick={fetchQuotes}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <div style={{ height: 500, width: '100%' }}>
          {loading && <LinearProgress />}
          <DataGrid
            rows={filteredQuotes}
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
            ¿Estás seguro de que deseas eliminar la cotización para {selectedQuote?.client}? Esta acción no se puede deshacer.
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
