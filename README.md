# Documentación Técnica y de Arquitectura — RENOVATEC 2026

## Índice del Documento

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Módulos y Funcionalidades Clave](#3-módulos-y-funcionalidades-clave)
4. [Estructura de Directorios](#4-estructura-de-directorios)
5. [Diccionario Técnico de Archivos (Catálogo Exhaustivo)](#5-diccionario-técnico-de-archivos)
6. [Arquitectura de Seguridad y Reglas de Negocio](#6-arquitectura-de-seguridad-y-reglas-de-negocio)
7. [Instalación y Despliegue Local](#7-instalación-y-despliegue-local)

---

## 1. Resumen Ejecutivo

**RENOVATEC 2026** es una plataforma web _Full-Stack_ robusta diseñada para la gestión integral del congreso académico, tecnológico y torneo de robótica del **Instituto Tecnológico Superior de Uruapan**.

La plataforma orquesta el ciclo de vida completo de los asistentes: desde la captación en una landing page, el registro de cuentas (con validación de correo electrónico OTP), el proceso de carrito de compras (múltiples convocatorias, inscripciones a congreso, registro de robots y campamento), validación administrativa de transacciones financieras, y check-in físico de alta velocidad mediante la lectura de códigos QR.

---

## 2. Stack Tecnológico

La arquitectura de la aplicación está construida bajo un esquema clásico y de alto rendimiento Cliente-Servidor (MPA con elementos SPA inyectados dinámicamente). No utiliza frameworks frontend pesados, asegurando tiempos de carga ultrarrápidos.

- **Frontend (Cliente):** HTML5, CSS3 (Variables, Grid, Flexbox, Media Queries), JavaScript ES6+ (Vanilla JS, Fetch API, manipulación del DOM, Promesas).
- **Librerías Frontend:** FontAwesome (Iconografía), jsPDF (Generación del PDF en el lado del cliente), jsQR (Lectura WebRTC de códigos de barras/QR).
- **Backend (Servidor):** PHP 8+ nativo utilizando PDO para la abstracción de base de datos y sentencias preparadas (prevención de Inyecciones SQL).
- **Base de Datos:** MySQL / MariaDB (Esquema relacional).
- **Infraestructura:** Servidor web Apache con reglas `.htaccess` para enrutamiento, seguridad y reescritura de URLs.

---

## 3. Módulos y Funcionalidades Clave

- **SSO y Gestión de Identidad:** Módulo unificado de acceso (Login/Registro/Recuperación) que direcciona roles de `usuario` y `admin` a sus respectivos ecosistemas. Utiliza sesiones combinadas con Storage Web para resiliencia y Web Tokens/Identifiers.
- **Wizard de Trámite Unificado:** Un flujo de múltiples pasos (`tramite.html`) donde el alumno selecciona paquetes (Congreso, Robótica, Campamento), agrega su información, detalla sus robots, y obtiene un folio pre-generado con referencias bancarias y capacidad de adjuntar el comprobante en tiempo real.
- **Generador de Pases PDF Client-Side:** Generación de recibos profesionales de pago al vuelo utilizando el navegador del usuario para descargar la presión del servidor.
- **Consola de Administración (Admin Dashboard):** Un entorno seguro para el staff que permite:
  - Revisar, aprobar y rechazar comprobantes de inscripción.
  - Visualizar KPIs financieros y analíticas de etapas (Pricing escalonado dinámico).
  - Gestionar y agendar talleres y conferencias, así como los profesores de las mismas.
  - Gestionar instituciones, escuelas y su aparición en el front-end de forma controlada.
  - Auditar eventos de seguridad (Activity Logging).
- **Check-In Biométrico/WebRTC:** Un validador de códigos QR integrado a la cámara del dispositivo móvil para uso de los guardias o staff en las puertas del congreso para cotejar la llegada de los robots y alumnos registrados.

---

## 4. Estructura de Directorios

La arquitectura de directorios aplica el patrón de seguridad que segrega la lógica y las configuraciones de la vista pública.

- `/` _(Raíz)_ - Reglas de servidor Apache y enrutadores.
- `/app/` - Toda la capa de seguridad Backend y Base de Datos (Inaccesible vía web de forma directa sin paso por API).
  - `/app/api/` - Controladores, Servicios y Endpoints en PHP.
  - `/app/config/` - Gestión de credenciales y variables de entorno (.env).
  - `/app/sql/` - Volcados y estructura de la base de datos MariaDB.
  - `/app/uploads/` - Archivos subidos por los usuarios (Ej. recibos de pago / portadas de talleres).
- `/public/` - Directorio `document_root` para la web pública. Contiene las vistas, estilos, e interactividad.
  - `/public/css/` - Hojas de estilo y temas.
  - `/public/js/` - Lógica de cliente en Vanilla JavaScript.
  - `/public/assets/` - Imágenes y PDFs descargables.

---

## 5. Diccionario Técnico de Archivos

### Directorio Raíz (`/`)

| Archivo       | Descripción de Funcionalidad                                                                                                                                                          |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.gitignore`  | Reglas de control de versiones. Evita el rastreo de carpetas `/uploads/` y claves `/app/.env.local`.                                                                                  |
| `.htaccess`   | Directivas de servidor Apache. Redirige el tráfico `/` hacia la subcarpeta `/public/` para proteger la carpeta de la aplicación (`/app/`).                                            |
| `index.html`  | Archivo pivote (Meta-Router). Su único rol es comprobar el _sessionStorage_ y redirigir inmediatamente al usuario a su panel de control o a la Landing Page si no ha iniciado sesión. |
| `README.md`   | _Este documento de arquitectura técnica_.                                                                                                                                             |
| `router.php`  | Router PHP local para levantar un entorno de pruebas mediante el CLI `php -S localhost:8000 router.php`. Emula el comportamiento del `.htaccess` en desarrollo.                       |
| `test_qr.php` | SandBox para depuración del motor de códigos de barras (QR).                                                                                                                          |
| `prueba.html` | Archivo aislado de frontend (SandBox) para prototipar rápidamente componentes UI sin afectar el repositorio principal.                                                                |

---

### Capa Backend (`/app/`)

#### `/app/config/`

| Archivo        | Descripción de Funcionalidad                                                                                                                                |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example` | Plantilla estructural que el sysadmin debe llenar al desplegar el sistema.                                                                                  |
| `.env.local`   | Archivo ignorado por GIT. Almacena las variables de entorno ultra-secretas: `DB_PASS`, `BREVO_API_KEY`, etc.                                                |
| `database.php` | Núcleo de inicialización. Parsea el archivo `.env`, establece la conexión mediante el Driver PDO, y controla la inyección global de CORS y `SESSION_START`. |

#### `/app/sql/`

| Archivo                      | Descripción de Funcionalidad                                                                                                                         |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renovatec_db.sql`           | Esquema relacional final (Data Definition Language) de toda la arquitectura del sistema.                                                             |
| `inicio_limpio_esencial.sql` | Script de truncamiento (Truncate) y _Reseed_ utilizado en operaciones QA para limpiar registros corruptos de pruebas manteniendo el entorno estable. |

#### `/app/api/` (Controladores y Endpoints)

**Autenticación y Cuentas:**
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `_auth_common.php` | Core Fundacional del sistema API. Se requiere en el 90% de los endpoints. Contiene las funciones de validación de sesión `requireLoggedInUser()`, utilidades del Mailer (Brevo) y la creación automática de tablas en cascada si no existen (DDL Recovery). |
| `auth-register.php` | Controlador POST. Valida Regex en la creación del usuario (nombres, correos, no de control), inserta en `platform_users`, previene registros duplicados y envía el correo OTP de bienvenida. |
| `auth-login.php` | Orquestador de inicio de sesión SSO. Retorna a qué entorno debe dirigirse el usuario validando los Flags de la BD (`role="admin"` o `is_active=1`). |
| `auth-verify-email.php` | Controlador OTP. Recibe un código de 6 dígitos numéricos, lo contrasta con la BD y activa la cuenta `email_verified=1`. |
| `auth-recover-account.php` | Middleware de dos pasos: primero busca la cuenta por correo/número de control y emite un código OTP. El segundo paso valida el OTP y reemplaza el HASH BCRYPT de la contraseña. |
| `auth-schools.php` | API Rest que expone en formato JSON el catálogo de Escuelas Verificadas y Activas para nutrir los _DataLists_ en tiempo real en los formularios. |
| `user-profile-update.php` | Permite al usuario logueado en la plataforma sobreescribir sus atributos estáticos en la BD (Ciudad, País, Teléfono, Matrícula). |

**Inscripciones, Pagos y Convocatorias:**
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `congress-enroll.php` | Mega-Controlador transaccional (Usa `beginTransaction()`). Absorbe un `FormData` gigante desde el _Wizard_ (`tramite.html`), captura qué paquetes quiere el usuario, calcula matemáticamente el costo de cada robot según la etapa y la fecha, inserta el `Profile_Snapshot`, genera el archivo binario del Comprobante (en `/uploads/receipts/`), inyecta Logs de Auditoría y compromete las tablas en cascada. |
| `congress-upload-receipt.php` | Sub-API para la función de _"Guardar y pagar después"_. Permite inyectar el comprobante de pago PDF o JPG a un Folio en la base de datos que ya existía pero con estatus `Awaiting Receipt`. |
| `congress-request-status.php` | End-point asíncrono (GET) que la vista _Perfil de Usuario_ sondea constantemente para revelar en qué estatus se encuentra el trámite (Pendiente, Autorizado, Solicitud de reenvío, Rechazado). |
| `get-receipt.php` | Proxy de seguridad (MIME Type Router). Su función es evitar el _Hot-Linking_. En lugar de exponer el archivo `/uploads/recibo.pdf` a la red, PHP lee el archivo del disco y lo escupe hacia el navegador web, SOLO si la cookie de sesión es válida para el administrador. |
| `get-qr.php` | Microservicio SVG autónomo de código de barras. Renderiza un `QR` en matriz vectorial 2D sin depender de servidores externos, inyectando un algoritmo de corrección Reed-Solomon H (Permite escaneos incluso con 30% del QR tapado). |
| `upload-receipt.php` | Deprecated/Retro-compatibilidad para el wizard viejo de robótica independiente. |
| `get-team.php` | Descarga relacional que extrae los arreglos JSON guardados como Strings y los parsea para revelar todos los miembros de un equipo de robótica. |
| `register-team.php` | API antigua dedicada estrictamente a inscribir equipos individuales al torneo, sustituida gradualmente por el Wizard Maestro (`congress-enroll.php`). |
| `send-registration-email.php` | Interfaz integradora SMTP con **Brevo** o Servidor Nativo, construye plantillas HTML robustas de confirmación. |

**Módulos Administrativos:**
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `admin-auth.php` | Validaciones y chequeos para entornos administrativos (Impide el ingreso de un `user` a paneles de tesorería). |
| `admin-congress-requests.php` | Controlador Maestro del Dashboard. Retorna al JS del Administrador una matriz masiva en JSON con toda la cola de trabajo de asistentes al congreso, para alimentar las pestañas de "Pendientes", "Aprobados", "Rechazados". |
| `admin-dashboard.php` | Agrega tabuladores de datos, sumatorias de dinero (`SUM(total_fee)`), y métricas para pintar los KPIs de la interfaz gráfica. |
| `verify-payment.php` | Punto final para el tesorero: Recibe un Payload con `id`, `action (approve/reject/resubmit)` y una nota opcional de rechazo, inyectando los cambios a `congress_enrollment_requests` y haciendo el cruce con el historial general `congress_registrations`. |
| `admin-checkin.php` | Recibe los Folios interceptados por la cámara de `validador.html`. Contiene la lógica para cruzar la DB, validar que la solicitud esté pagada y emitir la "Llegada del Equipo". |
| `admin-workshops.php` | Gestor en formato RESTful para el CRUD (Create, Read, Update, Delete) de la parrilla de ponentes, el horario multi-día y las imágenes en `/uploads/workshops/`. |
| `admin-security-activity.php` | Dumper del `audit_log`. Lee la tabla general de transacciones, revelando direcciones IP, User-Agents y Eventos bloqueados por intentos maliciosos, proveyendo un control paginado. |
| `admin-change-password.php` | Controlador ultra-seguro interno (`is_superadmin`) para modificar la contraseña global de las cuentas del staff, emitiendo alertas internas. |
| `admin-recover-account.php` | Pantalla visual nativa renderizada por el Servidor, dedicada a la recuperación estática mediante `ADMIN_RECOVERY_KEY` (Una clave quemada en `.env` en caso de pérdida total de control de la cuenta maestra). |
| `debug-enrollments.php` | Interfaz utilitaria secreta para purgar "enrollments" trancados durante el ciclo de pruebas locales. |

---

### Capa Frontend y Vistas (`/public/`)

Las Vistas no llevan el sufijo `.html` en el navegador del usuario gracias a las reglas silenciosas implementadas en el enrutamiento web (`.htaccess`).

#### Pantallas Globales (HTML)

| Archivo             | Descripción de Funcionalidad                                                                                                                                                                                                                                                                                  |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`        | _Landing Page Comercial_. Exhibe el material publicitario, ventajas, convocatorias, y llamadas a la acción (_Calls to Action_) del congreso. Redirige a los sistemas transaccionales.                                                                                                                         |
| `acceso.html`       | Pantalla Única de Autenticación (SPA). Carga en memoria todos los modales de Login, Creación de Cuenta, Envío de Códigos y Restablecimiento. Implementa animaciones con partículas, selecciones dinámicas de país (con bandera) y chequeos asíncronos en tiempo real sobre la validez de contraseñas.         |
| `auditoria.html`    | Documento visible de resumen, exponiendo un reporte formal sobre el estado de la seguridad perimetral de la arquitectura RENOVATEC.                                                                                                                                                                           |
| `usuario.html`      | _Panel Principal (Dashboard) del Alumno_. Una vez logueado, esta vista unifica la venta y exploración del evento: Ver talleres dinámicos extraídos de la BD, resumen de costos de robótica, y campamento.                                                                                                     |
| `tramite.html`      | _Wizard Full-Screen (Pantalla Completa)_. Guía al usuario paso a paso (Paso 1: Paquetes, Paso 2: Información Básica, Paso 3: Equipos y Robots, Paso 4: Resumen, Paso 5: Carga del Comprobante). Al finalizar el Paso 4, el JS genera e imprime directamente en la memoria caché un Archivo PDF transaccional. |
| `solicitud.html`    | Archivo de enrutamiento rápido (`<meta http-equiv="refresh">`) para enlaces profundos provenientes del correo electrónico que saltan directo a las solicitudes.                                                                                                                                               |
| `perfil.html`       | Consola Personal del Usuario. Administra su perfil con navegación basada en Pestañas (Tabs). Permite el chequeo constante de su solicitud ("Mis Inscripciones"), la descarga de pases posteriores, visualizar el estado del Check-In y alterar credenciales.                                                  |
| `admin.html`        | **Super-Dashboard Administrativo**. Aplicación SPA inmensa (Single Page Application). Su interfaz incorpora diseño reactivo de panel lateral, e incluye la importación de "Secciones" o Módulos Inyectables (`<section>`) a través de un sistema de navegación rápido sin reloads.                            |
| `validador.html`    | Pantalla WebRTC nativa optimizada para el _Día del Evento_. Enciende la cámara frontal o trasera de dispositivos móviles, escanea cuadros por segundo y procesa los códigos QR leyendo la variable criptográfica, informando visualmente (Pantalla Verde / Pantalla Roja) al personal de seguridad en puerta. |
| `confirmacion.html` | Interfaz legada o de consulta directa para imprimir el pase individual de un robot una vez verificado.                                                                                                                                                                                                        |
| `registro.html`     | Formulario asilado y simplificado (antiguo). Servía para equipos de robots que no venían al congreso completo, operando exclusivamente en base a 5 pasos aislados y generando el comprobante en formato antiguo.                                                                                              |

#### Fragmentos (Template Views HTML) Inyectables

Estas plantillas evitan saturar a `admin.html` con miles de líneas, siendo inyectadas en la interfaz a demanda:
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `admin-congress-section.html` | Módulo que encapsula las Tablas, Controles de Filtrado (Aprobadas, Pendientes, Awaiting) y el Scanner QR nativo integrado a los reportes del congreso. |
| `admin-workshops-sections.html` | El esqueleto visual que da vida a los Modales Multi-Paso para la creación de Conferencias, Profesores (InstructorModal), y Subida Asíncrona de las Imágenes Tipo Galería para los talleres. |
| `admin-institutions-section.html` | Panel para el control del catálogo de Preparatorias y Universidades (`Instituciones Verificadas`), incluyendo búsqueda, inserción e interrupción de la base de datos (BD). |
| `admin-security-section.html` | Vista de Seguridad Táctica. Expone el _Security Log_, Tabulaciones de IP, Gestión del Respaldo Físico (Local Download .JSON) y rotación en vivo de contraseñas de Staff. |

#### Carpeta de Estilos (`/public/css/`)

Utiliza arquitectura paramétrica, todas basan sus colores en variables nativas (`:root {}`) evitando librerías extra (Cero Bootstrap, Tailwind) para máximo control en el Hostinger.
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `acceso.css`, `admin.css`, `landing.css`, `perfil.css`, `registro.css`, `tramite.css`, `usuario.css`, `validador.css` | Mapeo específico de la estética para cada una de las interfaces principales mencionadas previamente. |
| `admin-congress.css`, `admin-institutions.css`, `admin-workshops.css` | Separación lógica del código de estilo para componentes específicos inyectados en la consola del administrador. |
| `styles.css` | Estilos base heredados, reset estándar (`box-sizing`), utilidades tipográficas y componentes botón globales. |
| `fa-fallback.css` | Capa de contingencia (Rescate visual) que se encarga de rellenar la interfaz con íconos o emojis básicos si CloudFlare u otro WAF bloquean temporalmente la descarga de los SVG de FontAwesome. |

#### Carpeta Lógica (JavaScript Vanilla en `/public/js/`)

Aquí reside toda la reactividad del cliente.
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `config.js` | Archivo global que almacena Endpoints base, Keys para SessionStorage y Variables Globales que todos los demás scripts referencian. |
| `script.js` | Utilidades de formateo HTML (`escapeHtml`), alertas rápidas (Toasts Notification), y utilitarios genéricos de interfaz de usuario. |
| `session-timeout.js` | _Watchdog_ de seguridad invisible. Mide pasivamente la inactividad del mouse, teclado y toques en pantalla de cualquier panel logueado. Si la inactividad supera los 15 minutos, detona un llamado API `auth-logout` borrando los LocalStorage y expulsando al usuario, previniendo el robo de sesión en computadoras compartidas (Ej. Cibercafés o Aulas de laboratorio). |
| `acceso.js` | Cerebro de la vista de registro e ingreso. Manipula la visibilidad de pantallas ocultas, el cifrado de las ladas con Banderas Dinámicas, evalúa en tiempo real (con barra térmica) la seguridad criptográfica del password del usuario y controla el _IP Block Overlay_ si el backend arroja códigos `HTTP 429`. |
| `tramite.js` | Compleja lógica multi-fase (El _Wizard_). Controla la barra progresiva del paso a paso, gestiona los precios calculando el carrito temporalmente en caché (borradores de `localStorage`), inyecta validadores de inputs y manipula el framework `jsPDF` para pre-renderizar y pintar el PDF en base64 antes de emitir la carga binaria mediante API Fetch. |
| `usuario.js` | Controla la visualización condicional. Carga asíncronamente vía API qué Talleres están `Published` y los inyecta en el mosaico de la interfaz principal. |
| `perfil.js` | Inyector modular de datos del usuario, lee y renderiza respuestas asíncronas de la DB a través de pestañas manipulando el DOM. Si detecta una solicitud, cambia dinámicamente las tarjetas gráficas para permitir subida de archivos, bajada del PDF final, o ver notificaciones de los administradores. |
| `stages.js` | Lógica central del sistema de _Tiered Pricing_ (Precios escalonados). Utilizando fechas nativas (`Date()`), decide si el usuario está bajo una Etapa Prematura, Regular o Tardía para alterar matemáticamente los totales de cobro visuales de Robótica. |
| `validador.js` | Integra a un Canvas `<video>` a la cámara cruda del dispositivo a través de `navigator.mediaDevices.getUserMedia`, y aplica un bucle infinito (_RequestAnimationFrame_) donde usa la biblioteca `jsQR` escaneando el frame del buffer para reaccionar al detectar un Folio oficial. |
| `escuelas.js` y `escuelas-data.js` | Motor de predicción asíncrono para instituciones. Implementan una base de datos Cache Offline con los nombres de escuelas precargados. Conforme el usuario escribe, el JS filtra y autocompleta su búsqueda (Evitando golpear a la base de datos con peticiones GET por cada pulsación de teclado). |
| `registro.js` / `registro-new.js` | Manipuladores para la versión independiente (vieja) del wizard de robótica, garantizando que equipos que solo vengan al torneo sigan pudiendo navegar un flujo lógico de registro multi-etapa. |
| `confirmacion.js` / `confirmacion-new.js` | Creadores de la capa visual final, que procesan la consulta de Folios QR y su pintura de datos en la pantalla de éxito. |

**El Cerebro Administrativo (SPA JS):**
| Archivo | Descripción de Funcionalidad |
| :--- | :--- |
| `admin.js` | Controlador Maestro de Navegación del Panel. Oculta/Muestra paneles de forma instantánea sin recargar, gestiona variables del administrador, orquesta Notificaciones y valida permisos antes de disparar acciones. |
| `admin-congress.js` | Funciones especializadas (`congressModule`) vinculadas a la extracción asíncrona de inscripciones y el renderizado del listado de aprobaciones. Lanza Modales que muestran las fotos de comprobantes del alumno. |
| `admin-confirmed.js` | Controlador de Reportes Gerenciales (Panel de analítica e información visual en gráficos). Mapea el cruce entre etapas y total de pagos. |
| `admin-workshops.js` | Controlador (`workshopModule`) para arrastrar/soltar (Drag&Drop) fotos e imágenes de talleres, añadir _tags_ de materiales requeridos y sincronizarlos contra la Base de Datos a través del FormData de PHP. |
| `admin-institutions.js` | Control (`institutionsModule`) del CRUD de las escuelas (Universidad/Preparatorias). Maneja la inserción de banderas con Selectors asíncronos y filtros complejos (Tipo/Status). |
| `admin-improvements.js` | Módulo de "Parches e inyecciones de interfaz" introducido en versiones tardías (v20260506). Introduce un overlay Fullscreen nativo de escaneo en toda la interfaz, añade un dumper paginado del Historial, control del Log de Seguridad por tiempo, y el Botón de Generación de un Archivo de Respaldo (`.JSON` Backup Downloader) de la BD y cronología de equipos para el Sysadmin. |

---

## 6. Arquitectura de Seguridad y Reglas de Negocio

El ecosistema cuenta con barreras defensivas en todos los niveles operativos:

1.  **Detección de Sesiones en Front-End (Fallback):** Implementado vía `SessionStorage`. Si un script bloqueado por redes estandar no responde, el enrutador recargará los JS críticos.
2.  **Inactividad Total Expirada (15 minutos):** Cualquier dispositivo inactivo por más del tiempo programado detona la expulsión total y el borrado criptográfico de cachés para evadir sustracciones (`session-timeout.js`).
3.  **Seguridad por Fuerza Bruta y Rate Limiting (IP Block):** Protecciones backend de intentos de conexión bloquean en una Pantalla Roja Total ("Acceso Bloqueado") la IP del usuario (`HTTP 429`) en el front si detecta actividad maliciosa en Login o Request.
4.  **Gestión de Permisos Transaccionales (SQL Roles):** Ninguna tabla crítica puede ser modificada a menos que el validador emita un JSON Web Token o sesión pre-autenticada y coteje si la jerarquía del perfil autoriza el cambio.
5.  **Exclusión Externa mediante Archivos Base de Servidor (Proxy):** Toda imagen adjunta de documentos de transacciones de un alumno o voucher, NUNCA es visible en internet público. Está contenida y extraída bajo un proxy `get-receipt.php` validando credenciales de Tesorería.
6.  **Regla de Negocio - Exigencia Institucional:** Si el FrontEnd localiza que la universidad elegida es el **Instituto Tecnológico Superior de Uruapan**, interrumpe el flujo y transfigura el campo `Matrícula / Número de control` a un requerimiento de Nivel Crítico Obligatorio.
7.  **Condiciones Transaccionales Concurrentes (`congress-enroll.php`):** Toda inscripción multi-bloque ocurre utilizando `BEGIN TRAN` a nivel SQL. Si falla un proceso a media carrera o explota el render, toda la base de datos es purgada bajo `ROLLBACK` para no dejar información basura de los usuarios.
8.  **Generación Dinámica Anticolisión de Folios:** Se basa en las variables Semilla del Perfil de cada participante. Un sufijo numérico se genera aleatoriamente en escenarios excepcionales de colisión temporal con un Re-intento programado en Backend de 10 Ciclos.

---

## 7. Instalación y Despliegue Local

### Requisitos Recomendados del Servidor

- **PHP 8.0+**
- **MySQL 8.0+** o **MariaDB 10.4+**
- Extensiones Nativas Habilitadas en php.ini: `pdo`, `pdo_mysql`, `curl`, `json`, `mbstring`.

### Pasos de Despliegue

1.  **Clonación y Extracción:**
    Extrae el repositorio en la carpeta raíz local (Ej. `/var/www/html/congreso/` o `C:\xampp\htdocs\congreso`).

2.  **Configuración Sensitiva y Variables de Entorno (`.env.local`):**
    Accede a `app/.env.example`, cópialo a un nuevo archivo llamado `.env.local` y suministra la estructura estricta del servidor.

    ```env
    # Acceso a la BD
    DB_HOST=localhost
    DB_PORT=3306
    DB_NAME=renovatec_2026_db
    DB_USER=root
    DB_PASS=SecretoSeguro

    # Proveedor de Notificaciones SMTP (Brevo o Nativo PHP)
    MAIL_PROVIDER=brevo
    MAIL_FROM_ADDRESS=notificaciones@renovatec.mx
    BREVO_API_KEY=xkeysib-000...

    # Seguridad Total Root
    APP_DEBUG=true
    ADMIN_RECOVERY_KEY=UnCodigoImposibleDeAdivinarX8
    ```

3.  **Provisión Estructural (Base de Datos):**
    En el entorno MySQL de destino (PhpMyAdmin o MySQL Workbench), ejecuta la estructura relacional base adjunta en `app/sql/renovatec_db.sql`.
    _(Opcional: Si ocurre un bug crítico en operaciones iniciales de Testing Local y se desea limpiar todo y devolver a cero, corre `app/sql/inicio_limpio_esencial.sql`)._

4.  **Levantar Arquitectura en Desarrollo (Local PHP-CLI):**
    Si careces de Apache y prefieres el servidor virtual enjaulado para evaluar localmente:

    ```bash
    cd c:\dev\congreso\
    php -S localhost:8000 router.php
    ```

    Accede a `http://localhost:8000/`.

5.  **Avisos para Infraestructura Cloud / Hostinger:**
    - Las subidas binarias de Archivos de Tesorería se colocan en `app/uploads/receipts/`. Garantiza que esta ruta de servidor esté chownificada en permisos `CHMOD 755` con el propietario del grupo WWW (`www-data`).
    - Al transicionar, apaga la bandera `APP_DEBUG=false` en el `.env.local` para cerrar el volcado de Errores Traza de PHP.

---

_Documento confidencial, generado como manual de handover técnico para el equipo Administrativo de RENOVATEC._
