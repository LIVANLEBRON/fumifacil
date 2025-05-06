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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [period, setPeriod] = useState('month');
  const [invoicesData, setInvoicesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [quotesData, setQuotesData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Determinar fechas según el período seleccionado
        let startDate, endDate;
        const today = new Date();
        
        if (period === 'week') {
          startDate = subDays(today, 7);
          endDate = today;
        } else if (period === 'month') {
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
        } else if (period === 'year') {
          startDate = subMonths(today, 12);
          endDate = today;
        }
        
        // Consultar facturas
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'asc')
        );
        
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoicesResult = [];
        
        invoicesSnapshot.forEach(doc => {
          invoicesResult.push({ id: doc.id, ...doc.data() });
        });
        
        setInvoicesData(invoicesResult);
        
        // Consultar inventario con stock bajo
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('quantity', '<', 10),
          orderBy('quantity', 'asc'),
          limit(5)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        const inventoryResult = [];
        
        inventorySnapshot.forEach(doc => {
          inventoryResult.push({ id: doc.id, ...doc.data() });
        });
        
        setInventoryData(inventoryResult);
        
        // Consultar cotizaciones recientes
        const quotesQuery = query(
          collection(db, 'quotes'),
          orderBy('date', 'desc'),
          limit(5)
        );
        
        const quotesSnapshot = await getDocs(quotesQuery);
        const quotesResult = [];
        
        quotesSnapshot.forEach(doc => {
          quotesResult.push({ id: doc.id, ...doc.data() });
        });
        
        setQuotesData(quotesResult);
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [period]);

  // Preparar datos para gráficos
  const prepareInvoiceChartData = () => {
    // Agrupar facturas por fecha
    const groupedByDate = {};
    
    invoicesData.forEach(invoice => {
      const dateStr = format(invoice.date.toDate(), 'dd/MM/yyyy');
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = 0;
      }
      groupedByDate[dateStr] += invoice.amount;
    });
    
    const labels = Object.keys(groupedByDate);
    const data = Object.values(groupedByDate);
    
    return {
      labels,
      datasets: [
        {
          label: 'Ingresos (RD$)',
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1
        }
      ]
    };
  };

  const prepareInventoryChartData = () => {
    return {
      labels: inventoryData.map(item => item.name),
      datasets: [
        {
          label: 'Stock Disponible',
          data: inventoryData.map(item => item.quantity),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareQuotesStatusChartData = () => {
    const pending = quotesData.filter(quote => quote.status === 'pending').length;
    const accepted = quotesData.filter(quote => quote.status === 'accepted').length;
    const rejected = quotesData.filter(quote => quote.status === 'rejected').length;
    
    return {
      labels: ['Pendientes', 'Aceptadas', 'Rechazadas'],
      datasets: [
        {
          data: [pending, accepted, rejected],
          backgroundColor: [
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: [
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Opciones para los gráficos
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Ingresos por Facturación',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Productos con Stock Bajo',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Estado de Cotizaciones',
      },
    },
  };

  // Calcular estadísticas generales
  const totalInvoices = invoicesData.length;
  const totalRevenue = invoicesData.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalPendingQuotes = quotesData.filter(quote => quote.status === 'pending').length;
  const totalLowStock = inventoryData.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="period-select-label">Período</InputLabel>
          <Select
            labelId="period-select-label"
            id="period-select"
            value={period}
            label="Período"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="week">Última Semana</MenuItem>
            <MenuItem value="month">Este Mes</MenuItem>
            <MenuItem value="year">Último Año</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tarjetas de resumen */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Facturas
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {totalInvoices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                en el período seleccionado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Ingresos
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                RD$ {totalRevenue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                en el período seleccionado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DescriptionIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Cotizaciones
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {totalPendingQuotes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                pendientes de aprobación
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InventoryIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Inventario
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {totalLowStock}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                productos con stock bajo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Line 
              data={prepareInvoiceChartData()} 
              options={lineOptions} 
              height={350}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Doughnut 
              data={prepareQuotesStatusChartData()} 
              options={doughnutOptions}
              height={350}
            />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Bar 
              data={prepareInventoryChartData()} 
              options={barOptions}
              height={350}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
