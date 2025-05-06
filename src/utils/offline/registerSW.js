/**
 * Registro del Service Worker para la funcionalidad offline
 * Este archivo debe ser importado en el punto de entrada principal de la aplicación
 */

import { registerSW } from 'virtual:pwa-register';

// Función para actualizar el Service Worker
const updateSW = registerSW({
  // Cuando hay una nueva versión disponible
  onNeedRefresh() {
    // Mostrar notificación al usuario
    if (confirm('Hay una nueva versión disponible. ¿Desea actualizar?')) {
      updateSW(true);
    }
  },
  // Cuando el Service Worker está listo
  onOfflineReady() {
    console.log('La aplicación está lista para funcionar sin conexión');
  },
  // Cuando hay un error en el registro
  onRegisterError(error) {
    console.error('Error al registrar el Service Worker:', error);
  }
});

export default updateSW;
