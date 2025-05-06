import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { vitePwaConfiguration } from './src/utils/offline/pwaConfig';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA(vitePwaConfiguration)
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    // Configuración para desarrollo local
    server: {
      port: 3000,
      open: true,
    },
    // Definir variables de entorno disponibles en el cliente
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV !== 'production', // Solo generar sourcemaps en desarrollo
      // Optimizar el tamaño del bundle
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production', // Eliminar console.log en producción
        },
      },
      // Configuración de Rollup para dividir el código en chunks
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': [
              '@mui/material',
              '@mui/icons-material',
              '@mui/lab',
              '@mui/x-data-grid',
              '@mui/x-date-pickers',
              '@emotion/react',
              '@emotion/styled'
            ],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            'form-vendor': ['react-hook-form', 'yup'],
            'pdf-vendor': ['jspdf', 'jspdf-autotable'],
            'utils-vendor': ['date-fns', 'uuid', 'axios', 'crypto-js']
          }
        }
      }
    },
    // Optimizaciones para SSR (Server-Side Rendering) en Vercel
    ssr: {
      noExternal: ['@emotion/react', '@emotion/styled', '@mui/material']
    }
  };
});
