import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'FumiFacil - Sistema de Facturación',
          short_name: 'FumiFacil',
          description: 'Sistema de facturación electrónica para empresas de fumigación',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          // Configuración de workbox para el Service Worker
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        // Eliminar la referencia a sw.js como injectRegister
        injectRegister: 'auto',
        strategies: 'generateSW',
        // No usar un archivo externo como punto de entrada
        // Dejar que el plugin genere el Service Worker automáticamente
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
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
      sourcemap: mode !== 'production', 
      // Optimizar el tamaño del bundle
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Eliminar console.log en producción
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
    },
    // Configuración para Vercel
    base: '/'
  };
});
