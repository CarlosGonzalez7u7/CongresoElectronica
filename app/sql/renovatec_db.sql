-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 04-05-2026 a las 16:29:54
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
  `last_login_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`, `last_login_at`) VALUES
(1, 'admin', 'Administrador General', 'admin@renovatec.local', '$2y$10$1T5DEqAAkr4KxOlgA/qIUebRJSEan3cszoSb85EEPC4CORl9JsU.m', 'superadmin', 1, '2026-03-31 04:06:13', '2026-05-04 16:24:41', '2026-05-04 16:24:41');

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

--
-- Volcado de datos para la tabla `audit_log`
--

INSERT INTO `audit_log` (`id`, `action`, `table_name`, `record_id`, `user_id`, `ip_address`, `changes`, `created_at`) VALUES
(1, 'CONGRESS_RESUBMIT_REQUESTED', 'congress_enrollment_requests', 3, NULL, '2806:266:1403:17e0:d553:ec53:96c4:ff0b', '{\"notes\":\"El comprobante no es visible\"}', '2026-05-03 18:04:09'),
(2, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 3, NULL, '2806:266:1403:17e0:d553:ec53:96c4:ff0b', '{\"notes\":\"Bienvenido!!\"}', '2026-05-03 18:06:34');

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
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `competition_categories`
--

INSERT INTO `competition_categories` (`id`, `category_code`, `category_name`, `description`, `max_weight`, `difficulty_level`, `is_active`, `created_at`) VALUES
(1, 'guerra-1lb', 'Guerra 1lb', 'Robots de combate de 1 libra de peso', '1 lb', 3, 1, '2026-03-31 02:54:18'),
(2, 'mini-sumo-rc', 'Mini sumo RC', 'Robots de control remoto luchando en un ring', '500 g', 3, 1, '2026-03-31 02:54:18'),
(3, 'robot-insecto', 'Robot insecto', 'Robots tipo insecto con desplazamiento especializado', 'Variable', 4, 1, '2026-03-31 02:54:18'),
(4, 'seguidor-linea', 'Seguidor de Línea', 'Robots que siguen un camino marcado a velocidad máxima', 'Variable', 2, 1, '2026-03-31 02:54:18'),
(5, 'sumo-autonomo', 'Sumó Autónomo', 'Robots que luchan automáticamente sin control remoto', '3 kg', 4, 1, '2026-03-31 02:54:18'),
(6, 'construccion', 'Construcción', 'Categoría de construcción y diseño', 'Variable', 3, 1, '2026-03-31 02:54:18'),
(7, 'programacion', 'Programación', 'Categoría de reto de programación', 'Variable', 5, 1, '2026-03-31 02:54:18'),
(16, 'robot-guerra-1lb', 'Robot de guerra 1 lb', 'Robots de combate de 1 libra de peso', '1 lb', 3, 1, '2026-04-23 00:05:37'),
(17, 'robot-guerra-3lb', 'Robot de guerra 3 lb', 'Robots de combate de 3 libras de peso', '3 lb', 4, 1, '2026-04-23 00:05:37'),
(18, 'seguidor-linea-profesional', 'Seguidor de línea profesional', 'Competencia de seguimiento de línea nivel profesional', 'Variable', 4, 1, '2026-04-23 00:05:37'),
(19, 'seguidor-linea-amateur', 'Seguidor de línea amateur', 'Competencia de seguimiento de línea nivel amateur', 'Variable', 2, 1, '2026-04-23 00:05:37'),
(20, 'carros-rc', 'Carros RC', 'Vehículos de control remoto para pruebas de velocidad y maniobra', 'Variable', 2, 1, '2026-04-23 00:05:37'),
(21, 'soccer-rc', 'Soccer RC', 'Competencia tipo fútbol con robots de control remoto', 'Variable', 3, 1, '2026-04-23 00:05:37');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conferences`
--

CREATE TABLE `conferences` (
  `id` int(11) NOT NULL,
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

--
-- Volcado de datos para la tabla `conferences`
--

INSERT INTO `conferences` (`id`, `name`, `description`, `speaker_name`, `speaker_title`, `speaker_org`, `location`, `building`, `room`, `location_type`, `conference_date`, `time_start`, `time_end`, `capacity`, `is_public`, `tags`, `status`, `language`, `live_stream_url`, `created_at`, `updated_at`) VALUES
(1, 'El Impacto del Internet de las Cosas (IoT) en la Industria Agrícola', 'Una exploración de cómo los sensores electrónicos, la automatización y la interconectividad están revolucionando el campo. Se analizarán casos prácticos de monitoreo de cultivos, optimización de riego y el futuro del Agrotech en nuestra región.', 'Dra. Elena Valdés', 'Directora de Innovación Tecnológica', 'AgroTech Solutions México', 'Edificio C, Auditorio', 'Edificio C', 'Auditorio', 'internal', '2026-05-04', '09:00:00', '10:00:00', 100, 1, '[\"Internet de las Cosas (IoT)\",\"Agricultura Inteligente\",\"Sensores\"]', 'published', 'Español', 'https://www.youtube.com/live/itsuruapan-conferencia-iot-2026', '2026-05-02 04:14:52', '2026-05-02 04:14:52');

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

--
-- Volcado de datos para la tabla `congress_enrollment_requests`
--

INSERT INTO `congress_enrollment_requests` (`id`, `user_id`, `congress_year`, `request_folio`, `profile_snapshot_json`, `robots_snapshot_json`, `members_snapshot_json`, `includes_congress`, `includes_robotics`, `includes_camp`, `congress_fee`, `robotics_fee`, `camp_fee`, `total_fee`, `receipt_path`, `receipt_filename`, `receipt_uploaded_at`, `status`, `admin_notes`, `rejection_reason`, `reviewed_at`, `reviewed_by_admin_id`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
(3, 1, '2026', 'JCGP-21040130', '{\"full_name\":\"Juan Carlos Gaspar Pérez\",\"email\":\"juanchitooelmejor@gmail.com\",\"phone\":\"4521123947\",\"school\":\"Instituto Tecnológico superior de Uruapan\",\"control_number\":\"21040130\",\"career\":\"Ingeniera en Sistemas\",\"semester\":\"10\",\"country\":\"México\",\"city\":\"Uruapan\"}', '[{\"name\":\"Panchito\",\"category\":\"Mini sumo RC\"},{\"name\":\"Pro233\",\"category\":\"Seguidor de línea profesional\"}]', '[\"Osvaldo Gonzalez Orozco\"]', 1, 1, 0, 400.00, 260.00, 0.00, 660.00, '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_1_1777831559.pdf', 'congreso_1_1777831559.pdf', '2026-05-03 18:05:59', 'approved', 'Bienvenido!!', NULL, '2026-05-03 18:06:34', NULL, '2806:266:1403:17e0:d553:ec53:96c4:ff0b', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-27 21:37:13', '2026-05-03 18:06:34');

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

--
-- Volcado de datos para la tabla `congress_registrations`
--

INSERT INTO `congress_registrations` (`id`, `folio_inscripcion`, `user_id`, `congress_year`, `registration_fee`, `payment_status`, `country_snapshot`, `city_snapshot`, `school_snapshot`, `matricula_snapshot`, `comprobante_ruta`, `qr_code_hash`, `registered_at`, `updated_at`) VALUES
(1, NULL, 1, 2026, 660.00, 'paid', 'México', 'Uruapan', 'Instituto Tecnológico superior de Uruapan', '21040130', NULL, NULL, '2026-04-27 21:11:27', '2026-05-03 18:06:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inscripciones_taller`
--

