import { Routes, Route, Navigate } from 'react-router-dom';
import ClientList from '../pages/clients/ClientList';
import ClientForm from '../pages/clients/ClientForm';
import ClientFormOffline from '../pages/clients/ClientFormOffline';
import ClientDetail from '../pages/clients/ClientDetail';
import Dashboard from '../pages/dashboard/Dashboard';
import ECFDashboard from '../pages/dashboard/ECFDashboard';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import PrivateRoute from './PrivateRoute';
import Settings from '../pages/settings/Settings';

// Importar componentes de cotizaciones
import QuoteList from '../pages/quotes/QuoteList';
import QuoteForm from '../pages/quotes/QuoteForm';
import QuoteDetail from '../pages/quotes/QuoteDetail';

// Importar componentes de facturas
import InvoiceList from '../pages/invoices/InvoiceList';
import InvoiceForm from '../pages/invoices/InvoiceForm';
import InvoiceDetail from '../pages/invoices/InvoiceDetail';
import ECFSettings from '../pages/settings/ECFSettings';

// Importar componentes de inventario
import InventoryList from '../pages/inventory/InventoryList';
import ProductForm from '../pages/inventory/ProductForm';
import ProductDetail from '../pages/inventory/ProductDetail';
import InventoryAlerts from '../pages/inventory/InventoryAlerts';
import InventoryMovements from '../pages/inventory/InventoryMovements';

// Placeholder para páginas aún no implementadas
const NotImplemented = ({ feature }) => (
  <div style={{ padding: '2rem' }}>
    <h1>{feature}</h1>
    <p>Esta funcionalidad está en desarrollo.</p>
  </div>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Rutas protegidas */}
      <Route element={<PrivateRoute />}>
        {/* Ruta principal */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard/ecf" element={<ECFDashboard />} />
        
        {/* Rutas de clientes */}
        <Route path="/clientes" element={<ClientList />} />
        <Route path="/clientes/nuevo" element={<ClientForm />} />
        <Route path="/clientes/nuevo-offline" element={<ClientFormOffline />} />
        <Route path="/clientes/editar/:id" element={<ClientForm />} />
        <Route path="/clientes/editar-offline/:id" element={<ClientFormOffline />} />
        <Route path="/clientes/:id" element={<ClientDetail />} />
        
        {/* Rutas de cotizaciones */}
        <Route path="/cotizaciones" element={<QuoteList />} />
        <Route path="/cotizaciones/nueva" element={<QuoteForm />} />
        <Route path="/cotizaciones/editar/:id" element={<QuoteForm />} />
        <Route path="/cotizaciones/:id" element={<QuoteDetail />} />
        
        {/* Rutas de facturas */}
        <Route path="/facturas" element={<InvoiceList />} />
        <Route path="/facturas/nueva" element={<InvoiceForm />} />
        <Route path="/facturas/editar/:id" element={<InvoiceForm />} />
        <Route path="/facturas/:id" element={<InvoiceDetail />} />
        
        {/* Rutas de inventario */}
        <Route path="/inventario" element={<InventoryList />} />
        <Route path="/inventario/nuevo" element={<ProductForm />} />
        <Route path="/inventario/editar/:id" element={<ProductForm />} />
        <Route path="/inventario/:id" element={<ProductDetail />} />
        <Route path="/inventario/alertas" element={<InventoryAlerts />} />
        <Route path="/inventario/movimientos" element={<InventoryMovements />} />
        
        {/* Rutas de configuración */}
        <Route path="/configuracion" element={<Settings />} />
        <Route path="/configuracion/ecf" element={<ECFSettings />} />
      </Route>
      
      {/* Ruta para redireccionar URLs no encontradas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
