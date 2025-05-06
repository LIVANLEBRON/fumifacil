# Guía de Usuario: Sistema de Facturación Electrónica (e-CF)

Esta guía proporciona instrucciones detalladas sobre cómo utilizar el sistema de facturación electrónica (e-CF) implementado en FumiFácil, de acuerdo con los requisitos de la DGII y la Ley 32-23 de República Dominicana.

## Índice

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Configuración Inicial](#configuración-inicial)
4. [Certificados Digitales](#certificados-digitales)
5. [Creación de Facturas Electrónicas](#creación-de-facturas-electrónicas)
6. [Envío a la DGII](#envío-a-la-dgii)
7. [Verificación de Estado](#verificación-de-estado)
8. [Solución de Problemas](#solución-de-problemas)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

## Introducción

El sistema de facturación electrónica (e-CF) permite la emisión de comprobantes fiscales electrónicos según los requisitos establecidos por la Dirección General de Impuestos Internos (DGII) de República Dominicana. Este sistema facilita:

- Creación de facturas electrónicas
- Firma digital de documentos XML
- Envío automático o manual a la DGII
- Verificación del estado de las facturas
- Generación de PDFs para envío a clientes

## Requisitos Previos

Antes de comenzar a utilizar el sistema de facturación electrónica, necesitará:

1. **Certificado Digital**: Emitido por una entidad certificadora autorizada por la DGII.
2. **Registro en la DGII**: Su empresa debe estar registrada como emisor de comprobantes fiscales electrónicos.
3. **Credenciales de la DGII**: Usuario y contraseña para acceder a los servicios web de la DGII.
4. **RNC Válido**: Registro Nacional del Contribuyente activo y al día.

## Configuración Inicial

### Acceso a la Configuración de e-CF

1. Inicie sesión en la aplicación FumiFácil.
2. Vaya a **Configuración** en el menú principal.
3. Seleccione **Configuración de e-CF**.

### Configuración Básica

1. Complete los datos de su empresa:
   - RNC
   - Nombre de la empresa
   - Dirección
   - Teléfono
   - Correo electrónico

2. Configure las credenciales de la DGII:
   - Usuario
   - Contraseña

3. Seleccione el modo de operación:
   - **Modo de Prueba**: Para realizar pruebas sin enviar facturas reales a la DGII.
   - **Modo de Producción**: Para enviar facturas reales a la DGII.

4. Configure el envío automático:
   - **Activado**: Las facturas se enviarán automáticamente a la DGII al ser creadas.
   - **Desactivado**: Las facturas deberán enviarse manualmente a la DGII.

## Certificados Digitales

### Obtención del Certificado Digital

Para obtener un certificado digital, debe seguir estos pasos:

1. Contacte a una entidad certificadora autorizada por la DGII.
2. Complete el proceso de solicitud y verificación.
3. Reciba su certificado digital en formato .p12 o .pfx.
4. Guarde la contraseña del certificado en un lugar seguro.

### Carga del Certificado Digital

1. En la sección de **Configuración de e-CF**, vaya a la pestaña **Certificado Digital**.
2. Haga clic en **Seleccionar Certificado** y elija el archivo .p12 o .pfx.
3. Ingrese la contraseña del certificado.
4. Cree una clave de encriptación para proteger el certificado en el sistema.
5. Haga clic en **Guardar Certificado**.

> **IMPORTANTE**: La clave de encriptación se utiliza para proteger su certificado digital. Guárdela en un lugar seguro, ya que la necesitará para operaciones futuras y no podrá recuperarla si la pierde.

## Creación de Facturas Electrónicas

### Crear una Nueva Factura

1. Vaya a **Facturas** en el menú principal.
2. Haga clic en **Nueva Factura**.
3. Complete los datos del cliente:
   - Nombre/Razón Social
   - RNC/Cédula
   - Dirección
   - Teléfono
   - Correo electrónico

4. Agregue los productos o servicios:
   - Descripción
   - Cantidad
   - Precio unitario
   - Impuesto (ITBIS)

5. Revise los totales:
   - Subtotal
   - ITBIS
   - Total

6. Haga clic en **Guardar** para crear la factura como pendiente, o en **Enviar a DGII** para crearla y enviarla inmediatamente.

### Editar una Factura Existente

> **NOTA**: Solo se pueden editar facturas en estado "pendiente" que aún no han sido enviadas a la DGII.

1. Vaya a **Facturas** en el menú principal.
2. Busque la factura que desea editar y haga clic en el ícono de edición.
3. Realice los cambios necesarios.
4. Haga clic en **Guardar** para actualizar la factura.

## Envío a la DGII

### Envío Manual

1. Vaya a **Facturas** en el menú principal.
2. Busque la factura que desea enviar y haga clic en ella para ver los detalles.
3. Haga clic en el botón **Enviar a DGII**.
4. Espere a que se complete el proceso de envío.
5. Verifique el estado de la factura.

### Envío Automático

Si ha configurado el envío automático, las facturas se enviarán a la DGII inmediatamente después de ser creadas. No se requiere ninguna acción adicional.

## Verificación de Estado

### Consultar Estado de una Factura

1. Vaya a **Facturas** en el menú principal.
2. Busque la factura que desea verificar y haga clic en ella para ver los detalles.
3. En la sección **Estado en DGII**, podrá ver el estado actual de la factura.
4. Haga clic en **Verificar Estado** para actualizar la información.

### Estados Posibles

- **Pendiente**: La factura aún no ha sido enviada a la DGII.
- **Enviada**: La factura ha sido enviada a la DGII y está en proceso.
- **Aceptada**: La factura ha sido aceptada por la DGII.
- **Rechazada**: La factura ha sido rechazada por la DGII. Revise el motivo del rechazo.

## Solución de Problemas

### Factura Rechazada

Si una factura es rechazada por la DGII, siga estos pasos:

1. Verifique el motivo del rechazo en los detalles de la factura.
2. Corrija los errores identificados.
3. Cree una nueva factura con la información corregida.
4. Envíe la nueva factura a la DGII.

### Problemas con el Certificado Digital

Si encuentra problemas con su certificado digital:

1. Verifique que el certificado no haya expirado.
2. Asegúrese de que está utilizando la contraseña correcta.
3. Verifique que el certificado haya sido emitido por una entidad autorizada por la DGII.
4. Si es necesario, cargue nuevamente el certificado siguiendo los pasos de la sección [Carga del Certificado Digital](#carga-del-certificado-digital).

### Error de Conexión con la DGII

Si no puede conectarse a los servicios de la DGII:

1. Verifique su conexión a internet.
2. Asegúrese de que las credenciales de la DGII sean correctas.
3. Verifique si los servicios de la DGII están en mantenimiento.
4. Intente nuevamente más tarde.

## Preguntas Frecuentes

### ¿Puedo anular una factura electrónica?

Sí, pero debe seguir el proceso establecido por la DGII para la anulación de comprobantes fiscales electrónicos. Esto generalmente implica la emisión de una nota de crédito.

### ¿Qué hago si pierdo mi certificado digital?

Deberá contactar a la entidad certificadora que emitió su certificado para solicitar uno nuevo. Una vez obtenido, deberá cargarlo nuevamente en el sistema.

### ¿Es necesario imprimir las facturas electrónicas?

No es obligatorio imprimir las facturas electrónicas, ya que son válidas en su formato digital. Sin embargo, puede imprimir o enviar por correo electrónico una representación gráfica (PDF) de la factura para sus clientes.

### ¿Cómo puedo enviar una factura a mi cliente?

Puede enviar la factura a su cliente de las siguientes maneras:

1. Envío por correo electrónico: En la vista de detalles de la factura, haga clic en el botón **Enviar por Correo**.
2. Descarga del PDF: En la vista de detalles de la factura, haga clic en el botón **Descargar PDF** y luego envíe el archivo manualmente.

### ¿Qué debo hacer si cambia mi RNC o información fiscal?

Debe actualizar su información en la DGII y luego actualizar la configuración en el sistema de facturación electrónica. Es posible que necesite un nuevo certificado digital si cambia su RNC.

---

Para más información o soporte técnico, contacte a nuestro equipo de soporte en [soporte@fumifacil.com](mailto:soporte@fumifacil.com) o llame al +1-809-XXX-XXXX.
