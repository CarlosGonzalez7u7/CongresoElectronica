# RENOVATEC - Plataforma de Gestion de Congreso y Registro de Robotica

## Contenido

1. [Resumen](#resumen)
2. [Tecnologias](#tecnologias)
3. [Funcionalidades](#funcionalidades)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Catalogo completo de archivos](#catalogo-completo-de-archivos)
6. [Flujo funcional](#flujo-funcional)
7. [Reglas de negocio](#reglas-de-negocio)
8. [Instalacion local](#instalacion-local)
9. [Variables de entorno](#variables-de-entorno)
10. [Notas operativas](#notas-operativas)

## Resumen

RENOVATEC es una aplicacion web full-stack para gestionar el registro de participantes, equipos, pagos, validacion administrativa, recuperacion de cuentas, inscripcion al congreso y seguimiento de solicitudes.

El proyecto esta construido con HTML, CSS y JavaScript vanilla en el frontend, y PHP + MySQL en el backend.

## Tecnologias

- HTML5, CSS3 y JavaScript ES6+
- PHP 8+ con PDO
- MySQL / MariaDB
- Font Awesome
- Reglas Apache mediante `.htaccess`
- Router local para `php -S`

## Funcionalidades

- Registro de usuario plataforma con verificacion de correo.
- Inicio de sesion unificado para usuarios y administradores.
- Recuperacion de cuenta.
- Registro de equipos y participantes para robotica.
- Inscripcion al congreso con reglas de negocio.
- Carga y verificacion de comprobantes de pago.
- Generacion y consulta de QR.
- Panel de usuario con perfil, seguridad e inscripciones.
- Panel administrativo con dashboard, check-in, solicitudes y actividades de seguridad.

## Estructura del proyecto

```text
congreso/
  .gitignore
  .htaccess
  README.md
  index.html
  router.php
  test_qr.php
  app/
    .env.example
    admin/
      verify-payments.html
    api/
      _auth_common.php
      admin-auth.php
      admin-change-password.php
      admin-checkin.php
      admin-congress-requests.php
      admin-dashboard.php
      admin-recover-account.php
      admin-security-activity.php
      admin-workshops.php
      auth-login.php
      auth-recover-account.php
      auth-register.php
      auth-schools.php
      auth-verify-email.php
      congress-enroll.php
      congress-request-status.php
      congress-upload-receipt.php
      debug-enrollments.php
      get-qr.php
      get-receipt.php
      get-team.php
      register-team.php
      send-registration-email.php
      upload-receipt.php
      user-profile-update.php
      verify-payment.php
    config/
      database.php
    sql/
      inicio_limpio_esencial.sql
      renovatec_db.sql
    uploads/
      receipts/
        receipt_1_1775002645.jpg
        receipt_2_1775007581.jpg
        receipt_3_1774928116.pdf
        receipt_4_1774929173.pdf
        receipt_5_1774998304.jpg
  public/
    .htaccess
    acceso.html
    admin-workshops-sections.html
    admin.html
    confirmacion.html
    index.html
    perfil.html
    registro.html
    solicitud.html
    tramite.html
    usuario.html
    validador.html
    assets/
      docs/
        reglamento-carros-rc.pdf
        reglamento-guerra-1lb.pdf
        reglamento-insecto.pdf
        reglamento-minisumo-rc.pdf
        reglamento-seguidor-linea.pdf
        reglamento-soccer-rc.pdf
      images/
        IEEE.jpeg
        electro.png
        logo.ico
        robot-clean-v2.png
        robot-original.png
        robot.png
        robot.svg
        tec.png
    css/
      acceso.css
      admin-workshops.css
      admin.css
      confirmacion.css
      fa-fallback.css
      landing.css
      perfil.css
      registro.css
      solicitud.css
      styles.css
      tramite.css
      usuario.css
      validador.css
    js/
      acceso.js
      admin-workshops.js
      admin.js
      confirmacion-new.js
      confirmacion.js
      config.js
      escuelas-data.js
      perfil.js
      registro-new.js
      registro.js
      script.js
      stages.js
      status-lookup.js
      tramite.js
      usuario.js
      validador.js
```

## Catalogo completo de archivos

### Raiz del proyecto

- `.gitignore`: excluye archivos y carpetas que no deben versionarse.
- `.htaccess`: reglas de reescritura para Apache en la raiz.
- `README.md`: documentacion principal del proyecto.
- `index.html`: entrada publica principal del sitio.
- `router.php`: router para el servidor de desarrollo de PHP.
- `test_qr.php`: archivo auxiliar de prueba para QR.

### `app/`

#### Configuracion

- `app/.env.example`: plantilla de variables de entorno.
- `app/config/database.php`: conexion a base de datos y carga de configuracion.

#### Interfaz auxiliar de administracion

- `app/admin/verify-payments.html`: vista dedicada para verificacion de pagos.

#### APIs de autenticacion y cuentas

- `app/api/_auth_common.php`: funciones compartidas para autenticacion, tablas y utilidades.
- `app/api/admin-auth.php`: autenticacion de administradores.
- `app/api/admin-change-password.php`: cambio de contrasena de administradores.
- `app/api/admin-recover-account.php`: recuperacion de cuenta administrativa.
- `app/api/auth-login.php`: inicio de sesion unificado para usuarios y admins.
- `app/api/auth-recover-account.php`: recuperacion de cuenta por correo/codigo.
- `app/api/auth-register.php`: alta de cuentas de plataforma.
- `app/api/auth-schools.php`: listado de escuelas para autocompletado.
- `app/api/auth-verify-email.php`: verificacion de correo electronico.

#### APIs de inscripcion, pagos y solicitudes

- `app/api/congress-enroll.php`: crea la inscripcion al congreso.
- `app/api/congress-request-status.php`: consulta el estado de una solicitud de inscripcion.
- `app/api/congress-upload-receipt.php`: carga alternativa de comprobantes del congreso.
- `app/api/get-qr.php`: genera o consulta datos para QR.
- `app/api/get-receipt.php`: entrega el archivo del comprobante.
- `app/api/get-team.php`: consulta informacion de equipos.
- `app/api/register-team.php`: registra equipos de competencia.
- `app/api/send-registration-email.php`: envia correos de registro y confirmacion.
- `app/api/upload-receipt.php`: carga comprobantes de pago.
- `app/api/user-profile-update.php`: actualiza datos del perfil del usuario.
- `app/api/verify-payment.php`: valida pagos desde administracion.

#### APIs administrativas

- `app/api/admin-congress-requests.php`: gestion administrativa de solicitudes del congreso.
- `app/api/admin-dashboard.php`: metricas y resumen para el panel admin.
- `app/api/admin-checkin.php`: check-in de participantes o equipos.
- `app/api/admin-security-activity.php`: bitacora y actividad de seguridad.
- `app/api/admin-workshops.php`: gestion de talleres administrativos.

#### Diagnostico y soporte

- `app/api/debug-enrollments.php`: endpoint de diagnostico para revisar inscripciones y tablas.

#### Base de datos

- `app/sql/renovatec_db.sql`: esquema completo de la base de datos.
- `app/sql/inicio_limpio_esencial.sql`: limpieza y reseed de entorno de pruebas.

#### Cargas de archivos

- `app/uploads/receipts/receipt_1_1775002645.jpg`: comprobante cargado actualmente.
- `app/uploads/receipts/receipt_2_1775007581.jpg`: comprobante cargado actualmente.
- `app/uploads/receipts/receipt_3_1774928116.pdf`: comprobante cargado actualmente.
- `app/uploads/receipts/receipt_4_1774929173.pdf`: comprobante cargado actualmente.
- `app/uploads/receipts/receipt_5_1774998304.jpg`: comprobante cargado actualmente.

### `public/`

#### HTML

- `public/.htaccess`: reglas de acceso para la carpeta publica.
- `public/index.html`: landing publica.
- `public/acceso.html`: acceso, registro, recuperacion y verificacion de cuenta.
- `public/admin-workshops-sections.html`: vista auxiliar para secciones de talleres.
- `public/admin.html`: panel administrativo principal.
- `public/confirmacion.html`: confirmacion posterior al registro.
- `public/perfil.html`: perfil del usuario con secciones de datos, inscripciones y seguridad.
- `public/registro.html`: formulario de registro de equipos.
- `public/solicitud.html`: vista de solicitud.
- `public/tramite.html`: flujo para iniciar tramite e inscripcion.
- `public/usuario.html`: panel principal del usuario autenticado.
- `public/validador.html`: validador QR y flujo de check-in.

#### CSS

- `public/css/acceso.css`: estilos del flujo de acceso.
- `public/css/admin-workshops.css`: estilos del modulo de talleres.
- `public/css/admin.css`: estilos del panel administrativo.
- `public/css/confirmacion.css`: estilos de la vista de confirmacion.
- `public/css/fa-fallback.css`: fallback para iconos cuando Font Awesome no carga.
- `public/css/landing.css`: estilos de la pagina principal.
- `public/css/perfil.css`: estilos del perfil de usuario.
- `public/css/registro.css`: estilos del formulario de registro.
- `public/css/solicitud.css`: estilos de la vista de solicitud.
- `public/css/styles.css`: estilos globales compartidos.
- `public/css/tramite.css`: estilos del flujo de tramite.
- `public/css/usuario.css`: estilos del panel de usuario.
- `public/css/validador.css`: estilos del validador QR.

#### JavaScript

- `public/js/acceso.js`: logica de login, registro, recuperacion y verificacion.
- `public/js/admin-workshops.js`: comportamiento del modulo de talleres.
- `public/js/admin.js`: logica del panel administrativo.
- `public/js/confirmacion-new.js`: version nueva de la pantalla de confirmacion.
- `public/js/confirmacion.js`: version anterior o complementaria de confirmacion.
- `public/js/config.js`: configuracion global del frontend.
- `public/js/escuelas-data.js`: dataset de escuelas para sugerencias.
- `public/js/perfil.js`: carga de perfil, inscripciones, seguridad y comprobantes.
- `public/js/registro-new.js`: version nueva del flujo de registro.
- `public/js/registro.js`: version anterior o base del registro.
- `public/js/script.js`: utilidades compartidas del frontend.
- `public/js/stages.js`: definicion de etapas y fechas del evento.
- `public/js/status-lookup.js`: consulta de estado de solicitudes o inscripciones.
- `public/js/tramite.js`: logica del flujo de tramite.
- `public/js/usuario.js`: panel del usuario autenticado.
- `public/js/validador.js`: logica del validador QR.

#### Recursos estaticos

- `public/assets/docs/reglamento-carros-rc.pdf`: reglamento de la categoria Carros RC.
- `public/assets/docs/reglamento-guerra-1lb.pdf`: reglamento de Guerra 1 lb.
- `public/assets/docs/reglamento-insecto.pdf`: reglamento de Robot Insecto.
- `public/assets/docs/reglamento-minisumo-rc.pdf`: reglamento de Mini Sumo RC.
- `public/assets/docs/reglamento-seguidor-linea.pdf`: reglamento de Seguidor de Linea.
- `public/assets/docs/reglamento-soccer-rc.pdf`: reglamento de Soccer RC.
- `public/assets/images/IEEE.jpeg`: imagen/logo IEEE.
- `public/assets/images/electro.png`: imagen de electronica.
- `public/assets/images/logo.ico`: favicon principal.
- `public/assets/images/robot-clean-v2.png`: robot principal usado en interfaces.
- `public/assets/images/robot-original.png`: variante original del robot.
- `public/assets/images/robot.png`: asset de robot en formato PNG.
- `public/assets/images/robot.svg`: asset vectorial del robot.
- `public/assets/images/tec.png`: logo del ITSU.

## Flujo funcional

1. Usuario visita landing (`public/index.html`).
2. Entra a acceso (`public/acceso.html`).
3. Si crea cuenta:
   - completa datos,
   - recibe codigo de verificacion,
   - verifica correo,
   - luego puede iniciar sesion.
4. Login unificado (`app/api/auth-login.php`):
   - `scope=admin` -> `public/admin.html`
   - `scope=platform` -> `public/usuario.html`
5. Usuario plataforma puede inscribirse al congreso (`app/api/congress-enroll.php`).
6. Admin gestiona tablero, pagos y validaciones con endpoints `app/api/admin-*.php`.

## Reglas de negocio

1. Cuentas nuevas de plataforma se crean como rol `alumno` por defecto.
2. Verificacion de correo obligatoria antes de permitir login de usuario plataforma.
3. Recuperacion de contrasena por codigo enviado por email.
4. Si la escuela coincide con ITSU, se puede exigir matricula en el flujo de inscripcion de congreso.

## Instalacion local

### Requisitos

1. PHP 8+
2. MySQL o MariaDB
3. Extensiones PHP recomendadas: `pdo`, `pdo_mysql`, `curl`, `json`

### Pasos

1. Configura variables en `app/.env.local` (DB, correo, claves).
2. Crea la base de datos y ejecuta `app/sql/renovatec_db.sql`.
3. Si necesitas limpiar y reseedear datos, usa `app/sql/inicio_limpio_esencial.sql`.
4. Levanta el servidor local:

```bash
php -S localhost:8000 router.php
```

5. Abre `http://localhost:8000/`.

## Variables de entorno

Revisar `app/.env.example` y completar en `app/.env.local`.

Campos tipicos:

1. Base de datos:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASS`
2. Correo:
   - `MAIL_PROVIDER`
   - `MAIL_FROM_ADDRESS`
   - `MAIL_FROM_NAME`
   - `BREVO_API_KEY` (si aplica)
3. Seguridad/debug:
   - `APP_DEBUG`
   - `ADMIN_RECOVERY_KEY`

## Notas operativas

1. Los comprobantes en `app/uploads/receipts/` son archivos generados por uso normal del sistema.
2. Para produccion, protege correctamente la carpeta `app/` y controla permisos de escritura en `app/uploads/`.
3. Si cambias rutas, actualiza tanto `router.php` como `.htaccess`.
4. Los archivos `public/js/*new.js` conviven con versiones base para mantener compatibilidad durante la evolucion del sistema.

## Estado actual

Proyecto funcional en flujo principal de registro, acceso y administracion, con backend activo en PHP y esquema de base de datos versionado por SQL.

Este proyecto es de uso interno para el ITSU Uruapan.

## Historial de versiones

- **v1.0**: frontend base con almacenamiento temporal.
- **v2.0**: integracion del backend PHP con MySQL.
- **v3.0**: evolucion del sistema con paneles, solicitudes e inscripciones.

## Ultima actualizacion

27 de abril de 2026.
