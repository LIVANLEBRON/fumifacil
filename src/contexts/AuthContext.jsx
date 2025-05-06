import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/firebase';

// Crear contexto de autenticación
const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  return useContext(AuthContext);
};

// Proveedor del contexto de autenticación
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Función para registrar un nuevo usuario
  const signup = async (email, password) => {
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Función para iniciar sesión
  const login = async (email, password) => {
    try {
      setError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      setError('');
      await signOut(auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Función para restablecer contraseña
  const resetPassword = async (email) => {
    try {
      setError('');
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Efecto para observar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Valor del contexto
  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
