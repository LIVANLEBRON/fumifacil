import React from 'react';
import { Button, CircularProgress, Box } from '@mui/material';

/**
 * Componente de botón seguro que evita errores de DOM
 * al manejar correctamente los estados de carga y los iconos
 * 
 * @param {Object} props - Propiedades del botón
 * @param {boolean} props.loading - Indica si el botón está en estado de carga
 * @param {React.ReactNode} props.startIcon - Icono para mostrar al inicio del botón
 * @param {React.ReactNode} props.endIcon - Icono para mostrar al final del botón
 * @param {string} props.loadingText - Texto a mostrar durante la carga (opcional)
 * @param {React.ReactNode} props.children - Contenido del botón
 * @returns {React.ReactElement} - Componente de botón seguro
 */
const SafeButton = ({ 
  loading = false, 
  startIcon, 
  endIcon, 
  loadingText, 
  children, 
  ...props 
}) => {
  // No usar startIcon y endIcon directamente en el Button
  // En su lugar, renderizar los iconos manualmente dentro del botón
  // para evitar errores de insertBefore/removeChild
  
  const buttonContent = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Renderizar startIcon manualmente si no está en estado de carga */}
      {!loading && startIcon && (
        <Box component="span" sx={{ display: 'inline-flex', mr: 1 }}>
          {startIcon}
        </Box>
      )}
      
      {/* Contenido principal del botón */}
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <span>{loadingText || 'Procesando...'}</span>
        </Box>
      ) : (
        <span>{children}</span>
      )}
      
      {/* Renderizar endIcon manualmente si no está en estado de carga */}
      {!loading && endIcon && (
        <Box component="span" sx={{ display: 'inline-flex', ml: 1 }}>
          {endIcon}
        </Box>
      )}
    </Box>
  );

  return (
    <Button
      {...props}
      // No usar las propiedades startIcon y endIcon de MUI
      disabled={loading || props.disabled}
    >
      {buttonContent}
    </Button>
  );
};

export default SafeButton;
