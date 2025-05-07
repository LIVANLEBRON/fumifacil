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
    // También puedes registrar el error en un servicio de reporte de errores
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
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
      // Puedes renderizar cualquier UI alternativa
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
              maxWidth: 600, 
              textAlign: 'center',
              borderRadius: 2
            }}
          >
            <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Algo salió mal
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Ha ocurrido un error en esta parte de la aplicación. Puedes intentar recargar la página o volver al inicio.
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