CREATE TABLE `inscripciones_taller` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `taller_id` int(11) NOT NULL,
  `fecha_inscripcion` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `last_login_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `platform_users`
--

INSERT INTO `platform_users` (`id`, `email`, `username`, `full_name`, `phone`, `control_number`, `career`, `semester`, `career_semester`, `country`, `city`, `school`, `matricula`, `role`, `password_hash`, `email_verified`, `email_verification_code`, `email_verification_expires_at`, `is_active`, `created_at`, `updated_at`, `last_login_at`) VALUES
(1, 'juanchitooelmejor@gmail.com', '21040130', 'Juan Carlos Gonzalez O.', '4521123947', '21040130', 'Ingeniera en Sistemas', '10', 'Ingeniera en Sistemas - 10', 'México', 'Uruapan', 'Instituto Tecnológico superior de Uruapan', '21040130', 'alumno', '$2y$10$ODNOOyniIHXbPyJPk46bbu4sptvG53GLlIb03aW1cFobMhUsuP.a6', 1, NULL, NULL, 1, '2026-04-27 05:17:04', '2026-05-03 18:28:13', '2026-05-03 18:28:13');

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
(1, 'Etapa 1', '2024-04-01 00:00:00', '2024-06-30 23:59:59', 130, 'Primera etapa: Promoción temprana', 1, '#28a745'),
(2, 'Etapa 2', '2024-07-01 00:00:00', '2024-08-31 23:59:59', 200, 'Segunda etapa: Registro regular', 1, '#007bff'),
(3, 'Etapa 3', '2024-09-01 00:00:00', '2024-10-23 23:59:59', 350, 'Tercera etapa: Última oportunidad', 1, '#fd7e14');

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
-- Estructura de tabla para la tabla `talleres`
--

CREATE TABLE `talleres` (
  `id` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `lugar` varchar(150) NOT NULL,
  `cupo_maximo` int(11) NOT NULL DEFAULT 20,
  `descripcion` text DEFAULT NULL,
  `temario` text DEFAULT NULL,
  `materiales` text DEFAULT NULL,
  `imagenes_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`imagenes_json`)),
  `token_edicion` varchar(64) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

