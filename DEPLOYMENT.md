# Guía de Despliegue para FumiFácil

Esta guía explica cómo desplegar correctamente la aplicación FumiFácil, que utiliza Firebase y Cloud Functions.

## Estructura del Proyecto

El proyecto consta de dos partes principales:
1. **Frontend**: Aplicación React construida con Vite
2. **Backend**: Cloud Functions de Firebase

## Pasos para el Despliegue

### 1. Desplegar las Cloud Functions en Firebase

Las Cloud Functions deben desplegarse en Firebase, no en Vercel:

```bash
# Navegar al directorio de funciones
cd functions

# Instalar dependencias si no lo has hecho
npm install

# Desplegar las funciones en Firebase
firebase deploy --only functions
```

### 2. Configurar Variables de Entorno en Vercel

Antes de desplegar en Vercel, debes configurar las siguientes variables de entorno en el panel de control de Vercel:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_FUNCTIONS_URL` (URL de tus Cloud Functions desplegadas)

### 3. Desplegar el Frontend en Vercel

Hay dos formas de desplegar en Vercel:

#### Opción 1: Despliegue desde la Interfaz de Vercel

1. Inicia sesión en [Vercel](https://vercel.com)
2. Haz clic en "New Project"
3. Importa tu repositorio de Git
4. Configura el proyecto:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Añade las variables de entorno mencionadas anteriormente
6. Haz clic en "Deploy"

#### Opción 2: Despliegue usando la CLI de Vercel

1. Instala la CLI de Vercel:
   ```bash
   npm install -g vercel
   ```

2. Inicia sesión en Vercel:
   ```bash
   vercel login
   ```

3. Despliega el proyecto:
   ```bash
   vercel
   ```

4. Sigue las instrucciones interactivas para configurar el proyecto

## Solución de Problemas Comunes

### Error: "Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE"

Este error puede ocurrir debido a problemas de CORS. Asegúrate de que:

1. Las Cloud Functions estén configuradas para permitir solicitudes desde tu dominio de Vercel
2. El archivo `vercel.json` incluya los encabezados CORS correctos

### Error: "Firebase: Error (auth/...)"

Verifica que las variables de entorno de Firebase estén correctamente configuradas en Vercel.

### Error: "Cannot find module..."

Si hay errores de módulos faltantes:
1. Verifica que todas las dependencias estén en `package.json`
2. Prueba con `npm install` localmente antes de desplegar
3. Asegúrate de que no haya importaciones de archivos que no existan

## Verificar el Despliegue

Una vez desplegada la aplicación:

1. Verifica que puedas iniciar sesión
2. Comprueba que las Cloud Functions funcionen correctamente
3. Prueba la funcionalidad offline
4. Verifica la integración con la DGII

## Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Documentación de Firebase Cloud Functions](https://firebase.google.com/docs/functions)

## Requisitos Previos

- Node.js 16.x o superior
- npm 8.x o superior
- Firebase CLI (`npm install -g firebase-tools`)
- Vercel CLI (`npm install -g vercel`)
- Cuenta en Firebase
- Cuenta en Vercel

## Configuración del Entorno

1. **Variables de Entorno**

   Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

   ```
   VITE_FIREBASE_API_KEY=tu-api-key
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu-messaging-id
   VITE_FIREBASE_APP_ID=tu-app-id
   VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-tu-proyecto.cloudfunctions.net
   ```

2. **Configuración de Firebase**

   Si aún no has inicializado Firebase en el proyecto:

   ```bash
   firebase login
   firebase init
   ```

   Selecciona las siguientes opciones:
   - Firestore
   - Functions
   - Storage
   - Hosting (opcional)

## Solución al Error del Service Worker

Si encuentras el error `Could not resolve entry module "public/sw.js"` durante el despliegue, sigue estos pasos:

1. **Verifica que el archivo `public/sw.js` exista**

   Este archivo debe estar presente aunque esté vacío, ya que sirve como punto de entrada para el Service Worker.

2. **Actualiza la configuración de Vite**

   En `vite.config.js`, asegúrate de que la configuración del plugin PWA sea la siguiente:

   ```javascript
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
       globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}']
     },
     injectRegister: 'auto',
     strategies: 'generateSW',
     devOptions: {
       enabled: true,
       type: 'module'
     }
   })
   ```

3. **Asegúrate de tener los iconos necesarios**

   Verifica que los siguientes archivos existan en la carpeta `public`:
   - `pwa-192x192.png`
   - `pwa-512x512.png`

## Despliegue de Cloud Functions

1. **Instala las dependencias de las funciones**

   ```bash
   cd functions
   npm install
   cd ..
   ```

2. **Despliega las funciones**

   ```bash
   npm run deploy:functions
   ```

   O usando Firebase CLI directamente:

   ```bash
   firebase deploy --only functions
   ```

3. **Verifica el despliegue**

   Una vez completado el despliegue, Firebase mostrará las URLs de las funciones. Copia la URL base (algo como `https://us-central1-tu-proyecto.cloudfunctions.net`) y actualiza la variable de entorno `VITE_FIREBASE_FUNCTIONS_URL` en tu archivo `.env` y en la configuración de Vercel.

