# Guía Técnica: Sistema de Facturación Electrónica (e-CF)

Esta guía técnica está dirigida a desarrolladores que necesiten mantener, extender o modificar el sistema de facturación electrónica (e-CF) implementado en FumiFácil.

## Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Componentes Principales](#componentes-principales)
3. [Flujo de Datos](#flujo-de-datos)
4. [Seguridad](#seguridad)
5. [Integración con la DGII](#integración-con-la-dgii)
6. [Extensión del Sistema](#extensión-del-sistema)
7. [Solución de Problemas Comunes](#solución-de-problemas-comunes)

## Arquitectura del Sistema

El sistema de facturación electrónica está construido siguiendo una arquitectura cliente-servidor, utilizando las siguientes tecnologías:

- **Frontend**: React con Material UI
- **Backend**: Firebase Cloud Functions
- **Base de Datos**: Firestore
- **Almacenamiento**: Firebase Storage
- **Autenticación**: Firebase Authentication

### Diagrama de Arquitectura

```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|  Cliente (React)  | <---> |  Firebase Hosting | <---> |  Firebase Auth    |
|                   |       |                   |       |                   |
+-------------------+       +-------------------+       +-------------------+
         ^                           ^
         |                           |
         v                           v
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|  Firestore        | <---> | Cloud Functions   | <---> |  API DGII         |
|                   |       |                   |       |                   |
+-------------------+       +-------------------+       +-------------------+
         ^                           ^
         |                           |
         v                           v
+-------------------+       +-------------------+
|                   |       |                   |
|  Firebase Storage | <---> | Certificados      |
|                   |       | Digitales         |
+-------------------+       +-------------------+
```

## Componentes Principales

### Dashboard de Facturación Electrónica

El sistema incluye un dashboard especializado para la facturación electrónica que proporciona una visión general del estado del sistema e-CF:

- **Ubicación**: `src/pages/dashboard/ECFDashboard.jsx`
- **Funcionalidad**: Muestra estadísticas de facturación, estado del sistema, facturas recientes y estado de la conexión con la DGII.
- **Componentes relacionados**:
  - `ECFStatistics`: Visualiza estadísticas de facturación mediante gráficos.
  - `DGIIStatusMonitor`: Monitorea el estado de la conexión con la DGII.

### Anulación de Facturas Electrónicas

El sistema permite la anulación de facturas electrónicas según los requisitos de la DGII:

- **Componente**: `src/components/ecf/InvoiceCancellation.jsx`
- **Cloud Function**: `functions/index.js` - `cancelInvoice`
- **Funcionalidad**: Permite anular facturas electrónicas, generando el XML de anulación, firmándolo y enviándolo a la DGII.
- **Proceso**:
  1. El usuario selecciona una factura y elige la opción "Anular".
  2. Se solicita el motivo de anulación según los códigos establecidos por la DGII.
  3. Se genera el XML de anulación y se firma digitalmente.
  4. Se envía a la DGII y se actualiza el estado de la factura.

### Monitor de Estado de la DGII

El sistema incluye un componente para monitorear el estado de la conexión con la DGII:

- **Componente**: `src/components/ecf/DGIIStatusMonitor.jsx`
- **Cloud Function**: `functions/index.js` - `checkDGIIStatus`
- **Funcionalidad**: Verifica la disponibilidad de los servicios de la DGII y muestra el estado actual.
- **Información mostrada**:
  - Estado de la conexión (en línea, fuera de línea, degradado)
  - Tiempo de respuesta
  - Última verificación
  - Modo de operación (prueba o producción)

### Frontend

#### Servicios

- **certificateService.js**: Manejo de certificados digitales
  - Encriptación/desencriptación de certificados
  - Carga y validación de certificados
  - Gestión de configuración de e-CF

- **validationService.js**: Validación de datos según requisitos DGII
  - Validación de RNC/Cédula
  - Validación de NCF
  - Validación de estructura de facturas

- **invoiceService.js**: Creación y gestión de facturas electrónicas
  - Creación de facturas
  - Envío a la DGII
  - Verificación de estado
  - Generación de PDF

#### Componentes UI

- **ECFStatusChecker.jsx**: Componente para verificar el estado de facturas en la DGII
- **CertificateManager.jsx**: Componente para gestionar certificados digitales
- **ECFSettings.jsx**: Página de configuración de e-CF

### Backend (Cloud Functions)

- **sendInvoiceEmail**: Envío de facturas por correo electrónico
- **sendInvoiceToDGII**: Envío de facturas a la DGII
- **generateInvoicePDF**: Generación de PDFs de facturas
- **checkInvoiceStatus**: Verificación del estado de facturas en la DGII
- **onInvoiceCreated**: Procesamiento automático de facturas nuevas
- **cancelInvoice**: Anulación de facturas electrónicas
- **checkDGIIStatus**: Verificación del estado de la conexión con la DGII

### Utilidades

- **xmlGenerator.js**: Generación de XML en formato UBL
- **xmlSigner.js**: Firma digital de documentos XML
- **pdfGenerator.js**: Generación de PDFs profesionales
- **dgiiApi.js**: Comunicación con la API de la DGII

## Flujo de Datos

### Creación de Factura Electrónica

1. El usuario completa el formulario de factura en el frontend.
2. Los datos son validados utilizando `validationService.js`.
3. Se llama a `invoiceService.createInvoice()` para crear la factura.
4. Los datos se envían a Firestore.
5. Se activa la función `onInvoiceCreated` en Cloud Functions.
6. Se genera el PDF de la factura con `generateInvoicePDF`.
7. Si está configurado el envío automático, se envía a la DGII con `sendInvoiceToDGII`.

### Envío a la DGII

1. Se obtienen los datos de la factura de Firestore.
2. Se genera el XML con `xmlGenerator.js`.
3. Se carga el certificado digital y se desencripta con `xmlSigner.js`.
4. Se firma el XML con el certificado digital.
5. Se envía el XML firmado a la DGII utilizando `dgiiApi.js`.
6. Se actualiza el estado de la factura en Firestore.

### Verificación de Estado

1. El usuario solicita verificar el estado de una factura.
2. Se llama a `invoiceService.checkInvoiceStatus()`.
3. La función `checkInvoiceStatus` consulta el estado en la DGII.
4. Se actualiza el estado de la factura en Firestore.
5. Se muestra el resultado al usuario.

## Seguridad

### Certificados Digitales

Los certificados digitales son encriptados antes de ser almacenados en Firestore, utilizando el algoritmo AES-256-CBC. La clave de encriptación es proporcionada por el usuario y no se almacena en ningún lugar del sistema.

#### Proceso de Encriptación

```javascript
function encryptCertificate(certBuffer, encryptionKey) {
  // Generar un IV aleatorio
  const iv = crypto.randomBytes(16);
  
  // Crear el cifrador
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  
  // Cifrar el certificado
  let encrypted = cipher.update(certBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Devolver el IV y el certificado cifrado en formato base64
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}
```

#### Proceso de Desencriptación

```javascript
function decryptCertificate(encryptedCert, encryptionKey) {
  // Separar el IV y el certificado cifrado
  const textParts = encryptedCert.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  
  // Crear el descifrador
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  
  // Descifrar el certificado
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}
```

### Autenticación y Autorización

El sistema utiliza Firebase Authentication para la autenticación de usuarios. Solo los usuarios autenticados pueden acceder a las funciones de facturación electrónica.

Las Cloud Functions verifican la autenticación del usuario antes de ejecutar cualquier operación:

```javascript
exports.sendInvoiceToDGII = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para enviar facturas a la DGII.'
    );
  }
  
  // Resto del código...
});
```

## Integración con la DGII

### Formato XML

El sistema genera documentos XML en formato UBL (Universal Business Language) según las especificaciones de la DGII. La estructura básica es la siguiente:

```xml
<ECF xmlns="https://dgii.gov.do/etrib/schema/ECF/1">
  <Encabezado>
    <IdDoc>
      <TipoeCF>31</TipoeCF>
      <eNCF>E310000000001</eNCF>
      <FechaVencimiento>2023-12-31</FechaVencimiento>
    </IdDoc>
    <Emisor>
      <RNCEmisor>123456789</RNCEmisor>
      <NombreEmisor>Empresa de Fumigación</NombreEmisor>
      <DireccionEmisor>Calle Principal #123</DireccionEmisor>
    </Emisor>
    <Comprador>
      <RNCComprador>987654321</RNCComprador>
      <TipoID>1</TipoID>
      <NombreComprador>Cliente Ejemplo</NombreComprador>
    </Comprador>
    <Totales>
      <MontoGravadoTotal>1000.00</MontoGravadoTotal>
      <ITBIS>180.00</ITBIS>
      <MontoTotal>1180.00</MontoTotal>
    </Totales>
  </Encabezado>
  <Detalles>
    <Item>
      <NumeroLinea>1</NumeroLinea>
      <IndicadorFacturacion>1</IndicadorFacturacion>
      <NombreItem>Servicio de Fumigación</NombreItem>
      <CantidadItem>1</CantidadItem>
      <PrecioUnitarioItem>1000.00</PrecioUnitarioItem>
      <MontoItem>1000.00</MontoItem>
      <MontoITBIS>180.00</MontoITBIS>
    </Item>
  </Detalles>
</ECF>
```

### Firma Digital

La firma digital se realiza utilizando la biblioteca `xml-crypto`. El proceso es el siguiente:

1. Se carga el certificado digital y se desencripta.
2. Se crea una instancia de `SignedXml`.
3. Se configura la firma según los requisitos de la DGII.
4. Se firma el documento XML.

```javascript
function signXML(xmlString, certificate, privateKey, password = '') {
  // Crear instancia de SignedXml
  const sig = new SignedXml();
  
  // Configurar la firma según los requisitos de la DGII
  sig.signingKey = privateKey;
  sig.keyInfoProvider = {
    getKeyInfo: () => {
      return `<X509Data><X509Certificate>${certificate.toString('base64')}</X509Certificate></X509Data>`;
    }
  };
  
  // Configurar la referencia al documento
  sig.addReference(
    "//*[local-name(.)='ECF']",
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#'
    ],
    'http://www.w3.org/2001/04/xmlenc#sha256'
  );
  
  // Configurar el algoritmo de canonicalización
  sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
  
  // Configurar el algoritmo de firma
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  
  // Firmar el documento
  sig.computeSignature(xmlString);
  
  // Obtener el documento firmado
  return sig.getSignedXml();
}
```

### Comunicación con la API

La comunicación con la API de la DGII se realiza utilizando `axios`. El sistema soporta tanto el entorno de pruebas como el de producción.

```javascript
async function sendInvoiceToDGII(xmlString, credentials, testMode = false) {
  // Determinar la URL base según el modo
  const baseUrl = testMode ? DGII_API_TEST_URL : DGII_API_BASE_URL;
  
  // Configurar headers de autenticación
  const headers = {
    'Content-Type': 'application/xml',
    'Authorization': `Bearer ${credentials.token}`,
    'X-DGII-RNC': credentials.rnc
  };
  
  // Enviar la factura a la DGII
  const response = await axios.post(
    `${baseUrl}/recepcion`,
    xmlString,
    { headers }
  );
  
  // Procesar la respuesta
  // ...
}
```

## Extensión del Sistema

### Agregar Nuevos Tipos de Comprobantes

Para agregar un nuevo tipo de comprobante, siga estos pasos:

1. Actualice la función `generateInvoiceXML` en `xmlGenerator.js` para soportar el nuevo tipo.
2. Agregue la validación correspondiente en `validationService.js`.
3. Actualice la interfaz de usuario para permitir la selección del nuevo tipo.

### Personalización de PDFs

Para personalizar el formato de los PDFs generados, modifique la función `generateInvoicePDF` en `pdfGenerator.js`. Puede ajustar:

- El diseño general
- Los colores y fuentes
- La información mostrada
- El logotipo y branding

### Integración con Otros Sistemas

Para integrar el sistema con otros sistemas externos, puede:

1. Crear nuevas Cloud Functions que actúen como intermediarios.
2. Utilizar webhooks para notificar a sistemas externos sobre eventos.
3. Implementar APIs adicionales para permitir la comunicación bidireccional.

## Solución de Problemas Comunes

### Error: "No se pudo cargar el certificado digital"

**Posibles causas**:
- El archivo del certificado está dañado.
- La contraseña del certificado es incorrecta.
- La clave de encriptación es incorrecta.

**Solución**:
1. Verifique que el archivo del certificado sea válido.
2. Asegúrese de que está utilizando la contraseña correcta.
3. Intente cargar nuevamente el certificado.

### Error: "Error al enviar factura a la DGII"

**Posibles causas**:
- Problemas de conexión con la API de la DGII.
- Credenciales de la DGII incorrectas.
- XML mal formado o con datos inválidos.

**Solución**:
1. Verifique la conexión a internet.
2. Compruebe las credenciales de la DGII.
3. Valide el XML generado contra el esquema de la DGII.
4. Revise los logs de error para obtener más detalles.

### Error: "No se pudo generar el PDF"

**Posibles causas**:
- Datos de la factura incompletos o inválidos.
- Problemas con la biblioteca jsPDF.
- Errores en la generación del código QR.

**Solución**:
1. Verifique que todos los datos necesarios estén presentes.
2. Actualice las dependencias del proyecto.
3. Revise los logs de error para obtener más detalles.

---

Para más información o soporte técnico, contacte al equipo de desarrollo en [dev@fumifacil.com](mailto:dev@fumifacil.com).
