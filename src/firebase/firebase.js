// Configuración de Firebase para FumiFacil
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC7PJtV6_MYEfkHZEIp1Pm8fPl7lgrNWF8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "xdxdxd-ed251.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "xdxdxd-ed251",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "xdxdxd-ed251.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "822100940554",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:822100940554:web:ea49d64b7204a591718cf3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9HFWV4ZQ5Z"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Inicializar Analytics solo si está soportado (evita errores en SSR)
let analytics = null;
// Inicializar analytics solo en el navegador, no en SSR
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

// Conectar al emulador de funciones solo en desarrollo y si estamos en un navegador
if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Conectado al emulador de funciones de Firebase');
  } catch (error) {
    console.error('Error al conectar al emulador de funciones:', error);
  }
}

export { db, storage, auth, functions, analytics };
