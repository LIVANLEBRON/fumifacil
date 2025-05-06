/**
 * Configuración para el Service Worker y PWA
 * Este archivo es utilizado por el plugin VitePWA para generar el Service Worker
 */

export const pwaConfiguration = {
  // Nombre de la aplicación
  name: 'FumiFácil',
  short_name: 'FumiFácil',
  description: 'Sistema de facturación electrónica para empresas de fumigación',
  
  // Tema y colores
  theme_color: '#1976d2',
  background_color: '#ffffff',
  
  // Orientación y pantalla de inicio
  orientation: 'any',
  display: 'standalone',
  
  // Iconos (estos deben existir en la carpeta public)
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
    },
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ],
  
  // Configuración del Service Worker
  includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
  
  // Estrategias de caché
  workbox: {
    // Estrategia para archivos estáticos (HTML, CSS, JS, imágenes)
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
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
          }
        }
      },
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7 // 1 semana
          }
        }
      },
      {
        // Estrategia para API de Firebase
        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'firebase-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 // 1 día
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  },
  
  // Configuración de la página offline
  manifest: {
    name: 'FumiFácil',
    short_name: 'FumiFácil',
    description: 'Sistema de facturación electrónica para empresas de fumigación',
    theme_color: '#1976d2',
    background_color: '#ffffff',
    orientation: 'any',
    display: 'standalone',
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
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
};

// Configuración para el plugin VitePWA
export const vitePwaConfiguration = {
  // Estrategia de registro del Service Worker
  registerType: 'prompt',
  
  // Incluir manifesto
  includeManifestIcons: true,
  
  // Configuración del manifesto
  manifest: pwaConfiguration.manifest,
  
  // Configuración de Workbox
  workbox: pwaConfiguration.workbox,
  
  // Incluir assets
  includeAssets: pwaConfiguration.includeAssets,
  
  // Configuración del Service Worker
  injectRegister: 'auto',
  
  // Estrategia de actualización del Service Worker
  strategies: 'injectManifest',
  
  // Configuración del modo de desarrollo
  devOptions: {
    enabled: true,
    type: 'module',
    navigateFallback: 'index.html'
  }
};
