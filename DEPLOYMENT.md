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
