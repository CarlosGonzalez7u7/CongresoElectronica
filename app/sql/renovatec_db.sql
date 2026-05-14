-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 14-05-2026 a las 01:46:24
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
(2, 'admin', 'Administrador General', 'admin@renovatec.local', '$2y$10$G0bnoFPjnVObr2qDCR2b/eec7cW/SnGLR7O7FOwpBt1u5fCL9oO8G', 'superadmin', 1, '2026-05-07 03:25:44', '2026-05-11 21:32:25', '2026-05-11 21:32:25', 0, NULL),
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

--
-- Volcado de datos para la tabla `audit_log`
--

INSERT INTO `audit_log` (`id`, `action`, `table_name`, `record_id`, `user_id`, `ip_address`, `changes`, `created_at`) VALUES
(1, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:c844:9c59:184:8f68', '{\"user_id\":1,\"total\":660}', '2026-05-10 06:01:04'),
(2, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:c844:9c59:184:8f68', '{\"user_id\":1,\"total\":660}', '2026-05-10 07:17:49'),
(3, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:c844:9c59:184:8f68', '{\"user_id\":1,\"total\":660}', '2026-05-10 07:19:42'),
(4, 'CONGRESS_ROBOTICS_UPDATED', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:5540:6fbd:9ff4:7156', '{\"notes\":\"Robots\\/integrantes actualizados\"}', '2026-05-10 07:20:51'),
(5, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:5540:6fbd:9ff4:7156', '{\"notes\":\"Bienvenido a RENOVATEC 2025\"}', '2026-05-10 07:21:23'),
(6, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"user_id\":3,\"total\":260}', '2026-05-11 21:28:55'),
(7, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"user_id\":3,\"total\":260}', '2026-05-11 21:30:47'),
(8, 'CONGRESS_RESUBMIT_REQUESTED', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"notes\":\"Baucher falso ,pague lacra\"}', '2026-05-11 21:33:36'),
(9, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"user_id\":3,\"total\":260}', '2026-05-11 21:36:14'),
(10, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"notes\":\"\"}', '2026-05-11 21:36:36'),
(11, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 3, NULL, '2806:266:1403:17e0:18e7:1e3e:6b45:be4e', '{\"user_id\":1,\"total\":130}', '2026-05-13 15:05:54');

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
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `competition_categories`
--

INSERT INTO `competition_categories` (`id`, `category_code`, `category_name`, `description`, `max_weight`, `difficulty_level`, `is_active`, `documento_reglamento_url`, `created_at`) VALUES
(25, 'robot-guerra-1lb', 'Robot de guerra 1 lb', 'Robots de combate de 1 libra de peso', '1 lb', 3, 1, NULL, '2026-05-07 03:25:44'),
(26, 'robot-guerra-3lb', 'Robot de guerra 3 lb', 'Robots de combate de 3 libras de peso', '3 lb', 4, 1, NULL, '2026-05-07 03:25:44'),
(27, 'seguidor-linea-profesional', 'Seguidor de linea profesional', 'Competencia de seguimiento de linea nivel profesional', 'Variable', 4, 1, NULL, '2026-05-07 03:25:44'),
(28, 'seguidor-linea-amateur', 'Seguidor de linea amateur', 'Competencia de seguimiento de linea nivel amateur', 'Variable', 2, 1, NULL, '2026-05-07 03:25:44'),
(29, 'carros-rc', 'Carros RC', 'Vehiculos de control remoto para pruebas de velocidad y maniobra', 'Variable', 2, 1, NULL, '2026-05-07 03:25:44'),
(30, 'soccer-rc', 'Soccer RC', 'Competencia tipo futbol con robots de control remoto', 'Variable', 3, 1, NULL, '2026-05-07 03:25:44'),
(31, 'mini-sumo-rc', 'Mini sumo RC', 'Robots de control remoto luchando en un ring', '500 g', 3, 1, NULL, '2026-05-07 03:25:44'),
(32, 'robot-insecto', 'Robot insecto', 'Robots tipo insecto con desplazamiento especializado', 'Variable', 4, 1, NULL, '2026-05-07 03:25:44');

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
(1, 1, '2026', 'JCGO-21040130', '{\"full_name\":\"Juan Carlos Gonzalez O.\",\"email\":\"juanchitooelmejor@gmail.com\",\"phone\":\"4521123947\",\"school\":\"Instituto Tecnológico superior de Uruapan\",\"control_number\":\"21040130\",\"career\":\"Ingeniera en Sistemas\",\"semester\":\"10\",\"country\":\"Mexico\",\"city\":\"Uruapan\"}', '[{\"name\":\"Panchito\",\"category\":\"Mini sumo RC\"},{\"name\":\"Chocoleta\",\"category\":\"Carros RC\"}]', '[{\"member_name\":\"[object Object]\",\"name\":\"[object Object]\",\"is_captain\":false}]', 1, 1, 0, 400.00, 260.00, 0.00, 660.00, '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_1_1778397582.pdf', 'congreso_1_1778397582.pdf', '2026-05-10 07:19:42', 'approved', 'Bienvenido a RENOVATEC 2025', NULL, '2026-05-10 07:21:23', NULL, '2806:266:1403:17e0:c844:9c59:184:8f68', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-10 06:01:04', '2026-05-10 07:21:23'),
(2, 3, '2026', 'JGCA-11040066', '{\"full_name\":\"JOSE GUADALUPE CAMACHO AVILA\",\"email\":\"chamajca@hotmail.com\",\"phone\":\"+524521271904\",\"school\":\"ITSU\",\"control_number\":\"11040066\",\"career\":\"Electrónica\",\"semester\":\"12\",\"country\":\"México\",\"city\":\"URUAPAN\"}', '[{\"name\":\"camachin\",\"category\":\"Robot insecto\"},{\"name\":\"tecu\",\"category\":\"Robot de guerra 3lb\"}]', '[{\"member_name\":\"[object Object]\",\"name\":\"[object Object]\",\"is_captain\":false}]', 0, 1, 0, 0.00, 260.00, 0.00, 260.00, '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_3_1778535374.pdf', 'congreso_3_1778535374.pdf', '2026-05-11 21:36:14', 'approved', '', NULL, '2026-05-11 21:36:36', NULL, '38.45.246.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-11 21:28:55', '2026-05-11 21:36:36'),
(3, 1, '2026', 'JCGO-21040130C2', '{\"full_name\":\"Juan Carlos Gonzalez O.\",\"email\":\"juanchitooelmejor@gmail.com\",\"phone\":\"4521123947\",\"school\":\"Instituto Tecnológico superior de Uruapan\",\"control_number\":\"21040130\",\"career\":\"Ingeniera en Sistemas\",\"semester\":\"10\",\"country\":\"Mexico\",\"city\":\"Uruapan\"}', '[{\"name\":\"Panchito\",\"category\":\"Robot de guerra 1 lb\"}]', '[{\"member_name\":\"Osvaldo Gonzalez Orozco\",\"name\":\"Osvaldo Gonzalez Orozco\",\"is_captain\":false}]', 0, 1, 0, 0.00, 130.00, 0.00, 130.00, NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, '2806:266:1403:17e0:18e7:1e3e:6b45:be4e', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-13 15:05:54', '2026-05-13 15:05:54');

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
(1, NULL, 1, 2026, 790.00, 'paid', 'Mexico', 'Uruapan', 'Instituto Tecnológico superior de Uruapan', '21040130', NULL, NULL, '2026-05-10 06:01:04', '2026-05-13 15:05:54'),
(4, NULL, 3, 2026, 260.00, 'paid', 'México', 'URUAPAN', 'ITSU', '11040066', NULL, NULL, '2026-05-11 21:28:55', '2026-05-11 21:36:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `convocatorias`
--

CREATE TABLE `convocatorias` (
  `id` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_base` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `documento_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `convocatorias`
--

INSERT INTO `convocatorias` (`id`, `codigo`, `titulo`, `descripcion`, `precio_base`, `is_active`, `documento_url`) VALUES
(1, 'congreso', 'Congreso Internacional RENOVATEC', 'Acceso completo a conferencias y evento', 400.00, 1, NULL),
(2, 'robotica', 'Torneo de Robótica', 'Inscripción para competencias de robótica', 0.00, 1, NULL),
(3, 'campamento', 'Campamento RENOVATEC', 'Alojamiento y actividades de campamento', 200.00, 1, NULL);

-- --------------------------------------------------------

--
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

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('general_schedule_pdf', NULL, 'Ruta del archivo PDF del cronograma general'),
('camp_guide_pdf', NULL, 'Ruta del archivo PDF de la guía del campamento');

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
('::1', 0, '2026-05-10 03:40:24', NULL),
('2806:266:1403:17e0:5de7:dbf6:c038:cfba', 0, '2026-05-09 14:55:38', NULL),
('2806:266:1403:17e0:868:453b:8e53:2b17', 0, '2026-05-09 15:42:17', NULL),
('2806:266:1403:17e0:946e:9437:ccfe:8604', 0, '2026-05-11 05:42:16', NULL),
('38.45.246.106', 0, '2026-05-11 21:21:47', NULL);

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

--
-- Volcado de datos para la tabla `payment_receipts`
--

INSERT INTO `payment_receipts` (`id`, `team_id`, `total_amount`, `number_of_robots`, `approved_robots_count`, `price_per_robot`, `receipt_filename`, `receipt_path`, `receipt_size`, `upload_date`, `verification_date`, `verified_by`, `notes`) VALUES
(1, 1, 260, 2, 2, 130, 'congreso_1_1778397582.pdf', '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_1_1778397582.pdf', NULL, '2026-05-10 07:19:42', '2026-05-10 07:21:23', NULL, NULL),
(2, 2, 260, 2, 2, 130, 'congreso_3_1778535374.pdf', '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_3_1778535374.pdf', NULL, '2026-05-11 21:36:14', '2026-05-11 21:36:36', NULL, NULL);

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
(1, 'juanchitooelmejor@gmail.com', '21040130', 'Juan Carlos Gonzalez O.', '4521123947', '21040130', 'Ingeniera en Sistemas', '10', 'Ingeniera en Sistemas - 10', 'Mexico', 'Uruapan', 'Instituto Tecnológico superior de Uruapan', '21040130', 'alumno', '$2y$10$zHAolgqJrBVcp1CR1nWV/eX7SwJXAnSvZTtWlf837VG5apTzY7TeW', 1, NULL, NULL, 1, '2026-05-08 02:01:32', '2026-05-14 01:26:23', '2026-05-14 01:26:23', 0, NULL),
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

--
-- Volcado de datos para la tabla `robots`
--

INSERT INTO `robots` (`id`, `team_id`, `robot_number`, `robot_name`, `category`, `registration_stage`, `robot_price`, `created_at`) VALUES
(1, 1, 1, 'Panchito', 'Mini sumo RC', NULL, NULL, '2026-05-10 07:21:23'),
(2, 1, 2, 'Chocoleta', 'Carros RC', NULL, NULL, '2026-05-10 07:21:23'),
(3, 2, 1, 'camachin', 'Robot insecto', NULL, NULL, '2026-05-11 21:36:36'),
(4, 2, 2, 'tecu', 'Robot de guerra 3lb', NULL, NULL, '2026-05-11 21:36:36');

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

--
-- Indices de la tabla `convocatorias`
--
ALTER TABLE `convocatorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Volcado de datos para la tabla `teams`
--

INSERT INTO `teams` (`id`, `folio`, `created_at`, `country_origin`, `state_id`, `state_name`, `country_name`, `institution_type`, `school_name`, `captain_name`, `captain_email`, `captain_phone`, `registration_stage`, `registration_price`, `payment_status`, `qr_code`, `qr_code_hash`) VALUES
(1, 'JUAN-2605109080', '2026-05-10 07:21:23', 'mexico', NULL, 'Uruapan', 'Mexico', 'preparatoria', 'Instituto Tecnológico superior de Uruapan', 'Juan Carlos Gonzalez O.', 'juanchitooelmejor@gmail.com', '4521123947', 1, NULL, 'verified', NULL, NULL),
(2, 'JOSE-2605113158', '2026-05-11 21:36:36', 'mexico', NULL, 'URUAPAN', 'México', 'preparatoria', 'ITSU', 'JOSE GUADALUPE CAMACHO AVILA', 'chamajca@hotmail.com', '+524521271904', 1, NULL, 'verified', NULL, NULL);

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

--
-- Volcado de datos para la tabla `team_members`
--

INSERT INTO `team_members` (`id`, `team_id`, `member_number`, `member_name`, `is_captain`) VALUES
(1, 1, 1, 'Juan Carlos Gonzalez O.', 1),
(2, 1, 2, '[object Object]', 0),
(3, 2, 1, 'JOSE GUADALUPE CAMACHO AVILA', 1),
(4, 2, 2, '[object Object]', 0);

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
(1, 'Arduino Basico', 'Exploración de Arduino en modo principiantes, esperando el dominio de la programación y funcionamiento.', 'Edificio D, Lab D1', 'internal', 15, 1, '2026-06-30', '04:00:00', '06:30:00', 'published', '[\"C++\",\"Componentes Electr\\u00f3nicos\"]', '[]', 'Laptop', NULL, NULL, '2026-05-10 07:26:14', '2026-05-11 20:58:38', 'Edificio D', 'Lab D1', NULL, 0);

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
(1, 1, 'ws_1_1778397976_48f8cd92.jpg', '/app/uploads/workshops/ws_1_1778397976_48f8cd92.jpg', 'gallery', 1, '', '2026-05-10 07:26:16'),
(2, 1, 'ws_1_1778397977_d2b9917b.jpg', '/app/uploads/workshops/ws_1_1778397977_d2b9917b.jpg', 'gallery', 0, '', '2026-05-10 07:26:17'),
(3, 1, 'ws_1_1778397979_b2c98960.jpg', '/app/uploads/workshops/ws_1_1778397979_b2c98960.jpg', 'gallery', 0, '', '2026-05-10 07:26:19');

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
-- Indices de la tabla `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`);

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
-- AUTO_INCREMENT de la tabla `convocatorias`
--
ALTER TABLE `convocatorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `congress_registrations`
--
ALTER TABLE `congress_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `platform_users`
--
ALTER TABLE `platform_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `robots`
--
ALTER TABLE `robots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `teams`
--
ALTER TABLE `teams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `team_members`
--
ALTER TABLE `team_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