INSERT INTO `workshops` (`id`, `name`, `description`, `location`, `location_type`, `max_capacity`, `instructor_id`, `schedule_date`, `schedule_start`, `schedule_end`, `status`, `topics`, `materials`, `requirements`, `cover_image_url`, `created_by_admin_id`, `created_at`, `updated_at`, `building`, `room`, `schedule_date_end`, `is_multi_day`) VALUES
(1, 'Introducción a Arduino y Automatización Básica', 'Aprende los fundamentos de la programación de microcontroladores y el diseño de circuitos interactivos. En este taller desde cero, los alumnos conectarán sensores y actuadores para automatizar tareas sencillas, culminando con la creación de un pequeño proyecto funcional. Ideal para perderle el miedo al hardware.', 'Edificio D, D2', 'internal', 30, 1, '2026-05-04', '10:00:00', '12:00:00', 'published', '[\"\\u00bfQu\\u00e9 es un microcontrolador y la filosof\\u00eda de hardware libre?\",\"Entradas y salidas digitales (Control de LEDs y lectura de botones).\",\"Uso del protoboard y c\\u00e1lculo b\\u00e1sico de resistencias.\"]', '[\"Kit b\\u00e1sico de Arduino UNO (Placa, cable USB, protoboard, LEDs, cables jumper macho-macho, resistencias variadas).\"]', 'Laptop', NULL, NULL, '2026-05-02 03:47:38', '2026-05-02 04:10:41', 'Edificio D', 'D2', '2026-05-05', 0);

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

--
-- Volcado de datos para la tabla `workshop_enrollments`
--

INSERT INTO `workshop_enrollments` (`id`, `workshop_id`, `user_id`, `enrolled_at`, `status`, `attendance_marked_at`, `attendance_marked_by`, `notes`) VALUES
(1, 1, 1, '2026-05-03 18:07:05', 'enrolled', NULL, NULL, NULL);

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
(2, 1, 'ws_1_1777694573_1cce6947.png', '/uploads/workshops/ws_1_1777694573_1cce6947.png', 'gallery', 0, '', '2026-05-02 04:02:56'),
(3, 1, 'ws_1_1777695020_67cd6de6.png', '/app/uploads/workshops/ws_1_1777695020_67cd6de6.png', 'gallery', 1, '', '2026-05-02 04:10:23');

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
(1, 'Osvaldo Gonzalez', 'gooj030829@itsuruapan.edu.mx', '4521123947', 'Ingeniero especialista en Electrónica con enfoque en el diseño de circuitos y sistemas embebidos. Mi objetivo principal es dotar a los estudiantes de las herramientas teóricas y prácticas necesarias para resolver problemas tecnológicos actuales. Apasionado por la innovación y la mejora continua en el ámbito de la ingeniería.', 'Electrónica', 'instructor', 'Osvaldo', '$2y$10$KbVkkTlSugO4ZlaEg78VV.YVd4.1B.caaEk40Y.zUowYNGSoHXkfa', 1, NULL, '2026-05-02 02:52:49', '2026-05-02 03:43:25', NULL);

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
  ADD UNIQUE KEY `unique_user_year` (`user_id`,`congress_year`),
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
-- Indices de la tabla `inscripciones_taller`
--
ALTER TABLE `inscripciones_taller`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_taller_unico` (`user_id`),
  ADD KEY `taller_id` (`taller_id`);

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
-- Indices de la tabla `talleres`
--
ALTER TABLE `talleres`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token_edicion` (`token_edicion`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `camp_registrations`
--
ALTER TABLE `camp_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `competition_categories`
--
ALTER TABLE `competition_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `conferences`
--
ALTER TABLE `conferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `conference_images`
--
ALTER TABLE `conference_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `congress_enrollment_requests`
--
ALTER TABLE `congress_enrollment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `congress_registrations`
--
ALTER TABLE `congress_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `inscripciones_taller`
--
ALTER TABLE `inscripciones_taller`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `robots`
--
ALTER TABLE `robots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `talleres`
--
ALTER TABLE `talleres`
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `workshop_images`
--
ALTER TABLE `workshop_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `camp_registrations`
--
ALTER TABLE `camp_registrations`
  ADD CONSTRAINT `camp_registrations_ibfk_1` FOREIGN KEY (`congress_registration_id`) REFERENCES `congress_registrations` (`id`) ON DELETE CASCADE;

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
-- Filtros para la tabla `inscripciones_taller`
--
ALTER TABLE `inscripciones_taller`
  ADD CONSTRAINT `inscripciones_taller_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `platform_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscripciones_taller_ibfk_2` FOREIGN KEY (`taller_id`) REFERENCES `talleres` (`id`) ON DELETE CASCADE;

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
