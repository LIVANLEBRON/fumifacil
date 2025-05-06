import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  HourglassEmpty as HourglassEmptyIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

/**
 * Componente para mostrar estadísticas de facturación electrónica
 * @param {Object} props - Propiedades del componente
 * @param {string} props.period - Período de tiempo para las estadísticas (week, month, year, all)
 * @param {Function} props.onDataLoaded - Función a llamar cuando se cargan los datos
 */
export default function ECFStatistics({ period = 'month', onDataLoaded }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    totalAmount: 0,
    monthlyData: []
  });

  // Cargar estadísticas
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError('');

        // Determinar fecha de inicio según el período
        const startDate = new Date();
        if (period === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (period === 'all') {
          startDate.setFullYear(2000); // Fecha muy antigua para incluir todo
        }

        // Consultar facturas
        let q;
        if (period !== 'all') {
          q = query(
            collection(db, 'invoices'),
            where('date', '>=', startDate)
          );
        } else {
          q = query(collection(db, 'invoices'));
        }

        const querySnapshot = await getDocs(q);
        
        // Inicializar contadores
        let total = 0;
        let pending = 0;
        let sent = 0;
        let accepted = 0;
        let rejected = 0;
        let totalAmount = 0;
        
        // Datos mensuales para gráfico
        const monthlyData = {};
        
        // Procesar resultados
        querySnapshot.forEach((doc) => {
          const invoice = doc.data();
          total++;
          
          // Contar por estado
          if (invoice.status === 'pendiente') {
            pending++;
          } else if (invoice.status === 'enviada') {
            sent++;
          } else if (invoice.status === 'aceptada') {
            accepted++;
          } else if (invoice.status === 'rechazada') {
            rejected++;
          }
          
          // Sumar monto total
          totalAmount += invoice.total || 0;
          
          // Agrupar por mes para el gráfico
          if (invoice.date) {
            const date = invoice.date.toDate ? invoice.date.toDate() : new Date(invoice.date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            
            if (!monthlyData[monthYear]) {
              monthlyData[monthYear] = {
                count: 0,
                amount: 0
              };
            }
            
            monthlyData[monthYear].count++;
            monthlyData[monthYear].amount += invoice.total || 0;
          }
        });
        
        // Convertir datos mensuales a arrays para el gráfico
        const monthlyDataArray = Object.keys(monthlyData).map(key => ({
          month: key,
          count: monthlyData[key].count,
          amount: monthlyData[key].amount
        }));
        
        // Ordenar por fecha
        monthlyDataArray.sort((a, b) => {
          const [monthA, yearA] = a.month.split('/');
          const [monthB, yearB] = b.month.split('/');
          
          if (yearA !== yearB) {
            return yearA - yearB;
          }
          
          return monthA - monthB;
        });
        
        // Actualizar estado
        setStats({
          total,
          pending,
          sent,
          accepted,
          rejected,
          totalAmount,
          monthlyData: monthlyDataArray
        });
        
        // Notificar que los datos han sido cargados
        if (onDataLoaded) {
          onDataLoaded({
            total,
            pending,
            sent,
            accepted,
            rejected,
            totalAmount
          });
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        setError('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, [period, onDataLoaded]);

  // Datos para el gráfico circular
  const pieData = {
    labels: ['Pendientes', 'Enviadas', 'Aceptadas', 'Rechazadas'],
    datasets: [
      {
        data: [stats.pending, stats.sent, stats.accepted, stats.rejected],
        backgroundColor: [
          'rgba(255, 206, 86, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Datos para el gráfico de barras
  const barData = {
    labels: stats.monthlyData.map(item => item.month),
    datasets: [
      {
        label: 'Cantidad de Facturas',
        data: stats.monthlyData.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  // Opciones para el gráfico de barras
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Facturas por Mes'
      }
    }
  };

  // Formatear monto como moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  // Obtener título según el período
  const getPeriodTitle = () => {
    switch (period) {
      case 'week':
        return 'Última Semana';
      case 'month':
        return 'Último Mes';
      case 'year':
        return 'Último Año';
      case 'all':
        return 'Todas las Facturas';
      default:
        return 'Estadísticas';
    }
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Estadísticas de Facturación Electrónica - {getPeriodTitle()}
        </Typography>
        <BarChartIcon />
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Facturas
                  </Typography>
                  <Typography variant="h4">
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Aceptadas
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.accepted}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pendientes
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.pending}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monto Total
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.totalAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Estado de Facturas" />
                <CardContent>
                  <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                    <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Facturas por Mes" />
                <CardContent>
                  <Box sx={{ height: 300 }}>
                    <Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Paper>
  );
}
