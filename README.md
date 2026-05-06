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
  prueba.html
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
        (archivos generados .jpg / .pdf)
  public/
    .htaccess
    acceso.html
    admin-congress-section.html
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
        IEEE.png
        electro.png
        logo.ico
        robot-clean-v2.png
        robot-original.png
        robot.png
        robot.svg
        tec.png
    css/
      acceso.css
      admin-congress.css
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
      admin-congress.js
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

- `.gitignore`: Define exclusiones para el control de versiones (ej. variables de entorno, directorios de caché y carpetas `uploads`).
- `.htaccess`: Establece políticas de seguridad de Apache, configuraciones de CORS, manejo de caché y reescritura de rutas maestras.
- `README.md`: Documentación arquitectónica e integral del proyecto RENOVATEC.
- `index.html`: Archivo enrutador del nivel raíz (root). Su única función es verificar los estados de sesión local y redirigir hacia la interfaz correcta.
- `prueba.html`: Documento HTML auxiliar para el aislamiento de pruebas de componentes y prototipado rápido.
- `router.php`: Enrutador y middleware nativo para ejecutar el servidor de desarrollo integrado de PHP (`php -S`).
- `test_qr.php`: Archivo de diagnóstico para probar el motor generador de códigos QR vectoriales sin afectar la plataforma en vivo.

### `app/`

#### Configuracion

- `app/.env.example` y `app/.env.local`: Plantillas y definiciones de variables de entorno (Credenciales de DB, correo transaccional y variables globales).
- `app/config/database.php`: Motor de arranque del backend. Implementa el patrón Singleton/PDO para la base de datos, carga las variables `.env` y configura tolerancias globales.

#### Interfaz auxiliar de administracion

- `app/admin/verify-payments.html`: Vista nativa sin dependencias dedicada a tesorería para validación de transacciones de forma ágil.

#### APIs de autenticacion y cuentas

- `app/api/_auth_common.php`: Núcleo fundacional del backend. Provee el ciclo de vida DDL (creando tablas automáticamente) e inyecta utilidades globales de correo.
- `app/api/admin-auth.php`: Endpoint segregado que procesa la validación de credenciales para el entorno administrativo (`role = admin`).
- `app/api/admin-change-password.php`: Controlador seguro para rotar la contraseña del superusuario, aplicando cifrado BCRYPT.
- `app/api/admin-recover-account.php`: Middleware de recuperación mediante clave estática (OTP/Recovery Key) para cuentas de administración.
- `app/api/auth-login.php`: Motor de autenticación universal (SSO local) para distinguir entre cuentas de alumno, tesorería y admin.
- `app/api/auth-recover-account.php`: Endpoint para enviar OTP al correo y permitir la rotación de credenciales a usuarios.
- `app/api/auth-register.php`: Procesa el alta de participantes validando expresiones regulares, previniendo duplicados y emitiendo correos de confirmación.
- `app/api/auth-schools.php`: Endpoint JSON optimizado para nutrir auto-completados de instituciones en el front-end.
- `app/api/auth-verify-email.php`: Valida códigos OTP transaccionales para cambiar el flag a `email_verified = 1`.

#### APIs de inscripcion, pagos y solicitudes

- `app/api/congress-enroll.php`: Controlador transaccional que procesa el "Paso a Paso" del formulario. Computa tarifas y guarda perfiles vía form-data.
- `app/api/congress-request-status.php`: Expone asíncronamente el estatus del trámite al perfil de usuario (en revisión, aprobado, rechazado).
- `app/api/congress-upload-receipt.php`: Método validado (MIME Types restrictivo) para adjuntar comprobantes PDF o JPG en solicitudes ya guardadas.
- `app/api/get-qr.php`: Generador local SVG para códigos QR vectoriales incorporando corrección de error H (Reed-Solomon).
- `app/api/get-receipt.php`: Proxy de seguridad que previene acceso directo (hotlinking) a comprobantes y valida la sesión de acceso.
- `app/api/get-team.php`: Retorna atributos consolidados (robots, categoría y miembros) de un equipo hacia el front-end.
- `app/api/register-team.php`: Inserción especializada para el Wizard individual de Robótica.
- `app/api/send-registration-email.php`: Orquestador SMTP/Brevo para construir el mensaje HTML e incluir PDF y QR como attachments.
- `app/api/upload-receipt.php`: Subida genérica de comprobantes de pago vinculados a torneos de Robótica con renombramiento algorítmico.
- `app/api/user-profile-update.php`: Modifica directamente en la tabla `platform_users` la dirección y carrera del asistente logueado.
- `app/api/verify-payment.php`: Manipula el estado (Approve/Reject) de una transacción solicitada por revisión administrativa.

