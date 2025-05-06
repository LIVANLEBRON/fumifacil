# FumiFácil - Sistema de Facturación para Empresas de Fumigación

FumiFácil es una aplicación web progresiva (PWA) diseñada específicamente para empresas de fumigación en República Dominicana. Cumple con los requisitos de la Ley 32-23 de la DGII para facturación electrónica.

## Características Principales

- **Facturación Electrónica (e-CF)**: Creación y envío de comprobantes fiscales electrónicos, firma digital de XML en formato UBL, y generación de PDFs con jsPDF.
- **Gestión de Clientes**: Registro completo de información de clientes, historial de servicios y documentos asociados.
- **Cotizaciones**: Creación de cotizaciones personalizadas, generación de PDFs, y conversión a facturas con un solo clic.
- **Inventario**: Control de productos químicos con alertas de stock bajo y fechas de vencimiento.
- **Estadísticas**: Dashboard con gráficos de ingresos, servicios realizados y estado del inventario.
- **Modo Offline**: Funcionalidad offline mediante Workbox para asegurar la operatividad continua.

## Tecnologías Utilizadas

- **Frontend**: React, Vite, Material-UI
- **Backend**: Firebase (Firestore, Storage, Functions, Authentication)
- **PDF**: jsPDF, jsPDF-AutoTable
- **Gráficos**: Chart.js, React-Chartjs-2
- **PWA**: Workbox, Vite-Plugin-PWA
- **Autenticación**: Firebase Authentication

## Requisitos del Sistema

- Node.js 16.x o superior
- NPM 8.x o superior
- Navegador moderno con soporte para PWA

## Instalación y Configuración

1. Clonar el repositorio:
   ```
   git clone [URL_DEL_REPOSITORIO]
   cd fumifacil
   ```

2. Instalar dependencias:
   ```
   npm install
   ```

3. Configurar variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto
   - Añadir las credenciales de Firebase y otras configuraciones necesarias

4. Iniciar el servidor de desarrollo:
   ```
   npm run dev
   ```

5. Construir para producción:
   ```
   npm run build
   ```

## Estructura del Proyecto

- `/src/pages`: Componentes principales de la aplicación organizados por funcionalidad
- `/src/components`: Componentes reutilizables
- `/src/contexts`: Contextos de React, incluyendo autenticación
- `/src/firebase`: Configuración y utilidades de Firebase
- `/src/utils`: Funciones de utilidad y helpers

## Licencia

Este proyecto es propiedad de [Nombre de la Empresa] y su uso está restringido según los términos acordados.
