import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { createMockCertificate } from '../utils/ecf/mockCertificate';
import SafeButton from './SafeButton';

/**
 * Botón para crear un certificado digital falso para desarrollo
 * SOLO DEBE USARSE EN ENTORNOS DE DESARROLLO
 */
const DevelopmentCertificateButton = () => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleCreateCertificate = async () => {
    setLoading(true);
    try {
      await createMockCertificate();
      setSnackbar({
        open: true,
        message: 'Certificado de desarrollo creado exitosamente',
        severity: 'success'
      });
      // Recargar la página para que se apliquen los cambios
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error al crear certificado:', error);
      setSnackbar({
        open: true,
        message: `Error al crear certificado: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <SafeButton
        variant="contained"
        color="warning"
        onClick={handleCreateCertificate}
        loading={loading}
        loadingText="Creando certificado..."
      >
        Crear Certificado de Desarrollo
      </SafeButton>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DevelopmentCertificateButton;
