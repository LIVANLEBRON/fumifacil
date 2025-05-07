import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

/**
 * Componente de límite de errores (Error Boundary) para capturar errores en la interfaz
 * y mostrar una interfaz de recuperación en lugar de que la aplicación se rompa
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la UI alternativa
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar el error en la consola
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    
    // Detectar específicamente errores de removeChild
    const isRemoveChildError = 
      error.message && (
        error.message.includes('removeChild') ||
        error.message.includes('The node to be removed is not a child of this node')
      );
    
    // Guardar información del error en el estado
    this.setState({
      error: error,
      errorInfo: errorInfo,
      isRemoveChildError: isRemoveChildError
    });
    
    // Si es un error de removeChild, intentar limpiar el DOM
    if (isRemoveChildError) {
      console.warn('Detectado error de removeChild, intentando recuperación...');
      // Usar setTimeout para permitir que React complete el ciclo de renderizado actual
      setTimeout(() => {
        try {
          // Forzar una actualización limpia
          this.forceUpdate();
        } catch (e) {
          console.error('Error durante la recuperación:', e);
        }
      }, 0);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      // Si es un componente hijo que proporciona su propio fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Determinar el mensaje de error apropiado
      let errorMessage = 'Ha ocurrido un error en la aplicación';
      let detailMessage = 'Por favor, intenta recargar la página';
      
      // Mensaje específico para errores de removeChild
      if (this.state.isRemoveChildError) {
        errorMessage = 'Error de manipulación del DOM';
        detailMessage = 'Se ha detectado un problema con la interfaz. Esto suele resolverse recargando la página.';
      }
      
      // UI alternativa para errores
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            p: 3
          }}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              maxWidth: 500, 
              textAlign: 'center'
            }}
          >
            <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" color="error" gutterBottom>
              {errorMessage}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {detailMessage}
            </Typography>
            {this.state.error && (
              <Box sx={{ mt: 2, mb: 3, textAlign: 'left', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto' }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button variant="outlined" onClick={this.handleReset}>
                Intentar de nuevo
              </Button>
              <Button 
                variant="contained" 
                onClick={() => window.location.href = '/'}
              >
                Volver al inicio
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    // Si no hay error, renderiza los children normalmente
    return this.props.children;
  }
}

export default ErrorBoundary;
