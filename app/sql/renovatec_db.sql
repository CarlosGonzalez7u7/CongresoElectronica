-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 29-05-2026 a las 16:44:04
-- Versión del servidor: 11.8.6-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u160168264_renovatec`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`u160168264_Carlos`@`127.0.0.1` PROCEDURE `registrar_o_incrementar_carrera` (IN `p_name` VARCHAR(200), IN `p_user_id` INT, OUT `p_out_id` INT)   BEGIN
  DECLARE v_existing INT DEFAULT 0;

  SELECT id INTO v_existing
  FROM career_catalog
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
  LIMIT 1;

  IF v_existing > 0 THEN
    UPDATE career_catalog
    SET times_used = times_used + 1
    WHERE id = v_existing;
    SET p_out_id = v_existing;
  ELSE
    INSERT INTO career_catalog (name, level, is_verified, times_used, proposed_by)
    VALUES (TRIM(p_name), 'otro', 0, 1, p_user_id);
    SET p_out_id = LAST_INSERT_ID();
  END IF;
END$$

CREATE DEFINER=`u160168264_Carlos`@`127.0.0.1` PROCEDURE `registrar_o_incrementar_escuela` (IN `p_name` VARCHAR(250), IN `p_type` VARCHAR(20), IN `p_user_id` INT, OUT `p_out_id` INT)   BEGIN
  DECLARE v_existing INT DEFAULT 0;

  SELECT id INTO v_existing
  FROM institution_catalog
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
  LIMIT 1;

  IF v_existing > 0 THEN
    -- Ya existe → solo incrementar contador
    UPDATE institution_catalog
    SET times_used = times_used + 1
    WHERE id = v_existing;
    SET p_out_id = v_existing;
  ELSE
    -- Nueva escuela propuesta por alumno
    INSERT INTO institution_catalog (name, type, state, is_verified, times_used, proposed_by)
    VALUES (TRIM(p_name), IF(p_type IN ('universidad','preparatoria','otro'), p_type, 'universidad'),
            NULL, 0, 1, p_user_id);
    SET p_out_id = LAST_INSERT_ID();
  END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL,
  `username` varchar(60) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('superadmin','reviewer','staff') DEFAULT 'staff',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login_at` timestamp NULL DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `last_failed_login_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`, `last_login_at`, `failed_login_attempts`, `last_failed_login_at`) VALUES
