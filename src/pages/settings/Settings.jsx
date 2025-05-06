import { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab
} from '@mui/material';
import { 
  Business as BusinessIcon,
  Category as CategoryIcon,
  Security as SecurityIcon,
  Receipt as ReceiptIcon,
  Handyman as HandymanIcon,
  VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';
import CompanySettings from './CompanySettings';
import AreasAndPests from './AreasAndPests';
import ServicesSettings from './ServicesSettings';
import CertificateManager from './CertificateManager';
import InvoiceSettings from './InvoiceSettings';

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
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Settings() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Placeholder para componentes aún no implementados
  const NotImplemented = ({ feature }) => (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {feature}
      </Typography>
      <Typography variant="body1">
        Esta funcionalidad está en desarrollo.
      </Typography>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="configuración tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            icon={<BusinessIcon />} 
            iconPosition="start" 
            label="Empresa" 
            id="settings-tab-0" 
          />
          <Tab 
            icon={<CategoryIcon />} 
            iconPosition="start" 
            label="Áreas y Plagas" 
            id="settings-tab-1" 
          />
          <Tab 
            icon={<HandymanIcon />} 
            iconPosition="start" 
            label="Servicios" 
            id="settings-tab-2" 
          />
          <Tab 
            icon={<ReceiptIcon />} 
            iconPosition="start" 
            label="Facturación" 
            id="settings-tab-3" 
          />
          <Tab 
            icon={<VerifiedUserIcon />} 
            iconPosition="start" 
            label="Certificados" 
            id="settings-tab-4" 
          />
          <Tab 
            icon={<SecurityIcon />} 
            iconPosition="start" 
            label="Seguridad" 
            id="settings-tab-5" 
          />
        </Tabs>
      </Paper>
      
      <TabPanel value={tabValue} index={0}>
        <CompanySettings />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <AreasAndPests />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <ServicesSettings />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <InvoiceSettings />
      </TabPanel>
      
      <TabPanel value={tabValue} index={4}>
        <CertificateManager />
      </TabPanel>
      
      <TabPanel value={tabValue} index={5}>
        <NotImplemented feature="Configuración de Seguridad" />
      </TabPanel>
    </Container>
  );
}
