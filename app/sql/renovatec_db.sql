-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 25-06-2026 a las 00:41:48
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
CREATE DEFINER=`u160168264_Carlos`@`localhost` PROCEDURE `registrar_o_incrementar_carrera` (IN `p_name` VARCHAR(200), IN `p_user_id` INT, OUT `p_out_id` INT)   BEGIN
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

CREATE DEFINER=`u160168264_Carlos`@`localhost` PROCEDURE `registrar_o_incrementar_escuela` (IN `p_name` VARCHAR(250), IN `p_type` VARCHAR(20), IN `p_user_id` INT, OUT `p_out_id` INT)   BEGIN
  DECLARE v_existing INT DEFAULT 0;

  SELECT id INTO v_existing
  FROM institution_catalog
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
  LIMIT 1;

  IF v_existing > 0 THEN
    
    UPDATE institution_catalog
    SET times_used = times_used + 1
    WHERE id = v_existing;
    SET p_out_id = v_existing;
  ELSE
    
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
(2, 'admin', 'Administrador General', 'admin@renovatec.local', '$2y$10$OZYjFjUapcT0f50vM1DuFOzyxHu0j.i3B8QG70qDm7LpTNZWh3cGm', 'superadmin', 1, '2026-05-07 03:25:44', '2026-06-24 05:19:41', '2026-06-24 05:19:41', 0, NULL),
(3, 'staff', 'Personal Operativo', 'staff@renovatec.local', '$2y$10$PIMRlD7GHgzotf2KqH/YPuzVL0tfRpiey5J56VwC.uJMjmFkeDPta', 'staff', 1, '2026-05-07 03:25:44', '2026-05-09 15:55:55', '2026-05-09 15:55:55', 0, NULL),
(4, '99999', 'renovatec2026', 'renovatec507@gmail.com', '$2y$10$/IC53qUxLK8QnPO7yEf9beLrOVFhiFgfmvYizNJ2XqAwxdJRR5Lri', 'superadmin', 1, '2026-06-07 06:46:02', '2026-06-25 00:11:19', '2026-06-25 00:11:19', 0, NULL);

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
(1, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:28eb:2942:87c9:d76b', '{\"user_id\":1,\"total\":660}', '2026-06-03 00:41:52'),
(2, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:28eb:2942:87c9:d76b', '{\"user_id\":1,\"total\":790}', '2026-06-03 00:47:56'),
(3, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:208c:7732:d7bc:7ea2', '{\"notes\":\"Bienvenido a este Evento!!\"}', '2026-06-03 00:53:34'),
(4, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"user_id\":7,\"total\":400}', '2026-06-05 19:42:22'),
(5, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 2, NULL, '38.45.246.106', '{\"notes\":\"Tu pago y documentos han sido revisados y est\\u00e1n correctos. \\u00a1Bienvenido a RENOVATEC!\"}', '2026-06-05 20:04:00'),
(6, 'CONGRESS_REJECTED', 'congress_enrollment_requests', 1, NULL, '159.16.107.218', '{\"notes\":\"El comprobante de pago adjunto no es v\\u00e1lido, no corresponde al monto o no es legible. Por favor, verifica los requisitos.\"}', '2026-06-05 20:52:39'),
(7, 'CONGRESS_SET_PENDING', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:54f3:3d24:9ac8:81ff', '{\"notes\":\"Bienvenido a este Evento!!\"}', '2026-06-07 00:07:14'),
(8, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 1, NULL, '2806:266:1403:17e0:54f3:3d24:9ac8:81ff', '{\"notes\":\"Bienvenido a este Evento!!\"}', '2026-06-07 00:07:33'),
(9, 'TEAM_CHECKIN', 'participant_checkins', 1, NULL, '2806:266:1403:17e0:54f3:3d24:9ac8:81ff', '{\"notes\":\"Check-in por equipo (detalle por robot)\",\"admin\":\"STAFF\"}', '2026-06-07 00:33:28'),
(10, 'TEAM_CHECKIN', 'participant_checkins', 1, NULL, '2806:266:1403:17e0:54f3:3d24:9ac8:81ff', '{\"notes\":\"Check-in por equipo (detalle por robot)\",\"admin\":\"STAFF\"}', '2026-06-07 01:09:00'),
(11, 'TEAM_CHECKIN', 'participant_checkins', 1, NULL, '2806:266:1403:17e0:54f3:3d24:9ac8:81ff', '{\"notes\":\"Check-in por equipo (detalle por robot)\",\"admin\":\"STAFF\"}', '2026-06-07 02:29:51'),
(12, 'USER_CONGRESS_ENROLL', 'congress_enrollment_requests', 3, NULL, '38.45.246.106', '{\"user_id\":7,\"total\":460}', '2026-06-09 17:39:01'),
(13, 'USER_WORKSHOP_ENROLL', 'workshop_enrollments', 2, NULL, '177.225.134.201', '{\"user_id\":7}', '2026-06-24 05:09:46'),
(14, 'CONGRESS_APPROVED', 'congress_enrollment_requests', 3, NULL, '177.225.134.201', '{\"notes\":\"Tu pago y documentos han sido revisados y est\\u00e1n correctos. \\u00a1Bienvenido a RENOVATEC!\"}', '2026-06-24 05:17:01');

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
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `requirements_docs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requirements_docs`)),
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

INSERT INTO `conferences` (`id`, `convocatoria_id`, `name`, `description`, `speaker_name`, `speaker_title`, `speaker_org`, `contact_email`, `contact_phone`, `requirements_docs`, `location`, `building`, `room`, `location_type`, `conference_date`, `time_start`, `time_end`, `capacity`, `is_public`, `tags`, `status`, `language`, `live_stream_url`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Electromovilidad Inteligente: Integración de IoT, Salud y Sistemas Embebidos en Vehículos del Futuro.', 'TecNM de Patzcuaro', 'MATI Mario Salvador Castro Zenil', '', '', NULL, NULL, NULL, 'D, D1', 'D', 'D1', 'internal', '2026-10-14', '11:30:00', '12:00:00', 20, 1, '[]', 'draft', 'Español', '', '2026-06-03 00:10:30', '2026-06-03 00:15:53'),
(2, NULL, 'Electrónica y energías renovables para cultivos sustentables.', '', 'Ing. Luis Alberto Gutiérrez Ramírez', '', '', '', '', '[]', 'D, D1', 'D', 'D1', 'internal', '2026-10-14', '13:30:00', '14:00:00', 30, 1, '[]', 'published', 'Español', '', '2026-06-03 00:15:45', '2026-06-24 05:07:23'),
(3, NULL, 'Legislación energética en México en el sector eléctrico con énfasis en las energías renovables.', '', 'Nacir García Ramos', '', '', '', '', '[]', 'D, D2', 'D', 'D2', 'internal', '2026-10-14', '13:30:00', '14:30:00', 30, 1, '[]', 'published', 'Español', '', '2026-06-03 00:31:08', '2026-06-08 17:59:18'),
(4, NULL, 'colombia', 'Colombia', 'Dr. Edwin Moncada Acevedo', '', '', NULL, NULL, NULL, 'Auditorio', 'Auditorio', '', 'internal', '2026-10-14', '10:00:00', '11:30:00', NULL, 1, '[]', 'draft', 'Español', '', '2026-06-03 00:42:52', '2026-06-03 00:42:52'),
(5, NULL, 'apatzingam', 'apatzingan', 'Dr. Omar Jehovani López Orozco', '', '', NULL, NULL, NULL, 'D, D2', 'D', 'D2', 'internal', '2026-10-14', '11:30:00', '12:00:00', 20, 1, '[]', 'draft', 'Español', '', '2026-06-03 00:45:09', '2026-06-03 00:45:09'),
(6, NULL, 'Importancia de ingles en la industria.', '', 'vocablo', '', '', NULL, NULL, NULL, 'D, D1', 'D', 'D1', 'internal', '2026-10-14', '14:00:00', '14:30:00', 20, 1, '[]', 'draft', 'Español', '', '2026-06-03 00:47:19', '2026-06-03 00:47:19'),
(7, NULL, 'El mundo de la electrónica y las importaciones para hacer funcionar tu empresa.', '', 'Ing. Francisco Javier Burgos Sánchez', '', '', NULL, NULL, NULL, 'D, D2', 'D', 'D2', 'internal', '2026-10-14', '14:00:00', '14:30:00', 20, 1, '[]', 'draft', 'Español', '', '2026-06-03 00:48:59', '2026-06-03 00:48:59'),
(8, NULL, 'Business models for renewable energy and electromobility solutions', '', 'Ramses Trejo', '', '', '', '', '[]', 'Aula magna', 'Aula magna', '', 'internal', '2026-10-14', '11:30:00', '12:00:00', 30, 1, '[]', 'published', 'Español', '', '2026-06-03 00:52:20', '2026-06-24 04:54:10');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conference_enrollments`
--

CREATE TABLE `conference_enrollments` (
  `id` int(11) NOT NULL,
  `conference_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('enrolled','cancelled','attended') DEFAULT 'enrolled',
  `enrollment_date` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
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

--
-- Volcado de datos para la tabla `conference_images`
--

INSERT INTO `conference_images` (`id`, `conference_id`, `filename`, `url`, `image_type`, `is_cover`, `caption`, `uploaded_at`) VALUES
(8, 3, 'conf_3_1780447008_b483e04e.jpeg', '/app/uploads/conferences/conf_3_1780447008_b483e04e.jpeg', 'gallery', 1, 'Portada', '2026-06-03 00:36:48'),
(9, 2, 'conf_2_1780447064_63443d0e.jpeg', '/app/uploads/conferences/conf_2_1780447064_63443d0e.jpeg', 'gallery', 1, 'Portada', '2026-06-03 00:37:44'),
(10, 8, 'conf_8_1782276965_1a5719de.jpeg', '/app/uploads/conferences/conf_8_1782276965_1a5719de.jpeg', 'gallery', 1, 'Portada', '2026-06-24 04:56:05');

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
  `selected_convocatorias_json` text DEFAULT NULL,
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

INSERT INTO `congress_enrollment_requests` (`id`, `user_id`, `congress_year`, `request_folio`, `profile_snapshot_json`, `robots_snapshot_json`, `members_snapshot_json`, `selected_convocatorias_json`, `includes_congress`, `includes_robotics`, `includes_camp`, `congress_fee`, `robotics_fee`, `camp_fee`, `total_fee`, `receipt_path`, `receipt_filename`, `receipt_uploaded_at`, `status`, `admin_notes`, `rejection_reason`, `reviewed_at`, `reviewed_by_admin_id`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
(2, 7, '2026', 'JMV-23040098', '{\"full_name\":\"Jimena Morelos Valladares\",\"email\":\"jimenamorelosvalla12@gmail.com\",\"phone\":\"+524521790952\",\"school\":\"Instituto tecnológico superior de Uruapan\",\"control_number\":\"23040098\",\"career\":\"Ing. Electrónica\",\"semester\":\"6\",\"country\":\"México\",\"city\":\"Uruapan\"}', '[{\"name\":\"\",\"category\":\"\"}]', '[]', '[1]', 1, 0, 0, 400.00, 0.00, 0.00, 400.00, '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_7_1780688542.pdf', 'congreso_7_1780688542.pdf', '2026-06-05 19:42:22', 'approved', 'Tu pago y documentos han sido revisados y están correctos. ¡Bienvenido a RENOVATEC!', NULL, '2026-06-05 20:04:00', NULL, '38.45.246.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-05 19:42:22', '2026-06-05 20:04:00'),
(3, 7, '2026', 'JMV-23040098C2', '{\"full_name\":\"Jimena Morelos Valladares\",\"email\":\"jimenamorelosvalla12@gmail.com\",\"phone\":\"+524521790952\",\"school\":\"Instituto tecnológico superior de Uruapan\",\"control_number\":\"23040098\",\"career\":\"Ing. Electrónica\",\"semester\":\"6\",\"country\":\"México\",\"city\":\"Uruapan\"}', '[{\"name\":\"panchito\",\"category\":\"Carros RC\"},{\"name\":\"electronica\",\"category\":\"Guerra 1LB/3LB\"}]', '[]', '[2,3]', 0, 1, 1, 0.00, 260.00, 200.00, 460.00, '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_7_1781026741.pdf', 'congreso_7_1781026741.pdf', '2026-06-09 17:39:01', 'approved', 'Tu pago y documentos han sido revisados y están correctos. ¡Bienvenido a RENOVATEC!', NULL, '2026-06-24 05:17:01', NULL, '38.45.246.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-09 17:39:01', '2026-06-24 05:17:01');

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
(3, NULL, 7, 2026, 460.00, 'paid', 'México', 'Uruapan', 'Instituto tecnológico superior de Uruapan', '23040098', NULL, NULL, '2026-06-05 19:42:22', '2026-06-24 05:17:01');

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
(1, 'congreso', 'Congreso Internacional RENOVATEC', '<h2><strong>Acceso completo a conferencias y evento</strong></h2><p><img src=\"data:image/png;base64,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\" width=\"127\" height=\"120\" style=\"width: 127px; height: 120px; left: 396px; top: 98.875px; position: static; display: block; margin: 15px auto; float: none; z-index: 10; vertical-align: middle;\"></p>', 'Congreso Académico', 400.00, 1, NULL, '2026-05-14 03:14:17', '2026-06-05 02:13:56', 'general', 'fixed', NULL, '2026-05-16 23:59:00', '2026-10-14 12:00:00', '2026-10-14 09:00:00', '2026-10-20 18:30:00', NULL, NULL, 'fa-solid fa-suitcase', '#f2a900', 1, 1, NULL, '{\"congress\":false,\"robotics\":false,\"camp\":false,\"workshops\":true,\"conferences\":true,\"custom\":[]}');
INSERT INTO `convocatorias` (`id`, `codigo`, `titulo`, `descripcion`, `conv_tipo`, `precio_base`, `is_active`, `documento_url`, `created_at`, `updated_at`, `conv_type`, `pricing_mode`, `price_stages`, `inscripcion_inicio`, `inscripcion_fin`, `evento_inicio`, `evento_fin`, `rich_content`, `cover_image_url`, `icon`, `color`, `show_on_landing`, `landing_order`, `categories_json`, `included_modules`) VALUES
(2, 'robotica', 'Torneo de Robótica', '<p>Inscripción para competencias de robótica</p>', '', 130.00, 1, '/app/uploads/docs/convocatoria_2_1780625460.pdf', '2026-05-14 03:14:17', '2026-06-05 02:11:00', 'general', 'staged', '[{\"start\":\"2026-04-01\",\"end\":\"2026-06-30\",\"price\":130},{\"start\":\"2026-07-01\",\"end\":\"2026-08-31\",\"price\":200},{\"start\":\"2026-09-01\",\"end\":\"2026-10-16\",\"price\":350}]', '2026-04-01 01:00:00', '2026-10-16 09:30:00', '2026-10-16 09:00:00', '2026-10-19 17:00:00', NULL, NULL, 'fas fa-robot', '#22d3ee', 1, 2, '[{\"name\":\"Guerra 1LB/3LB\",\"description\":\"Competencia de combate entre robots de peso estandarizado (1 lb y 3 lb). Los robots luchan dentro de una jaula de combate de 1.5 m de lado. <div>El objetivo es incapacitar al oponente, empujarlo fuera de la arena o dominarlo por iniciativa de ataque.  <div><br></div><div>Cada pelea dura 3 minutos. Los robots son no autónomos (controlados por Bluetooth o radio control 2.4 GHz). </div></div>\",\"pdf_url\":\"/app/uploads/docs/generic_cat1780265844031_1780265847.pdf\",\"icon\":\"fas fa-robot\"},{\"name\":\"Carros RC\",\"description\":\"Es una carrera de <font color=\\\"#ef4444\\\"><b>velocidad</b></font> donde los participantes diseñan e implementan un carro robótico 4x4 controlado por radio control o Bluetooth (inalámbrico). El objetivo es completar 2 vueltas completas al circuito lo más rápido posible. El circuito tiene giros, rectas y obstáculos en zigzag sobre una superficie mixta (no lisa). Gana el equipo que termine primero las 2 vueltas en enfrentamientos directos. Dimensiones máximas: 30 cm largo × 25 cm ancho. Sin límite de peso ni cantidad de motores.\",\"pdf_url\":\"/app/uploads/docs/generic_cat1780266165646_1780266168.pdf\",\"icon\":\"fas fa-medal\"},{\"name\":\"Robots Insectos\",\"description\":\"Los robots deben simular el movimiento de un insecto usando patas (no se permiten ruedas, orugas ni saltos). Tienen que recorrer 200 cm en el carril central y 200 cm en el carril lateral externo en el menor tiempo posible.  Autónomos (sin cables). Dimensiones máximas: 20 cm × 20 cm. Deben tener un arranque retardado de 5 segundos. Prohibido usar kits comerciales; las patas deben ser fabricadas por el equipo.\",\"pdf_url\":\"/app/uploads/docs/generic_cat1780266214335_1780266217.pdf\",\"icon\":\"fas fa-atom\"},{\"name\":\"Mini Sumo RC\",\"description\":\"Robots que imitan el sumo japonés. Dos robots se enfrentan en un dohyo (círculo de combate) de 77 cm de diámetro. El objetivo es empujar al oponente fuera del círculo.  No autónomos (control RC o Bluetooth). Dimensiones máximas: 10 cm × 10 cm. Peso máximo: 500 g (sin tolerancia). Prohibido: succión, pegamento, disparos o elementos que dañen el dohyo.\",\"pdf_url\":\"/app/uploads/docs/generic_cat1780266358874_1780266361.pdf\",\"icon\":\"fas fa-code\"},{\"name\":\"Seguidor de líneas (Amateur y profesional)\",\"description\":\"El objetivo de esta competencia es completar un circuito en el tiempo más corto posible mientras se sigue con precisión la línea del circuito desde el punto de inicio hasta la meta.\\nEl concurso de seguidores de línea consistirá en:\\n1. Lograr que el robot siga fielmente una línea negra mate, dibujada en una lona de vinil de color blanco y que recorra el circuito en el menor tiempo posible.\\n2. Se efectuarán tres rondas, de las cuales se tomará el mejor tiempo de cada robot para determinar al ganador.\",\"pdf_url\":\"/app/uploads/docs/generic_cat1780624183790_1780624184.pdf\",\"icon\":\"fas fa-diagram-project\"},{\"name\":\"Robot soccer\",\"description\":\"La categoría consiste en simular un partido de fútbol con robots conducidos a distancia por los\\nparticipantes.\\nConsta de dos equipos con dos robots en cada equipo dentro de un escenario parecido a una\\ncancha de fútbol.\\nCon un balón o pelota de ping-pong o similar se deberá anotar en la portería del rival para sumar\\npuntos o goles.\\nEl equipo con más cantidad de goles gana la contienda.\",\"pdf_url\":\"/app/uploads/docs/generic_cat1780624251460_1780624252.pdf\",\"icon\":\"fas fa-robot\"}]', '{\"congress\":false,\"robotics\":false,\"camp\":false,\"workshops\":false,\"conferences\":false,\"custom\":[]}'),
(3, 'campamento', 'Campamento RENOVATEC', '<p>Alojamiento y actividades de campamento</p>', '', 200.00, 1, NULL, '2026-05-14 03:14:17', '2026-06-05 02:16:44', 'general', 'fixed', NULL, '2026-06-01 20:15:00', '2026-10-15 16:00:00', '2026-10-14 17:15:00', '2026-10-20 20:16:00', NULL, NULL, 'fas fa-campground', '#34d399', 1, 3, NULL, '{\"congress\":false,\"robotics\":false,\"camp\":false,\"workshops\":false,\"conferences\":false,\"custom\":[]}');

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
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `location` varchar(255) DEFAULT NULL,
  `schedule_date` date DEFAULT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `max_capacity` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `custom_module_items`
--

CREATE TABLE `custom_module_items` (
  `id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL COMMENT 'FK a convocatoria_modules.id',
  `convocatoria_id` int(11) NOT NULL COMMENT 'FK a convocatorias.id (desnormalizado para queries rápidos)',
  `name` varchar(250) NOT NULL COMMENT 'Nombre del ítem, ej: Torneo de League of Legends',
  `description` text DEFAULT NULL,
  `location` varchar(300) DEFAULT NULL,
  `building` varchar(100) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `location_type` enum('internal','external') DEFAULT 'internal',
  `event_date` date DEFAULT NULL,
  `event_date_end` date DEFAULT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `is_multi_day` tinyint(1) DEFAULT 0,
  `capacity` int(11) DEFAULT NULL COMMENT 'NULL = sin límite',
  `status` enum('draft','published','cancelled','completed') DEFAULT 'draft',
  `tags` text DEFAULT NULL COMMENT 'JSON array de etiquetas',
  `extra_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Campos libres según el tipo de módulo (ej. plataforma, reglas, premio)' CHECK (json_valid(`extra_fields`)),
  `requirements` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 1,
  `created_by_admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ítems individuales de módulos personalizados (torneos, actividades, etc.)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `custom_module_item_images`
--

CREATE TABLE `custom_module_item_images` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL COMMENT 'FK a custom_module_items.id',
  `filename` varchar(300) NOT NULL,
  `url` varchar(500) NOT NULL,
  `image_type` enum('cover','gallery','map','sponsor') DEFAULT 'gallery',
  `is_cover` tinyint(1) DEFAULT 0,
  `caption` varchar(300) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Galería de imágenes de cada ítem de módulo personalizado';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `custom_module_staff`
--

CREATE TABLE `custom_module_staff` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL COMMENT 'FK a custom_module_items.id',
  `full_name` varchar(150) NOT NULL,
  `role_label` varchar(100) NOT NULL DEFAULT 'Encargado' COMMENT 'Ej: Juez, Árbitro, Coordinador, Ponente',
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personal responsable de cada ítem: jueces, árbitros, coordinadores, etc.';

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
('148.224.12.170', 0, '2026-06-24 20:09:39', NULL),
('159.16.107.218', 1, '2026-06-05 21:12:58', NULL),
('177.225.134.57', 1, '2026-06-11 15:24:14', NULL),
('187.246.167.80', 3, '2026-06-02 20:51:44', NULL),
('200.68.182.188', 0, '2026-06-04 05:06:05', NULL),
('2806:266:1403:17e0:28eb:2942:87c9:d76b', 0, '2026-06-03 00:38:00', NULL),
('2806:266:1403:17e0:3e20:614b:49ae:ab02', 0, '2026-06-07 17:10:25', NULL),
('2806:266:1403:17e0:54f3:3d24:9ac8:81ff', 0, '2026-06-07 07:07:42', NULL),
('2806:266:1403:17e0:5885:bf1c:b948:deea', 0, '2026-05-21 03:07:46', NULL),
('2806:266:1403:17e0:5886:f414:b7ae:5bd9', 0, '2026-06-25 00:13:14', NULL),
('2806:266:1403:17e0:59ac:3125:db44:31a6', 0, '2026-05-23 21:29:44', NULL),
('2806:266:1403:17e0:8827:cc23:8d34:f6f5', 0, '2026-05-23 15:44:42', NULL),
('2806:266:1403:17e0:d10b:219f:7000:295a', 0, '2026-06-08 01:07:39', NULL),
('2806:266:1480:631:f5a7:17fd:da2a:f00e', 0, '2026-06-05 18:28:25', NULL),
('2806:266:1481:7a1:84ef:b8d6:6149:e828', 6, '2026-06-14 14:27:45', NULL),
('2806:266:480:8249:d455:bc99:a610:85c7', 0, '2026-06-04 15:30:32', NULL),
('38.45.246.106', 0, '2026-06-03 15:34:41', NULL);

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
(2, 2, 260, 2, 2, 130, 'congreso_7_1781026741.pdf', '/home/u160168264/domains/renovatec2026.navidev.org/public_html/app/config/../uploads/receipts/congreso_7_1781026741.pdf', NULL, '2026-06-09 17:39:01', '2026-06-24 05:17:01', NULL, NULL);

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
(2, 'gooj030829@itsuruapan.edu.mx', 'Osvaldo', 'Ing. Osvaldo Gonzalez', '4521123947', 'Osvaldo', NULL, NULL, NULL, 'México', 'Uruapan', 'Instructor', 'Osvaldo', 'tallerista', '$2y$10$h.zrpS0becMAyDa3rN5WoOI1Dbv75.VOffA4JmjWZtsaGF1cybIpG', 1, NULL, NULL, 1, '2026-05-11 05:19:11', '2026-05-11 05:42:16', NULL, 1, '2026-05-11 05:42:16'),
(3, 'chamajca@hotmail.com', '11040066', 'JOSE GUADALUPE CAMACHO AVILA', '+524521271904', '11040066', 'Electrónica', '12', 'Electrónica - 12', 'México', 'URUAPAN', 'ITSU', '11040066', 'alumno', '$2y$10$lq76aB9fNo2qf8WDUxAX8uxhVIlRpfn4QMSE4Pa0a.LD4luDwP53i', 1, NULL, NULL, 1, '2026-05-11 21:20:15', '2026-06-24 20:10:30', '2026-06-24 20:10:30', 0, NULL),
(4, 'camachinchamaco@gmail.com', '1123637', 'Jose Camacho', '+524521271904', '1123637', 'Electrónica', '8', 'Electrónica - 8', 'México', 'Uruapan', 'Tec Uruapan', '1123637', 'alumno', '$2y$10$l3fR74F3oBPWXA.ubgcBHuQIyfJ/bgRosuCkGI6sGov5w4yCdsnJe', 0, '946817', '2026-06-02 21:11:44', 1, '2026-06-02 20:51:44', '2026-06-02 20:51:44', NULL, 0, NULL),
(5, 'sloa99@yahoo.com', '99999999', 'Salvador Loa Cázares', '+524521216116', '99999999', 'Ing. Electronica', '12', 'Ing. Electronica - 12', 'México', 'Uruapan', 'ITSU', '99999999', 'alumno', '$2y$10$8SWCYPO.Qo4BEGFaG0Du..F2sMrSDOngMCL/5SwqiJCPEzoKHk2kG', 1, NULL, NULL, 1, '2026-06-02 20:52:07', '2026-06-02 20:55:56', '2026-06-02 20:55:56', 0, NULL),
(6, 'alexdluf04@gmail.com', '22040233', 'Diego Alexander Luna Figueroa', '+524524806030', '22040233', 'Ingeniería Electrónica', '9', 'Ingeniería Electrónica - 9', 'México', 'Uruapan', 'Instituto Tecnológico Superior de Uruapan', '22040233', 'alumno', '$2y$10$hrDYG.2eZViJK6NJ8daRx.e/ozNeK548MOv0ZG5m7NvDIMmHFzTZK', 1, NULL, NULL, 1, '2026-06-02 21:24:46', '2026-06-02 21:33:21', '2026-06-02 21:33:21', 0, NULL),
(7, 'jimenamorelosvalla12@gmail.com', '23040098', 'Jimena Morelos Valladares', '+524521790952', '23040098', 'Ing. Electrónica', '6', 'Ing. Electrónica - 6', 'México', 'Uruapan', 'Instituto tecnológico superior de Uruapan', '23040098', 'alumno', '$2y$10$vLApiZaM.aEZVsCmdG7eBu1YZIxKJqOfwIF1/MCu6iTYuBrNhdtO6', 1, NULL, NULL, 1, '2026-06-04 05:06:05', '2026-06-24 05:24:22', '2026-06-24 05:24:22', 0, NULL),
(8, 'jmsr5416@gmail.com', '21040305', 'Jose Sanchez', '+525573518071', '21040305', 'Ingenieria en Sistemas', '10', 'Ingenieria en Sistemas - 10', 'México', 'Morelia', 'ITSU', '21040305', 'alumno', '$2y$10$wP19v2Ec7zplLcGk1wJHy.V05pMQJU4KNC0bGZkB6kKpCUAY0ov5C', 1, NULL, NULL, 1, '2026-06-04 15:30:33', '2026-06-04 15:31:44', '2026-06-04 15:31:44', 0, NULL),
(9, 'kmilagalleaba@gmail.com', '24040187', 'Kamila Gallegos', '+524521211778', '24040187', 'Ing. Electrónica', '4', 'Ing. Electrónica - 4', 'México', 'Uruapan', 'Instituto Tecnológico Superior de Uruapan', '24040187', 'alumno', '$2y$10$Cs9OIraqPtV4I0Q27Dx35ukT76j20U6s7tg1Fukx7sbQ1oab612Xy', 1, NULL, NULL, 1, '2026-06-05 18:28:25', '2026-06-05 18:30:15', '2026-06-05 18:30:15', 0, NULL),
(10, 'juanchitooelmejor@gmail.com', '21040130', 'Juan Carlos Gonzalez', '+524521123947', '21040130', 'Ingeniería en Sistemas Computacionales', '10', 'Ingeniería en Sistemas Computacionales - 10', 'Mexico', 'Uruapan, Michoacán', 'Instituto Tecnológico Superior de Uruapan', '21040130', 'alumno', '$2y$10$baOxm7GHUmwNvb1YAYg2TefmKMN7lBvr6HUaTvCDW2eLBzedR8mPS', 1, NULL, NULL, 1, '2026-06-07 06:19:13', '2026-06-25 00:13:14', '2026-06-25 00:13:14', 2, '2026-06-07 19:36:22'),
(11, 'renovatec507@gmail.com', '99999', 'renovatec2026', '+524521790952', '99999', 'Ingeniería Electrónica', '12', 'Ingeniería Electrónica - 12', 'México', 'Uruapan, Michoacán', 'Instituto Tecnológico Superior de Uruapan', '99999', 'admin', '$2y$10$/IC53qUxLK8QnPO7yEf9beLrOVFhiFgfmvYizNJ2XqAwxdJRR5Lri', 1, NULL, NULL, 1, '2026-06-07 06:45:21', '2026-06-25 00:11:19', '2026-06-25 00:11:19', 0, NULL),
(12, 'ianmiguelcastrocruz@gmail.com', '25040028', 'Ian Miguel Castro Cruz', '+524523033690', '25040028', 'Ingeniería Electrónica', '2', 'Ingeniería Electrónica - 2', 'México', 'Uruapan, Michoacán', 'Tec Uruapan', '25040028', 'alumno', '$2y$10$l8F0CcIun0V9AX991LqyBOpGnb4IWnofNw08W0sTX/oC0JRjj9Bha', 0, '390732', '2026-06-11 15:44:14', 1, '2026-06-11 15:24:14', '2026-06-11 15:24:14', NULL, 0, NULL),
(13, 'jesvarg1810@gmail.com', '22040277', 'jesus manuel vargas jimenez', '+524521806418', '22040277', 'Ingeniería Electrónica', '9', 'Ingeniería Electrónica - 9', 'México', 'Uruapan', 'ITSU', '22040277', 'alumno', '$2y$10$fHcrR3QmYS6fVBd5KPQNruY0A2h9t9Fk/zi9OL/urgNYLoeQMbvdi', 0, '298422', '2026-06-14 14:46:43', 1, '2026-06-14 14:26:44', '2026-06-14 14:26:44', NULL, 0, NULL),
(14, 'ramses1245@gmail.com', 'Ramses Trejo', 'Ramses Trejo', '', 'Ramses Trejo', NULL, NULL, NULL, 'México', 'Uruapan', 'Instructor', 'Ramses Trejo', 'tallerista', '$2y$10$CqnTvPc1c/asvUrxSfg3p.DSTyap7J.WcFmNfE0wSV7KGinRCATs.', 1, NULL, NULL, 1, '2026-06-24 04:57:26', '2026-06-24 04:57:26', NULL, 0, NULL),
(15, '', 'AlejandroGG', 'Ing. Alejandro Garcia Garcia', '', 'AlejandroGG', NULL, NULL, NULL, 'México', 'Uruapan', 'Instructor', 'AlejandroGG', 'tallerista', '$2y$10$juMKZAur0BxMeuhB/61/seNePICo.SBtyuLtKHBozzZfGX/7smAgS', 1, NULL, NULL, 1, '2026-06-24 05:01:11', '2026-06-24 05:01:11', NULL, 0, NULL);

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
(3, 2, 1, 'panchito', 'Carros RC', NULL, NULL, '2026-06-24 05:17:01'),
(4, 2, 2, 'electronica', 'Guerra 1LB/3LB', NULL, NULL, '2026-06-24 05:17:01');

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
('bank_account', '', NULL, '2026-06-03 00:35:20'),
('bank_beneficiary', 'Jimena Morelos Valladares', NULL, '2026-06-03 00:35:20'),
('bank_card_number', '5428785107209107', NULL, '2026-06-03 00:35:20'),
('bank_clabe', '722969040860863730', NULL, '2026-06-03 00:35:20'),
('bank_name', 'Mercado Pago W-', NULL, '2026-06-03 00:35:20'),
('call_for_speakers', '{\"active\":true,\"title\":\"¿Deseas ser Ponente?\",\"description\":\"En el archivo adjunto PDF se encuentra el Call For Papper. Su ponencia será integrada a la memoria del congreso.\",\"email\":\"raul.pa@gmail.com\",\"phone\":\"+52 9844696222\",\"docs\":[{\"name\":\"CONVOCATORIA DE TRABAJOS.pdf\",\"url\":\"\\/app\\/uploads\\/docs\\/generic_cfsdoc1780941426631_1780941427.pdf\"}]}', NULL, '2026-06-08 19:00:30'),
('camp_guide_pdf', NULL, 'Ruta del archivo PDF de la guía del campamento', '2026-05-14 03:14:17'),
('event_name', 'RENOVATEC 2026', NULL, '2026-05-17 02:41:09'),
('general_schedule_pdf', NULL, 'Ruta del archivo PDF del cronograma general', '2026-05-14 03:14:17'),
('landing_contact_email', 'renovatec507@gmail.com', NULL, '2026-05-17 19:11:14'),
('landing_contact_phone', '4521790952', NULL, '2026-05-17 19:11:14'),
('landing_event_date', '2026-10-14 09:00:00', NULL, '2026-05-21 05:25:02'),
('landing_event_end_date', '2026-10-16 18:30:00', NULL, '2026-05-21 05:25:02'),
('landing_feature_band', '[{\"icon\":\"fas fa-bullhorn\",\"title\":\"4 Convocatorias\",\"desc\":\"Este evento incluye Congreso(Talleres y Conferencias) todo incluido, Torneo de Robótica y Campamento en un solo evento.\"},{\"icon\":\"fas fa-file-alt\",\"title\":\"Precios por etapa\",\"desc\":\"Registra tus robots temprano para conseguir la mejor tarifa.\"},{\"icon\":\"fas fa-file-pdf\",\"title\":\"Reglamentos y guias\",\"desc\":\"Consulta nuestros documentos oficiales y prepara tu robot.\"},{\"icon\":\"fas fa-desktop\",\"title\":\"Tramite en linea\",\"desc\":\"Creas una cuenta, eliges y armas tu paquete y por ultimo sube tu comprobante de pago.\"}]', 'Tarjetas de características de la Landing Page', '2026-06-03 00:36:58'),
('landing_hero_lead', 'Inicia tu experiencia en este mundo de la Electrónica, con las diversas actividades, (Talleres, conferencias, Torneos y actividades de campamento)', NULL, '2026-05-16 23:04:09'),
('landing_hero_pills', 'Congreso que incluye (Talleres y Conferencias), Torneo de Robótica, Campamento.', NULL, '2026-06-03 00:38:47'),
('landing_hero_title', 'Congreso Internacional de Electrónica', NULL, '2026-05-16 23:02:05'),
('landing_location', 'Instituto Tecnológico Superior de Uruapan', NULL, '2026-05-17 19:11:14'),
('maintenance_active', '1', NULL, '2026-06-07 06:12:34'),
('maintenance_end', '2026-06-26T06:00', NULL, '2026-06-25 00:10:48'),
('maintenance_message', '<p><strong>⚙️ Sistema en Mantenimiento - RENOVATEC 2026</strong></p><p>Estimado usuario:</p><p>En este momento nos encontramos realizando tareas de mantenimiento programado en nuestra plataforma. Estamos implementando actualizaciones importantes para ofrecerte una mejor experiencia de usuario.</p><p>Durante este periodo, estamos trabajando en:</p><p><br></p><ul><li>✨ <strong>Mejora de la interfaz:</strong> Un diseño más limpio y fácil de usar.</li><li>📱 <strong>Optimización móvil:</strong> Mejoras significativas en la navegación desde nuestra aplicación.</li><li>🛠️ <strong>Corrección de errores (Bugs):</strong> Ajustes técnicos para que el sistema sea más rápido y estable.</li></ul><p>Nuestro equipo de desarrollo está trabajando a toda marcha para reanudar el sistema lo más pronto posible. Agradecemos profundamente tu paciencia y comprensión mientras preparamos estas mejoras para ti.</p>', NULL, '2026-06-07 04:23:46'),
('maintenance_start', '2026-06-24T18:00', NULL, '2026-06-25 00:10:48'),
('maintenance_token', 'Coppel2003', NULL, '2026-06-06 00:17:20');

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
-- Volcado de datos para la tabla `teams`
--

INSERT INTO `teams` (`id`, `folio`, `created_at`, `country_origin`, `state_id`, `state_name`, `country_name`, `institution_type`, `school_name`, `captain_name`, `captain_email`, `captain_phone`, `registration_stage`, `registration_price`, `payment_status`, `qr_code`, `qr_code_hash`) VALUES
(2, 'JMV-23040098C2', '2026-06-24 05:17:01', 'mexico', NULL, 'Uruapan', 'México', 'preparatoria', 'Instituto tecnológico superior de Uruapan', 'Jimena Morelos Valladares', 'jimenamorelosvalla12@gmail.com', '+524521790952', 1, NULL, 'verified', NULL, NULL);

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
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `requirements_docs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requirements_docs`)),
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

INSERT INTO `workshops` (`id`, `name`, `description`, `location`, `location_type`, `max_capacity`, `instructor_id`, `contact_email`, `contact_phone`, `requirements_docs`, `convocatoria_id`, `schedule_date`, `schedule_start`, `schedule_end`, `status`, `topics`, `materials`, `requirements`, `cover_image_url`, `created_by_admin_id`, `created_at`, `updated_at`, `building`, `room`, `schedule_date_end`, `is_multi_day`) VALUES
(1, 'Introducción a Arduino y Automatización Básica', 'Emprende tu mente he inicia en el mundo de la domótica', 'Edificio D, D2', 'internal', 30, 1, '', '', '[]', NULL, '2026-05-25', '07:00:00', '13:00:00', 'draft', '[\"C++\",\"Motores\",\"Arduino\"]', '[]', 'Laptop', NULL, NULL, '2026-05-23 15:48:20', '2026-06-22 20:59:11', 'Edificio D', 'D2', NULL, 0),
(2, 'Diseño y construcción de un generador eólico', '', 'Laboratorio de mecanica', 'internal', 30, 2, '', '', '[]', NULL, '2026-10-14', '14:00:00', NULL, 'published', '[]', '[]', '', NULL, NULL, '2026-06-22 21:17:04', '2026-06-22 21:26:26', 'Laboratorio de mecanica', '', NULL, 0);

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
(1, 2, 7, '2026-06-24 05:09:46', 'enrolled', NULL, NULL, NULL);

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
(1, 1, 'ws_1_1779551301_64979362.png', '/app/uploads/workshops/ws_1_1779551301_64979362.png', 'gallery', 1, '', '2026-05-23 15:48:21'),
(2, 1, 'ws_1_1780153409_87a386b8.png', '/app/uploads/workshops/ws_1_1780153409_87a386b8.png', 'gallery', 0, '', '2026-05-30 15:03:29'),
(3, 2, 'ws_2_1782163563_212cd194.jpeg', '/app/uploads/workshops/ws_2_1782163563_212cd194.jpeg', 'gallery', 1, '', '2026-06-22 21:26:03');

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
(1, 'Ing. Osvaldo Gonzalez', 'gooj030829@itsuruapan.edu.mx', '4521123947', 'Ingeniero Electrónico especializado en Arduino', 'Electrónica', 'instructor', 'Osvaldo', '$2y$10$h.zrpS0becMAyDa3rN5WoOI1Dbv75.VOffA4JmjWZtsaGF1cybIpG', 1, NULL, '2026-05-10 04:41:55', '2026-06-05 21:09:08', '2026-06-05 21:09:08'),
(2, 'Ing. Alejandro Garcia Garcia', '', '', 'Docente del Instituto Vasco de Quiroga. Morelia, Michoacán', '', 'instructor', 'AlejandroGG', '$2y$10$juMKZAur0BxMeuhB/61/seNePICo.SBtyuLtKHBozzZfGX/7smAgS', 1, NULL, '2026-06-22 21:04:20', '2026-06-24 05:01:11', '2026-06-24 05:01:11'),
(6, 'Ramses Trejo', 'ramses1245@gmail.com', '', '', '', 'speaker', 'Ramses Trejo', '$2y$10$CqnTvPc1c/asvUrxSfg3p.DSTyap7J.WcFmNfE0wSV7KGinRCATs.', 1, NULL, '2026-06-24 04:52:01', '2026-06-24 04:59:27', '2026-06-24 04:59:27');

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
-- Indices de la tabla `conference_enrollments`
--
ALTER TABLE `conference_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conf_user` (`user_id`),
  ADD KEY `idx_conf_id` (`conference_id`);

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
-- Indices de la tabla `custom_module_items`
--
ALTER TABLE `custom_module_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cmi_module` (`module_id`),
  ADD KEY `idx_cmi_convocatoria` (`convocatoria_id`),
  ADD KEY `idx_cmi_status` (`status`),
  ADD KEY `idx_cmi_date` (`event_date`);

--
-- Indices de la tabla `custom_module_item_images`
--
ALTER TABLE `custom_module_item_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cmii_item` (`item_id`);

--
-- Indices de la tabla `custom_module_staff`
--
ALTER TABLE `custom_module_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cms_item` (`item_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `conference_enrollments`
--
ALTER TABLE `conference_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `conference_images`
--
ALTER TABLE `conference_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `congress_enrollment_requests`
--
ALTER TABLE `congress_enrollment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `congress_registrations`
--
ALTER TABLE `congress_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
-- AUTO_INCREMENT de la tabla `custom_module_items`
--
ALTER TABLE `custom_module_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `custom_module_item_images`
--
ALTER TABLE `custom_module_item_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `custom_module_staff`
--
ALTER TABLE `custom_module_staff`
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `workshops`
--
ALTER TABLE `workshops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

-- --------------------------------------------------------

--
-- Estructura para la vista `stage_statistics`
--
DROP TABLE IF EXISTS `stage_statistics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u160168264_Carlos`@`localhost` SQL SECURITY DEFINER VIEW `stage_statistics`  AS SELECT `rs`.`id` AS `id`, `rs`.`stage_name` AS `stage_name`, count(distinct `t`.`id`) AS `total_teams`, sum(case when `t`.`payment_status` = 'verified' then 1 else 0 end) AS `verified_payments`, count(distinct `r`.`id`) AS `total_robots`, sum(`r`.`robot_price`) AS `total_revenue` FROM ((`registration_stages` `rs` left join `teams` `t` on(`t`.`registration_stage` = `rs`.`id`)) left join `robots` `r` on(`t`.`id` = `r`.`team_id`)) GROUP BY `rs`.`id` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `team_summary`
--
DROP TABLE IF EXISTS `team_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u160168264_Carlos`@`localhost` SQL SECURITY DEFINER VIEW `team_summary`  AS SELECT `t`.`id` AS `id`, `t`.`folio` AS `folio`, `t`.`captain_name` AS `captain_name`, `t`.`captain_email` AS `captain_email`, `t`.`school_name` AS `school_name`, count(distinct `m`.`id`) AS `total_members`, count(distinct `r`.`id`) AS `total_robots`, sum(`r`.`robot_price`) AS `total_cost`, `rs`.`stage_name` AS `registration_stage_name`, `t`.`payment_status` AS `payment_status`, `t`.`created_at` AS `created_at` FROM (((`teams` `t` left join `team_members` `m` on(`t`.`id` = `m`.`team_id`)) left join `robots` `r` on(`t`.`id` = `r`.`team_id`)) left join `registration_stages` `rs` on(`t`.`registration_stage` = `rs`.`id`)) GROUP BY `t`.`id` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_workshops_with_conv`
--
DROP TABLE IF EXISTS `v_workshops_with_conv`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u160168264_Carlos`@`localhost` SQL SECURITY DEFINER VIEW `v_workshops_with_conv`  AS SELECT `w`.`id` AS `id`, `w`.`name` AS `name`, `w`.`status` AS `status`, `w`.`schedule_date` AS `schedule_date`, `w`.`convocatoria_id` AS `convocatoria_id`, coalesce(`c`.`titulo`,'Congreso (por defecto)') AS `convocatoria_titulo`, coalesce(`c`.`codigo`,'congreso') AS `convocatoria_codigo` FROM (`workshops` `w` left join `convocatorias` `c` on(`c`.`id` = `w`.`convocatoria_id`)) ;

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
-- Filtros para la tabla `custom_module_items`
--
ALTER TABLE `custom_module_items`
  ADD CONSTRAINT `custom_module_items_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `convocatoria_modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `custom_module_items_ibfk_2` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `custom_module_item_images`
--
ALTER TABLE `custom_module_item_images`
  ADD CONSTRAINT `custom_module_item_images_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `custom_module_items` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `custom_module_staff`
--
ALTER TABLE `custom_module_staff`
  ADD CONSTRAINT `custom_module_staff_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `custom_module_items` (`id`) ON DELETE CASCADE;

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
