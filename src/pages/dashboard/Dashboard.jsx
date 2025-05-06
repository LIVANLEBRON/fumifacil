import { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button
} from '@mui/material';
import { 
  PeopleAlt as PeopleIcon,
  RequestQuote as QuoteIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  ReceiptLong as ReceiptLongIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clientCount: 0,
    quoteCount: 0,
    invoiceCount: 0,
    productCount: 0
  });
  const [recentClients, setRecentClients] = useState([]);
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [chartData, setChartData] = useState({
    quotes: {
      labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#FFC107', '#4CAF50', '#F44336'],
      }]
    },
    invoices: {
      labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
      datasets: [{
        label: 'Ingresos',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: '#2196F3',
      }]
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener conteos
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const quotesSnapshot = await getDocs(collection(db, 'quotes'));
      const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
      const productsSnapshot = await getDocs(collection(db, 'products'));
      
      setStats({
        clientCount: clientsSnapshot.size,
        quoteCount: quotesSnapshot.size,
        invoiceCount: invoicesSnapshot.size,
        productCount: productsSnapshot.size
      });
      
      // Obtener clientes recientes
      const recentClientsQuery = query(
        collection(db, 'clients'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const recentClientsSnapshot = await getDocs(recentClientsQuery);
      const recentClientsData = [];
      
      recentClientsSnapshot.forEach((doc) => {
        recentClientsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRecentClients(recentClientsData);
      
      // Obtener cotizaciones recientes
      const recentQuotesQuery = query(
        collection(db, 'quotes'),
        orderBy('date', 'desc'),
        limit(5)
      );
      
      const recentQuotesSnapshot = await getDocs(recentQuotesQuery);
      const recentQuotesData = [];
      
      recentQuotesSnapshot.forEach((doc) => {
        recentQuotesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRecentQuotes(recentQuotesData);
      
      // Datos para gráfico de cotizaciones por estado
      const pendingQuotesQuery = query(
        collection(db, 'quotes'),
        where('status', '==', 'pending')
      );
      
      const approvedQuotesQuery = query(
        collection(db, 'quotes'),
        where('status', '==', 'approved')
      );
      
      const rejectedQuotesQuery = query(
        collection(db, 'quotes'),
        where('status', '==', 'rejected')
      );
      
      const pendingQuotesSnapshot = await getDocs(pendingQuotesQuery);
      const approvedQuotesSnapshot = await getDocs(approvedQuotesQuery);
      const rejectedQuotesSnapshot = await getDocs(rejectedQuotesQuery);
      
      setChartData(prev => ({
        ...prev,
        quotes: {
          ...prev.quotes,
          datasets: [{
            ...prev.quotes.datasets[0],
            data: [
              pendingQuotesSnapshot.size,
              approvedQuotesSnapshot.size,
              rejectedQuotesSnapshot.size
            ]
          }]
        }
      }));
      
      // Datos para gráfico de ingresos mensuales (simulados por ahora)
      // En una implementación real, esto vendría de un análisis de las facturas
      setChartData(prev => ({
        ...prev,
        invoices: {
          ...prev.invoices,
          datasets: [{
            ...prev.invoices.datasets[0],
            data: [12000, 19000, 15000, 25000, 22000, 30000]
          }]
        }
      }));
      
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#e3f2fd'
            }}
          >
            <PeopleIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
            <Typography component="h2" variant="h5">
              {stats.clientCount}
            </Typography>
            <Typography color="text.secondary">
              Clientes
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#fff8e1'
            }}
          >
            <QuoteIcon sx={{ fontSize: 40, color: '#f57c00', mb: 1 }} />
            <Typography component="h2" variant="h5">
              {stats.quoteCount}
            </Typography>
            <Typography color="text.secondary">
              Cotizaciones
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#e8f5e9'
            }}
          >
            <ReceiptIcon sx={{ fontSize: 40, color: '#388e3c', mb: 1 }} />
            <Typography component="h2" variant="h5">
              {stats.invoiceCount}
            </Typography>
            <Typography color="text.secondary">
              Facturas
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: '#ffebee'
            }}
          >
            <InventoryIcon sx={{ fontSize: 40, color: '#d32f2f', mb: 1 }} />
            <Typography component="h2" variant="h5">
              {stats.productCount}
            </Typography>
            <Typography color="text.secondary">
              Productos
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Estado de Cotizaciones
            </Typography>
            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pie data={chartData.quotes} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ingresos Mensuales
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={chartData.invoices} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return 'RD$ ' + value.toLocaleString();
                        }
                      }
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Listas de recientes */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Clientes Recientes" />
            <Divider />
            <CardContent>
              {recentClients.length > 0 ? (
                <List>
                  {recentClients.map((client) => (
                    <ListItem key={client.id}>
                      <ListItemText 
                        primary={client.name} 
                        secondary={client.email || client.phone || client.rnc} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay clientes registrados
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Cotizaciones Recientes" />
            <Divider />
            <CardContent>
              {recentQuotes.length > 0 ? (
                <List>
                  {recentQuotes.map((quote) => (
                    <ListItem key={quote.id}>
                      <ListItemText 
                        primary={`Cotización #${quote.quoteNumber || quote.id}`} 
                        secondary={`Cliente: ${quote.clientName} - Total: RD$ ${quote.total?.toFixed(2) || 0}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay cotizaciones registradas
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            to="/dashboard/ecf"
            startIcon={<ReceiptLongIcon />}
            size="large"
            sx={{ px: 3, py: 1 }}
          >
            Ver Dashboard de Facturación Electrónica
          </Button>
        </Box>
      </Grid>
    </Container>
  );
}
