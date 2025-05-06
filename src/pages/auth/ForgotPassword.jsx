import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Avatar, 
  Button, 
  TextField, 
  Link, 
  Grid, 
  Box, 
  Typography, 
  Container, 
  Alert, 
  Paper 
} from '@mui/material';
import { 
  LockReset as LockResetIcon 
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Se ha enviado un correo con instrucciones para restablecer tu contraseña.');
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      setError('No se pudo enviar el correo de restablecimiento. Verifica tu dirección de correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 8, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'warning.main' }}>
          <LockResetIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Recuperar Contraseña
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
            {message}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Correo Electrónico"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
          </Button>
          <Grid container>
            <Grid item xs>
              <Link component={RouterLink} to="/login" variant="body2">
                Volver a Iniciar Sesión
              </Link>
            </Grid>
            <Grid item>
              <Link component={RouterLink} to="/registro" variant="body2">
                {"¿No tienes cuenta? Regístrate"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}