#### APIs administrativas

- `app/api/admin-congress-requests.php`: Endpoint matriz del panel del Congreso. Extrae todas las colas de validación (Pendiente, Aprobado).
- `app/api/admin-dashboard.php`: Extrae tabuladores y cruces de datos (KPIs financieros) para las métricas administrativas en el Frontend.
- `app/api/admin-checkin.php`: Cruce de datos nativo que asocia un escaneo de cámara validado con un equipo/robot en torneo.
- `app/api/admin-security-activity.php`: Retorna Activity Log con registros de auditoría y huellas digitales del cliente (IP, Navegador).
- `app/api/admin-workshops.php`: Interfaz CRUD avanzada para la estructuración de la agenda, creación de talleres, conferencias y perfiles de ponentes.

#### Diagnostico y soporte

- `app/api/debug-enrollments.php`: Interfaz interna para depuración en entornos de prueba de inscripciones en estado corrupto.

#### Base de datos

- `app/sql/renovatec_db.sql`: Schema final relacional (DDL) de la arquitectura en MariaDB/MySQL.
- `app/sql/inicio_limpio_esencial.sql`: Script de tipo truncamiento/reseed para limpieza y control de QA interno.

#### Cargas de archivos

- `app/uploads/receipts/` y `app/uploads/workshops/`: Bóvedas restringidas por PHP donde residen los recursos estáticos binarios (PDFs, imágenes de comprobantes y portadas de cursos).

### `public/`

#### HTML

- `public/.htaccess`: Define políticas estrictas para evitar listados de directorio y maneja reescritura visual sin terminación `.html`.
- `public/index.html`: Landing publicitaria del congreso con publicidad, cronogramas y CTA.
- `public/acceso.html`: Módulo de autenticación SPA. Maneja modales interactivos para ingreso, creación y validación de cuentas.
- `public/admin-congress-section.html` y `admin-workshops-sections.html`: Fragmentos (Template Views) inyectables dentro del Admin para escalar su interfaz (Módulos de validación y de docentes).
- `public/admin.html`: Dashboard Maestro Administrativo (SPA), unificando robótica, congreso, acreditación e inventario.
- `public/confirmacion.html`: Render visual post-pago, generación local del PDF de acreditación de equipos.
- `public/perfil.html`: Consola Privada del Alumno (Tabs, Ajustes, Estatus de Solicitudes y cambio de pass).
- `public/registro.html`: Módulo heredado o independiente (Wizard asilado) para dar de alta equipos de robótica.
- `public/solicitud.html`: Página pivote auxiliar (Meta-Refresh) para saltar automáticamente a inscripciones.
- `public/tramite.html`: Interfaz a Pantalla Completa (Wizard unificado) orquestando la venta de paquetes integrales del evento.
- `public/usuario.html`: Panel base post-login con los paquetes a ofertar e información resumida del congreso.
- `public/validador.html`: Estación webRTC de check-in físico de alta velocidad.

#### CSS

- Archivos `.css` dentro de `public/css/`: Colección paramétrica de estilos definidos con CSS Variables (`:root`) manteniendo la identidad "Dark Industrial / Cyan" de Renovatec.
- Destacan las hojas individuales como `admin.css`, `tramite.css`, `acceso.css` diseñadas con Responsive Design (Media Queries), animaciones de partículas asíncronas y medidas Mobile First; y `fa-fallback.css` para el manejo de fallas de CDNs visuales.

#### JavaScript

- Archivos `.js` en `public/js/`: El núcleo operativo de la interfaz. Manejan el enrutamiento vía DOM Manipulation, promesas con API Fetch (`apiJson`), validaciones Regex asíncronas y renderizado de módulos.
- Componentes especializados: `validador.js` interactúa con la API WebRTC (`navigator.mediaDevices`); `stages.js` procesa los algoritmos de tarifas dinámicas en el lado del cliente; `escuelas-data.js` pre-carga un caché offline de alta velocidad, y los módulos `admin-*.js` (SPA) refrescan el panel sin reloads.

#### Recursos estaticos

- `public/assets/docs/reglamento-*.pdf`: Colección descargable de PDFs técnicos que rigen la competencia de robótica.
- `public/assets/images/*`: Contiene imágenes renderizadas y logotipos vectoriales de las ramas institucionales (Tec, Electrónica, IEEE) y los renders "mascota" levitantes.

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