## Despliegue en Vercel

1. **Configura las variables de entorno en Vercel**

   Puedes hacerlo a través de la interfaz web de Vercel o usando el CLI:

   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add VITE_FIREBASE_AUTH_DOMAIN
   vercel env add VITE_FIREBASE_PROJECT_ID
   vercel env add VITE_FIREBASE_STORAGE_BUCKET
   vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
   vercel env add VITE_FIREBASE_APP_ID
   vercel env add VITE_FIREBASE_FUNCTIONS_URL
   ```

2. **Construye la aplicación localmente para verificar que no hay errores**

   ```bash
   npm run build
   ```

3. **Despliega la aplicación en Vercel**

   ```bash
   npm run deploy:app
   ```

   O usando Vercel CLI directamente:

   ```bash
   vercel --prod
   ```

## Usando el Script de Despliegue Automatizado

Hemos creado un script de despliegue para facilitar el proceso:

```bash
npm run deploy
```

Este script te guiará a través del proceso de despliegue, verificando dependencias y permitiéndote elegir qué componentes desplegar.

## Verificación Post-Despliegue

Después de completar el despliegue, verifica lo siguiente:

1. **Accede a la aplicación** a través de la URL proporcionada por Vercel.
2. **Inicia sesión** para verificar que la autenticación funciona.
3. **Crea una factura** y verifica que se guarda correctamente en Firestore.
4. **Prueba las funcionalidades de e-CF** para asegurarte de que la comunicación con las Cloud Functions funciona correctamente.

## Solución de Problemas Comunes

### Error 404 en Rutas de la Aplicación

Si experimentas errores 404 al navegar directamente a rutas de la aplicación, verifica que el archivo `vercel.json` contenga la siguiente configuración:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Error en las Cloud Functions

Si las Cloud Functions no responden correctamente, verifica:

1. Que las funciones se hayan desplegado correctamente en Firebase.
2. Que la variable de entorno `VITE_FIREBASE_FUNCTIONS_URL` esté configurada correctamente.
3. Que las reglas de seguridad de Firebase permitan las operaciones necesarias.

### Problemas con el Service Worker

Si el Service Worker no se registra correctamente:

1. Verifica que los archivos `pwa-192x192.png` y `pwa-512x512.png` existan en la carpeta `public`.
2. Asegúrate de que el archivo `public/sw.js` exista.
3. Comprueba la configuración del plugin PWA en `vite.config.js`.

## Tareas Pendientes para Completar el Proyecto

1. **Pruebas exhaustivas**:
   - Verificar todas las funcionalidades de e-CF
   - Probar el sistema en modo offline
   - Validar la generación y firma de XML
   - Comprobar la anulación de facturas

2. **Optimización de rendimiento**:
   - Implementar lazy loading para componentes grandes
   - Optimizar consultas a Firestore
   - Mejorar el cacheo de datos

3. **Documentación final**:
   - Completar la guía de usuario con capturas de pantalla
   - Actualizar la documentación técnica con los últimos cambios

## Recursos Adicionales

- [Documentación de Firebase](https://firebase.google.com/docs)
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Vite](https://vitejs.dev/guide/)
- [Documentación de PWA con Vite](https://vite-pwa-org.netlify.app/)
