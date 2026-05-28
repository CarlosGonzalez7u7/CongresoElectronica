-- Migration: convocatoria_modules
-- Ejecutar sobre la base de datos del proyecto para habilitar módulos
-- editables por convocatoria con responsable y configuración extensible.

CREATE TABLE IF NOT EXISTS `convocatoria_modules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`id`),
  KEY `idx_cm_conv` (`convocatoria_id`),
  KEY `idx_cm_type` (`module_type`),
  KEY `idx_cm_status` (`status`),
  CONSTRAINT `fk_cm_convocatoria` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