(2, 'admin', 'Administrador General', 'admin@renovatec.local', '$2y$10$OZYjFjUapcT0f50vM1DuFOzyxHu0j.i3B8QG70qDm7LpTNZWh3cGm', 'superadmin', 1, '2026-05-07 03:25:44', '2026-05-29 16:41:02', '2026-05-29 16:41:02', 0, NULL),
(3, 'staff', 'Personal Operativo', 'staff@renovatec.local', '$2y$10$PIMRlD7GHgzotf2KqH/YPuzVL0tfRpiey5J56VwC.uJMjmFkeDPta', 'staff', 1, '2026-05-07 03:25:44', '2026-05-09 15:55:55', '2026-05-09 15:55:55', 0, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changes`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `camp_registrations`
--

CREATE TABLE `camp_registrations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'platform_users.id',
  `congress_registration_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 200.00,
  `status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `registered_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `career_catalog`
--

CREATE TABLE `career_catalog` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL COMMENT 'Nombre de la carrera o programa',
  `level` enum('licenciatura','ingenieria','tecnico_superior','tecnico','otro') NOT NULL DEFAULT 'ingenieria',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `times_used` int(11) NOT NULL DEFAULT 1,
  `proposed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo comunitario de carreras.';

--
-- Volcado de datos para la tabla `career_catalog`
--

INSERT INTO `career_catalog` (`id`, `name`, `level`, `is_verified`, `times_used`, `proposed_by`, `created_at`) VALUES
(1, 'Ingeniería Electrónica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(2, 'Ingeniería en Sistemas Computacionales', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(3, 'Ingeniería en Tecnologías de la Información', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(4, 'Ingeniería Mecatrónica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(5, 'Ingeniería Eléctrica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(6, 'Ingeniería Mecánica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(7, 'Ingeniería Industrial', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(8, 'Ingeniería Civil', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(9, 'Ingeniería Química', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(10, 'Ingeniería Biomédica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(11, 'Ingeniería en Robótica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(12, 'Ingeniería en Automatización', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(13, 'Ingeniería en Comunicaciones y Electrónica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(14, 'Ingeniería en Energías Renovables', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(15, 'Ingeniería en Software', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(16, 'Ingeniería en Redes Computacionales', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(17, 'Ingeniería en Ciberseguridad', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(18, 'Ingeniería en Inteligencia Artificial', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(19, 'Ingeniería en Gestión Empresarial', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(20, 'Ingeniería en Ciencias de Datos', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(21, 'Ingeniería en Nanotecnología', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(22, 'Ingeniería en Manufactura', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(23, 'Ingeniería Ambiental', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(24, 'Ingeniería en Logística', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(25, 'Ingeniería Aeronáutica', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(26, 'Ingeniería en Alimentos', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(27, 'Ingeniería en Geomática', 'ingenieria', 1, 0, NULL, '2026-05-08 02:29:09'),
(28, 'Licenciatura en Informática', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(29, 'Licenciatura en Sistemas de Información', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(30, 'Licenciatura en Física', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(31, 'Licenciatura en Matemáticas', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(32, 'Licenciatura en Química', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(33, 'Licenciatura en Administración de Empresas', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(34, 'Licenciatura en Contaduría', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(35, 'Licenciatura en Mercadotecnia', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(36, 'Licenciatura en Negocios Internacionales', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(37, 'Licenciatura en Diseño Gráfico', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(38, 'Licenciatura en Diseño Industrial', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(39, 'Licenciatura en Animación Digital', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(40, 'Licenciatura en Derecho', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(41, 'Licenciatura en Comunicación', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(42, 'Licenciatura en Educación', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(43, 'Licenciatura en Psicología', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(44, 'Licenciatura en Enfermería', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(45, 'Médico Cirujano y Partero', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(46, 'Arquitectura', 'licenciatura', 1, 0, NULL, '2026-05-08 02:29:09'),
(47, 'Técnico Superior en Sistemas', 'tecnico_superior', 1, 0, NULL, '2026-05-08 02:29:09'),
(48, 'Técnico Superior en Electrónica', 'tecnico_superior', 1, 0, NULL, '2026-05-08 02:29:09'),
(49, 'Técnico Superior en Mecatrónica', 'tecnico_superior', 1, 0, NULL, '2026-05-08 02:29:09'),
(50, 'Técnico en Programación', 'tecnico', 1, 0, NULL, '2026-05-08 02:29:09'),
(51, 'Técnico en Mantenimiento Industrial', 'tecnico', 1, 0, NULL, '2026-05-08 02:29:09'),
(52, 'Técnico en Redes', 'tecnico', 1, 0, NULL, '2026-05-08 02:29:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `competition_categories`
--

CREATE TABLE `competition_categories` (
  `id` int(11) NOT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `max_weight` varchar(50) DEFAULT NULL,
  `difficulty_level` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `documento_reglamento_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `competition_datetime` datetime DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `weight_label` varchar(50) DEFAULT NULL,
  `tag` varchar(30) DEFAULT NULL,
  `icon_type` varchar(80) DEFAULT 'fas fa-flag',
  `is_remote_controlled` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `competition_categories`
--

INSERT INTO `competition_categories` (`id`, `category_code`, `category_name`, `description`, `max_weight`, `difficulty_level`, `is_active`, `documento_reglamento_url`, `created_at`, `competition_datetime`, `location`, `weight_label`, `tag`, `icon_type`, `is_remote_controlled`, `sort_order`) VALUES
(25, 'robot-guerra-1lb', 'Robot de guerra 1 lb', 'Robots de combate de 1 libra de peso', '1 lb', 3, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(26, 'robot-guerra-3lb', 'Robot de guerra 3 lb', 'Robots de combate de 3 libras de peso', '3 lb', 4, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(27, 'seguidor-linea-profesional', 'Seguidor de linea profesional', 'Competencia de seguimiento de linea nivel profesional', 'Variable', 4, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(28, 'seguidor-linea-amateur', 'Seguidor de linea amateur', 'Competencia de seguimiento de linea nivel amateur', 'Variable', 2, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(29, 'carros-rc', 'Carros RC', 'Vehiculos de control remoto para pruebas de velocidad y maniobra', 'Variable', 2, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(30, 'soccer-rc', 'Soccer RC', 'Competencia tipo futbol con robots de control remoto', 'Variable', 3, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(31, 'mini-sumo-rc', 'Mini sumo RC', 'Robots de control remoto luchando en un ring', '500 g', 3, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0),
(32, 'robot-insecto', 'Robot insecto', 'Robots tipo insecto con desplazamiento especializado', 'Variable', 4, 1, NULL, '2026-05-07 03:25:44', NULL, NULL, NULL, NULL, 'fas fa-flag', 0, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conferences`
--

CREATE TABLE `conferences` (
  `id` int(11) NOT NULL,
  `convocatoria_id` int(11) DEFAULT NULL COMMENT 'NULL = asociado al Congreso por defecto',
  `name` varchar(250) NOT NULL,
  `description` text DEFAULT NULL,
  `speaker_name` varchar(200) DEFAULT NULL,
  `speaker_title` varchar(200) DEFAULT NULL,
  `speaker_org` varchar(200) DEFAULT NULL,
  `location` varchar(300) DEFAULT NULL,
  `building` varchar(100) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `location_type` enum('internal','external') DEFAULT 'internal',
  `conference_date` date DEFAULT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 1,
  `tags` text DEFAULT NULL,
  `status` enum('draft','published','cancelled','completed') DEFAULT 'draft',
  `language` varchar(60) DEFAULT 'Español',
  `live_stream_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conference_images`
--

CREATE TABLE `conference_images` (
  `id` int(11) NOT NULL,
  `conference_id` int(11) NOT NULL,
  `filename` varchar(300) NOT NULL,
  `url` varchar(500) NOT NULL,
  `image_type` enum('speaker','map','gallery') DEFAULT 'gallery',
  `is_cover` tinyint(1) DEFAULT 0,
  `caption` varchar(300) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `congress_enrollment_requests`
--

CREATE TABLE `congress_enrollment_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `congress_year` year(4) NOT NULL DEFAULT 2026,
  `request_folio` varchar(50) DEFAULT NULL,
  `profile_snapshot_json` longtext DEFAULT NULL,
  `robots_snapshot_json` longtext DEFAULT NULL,
  `members_snapshot_json` longtext DEFAULT NULL,
  `includes_congress` tinyint(1) DEFAULT 1,
  `includes_robotics` tinyint(1) DEFAULT 0,
  `includes_camp` tinyint(1) DEFAULT 0,
  `congress_fee` decimal(10,2) DEFAULT 400.00,
  `robotics_fee` decimal(10,2) DEFAULT 0.00,
  `camp_fee` decimal(10,2) DEFAULT 0.00,
  `total_fee` decimal(10,2) DEFAULT 400.00,
  `receipt_path` varchar(500) DEFAULT NULL,
  `receipt_filename` varchar(300) DEFAULT NULL,
  `receipt_uploaded_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','approved','rejected','resubmit_requested') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by_admin_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `congress_registrations`
--

CREATE TABLE `congress_registrations` (
  `id` int(11) NOT NULL,
  `folio_inscripcion` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `congress_year` int(11) NOT NULL,
  `registration_fee` decimal(10,2) NOT NULL DEFAULT 400.00,
  `payment_status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `country_snapshot` varchar(120) NOT NULL,
  `city_snapshot` varchar(120) NOT NULL,
  `school_snapshot` varchar(220) NOT NULL,
  `matricula_snapshot` varchar(60) DEFAULT NULL,
  `comprobante_ruta` varchar(255) DEFAULT NULL,
  `qr_code_hash` varchar(255) DEFAULT NULL,
  `registered_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `convocatorias`
--

CREATE TABLE `convocatorias` (
  `id` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` longtext DEFAULT NULL,
  `conv_tipo` varchar(120) NOT NULL DEFAULT '' COMMENT 'Tipo libre de evento: Torneo, Congreso, Campamento, etc.',
  `precio_base` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `documento_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `conv_type` varchar(60) NOT NULL DEFAULT 'general',
  `pricing_mode` enum('fixed','staged') NOT NULL DEFAULT 'fixed',
  `price_stages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`price_stages`)),
  `inscripcion_inicio` datetime DEFAULT NULL COMMENT 'Desde cuándo pueden registrarse los participantes',
  `inscripcion_fin` datetime DEFAULT NULL COMMENT 'Fecha y hora límite para inscribirse',
  `evento_inicio` datetime DEFAULT NULL COMMENT 'Cuándo inicia físicamente el evento',
  `evento_fin` datetime DEFAULT NULL COMMENT 'Cuándo termina el evento (opcional)',
  `rich_content` longtext DEFAULT NULL COMMENT 'HTML generado por Quill.js — contenido rico de la convocatoria para la landing',
  `cover_image_url` varchar(500) DEFAULT NULL COMMENT 'URL de imagen de portada/banner de la convocatoria',
  `icon` varchar(80) DEFAULT 'fas fa-bullhorn' COMMENT 'Clase de icono FontAwesome para la convocatoria',
  `color` varchar(30) DEFAULT '#f2a900' COMMENT 'Color identificador de la convocatoria (hex)',
  `show_on_landing` tinyint(1) DEFAULT 1 COMMENT '1 = mostrar en la página principal',
  `landing_order` int(11) DEFAULT 99 COMMENT 'Orden de aparición en la landing (menor = primero)',
  `categories_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`categories_json`)),
  `included_modules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`included_modules`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `convocatorias`
--

INSERT INTO `convocatorias` (`id`, `codigo`, `titulo`, `descripcion`, `conv_tipo`, `precio_base`, `is_active`, `documento_url`, `created_at`, `updated_at`, `conv_type`, `pricing_mode`, `price_stages`, `inscripcion_inicio`, `inscripcion_fin`, `evento_inicio`, `evento_fin`, `rich_content`, `cover_image_url`, `icon`, `color`, `show_on_landing`, `landing_order`, `categories_json`, `included_modules`) VALUES
(1, 'congreso', 'Congreso Internacional RENOVATEC', '<style>\r\n.ql-editor-display .ql-align-center { text-align: center; }\r\n.ql-editor-display .ql-align-right { text-align: right; }\r\n.ql-editor-display .ql-align-justify { text-align: justify; }\r\n.ql-editor-display .ql-font-arial { font-family: \'Arial\', sans-serif; }\r\n.ql-editor-display .ql-font-times-new-roman { font-family: \'Times New Roman\', serif; }\r\n.ql-editor-display .ql-font-courier-new { font-family: \'Courier New\', monospace; }\r\n.ql-editor-display .ql-font-georgia { font-family: \'Georgia\', serif; }\r\n.ql-editor-display .ql-font-verdana { font-family: \'Verdana\', sans-serif; }\r\n.ql-editor-display .ql-font-syne { font-family: \'Syne\', sans-serif; }\r\n.ql-editor-display .ql-font-dm-sans { font-family: \'DM Sans\', sans-serif; }\r\n.ql-editor-display img { max-width: 100%; height: auto; }\r\n.ql-editor-display h1 { font-family: \'Syne\', sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 12px; margin-top: 0; color: #1a1a2e; }\r\n.ql-editor-display h2 { font-family: \'Syne\', sans-serif; font-size: 22px; font-weight: 700; margin-bottom: 10px; margin-top: 0; color: #1a1a2e; }\r\n.ql-editor-display h3 { font-family: \'Syne\', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 8px; margin-top: 0; color: #1a1a2e; }\r\n.ql-editor-display p { margin-bottom: 10px; margin-top: 0; }\r\n.ql-editor-display a { color: #1a73e8; text-decoration: underline; }\r\n.ql-editor-display::after { content: \"\"; display: table; clear: both; }\r\n@media (max-width: 768px) { .ql-editor-display { padding: 20px !important; margin: 15px auto !important; } }\r\n</style><div class=\"ql-editor-display\" style=\"background: #ffffff; color: #1c1c1e; max-width: 816px; margin: 30px auto; padding: 40px; border-radius: 8px; font-family: \'DM Sans\', sans-serif; line-height: 1.75; box-shadow: 0 4px 20px rgba(0,0,0,0.15); box-sizing: border-box; overflow-wrap: break-word;\"><p>Acceso completo a conferencias y evento</p></div>', 'Congreso Académico', 400.00, 1, NULL, '2026-05-14 03:14:17', '2026-05-28 01:08:22', 'general', 'fixed', NULL, '2026-05-16 23:59:00', '2026-05-18 23:59:00', '2026-05-18 14:00:00', '2026-05-20 18:30:00', NULL, NULL, 'fa-solid fa-suitcase', '#f2a900', 1, 1, NULL, '{\"workshops\":true,\"instructors\":false,\"conferences\":true,\"custom\":[]}'),
(2, 'robotica', 'Torneo de Robótica', '<style>\r\n.ql-editor-display .ql-align-center { text-align: center; }\r\n.ql-editor-display .ql-align-right { text-align: right; }\r\n.ql-editor-display .ql-align-justify { text-align: justify; }\r\n.ql-editor-display .ql-font-arial { font-family: \'Arial\', sans-serif; }\r\n.ql-editor-display .ql-font-times-new-roman { font-family: \'Times New Roman\', serif; }\r\n.ql-editor-display .ql-font-courier-new { font-family: \'Courier New\', monospace; }\r\n.ql-editor-display .ql-font-georgia { font-family: \'Georgia\', serif; }\r\n.ql-editor-display .ql-font-verdana { font-family: \'Verdana\', sans-serif; }\r\n.ql-editor-display .ql-font-syne { font-family: \'Syne\', sans-serif; }\r\n.ql-editor-display .ql-font-dm-sans { font-family: \'DM Sans\', sans-serif; }\r\n.ql-editor-display img { max-width: 100%; height: auto; }\r\n.ql-editor-display h1 { font-family: \'Syne\', sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 12px; margin-top: 0; color: #1a1a2e; }\r\n.ql-editor-display h2 { font-family: \'Syne\', sans-serif; font-size: 22px; font-weight: 700; margin-bottom: 10px; margin-top: 0; color: #1a1a2e; }\r\n.ql-editor-display h3 { font-family: \'Syne\', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 8px; margin-top: 0; color: #1a1a2e; }\r\n.ql-editor-display p { margin-bottom: 10px; margin-top: 0; }\r\n.ql-editor-display a { color: #1a73e8; text-decoration: underline; }\r\n.ql-editor-display::after { content: \"\"; display: table; clear: both; }\r\n@media (max-width: 768px) { .ql-editor-display { padding: 20px !important; margin: 15px auto !important; } }\r\n</style><div class=\"ql-editor-display\" style=\"background: #ffffff; color: #1c1c1e; max-width: 816px; margin: 30px auto; padding: 40px; border-radius: 8px; font-family: \'DM Sans\', sans-serif; line-height: 1.75; box-shadow: 0 4px 20px rgba(0,0,0,0.15); box-sizing: border-box; overflow-wrap: break-word;\"><p>Inscripción para competencias de robótica</p></div>', '', 130.00, 1, NULL, '2026-05-14 03:14:17', '2026-05-17 02:47:54', 'general', 'staged', '[{\"start\":\"2026-04-01\",\"end\":\"2026-06-30\",\"price\":130},{\"start\":\"2026-07-01\",\"end\":\"2026-08-31\",\"price\":200},{\"start\":\"2026-09-01\",\"end\":\"2026-10-22\",\"price\":350}]', '2026-04-01 01:00:00', '2026-10-22 23:59:00', '2026-10-23 09:00:00', '2026-10-28 17:00:00', NULL, NULL, 'fas fa-robot', '#22d3ee', 1, 2, NULL, NULL),
(3, 'campamento', 'Campamento RENOVATEC', 'Alojamiento y actividades de campamento', '', 200.00, 1, NULL, '2026-05-14 03:14:17', '2026-05-16 18:40:57', 'general', 'fixed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'fas fa-campground', '#34d399', 1, 3, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `convocatoria_images`
--

CREATE TABLE `convocatoria_images` (
  `id` int(11) NOT NULL,
  `convocatoria_id` int(11) NOT NULL,
  `filename` varchar(300) NOT NULL,
  `url` varchar(500) NOT NULL,
  `caption` text DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `convocatoria_modules`
--

CREATE TABLE `convocatoria_modules` (
  `id` int(11) NOT NULL,
  `convocatoria_id` int(11) NOT NULL,
  `module_key` varchar(80) DEFAULT NULL,
  `module_type` enum('workshop','conference','custom') NOT NULL DEFAULT 'custom',
  `title` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(80) NOT NULL DEFAULT 'fas fa-star',
  `status` enum('draft','published','disabled') NOT NULL DEFAULT 'draft',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `responsible_name` varchar(180) DEFAULT NULL,
  `responsible_email` varchar(180) DEFAULT NULL,
  `responsible_phone` varchar(40) DEFAULT NULL,
  `responsible_username` varchar(60) DEFAULT NULL,
  `responsible_role` enum('instructor','speaker','manager') DEFAULT NULL,
  `config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `institution_catalog`
--

CREATE TABLE `institution_catalog` (
  `id` int(11) NOT NULL,
  `name` varchar(250) NOT NULL COMMENT 'Nombre oficial de la institución',
  `type` enum('universidad','preparatoria','otro') NOT NULL DEFAULT 'universidad',
  `state` varchar(100) DEFAULT NULL COMMENT 'Estado de la República o país',
  `country` varchar(80) NOT NULL DEFAULT 'México',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = verificada por admin, 0 = propuesta por alumno',
  `times_used` int(11) NOT NULL DEFAULT 1 COMMENT 'Veces que alumnos han seleccionado esta escuela',
  `proposed_by` int(11) DEFAULT NULL COMMENT 'user_id del alumno que la propuso (NULL si es base)',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo comunitario de escuelas. Los alumnos proponen nuevas.';

--
-- Volcado de datos para la tabla `institution_catalog`
--

INSERT INTO `institution_catalog` (`id`, `name`, `type`, `state`, `country`, `is_verified`, `times_used`, `proposed_by`, `created_at`, `updated_at`) VALUES
(1, 'Instituto Tecnológico Superior de Uruapan', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(2, 'Instituto Tecnológico de Morelia', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(3, 'Instituto Tecnológico Superior de Pátzcuaro', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(4, 'Instituto Tecnológico Superior de Zamora', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(5, 'Instituto Tecnológico Superior de Apatzingán', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(6, 'Instituto Tecnológico Superior de Coalcomán', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(7, 'Instituto Tecnológico Superior de Tacámbaro', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(8, 'Instituto Tecnológico Superior de Tierra Caliente', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(9, 'Instituto Tecnológico Superior de La Región Sierra', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(10, 'Universidad Politécnica de Uruapan', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(11, 'Universidad Tecnológica de Morelia', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(12, 'Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)', 'universidad', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(13, 'Instituto Tecnológico de Estudios Superiores de Occidente (ITESO)', 'universidad', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(14, 'Instituto Tecnológico de Monterrey (ITESM)', 'universidad', 'Nuevo León', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(15, 'Instituto Tecnológico de Tijuana', 'universidad', 'Baja California', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(16, 'Instituto Tecnológico de León', 'universidad', 'Guanajuato', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(17, 'Instituto Tecnológico de Celaya', 'universidad', 'Guanajuato', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(18, 'Instituto Tecnológico de Querétaro', 'universidad', 'Querétaro', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(19, 'Instituto Tecnológico de Aguascalientes', 'universidad', 'Aguascalientes', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(20, 'Instituto Tecnológico de Saltillo', 'universidad', 'Coahuila', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(21, 'Instituto Tecnológico de Durango', 'universidad', 'Durango', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(22, 'Instituto Tecnológico de Mérida', 'universidad', 'Yucatán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(23, 'Instituto Tecnológico de Cancún', 'universidad', 'Quintana Roo', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(24, 'Instituto Tecnológico de Tuxtla Gutiérrez', 'universidad', 'Chiapas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(25, 'Instituto Tecnológico de Oaxaca', 'universidad', 'Oaxaca', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(26, 'Instituto Tecnológico de Veracruz', 'universidad', 'Veracruz', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(27, 'Instituto Tecnológico de Orizaba', 'universidad', 'Veracruz', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(28, 'Instituto Tecnológico de Puebla', 'universidad', 'Puebla', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(29, 'Instituto Tecnológico de Toluca', 'universidad', 'Estado de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(30, 'Instituto Tecnológico de Culiacán', 'universidad', 'Sinaloa', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(31, 'Instituto Tecnológico de Hermosillo', 'universidad', 'Sonora', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(32, 'Instituto Tecnológico de Ciudad Juárez', 'universidad', 'Chihuahua', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(33, 'Instituto Tecnológico de La Paz', 'universidad', 'Baja California Sur', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(34, 'Instituto Tecnológico de San Luis Potosí', 'universidad', 'San Luis Potosí', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(35, 'Instituto Tecnológico de Tepic', 'universidad', 'Nayarit', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(36, 'Instituto Tecnológico de Colima', 'universidad', 'Colima', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(37, 'Instituto Tecnológico de Villahermosa', 'universidad', 'Tabasco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(38, 'Instituto Tecnológico de Apizaco', 'universidad', 'Tlaxcala', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(39, 'Instituto Tecnológico de Zacatecas', 'universidad', 'Zacatecas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(40, 'Instituto Tecnológico de Cuernavaca', 'universidad', 'Morelos', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(41, 'Instituto Tecnológico Superior de Irapuato', 'universidad', 'Guanajuato', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(42, 'Instituto Tecnológico Superior de Xalapa', 'universidad', 'Veracruz', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(43, 'Instituto Tecnológico Superior de Huatulco', 'universidad', 'Oaxaca', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(44, 'Universidad Nacional Autónoma de México (UNAM)', 'universidad', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(45, 'Instituto Politécnico Nacional (IPN)', 'universidad', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(46, 'Universidad Autónoma Metropolitana (UAM)', 'universidad', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(47, 'Universidad Autónoma de Nuevo León (UANL)', 'universidad', 'Nuevo León', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(48, 'Universidad de Guadalajara (UdeG)', 'universidad', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(49, 'Universidad Autónoma de Guadalajara (UAG)', 'universidad', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(50, 'Universidad Autónoma de Baja California (UABC)', 'universidad', 'Baja California', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(51, 'Universidad Autónoma de Chihuahua (UACH)', 'universidad', 'Chihuahua', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(52, 'Universidad Autónoma de Sinaloa (UAS)', 'universidad', 'Sinaloa', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(53, 'Universidad Autónoma de Sonora (UNISON)', 'universidad', 'Sonora', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(54, 'Universidad Autónoma de Aguascalientes (UAA)', 'universidad', 'Aguascalientes', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(55, 'Universidad Autónoma de Coahuila (UAdeC)', 'universidad', 'Coahuila', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(56, 'Universidad Autónoma de San Luis Potosí (UASLP)', 'universidad', 'San Luis Potosí', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(57, 'Universidad Autónoma de Nayarit (UAN)', 'universidad', 'Nayarit', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(58, 'Universidad de Colima (UCOL)', 'universidad', 'Colima', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(59, 'Universidad Autónoma Benito Juárez de Oaxaca (UABJO)', 'universidad', 'Oaxaca', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(60, 'Universidad Autónoma de Chiapas (UNACH)', 'universidad', 'Chiapas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(61, 'Universidad Autónoma de Yucatán (UADY)', 'universidad', 'Yucatán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(62, 'Universidad Veracruzana (UV)', 'universidad', 'Veracruz', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(63, 'Benemérita Universidad Autónoma de Puebla (BUAP)', 'universidad', 'Puebla', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(64, 'Universidad Autónoma del Estado de México (UAEM)', 'universidad', 'Estado de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(65, 'Universidad Autónoma del Estado de Morelos (UAEM)', 'universidad', 'Morelos', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(66, 'Universidad Autónoma de Guerrero (UAGRO)', 'universidad', 'Guerrero', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(67, 'Universidad Autónoma del Estado de Hidalgo (UAEH)', 'universidad', 'Hidalgo', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(68, 'Universidad de Guanajuato (UG)', 'universidad', 'Guanajuato', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(69, 'Universidad Autónoma de Querétaro (UAQ)', 'universidad', 'Querétaro', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(70, 'Universidad Autónoma de Tamaulipas (UAT)', 'universidad', 'Tamaulipas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(71, 'Universidad Autónoma de Durango (UAD)', 'universidad', 'Durango', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(72, 'Universidad Autónoma de Zacatecas (UAZ)', 'universidad', 'Zacatecas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(73, 'Universidad Iberoamericana (Ibero)', 'universidad', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(74, 'Universidad Panamericana (UP)', 'universidad', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(75, 'Universidad Anáhuac México', 'universidad', 'Estado de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(76, 'Universidad del Valle de México (UVM)', 'universidad', 'Nacional', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(77, 'Universidad de Monterrey (UDEM)', 'universidad', 'Nuevo León', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(78, 'Universidad Regiomontana (UR)', 'universidad', 'Nuevo León', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(79, 'Universidad La Salle México', 'universidad', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(80, 'Universidad CETYS', 'universidad', 'Baja California', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(81, 'Universidad Politécnica de Guanajuato', 'universidad', 'Guanajuato', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(82, 'Universidad Politécnica de Querétaro', 'universidad', 'Querétaro', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(83, 'Universidad Politécnica de Aguascalientes', 'universidad', 'Aguascalientes', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(84, 'Universidad Politécnica de Chiapas', 'universidad', 'Chiapas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(85, 'Universidad Politécnica de Sinaloa', 'universidad', 'Sinaloa', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(86, 'Universidad Politécnica de Pachuca', 'universidad', 'Hidalgo', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(87, 'Universidad Politécnica del Valle de México', 'universidad', 'Estado de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(88, 'Universidad Politécnica de Puebla', 'universidad', 'Puebla', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(89, 'Universidad Politécnica de Tlaxcala', 'universidad', 'Tlaxcala', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(90, 'Universidad Politécnica de Zacatecas', 'universidad', 'Zacatecas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(91, 'Universidad Politécnica de San Luis Potosí', 'universidad', 'San Luis Potosí', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(92, 'Universidad Politécnica de Altamira', 'universidad', 'Tamaulipas', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(93, 'Universidad Politécnica de Jalisco', 'universidad', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(94, 'Universidad Tecnológica de Guadalajara', 'universidad', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(95, 'Universidad Tecnológica de Puebla', 'universidad', 'Puebla', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(96, 'Universidad Tecnológica de Querétaro', 'universidad', 'Querétaro', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(97, 'Universidad Tecnológica de Aguascalientes', 'universidad', 'Aguascalientes', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(98, 'Universidad Tecnológica de Cancún', 'universidad', 'Quintana Roo', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(99, 'Universidad Tecnológica de Tabasco', 'universidad', 'Tabasco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(100, 'Universidad Tecnológica de Tula-Tepeji', 'universidad', 'Hidalgo', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(101, 'Universidad Tecnológica de Ciudad Juárez', 'universidad', 'Chihuahua', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(102, 'Universidad Tecnológica de Chihuahua', 'universidad', 'Chihuahua', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(103, 'Universidad Tecnológica de Nayarit', 'universidad', 'Nayarit', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(104, 'Universidad Tecnológica de Coahuila', 'universidad', 'Coahuila', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(105, 'Universidad Tecnológica de Durango', 'universidad', 'Durango', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(106, 'Universidad Tecnológica de Jalisco', 'universidad', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(107, 'Preparatoria Federal Lázaro Cárdenas (Uruapan)', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(108, 'Preparatoria UMSNH', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(109, 'CONALEP Uruapan', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(110, 'CONALEP Morelia', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(111, 'CONALEP Zamora', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(112, 'CBTIS 82 Uruapan', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(113, 'CBTIS 43 Morelia', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(114, 'CBTIS 146 Zamora', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(115, 'CBTIS 68 Lázaro Cárdenas', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(116, 'CECYTE Michoacán', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(117, 'Colegio de Bachilleres del Estado de Michoacán (COBAEM)', 'preparatoria', 'Michoacán', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(118, 'CCH-UNAM (Colegio de Ciencias y Humanidades)', 'preparatoria', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(119, 'ENP-UNAM (Escuela Nacional Preparatoria)', 'preparatoria', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(120, 'Prepa Tec (ITESM)', 'preparatoria', 'Nacional', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(121, 'Bachillerato UdeG (SEMS)', 'preparatoria', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(122, 'Preparatoria UANL', 'preparatoria', 'Nuevo León', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(123, 'CONALEP Monterrey', 'preparatoria', 'Nuevo León', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(124, 'CONALEP Guadalajara', 'preparatoria', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(125, 'CECYTE Guanajuato', 'preparatoria', 'Guanajuato', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(126, 'CECYTE Jalisco', 'preparatoria', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(127, 'CECYTE Guerrero', 'preparatoria', 'Guerrero', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(128, 'Colegio de Bachilleres del Estado de Jalisco (COBAEJ)', 'preparatoria', 'Jalisco', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(129, 'Colegio de Bachilleres del Estado de Oaxaca (COBAO)', 'preparatoria', 'Oaxaca', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(130, 'Colegio de Bachilleres del Estado de Veracruz (COBAEV)', 'preparatoria', 'Veracruz', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(131, 'Colegio de Bachilleres del Estado de México', 'preparatoria', 'Estado de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(132, 'TELEBACHILLERATO', 'preparatoria', 'Nacional', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(133, 'CETIS 1 Ciudad de México', 'preparatoria', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(134, 'CETIS 7 Ciudad de México', 'preparatoria', 'Ciudad de México', 'México', 1, 0, NULL, '2026-05-08 02:29:09', '2026-05-08 02:29:09'),
(135, 'Universidad Contemporánea de las Américas', 'universidad', 'Michoacán', 'México', 1, 1, NULL, '2026-05-09 03:00:10', '2026-05-09 03:00:10'),
(137, 'Universidade Federal de Santa Catarina (UFSC)', 'universidad', 'Santa Catarina', 'Brasil', 1, 1, NULL, '2026-05-09 03:20:04', '2026-05-09 03:20:04');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ip_rate_limits`
--

CREATE TABLE `ip_rate_limits` (
  `ip_address` varchar(45) NOT NULL,
  `attempts` int(11) DEFAULT 0,
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  `blocked_until` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ip_rate_limits`
--

INSERT INTO `ip_rate_limits` (`ip_address`, `attempts`, `last_attempt_at`, `blocked_until`) VALUES
('2806:266:1403:17e0:5885:bf1c:b948:deea', 0, '2026-05-21 03:07:46', NULL),
('2806:266:1403:17e0:59ac:3125:db44:31a6', 0, '2026-05-23 21:29:44', NULL),
('2806:266:1403:17e0:8827:cc23:8d34:f6f5', 0, '2026-05-23 15:44:42', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `legal_acceptance`
--

CREATE TABLE `legal_acceptance` (
  `id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `accepted_liability` tinyint(1) DEFAULT 0,
  `accepted_terms` tinyint(1) DEFAULT 0,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `participant_checkins`
--

CREATE TABLE `participant_checkins` (
  `id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `checkin_at` timestamp NULL DEFAULT current_timestamp(),
  `checked_in_by` varchar(150) DEFAULT 'ADMIN',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `participant_robot_checkins`
--

CREATE TABLE `participant_robot_checkins` (
  `id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `robot_id` int(11) NOT NULL,
  `arrived` tinyint(1) NOT NULL DEFAULT 0,
  `checkin_at` timestamp NULL DEFAULT current_timestamp(),
  `checked_in_by` varchar(150) DEFAULT 'ADMIN',
  `notes` text DEFAULT NULL,
  `category_snapshot` varchar(120) DEFAULT NULL,
  `robot_name_snapshot` varchar(180) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `payment_receipts`
--

CREATE TABLE `payment_receipts` (
  `id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `total_amount` int(11) NOT NULL,
  `number_of_robots` int(11) NOT NULL,
  `approved_robots_count` int(11) DEFAULT NULL,
  `price_per_robot` int(11) NOT NULL,
  `receipt_filename` varchar(255) DEFAULT NULL,
  `receipt_path` varchar(500) DEFAULT NULL,
  `receipt_size` int(11) DEFAULT NULL,
  `upload_date` timestamp NULL DEFAULT current_timestamp(),
  `verification_date` timestamp NULL DEFAULT NULL,
  `verified_by` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `platform_users`
--

CREATE TABLE `platform_users` (
  `id` int(11) NOT NULL,
  `email` varchar(180) NOT NULL,
  `username` varchar(60) NOT NULL,
  `full_name` varchar(180) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `control_number` varchar(60) DEFAULT NULL,
  `career` varchar(150) DEFAULT NULL,
  `semester` varchar(40) DEFAULT NULL,
  `career_semester` varchar(120) DEFAULT NULL,
  `country` varchar(120) NOT NULL,
  `city` varchar(120) NOT NULL,
  `school` varchar(220) NOT NULL,
  `matricula` varchar(60) DEFAULT NULL,
  `role` enum('alumno','tallerista','admin') NOT NULL DEFAULT 'alumno',
  `password_hash` varchar(255) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verification_code` varchar(12) DEFAULT NULL,
  `email_verification_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login_at` timestamp NULL DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `last_failed_login_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `platform_users`
--

INSERT INTO `platform_users` (`id`, `email`, `username`, `full_name`, `phone`, `control_number`, `career`, `semester`, `career_semester`, `country`, `city`, `school`, `matricula`, `role`, `password_hash`, `email_verified`, `email_verification_code`, `email_verification_expires_at`, `is_active`, `created_at`, `updated_at`, `last_login_at`, `failed_login_attempts`, `last_failed_login_at`) VALUES
(1, 'juanchitooelmejor@gmail.com', '21040130', 'Juan Carlos Gonzalez O.', '4521123947', '21040130', 'Ingeniera en Sistemas', '10', 'Ingeniera en Sistemas - 10', 'Mexico', 'Uruapan', 'Instituto Tecnológico superior de Uruapan', '21040130', 'alumno', '$2y$10$zHAolgqJrBVcp1CR1nWV/eX7SwJXAnSvZTtWlf837VG5apTzY7TeW', 1, NULL, NULL, 1, '2026-05-08 02:01:32', '2026-05-23 23:39:23', '2026-05-23 23:39:23', 0, NULL),
(2, 'gooj030829@itsuruapan.edu.mx', 'Osvaldo', 'Ing. Osvaldo Gonzalez', '4521123947', 'Osvaldo', NULL, NULL, NULL, 'México', 'Uruapan', 'Instructor', 'Osvaldo', 'tallerista', '$2y$10$h.zrpS0becMAyDa3rN5WoOI1Dbv75.VOffA4JmjWZtsaGF1cybIpG', 1, NULL, NULL, 1, '2026-05-11 05:19:11', '2026-05-11 05:42:16', NULL, 1, '2026-05-11 05:42:16'),
(3, 'chamajca@hotmail.com', '11040066', 'JOSE GUADALUPE CAMACHO AVILA', '+524521271904', '11040066', 'Electrónica', '12', 'Electrónica - 12', 'México', 'URUAPAN', 'ITSU', '11040066', 'alumno', '$2y$10$lq76aB9fNo2qf8WDUxAX8uxhVIlRpfn4QMSE4Pa0a.LD4luDwP53i', 1, NULL, NULL, 1, '2026-05-11 21:20:15', '2026-05-11 21:36:14', '2026-05-11 21:21:58', 0, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registration_stages`
--

CREATE TABLE `registration_stages` (
  `id` int(11) NOT NULL,
  `stage_name` varchar(100) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `price_per_robot` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `color_code` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `registration_stages`
--

INSERT INTO `registration_stages` (`id`, `stage_name`, `start_date`, `end_date`, `price_per_robot`, `description`, `is_active`, `color_code`) VALUES
(1, 'Etapa 1', '2026-04-01 00:00:00', '2026-06-30 23:59:59', 130, 'Primera etapa: Promocion temprana', 1, '#28a745'),
(2, 'Etapa 2', '2026-07-01 00:00:00', '2026-08-31 23:59:59', 200, 'Segunda etapa: Registro regular', 1, '#007bff'),
(3, 'Etapa 3', '2026-09-01 00:00:00', '2026-10-23 23:59:59', 350, 'Tercera etapa: Ultima oportunidad', 1, '#fd7e14');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `robots`
--

CREATE TABLE `robots` (
  `id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `robot_number` int(11) DEFAULT NULL,
  `robot_name` varchar(150) NOT NULL,
  `category` varchar(100) NOT NULL,
  `registration_stage` int(11) DEFAULT NULL,
  `robot_price` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `site_config`
--

CREATE TABLE `site_config` (
  `config_key` varchar(120) NOT NULL,
  `config_value` longtext DEFAULT NULL COMMENT 'Texto plano, HTML o JSON',
  `config_type` enum('text','html','json','image_url') NOT NULL DEFAULT 'text',
  `label` varchar(200) DEFAULT NULL COMMENT 'Etiqueta legible para el admin',
  `section` varchar(80) DEFAULT 'general' COMMENT 'Sección: hero, landing, seo',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración dinámica de la página pública (landing)';

--
-- Volcado de datos para la tabla `site_config`
--

INSERT INTO `site_config` (`config_key`, `config_value`, `config_type`, `label`, `section`, `updated_at`) VALUES
('brand_logo_url', 'assets/images/tec.png', 'image_url', 'Logo del header', 'general', '2026-05-16 18:40:57'),
('brand_name', 'RENOVATEC 2026', 'text', 'Nombre de la marca / header', 'general', '2026-05-16 18:40:57'),
('feature_band', '[{\"icon\":\"fas fa-calendar-check\",\"title\":\"3 Convocatorias\",\"desc\":\"Congreso, Torneo de Robótica y Campamento en un solo evento.\"},{\"icon\":\"fas fa-clock\",\"title\":\"Precios por etapa\",\"desc\":\"Registra tus robots temprano para conseguir la mejor tarifa.\"},{\"icon\":\"fas fa-file-pdf\",\"title\":\"Reglamentos y guías\",\"desc\":\"Consulta nuestros documentos oficiales y prepara tu robot.\"},{\"icon\":\"fas fa-wand-magic-sparkles\",\"title\":\"Trámite en línea\",\"desc\":\"Crea una cuenta, elige tu paquete y sube tu comprobante de pago.\"}]', 'json', 'Band de características (JSON)', 'landing', '2026-05-16 18:40:57'),
('hero_badge_text', 'RENOVATEC 2026', 'text', 'Hero — badge sobre la imagen', 'hero', '2026-05-16 18:40:57'),
('hero_description', '<p>Descubre todo lo que incluye el evento: <b>Congreso (Talleres y Conferencias), Torneo de Robótica y Campamento.</b> Regístrate e inicia tu trámite en línea.</p>', 'html', 'Hero — descripción (rich text)', 'hero', '2026-05-16 18:40:57'),
('hero_event_name', 'RENOVATEC 2026', 'text', 'Hero — nombre del evento (badge)', 'hero', '2026-05-16 18:40:57'),
('hero_image_alt', 'Robot RENOVATEC', 'text', 'Hero — texto alternativo imagen', 'hero', '2026-05-16 18:40:57'),
('hero_image_url', 'assets/images/robot-clean-v2.png', 'image_url', 'Hero — imagen del robot/mascota', 'hero', '2026-05-16 18:40:57'),
('hero_kicker', 'Vive la experiencia', 'text', 'Hero — etiqueta superior', 'hero', '2026-05-16 18:40:57'),
('hero_note', 'El proceso de inscripción a cualquier convocatoria se hace desde tu cuenta en la plataforma, <b>Inicia o Crea una cuenta.</b>', 'html', 'Hero — nota al pie de botones', 'hero', '2026-05-16 18:40:57'),
('hero_pills', '[{\"icon\":\"fa-solid fa-suitcase\",\"label\":\"Congreso\"},{\"icon\":\"fas fa-robot\",\"label\":\"Robótica\"},{\"icon\":\"fas fa-campground\",\"label\":\"Campamento\"}]', 'json', 'Hero — pills del card visual (JSON)', 'hero', '2026-05-16 18:40:57'),
('hero_stats', '[{\"icon\":\"fa-solid fa-suitcase\",\"label\":\"Congreso completo<br>(Talleres y Conferencias)\",\"price\":\"$400 MXN\"},{\"icon\":\"fas fa-robot\",\"label\":\"Torneo de Robótica desde\",\"price\":\"$130 MXN c/u\"},{\"icon\":\"fas fa-campground\",\"label\":\"Campamento\",\"price\":\"$200 MXN\"}]', 'json', 'Hero — estadísticas de precio (JSON)', 'hero', '2026-05-16 18:40:57'),
('hero_title', 'Congreso Internacional de Ingeniería Electrónica 2026', 'text', 'Hero — título principal (H1)', 'hero', '2026-05-16 18:40:57'),
('seo_description', 'Congreso, Torneo de Robótica y Campamento en un solo evento. Regístrate en línea.', 'text', 'SEO — meta description', 'seo', '2026-05-16 18:40:57'),
('seo_title', 'RENOVATEC 2026 — Congreso Internacional de Ingeniería Electrónica', 'text', 'SEO — título de la página (<title>)', 'seo', '2026-05-16 18:40:57');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `stage_statistics`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `stage_statistics` (
`id` int(11)
,`stage_name` varchar(100)
,`total_teams` bigint(21)
,`verified_payments` decimal(22,0)
,`total_robots` bigint(21)
,`total_revenue` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `description` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `system_settings`
--

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES
('camp_guide_pdf', NULL, 'Ruta del archivo PDF de la guía del campamento', '2026-05-14 03:14:17'),
('event_name', 'RENOVATEC 2026', NULL, '2026-05-17 02:41:09'),
('general_schedule_pdf', NULL, 'Ruta del archivo PDF del cronograma general', '2026-05-14 03:14:17'),
('landing_contact_email', 'renovatec507@gmail.com', NULL, '2026-05-17 19:11:14'),
('landing_contact_phone', '4521790952', NULL, '2026-05-17 19:11:14'),
('landing_event_date', '2026-10-14 09:00:00', NULL, '2026-05-21 05:25:02'),
('landing_event_end_date', '2026-10-16 18:30:00', NULL, '2026-05-21 05:25:02'),
('landing_feature_band', '[{\"icon\":\"fas fa-bullhorn\",\"title\":\"4 Convocatorias\",\"desc\":\"Este evento incluye Congreso(Talleres y Conferencias) todo incluido, Torneo de Robótica, Torneo de Futbol y Campamento en un solo evento.\"},{\"icon\":\"fas fa-file-alt\",\"title\":\"Precios por etapa\",\"desc\":\"Registra tus robots temprano para conseguir la mejor tarifa.\"},{\"icon\":\"fas fa-file-pdf\",\"title\":\"Reglamentos y guias\",\"desc\":\"Consulta nuestros documentos oficiales y prepara tu robot.\"},{\"icon\":\"fas fa-desktop\",\"title\":\"Tramite en linea\",\"desc\":\"Creas una cuenta, eliges y armas tu paquete y por ultimo sube tu comprobante de pago.\"}]', 'Tarjetas de características de la Landing Page', '2026-05-21 05:47:51'),
('landing_hero_lead', 'Inicia tu experiencia en este mundo de la Electrónica, con las diversas actividades, (Talleres, conferencias, Torneos y actividades de campamento)', NULL, '2026-05-16 23:04:09'),
('landing_hero_pills', 'Congreso, Talleres, Conferencias, Deportes, Campamento', NULL, '2026-05-16 23:04:53'),
('landing_hero_title', 'Congreso Internacional de Electrónica', NULL, '2026-05-16 23:02:05'),
('landing_location', 'Instituto Tecnológico Superior de Uruapan', NULL, '2026-05-17 19:11:14');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `teams`
--

CREATE TABLE `teams` (
  `id` int(11) NOT NULL,
  `folio` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `country_origin` enum('mexico','exterior') DEFAULT 'mexico',
  `state_id` varchar(50) DEFAULT NULL,
  `state_name` varchar(100) DEFAULT NULL,
  `country_name` varchar(100) DEFAULT NULL,
  `institution_type` enum('preparatoria','universidad') DEFAULT 'preparatoria',
  `school_name` varchar(200) NOT NULL,
  `captain_name` varchar(150) NOT NULL,
  `captain_email` varchar(100) NOT NULL,
  `captain_phone` varchar(20) NOT NULL,
  `registration_stage` int(11) DEFAULT 1,
  `registration_price` int(11) DEFAULT NULL,
  `payment_status` enum('pending','verified','rejected') DEFAULT 'pending',
  `qr_code` longblob DEFAULT NULL,
  `qr_code_hash` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `team_members`
--

CREATE TABLE `team_members` (
  `id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `member_number` int(11) DEFAULT NULL,
  `member_name` varchar(150) NOT NULL,
  `is_captain` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `team_summary`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `team_summary` (
`id` int(11)
,`folio` varchar(50)
,`captain_name` varchar(150)
,`captain_email` varchar(100)
,`school_name` varchar(200)
,`total_members` bigint(21)
,`total_robots` bigint(21)
,`total_cost` decimal(32,0)
,`registration_stage_name` varchar(100)
,`payment_status` enum('pending','verified','rejected')
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_workshops_with_conv`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_workshops_with_conv` (
`id` int(11)
,`name` varchar(200)
,`status` enum('draft','published','full','cancelled','completed')
,`schedule_date` date
,`convocatoria_id` int(11)
,`convocatoria_titulo` varchar(150)
,`convocatoria_codigo` varchar(50)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `workshops`
--

CREATE TABLE `workshops` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(300) NOT NULL COMMENT 'Salón, aula o lugar externo',
  `location_type` enum('internal','external') DEFAULT 'internal' COMMENT 'internal=campus, external=fuera',
  `max_capacity` int(11) NOT NULL DEFAULT 30,
  `instructor_id` int(11) DEFAULT NULL,
  `convocatoria_id` int(11) DEFAULT NULL COMMENT 'NULL = asociado al Congreso por defecto; referencia a convocatorias.id',
  `schedule_date` date DEFAULT NULL COMMENT 'Fecha del taller',
  `schedule_start` time DEFAULT NULL COMMENT 'Hora inicio',
  `schedule_end` time DEFAULT NULL COMMENT 'Hora fin',
  `status` enum('draft','published','full','cancelled','completed') DEFAULT 'draft',
  `topics` text DEFAULT NULL COMMENT 'JSON array de temas',
  `materials` text DEFAULT NULL COMMENT 'JSON array de materiales requeridos',
  `requirements` text DEFAULT NULL COMMENT 'Requisitos para el alumno',
  `cover_image_url` varchar(500) DEFAULT NULL,
  `created_by_admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `building` varchar(100) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `schedule_date_end` date DEFAULT NULL,
  `is_multi_day` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `workshops`
--

INSERT INTO `workshops` (`id`, `name`, `description`, `location`, `location_type`, `max_capacity`, `instructor_id`, `convocatoria_id`, `schedule_date`, `schedule_start`, `schedule_end`, `status`, `topics`, `materials`, `requirements`, `cover_image_url`, `created_by_admin_id`, `created_at`, `updated_at`, `building`, `room`, `schedule_date_end`, `is_multi_day`) VALUES
(1, 'Introducción a Arduino y Automatización Básica', 'Emprende tu mente he inicia en el mundo de la domótica', 'Edificio D, D2', 'internal', 30, 1, NULL, '2026-05-25', '07:00:00', '13:00:00', 'published', '[\"C++\",\"Motores\",\"Arduino\"]', '[]', 'Laptop', NULL, NULL, '2026-05-23 15:48:20', '2026-05-23 15:48:26', 'Edificio D', 'D2', '2026-05-28', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `workshop_attendance_sessions`
--

CREATE TABLE `workshop_attendance_sessions` (
  `id` int(11) NOT NULL,
  `workshop_id` int(11) NOT NULL,
  `session_date` date NOT NULL,
  `opened_by_instructor_id` int(11) DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT current_timestamp(),
  `closed_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `workshop_days`
--

CREATE TABLE `workshop_days` (
  `id` int(11) NOT NULL,
  `workshop_id` int(11) NOT NULL,
  `day_number` int(11) NOT NULL DEFAULT 1,
  `date` date DEFAULT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `workshop_enrollments`
--

CREATE TABLE `workshop_enrollments` (
  `id` int(11) NOT NULL,
  `workshop_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'platform_users.id',
  `enrolled_at` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('enrolled','cancelled','attended','no_show') DEFAULT 'enrolled',
  `attendance_marked_at` timestamp NULL DEFAULT NULL,
  `attendance_marked_by` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `workshop_images`
--

CREATE TABLE `workshop_images` (
  `id` int(11) NOT NULL,
  `workshop_id` int(11) NOT NULL,
  `filename` varchar(300) NOT NULL,
  `url` varchar(500) NOT NULL,
  `image_type` enum('gallery','map') DEFAULT 'gallery',
  `is_cover` tinyint(1) DEFAULT 0,
  `caption` varchar(300) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `workshop_images`
--

INSERT INTO `workshop_images` (`id`, `workshop_id`, `filename`, `url`, `image_type`, `is_cover`, `caption`, `uploaded_at`) VALUES
(1, 1, 'ws_1_1779551301_64979362.png', '/app/uploads/workshops/ws_1_1779551301_64979362.png', 'gallery', 1, '', '2026-05-23 15:48:21');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `workshop_instructors`
--

CREATE TABLE `workshop_instructors` (
  `id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `specialty` varchar(200) DEFAULT NULL,
  `role_type` enum('instructor','speaker') DEFAULT 'instructor',
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by_admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `workshop_instructors`
--

INSERT INTO `workshop_instructors` (`id`, `full_name`, `email`, `phone`, `bio`, `specialty`, `role_type`, `username`, `password_hash`, `is_active`, `created_by_admin_id`, `created_at`, `updated_at`, `last_login_at`) VALUES
(1, 'Ing. Osvaldo Gonzalez', 'gooj030829@itsuruapan.edu.mx', '4521123947', 'Ingeniero Electrónico especializado en Arduino', 'Electrónica', 'instructor', 'Osvaldo', '$2y$10$h.zrpS0becMAyDa3rN5WoOI1Dbv75.VOffA4JmjWZtsaGF1cybIpG', 1, NULL, '2026-05-10 04:41:55', '2026-05-11 05:50:36', '2026-05-11 05:50:36');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_admin_active` (`is_active`),
  ADD KEY `idx_admin_role` (`role`);

--
-- Indices de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_date` (`created_at`);

--
-- Indices de la tabla `camp_registrations`
--
ALTER TABLE `camp_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_camp_user` (`user_id`),
  ADD KEY `congress_registration_id` (`congress_registration_id`),
  ADD KEY `idx_camp_status` (`status`);

--
-- Indices de la tabla `career_catalog`
--
ALTER TABLE `career_catalog`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_career_name` (`name`),
  ADD KEY `idx_career_verified` (`is_verified`),
  ADD KEY `fk_career_proposed_by` (`proposed_by`);

--
-- Indices de la tabla `competition_categories`
--
ALTER TABLE `competition_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_code` (`category_code`);

--
-- Indices de la tabla `conferences`
--
ALTER TABLE `conferences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conf_date` (`conference_date`),
  ADD KEY `idx_conf_status` (`status`);

--
-- Indices de la tabla `conference_images`
--
ALTER TABLE `conference_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ci_conf` (`conference_id`);

--
-- Indices de la tabla `congress_enrollment_requests`
--
ALTER TABLE `congress_enrollment_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_request_folio` (`request_folio`),
  ADD KEY `idx_cer_user` (`user_id`),
  ADD KEY `idx_cer_status` (`status`),
  ADD KEY `idx_cer_year` (`congress_year`);

--
-- Indices de la tabla `congress_registrations`
--
ALTER TABLE `congress_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_year` (`user_id`,`congress_year`),
  ADD UNIQUE KEY `folio_inscripcion` (`folio_inscripcion`),
  ADD KEY `idx_congress_status` (`payment_status`);

--
-- Indices de la tabla `convocatorias`
--
ALTER TABLE `convocatorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `convocatoria_images`
--
ALTER TABLE `convocatoria_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conv_img` (`convocatoria_id`);

--
-- Indices de la tabla `convocatoria_modules`
--
ALTER TABLE `convocatoria_modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cm_conv` (`convocatoria_id`),
  ADD KEY `idx_cm_type` (`module_type`),
  ADD KEY `idx_cm_status` (`status`);

--
-- Indices de la tabla `institution_catalog`
--
ALTER TABLE `institution_catalog`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_institution_name` (`name`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_is_verified` (`is_verified`),
  ADD KEY `idx_times_used` (`times_used`),
  ADD KEY `fk_institution_proposed_by` (`proposed_by`);

--
-- Indices de la tabla `ip_rate_limits`
--
ALTER TABLE `ip_rate_limits`
  ADD PRIMARY KEY (`ip_address`);

--
-- Indices de la tabla `legal_acceptance`
--
ALTER TABLE `legal_acceptance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_liability_team` (`team_id`);

--
-- Indices de la tabla `participant_checkins`
--
ALTER TABLE `participant_checkins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_team_checkin` (`team_id`);

--
-- Indices de la tabla `participant_robot_checkins`
--
ALTER TABLE `participant_robot_checkins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_robot_checkin` (`robot_id`),
  ADD KEY `idx_robot_team` (`team_id`);

--
-- Indices de la tabla `payment_receipts`
--
ALTER TABLE `payment_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_team_receipt` (`team_id`);

--
-- Indices de la tabla `platform_users`
--
ALTER TABLE `platform_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `uq_platform_control_number` (`control_number`),
  ADD KEY `idx_platform_role` (`role`),
  ADD KEY `idx_platform_active` (`is_active`),
  ADD KEY `idx_platform_verified` (`email_verified`);

--
-- Indices de la tabla `registration_stages`
--
ALTER TABLE `registration_stages`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `robots`
--
ALTER TABLE `robots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_stage` (`registration_stage`),
  ADD KEY `idx_robots_team` (`team_id`);

--
-- Indices de la tabla `site_config`
--
ALTER TABLE `site_config`
  ADD PRIMARY KEY (`config_key`);

--
-- Indices de la tabla `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indices de la tabla `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `folio` (`folio`),
  ADD KEY `idx_folio` (`folio`),
  ADD KEY `idx_email` (`captain_email`),
  ADD KEY `idx_stage` (`registration_stage`),
  ADD KEY `idx_status` (`payment_status`),
  ADD KEY `idx_teams_date` (`created_at`);

--
-- Indices de la tabla `team_members`
--
ALTER TABLE `team_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_member` (`team_id`,`member_number`),
  ADD KEY `idx_members_team` (`team_id`);

--
-- Indices de la tabla `workshops`
--
ALTER TABLE `workshops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workshop_status` (`status`),
  ADD KEY `idx_workshop_instructor` (`instructor_id`),
  ADD KEY `idx_workshop_date` (`schedule_date`);

--
-- Indices de la tabla `workshop_attendance_sessions`
--
ALTER TABLE `workshop_attendance_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `opened_by_instructor_id` (`opened_by_instructor_id`),
  ADD KEY `idx_was_workshop` (`workshop_id`),
  ADD KEY `idx_was_date` (`session_date`);

--
-- Indices de la tabla `workshop_days`
--
ALTER TABLE `workshop_days`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_wd_workshop` (`workshop_id`);

--
-- Indices de la tabla `workshop_enrollments`
--
ALTER TABLE `workshop_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_workshop_user` (`workshop_id`,`user_id`),
  ADD KEY `idx_we_user` (`user_id`),
  ADD KEY `idx_we_status` (`status`);

--
-- Indices de la tabla `workshop_images`
--
ALTER TABLE `workshop_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_wi_workshop` (`workshop_id`);

--
-- Indices de la tabla `workshop_instructors`
--
ALTER TABLE `workshop_instructors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_instructor_active` (`is_active`),
  ADD KEY `idx_instructor_email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `camp_registrations`
--
ALTER TABLE `camp_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `career_catalog`
--
ALTER TABLE `career_catalog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT de la tabla `competition_categories`
--
ALTER TABLE `competition_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `conferences`
--
ALTER TABLE `conferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `conference_images`
--
ALTER TABLE `conference_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `congress_enrollment_requests`
--
ALTER TABLE `congress_enrollment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `congress_registrations`
--
ALTER TABLE `congress_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `convocatorias`
--
ALTER TABLE `convocatorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `convocatoria_images`
--
ALTER TABLE `convocatoria_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `convocatoria_modules`
--
ALTER TABLE `convocatoria_modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `institution_catalog`
--
ALTER TABLE `institution_catalog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=138;

--
-- AUTO_INCREMENT de la tabla `legal_acceptance`
--
ALTER TABLE `legal_acceptance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `participant_checkins`
--
ALTER TABLE `participant_checkins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `participant_robot_checkins`
--
ALTER TABLE `participant_robot_checkins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `payment_receipts`
--
ALTER TABLE `payment_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `platform_users`
--
ALTER TABLE `platform_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `robots`
--
ALTER TABLE `robots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `teams`
--
ALTER TABLE `teams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `team_members`
--
ALTER TABLE `team_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `workshops`
--
ALTER TABLE `workshops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `workshop_attendance_sessions`
--
ALTER TABLE `workshop_attendance_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `workshop_days`
--
ALTER TABLE `workshop_days`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `workshop_enrollments`
--
ALTER TABLE `workshop_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `workshop_images`
--
ALTER TABLE `workshop_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `workshop_instructors`
--
ALTER TABLE `workshop_instructors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

-- --------------------------------------------------------

--
-- Estructura para la vista `stage_statistics`
--
DROP TABLE IF EXISTS `stage_statistics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u160168264_Carlos`@`127.0.0.1` SQL SECURITY DEFINER VIEW `stage_statistics`  AS SELECT `rs`.`id` AS `id`, `rs`.`stage_name` AS `stage_name`, count(distinct `t`.`id`) AS `total_teams`, sum(case when `t`.`payment_status` = 'verified' then 1 else 0 end) AS `verified_payments`, count(distinct `r`.`id`) AS `total_robots`, sum(`r`.`robot_price`) AS `total_revenue` FROM ((`registration_stages` `rs` left join `teams` `t` on(`t`.`registration_stage` = `rs`.`id`)) left join `robots` `r` on(`t`.`id` = `r`.`team_id`)) GROUP BY `rs`.`id` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `team_summary`
--
DROP TABLE IF EXISTS `team_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u160168264_Carlos`@`127.0.0.1` SQL SECURITY DEFINER VIEW `team_summary`  AS SELECT `t`.`id` AS `id`, `t`.`folio` AS `folio`, `t`.`captain_name` AS `captain_name`, `t`.`captain_email` AS `captain_email`, `t`.`school_name` AS `school_name`, count(distinct `m`.`id`) AS `total_members`, count(distinct `r`.`id`) AS `total_robots`, sum(`r`.`robot_price`) AS `total_cost`, `rs`.`stage_name` AS `registration_stage_name`, `t`.`payment_status` AS `payment_status`, `t`.`created_at` AS `created_at` FROM (((`teams` `t` left join `team_members` `m` on(`t`.`id` = `m`.`team_id`)) left join `robots` `r` on(`t`.`id` = `r`.`team_id`)) left join `registration_stages` `rs` on(`t`.`registration_stage` = `rs`.`id`)) GROUP BY `t`.`id` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_workshops_with_conv`
--
DROP TABLE IF EXISTS `v_workshops_with_conv`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u160168264_Carlos`@`127.0.0.1` SQL SECURITY DEFINER VIEW `v_workshops_with_conv`  AS SELECT `w`.`id` AS `id`, `w`.`name` AS `name`, `w`.`status` AS `status`, `w`.`schedule_date` AS `schedule_date`, `w`.`convocatoria_id` AS `convocatoria_id`, coalesce(`c`.`titulo`,'Congreso (por defecto)') AS `convocatoria_titulo`, coalesce(`c`.`codigo`,'congreso') AS `convocatoria_codigo` FROM (`workshops` `w` left join `convocatorias` `c` on(`c`.`id` = `w`.`convocatoria_id`)) ;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `camp_registrations`
--
ALTER TABLE `camp_registrations`
  ADD CONSTRAINT `camp_registrations_ibfk_1` FOREIGN KEY (`congress_registration_id`) REFERENCES `congress_registrations` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `career_catalog`
--
ALTER TABLE `career_catalog`
  ADD CONSTRAINT `fk_career_proposed_by` FOREIGN KEY (`proposed_by`) REFERENCES `platform_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `conference_images`
--
ALTER TABLE `conference_images`
  ADD CONSTRAINT `conference_images_ibfk_1` FOREIGN KEY (`conference_id`) REFERENCES `conferences` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `congress_enrollment_requests`
--
ALTER TABLE `congress_enrollment_requests`
  ADD CONSTRAINT `fk_cer_user` FOREIGN KEY (`user_id`) REFERENCES `platform_users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `congress_registrations`
--
ALTER TABLE `congress_registrations`
  ADD CONSTRAINT `fk_congress_user` FOREIGN KEY (`user_id`) REFERENCES `platform_users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `convocatoria_images`
--
ALTER TABLE `convocatoria_images`
  ADD CONSTRAINT `fk_conv_img_convocatoria` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `convocatoria_modules`
--
ALTER TABLE `convocatoria_modules`
  ADD CONSTRAINT `fk_cm_convocatoria` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `institution_catalog`
--
ALTER TABLE `institution_catalog`
  ADD CONSTRAINT `fk_institution_proposed_by` FOREIGN KEY (`proposed_by`) REFERENCES `platform_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `legal_acceptance`
--
ALTER TABLE `legal_acceptance`
  ADD CONSTRAINT `legal_acceptance_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `participant_checkins`
--
ALTER TABLE `participant_checkins`
  ADD CONSTRAINT `participant_checkins_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `participant_robot_checkins`
--
ALTER TABLE `participant_robot_checkins`
  ADD CONSTRAINT `participant_robot_checkins_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `participant_robot_checkins_ibfk_2` FOREIGN KEY (`robot_id`) REFERENCES `robots` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `payment_receipts`
--
ALTER TABLE `payment_receipts`
  ADD CONSTRAINT `payment_receipts_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `robots`
--
ALTER TABLE `robots`
  ADD CONSTRAINT `robots_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `team_members`
--
ALTER TABLE `team_members`
  ADD CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `workshops`
--
ALTER TABLE `workshops`
  ADD CONSTRAINT `workshops_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `workshop_instructors` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `workshop_attendance_sessions`
--
ALTER TABLE `workshop_attendance_sessions`
  ADD CONSTRAINT `workshop_attendance_sessions_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `workshop_attendance_sessions_ibfk_2` FOREIGN KEY (`opened_by_instructor_id`) REFERENCES `workshop_instructors` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `workshop_days`
--
ALTER TABLE `workshop_days`
  ADD CONSTRAINT `workshop_days_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `workshop_enrollments`
--
ALTER TABLE `workshop_enrollments`
  ADD CONSTRAINT `workshop_enrollments_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `workshop_images`
--
ALTER TABLE `workshop_images`
  ADD CONSTRAINT `workshop_images_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
