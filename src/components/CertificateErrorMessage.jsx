import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DevelopmentCertificateButton from './DevelopmentCertificateButton';

/**
 * Componente que muestra un mensaje de error cuando no hay un certificado digital configurado
 * y ofrece opciones para solucionarlo
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.error - Mensaje de error a mostrar
 * @returns {React.ReactElement} - Componente de mensaje de error
 */
const CertificateErrorMessage = ({ error }) => {
  const navigate = useNavigate();
  const isCertificateError = error && error.includes('certificado digital');

  if (!error) return null;

  return (
    <Container>
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/settings/ecf')}
            startIcon={<SettingsIcon />}
          >
            Ir a Configuración
          </Button>
          
          {isCertificateError && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Para desarrollo, puede crear un certificado temporal:
              </Typography>
              <DevelopmentCertificateButton />
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default CertificateErrorMessage;
