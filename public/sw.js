// Este archivo es un punto de entrada para el Service Worker
// El contenido real será generado por vite-plugin-pwa

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// El resto del código será inyectado por el plugin
