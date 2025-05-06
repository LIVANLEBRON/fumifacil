import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
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
  Divider
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

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AreasAndPests() {
  const [tabValue, setTabValue] = useState(0);
  const [areas, setAreas] = useState([]);
  const [pests, setPests] = useState([]);
  const [newArea, setNewArea] = useState('');
  const [newPest, setNewPest] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAreasAndPests();
  }, []);

  const fetchAreasAndPests = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener áreas
      const areasQuery = query(
        collection(db, 'areas'),
        orderBy('name', 'asc')
      );
      
      const areasSnapshot = await getDocs(areasQuery);
      const areasData = [];
      
      areasSnapshot.forEach((doc) => {
        areasData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setAreas(areasData);
      
      // Obtener plagas
      const pestsQuery = query(
        collection(db, 'pests'),
        orderBy('name', 'asc')
      );
      
      const pestsSnapshot = await getDocs(pestsQuery);
      const pestsData = [];
      
      pestsSnapshot.forEach((doc) => {
        pestsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setPests(pestsData);
    } catch (error) {
      console.error('Error al cargar áreas y plagas:', error);
      setError('Error al cargar datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddArea = async () => {
    if (!newArea.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      await addDoc(collection(db, 'areas'), {
        name: newArea.trim(),
        createdAt: new Date()
      });
      
      setNewArea('');
      setSuccess('Área agregada correctamente');
      fetchAreasAndPests();
    } catch (error) {
      console.error('Error al agregar área:', error);
      setError('Error al agregar área. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleAddPest = async () => {
    if (!newPest.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      await addDoc(collection(db, 'pests'), {
        name: newPest.trim(),
        createdAt: new Date()
      });
      
      setNewPest('');
      setSuccess('Plaga agregada correctamente');
      fetchAreasAndPests();
    } catch (error) {
      console.error('Error al agregar plaga:', error);
      setError('Error al agregar plaga. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditItem(item);
    setEditValue(item.name);
  };

  const handleEditCancel = () => {
    setEditItem(null);
    setEditValue('');
  };

  const handleEditSave = async () => {
    if (!editValue.trim() || !editItem) return;
    
    try {
      setLoading(true);
      setError('');
      
      const collectionName = tabValue === 0 ? 'areas' : 'pests';
      const itemRef = doc(db, collectionName, editItem.id);
      
      await updateDoc(itemRef, {
        name: editValue.trim(),
        updatedAt: new Date()
      });
      
      setEditItem(null);
      setEditValue('');
      setSuccess(`${tabValue === 0 ? 'Área' : 'Plaga'} actualizada correctamente`);
      fetchAreasAndPests();
    } catch (error) {
      console.error('Error al actualizar:', error);
      setError('Error al actualizar. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      setError('');
      
      const collectionName = tabValue === 0 ? 'areas' : 'pests';
      await deleteDoc(doc(db, collectionName, itemToDelete.id));
      
      setItemToDelete(null);
      setDeleteDialogOpen(false);
      setSuccess(`${tabValue === 0 ? 'Área' : 'Plaga'} eliminada correctamente`);
      fetchAreasAndPests();
    } catch (error) {
      console.error('Error al eliminar:', error);
      setError('Error al eliminar. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de Áreas y Plagas
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
      
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="áreas y plagas tabs"
          >
            <Tab label="Áreas" id="settings-tab-0" />
            <Tab label="Plagas" id="settings-tab-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <TextField
              label="Nueva Área"
              variant="outlined"
              size="small"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              sx={{ mr: 2, flexGrow: 1 }}
            />
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleAddArea}
              disabled={!newArea.trim() || loading}
            >
              Agregar
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loading && !areas.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {areas.map((area) => (
                <ListItem key={area.id}>
                  {editItem && editItem.id === area.id ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <TextField
                        variant="outlined"
                        size="small"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        sx={{ mr: 2, flexGrow: 1 }}
                      />
                      <IconButton 
                        edge="end" 
                        aria-label="save" 
                        onClick={handleEditSave}
                        disabled={!editValue.trim()}
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="cancel" 
                        onClick={handleEditCancel}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <>
                      <ListItemText primary={area.name} />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="edit" 
                          onClick={() => handleEditClick(area)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleDeleteClick(area)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
              {!areas.length && !loading && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No hay áreas registradas
                </Typography>
              )}
            </List>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <TextField
              label="Nueva Plaga"
              variant="outlined"
              size="small"
              value={newPest}
              onChange={(e) => setNewPest(e.target.value)}
              sx={{ mr: 2, flexGrow: 1 }}
            />
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleAddPest}
              disabled={!newPest.trim() || loading}
            >
              Agregar
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loading && !pests.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {pests.map((pest) => (
                <ListItem key={pest.id}>
                  {editItem && editItem.id === pest.id ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <TextField
                        variant="outlined"
                        size="small"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        sx={{ mr: 2, flexGrow: 1 }}
                      />
                      <IconButton 
                        edge="end" 
                        aria-label="save" 
                        onClick={handleEditSave}
                        disabled={!editValue.trim()}
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="cancel" 
                        onClick={handleEditCancel}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <>
                      <ListItemText primary={pest.name} />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="edit" 
                          onClick={() => handleEditClick(pest)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleDeleteClick(pest)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
              {!pests.length && !loading && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No hay plagas registradas
                </Typography>
              )}
            </List>
          )}
        </TabPanel>
      </Paper>
      
      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar "{itemToDelete?.name}"? Esta acción no se puede deshacer.
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
