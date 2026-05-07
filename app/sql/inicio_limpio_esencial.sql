-- ==============================================
-- RENOVATEC - INICIO LIMPIO CON DATOS ESENCIALES
-- ==============================================
-- Uso:
-- 1) Ejecutar dentro de MySQL con permisos de ALTER/DELETE/INSERT.
-- 2) Ajustar nombres/correos de admins antes de producción.
-- 3) Contraseñas seed:
--    - admin / admin123
--    - staff / staff123

USE renovatec_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar datos operativos del evento
TRUNCATE TABLE platform_users;
TRUNCATE TABLE congress_enrollment_requests;
TRUNCATE TABLE congress_registrations;
TRUNCATE TABLE camp_registrations;
TRUNCATE TABLE inscripciones_taller;
TRUNCATE TABLE workshop_enrollments;
TRUNCATE TABLE workshop_attendance_sessions;
TRUNCATE TABLE talleres;
TRUNCATE TABLE workshops;
TRUNCATE TABLE workshop_days;
TRUNCATE TABLE workshop_images;
TRUNCATE TABLE workshop_instructors;
TRUNCATE TABLE conferences;
TRUNCATE TABLE conference_images;
TRUNCATE TABLE participant_robot_checkins;
TRUNCATE TABLE participant_checkins;
TRUNCATE TABLE payment_receipts;
TRUNCATE TABLE legal_acceptance;
TRUNCATE TABLE team_members;
TRUNCATE TABLE robots;
TRUNCATE TABLE teams;
TRUNCATE TABLE audit_log;

SET FOREIGN_KEY_CHECKS = 1;

-- Asegurar tabla de usuarios admin
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('superadmin', 'reviewer', 'staff') DEFAULT 'staff',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_admin_active (is_active),
  INDEX idx_admin_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(180) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  country VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  school VARCHAR(220) NOT NULL,
  matricula VARCHAR(60) NULL,
  role ENUM('alumno', 'tallerista', 'admin') NOT NULL DEFAULT 'alumno',
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_code VARCHAR(12) NULL,
  email_verification_expires_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_platform_role (role),
  INDEX idx_platform_active (is_active),
  INDEX idx_platform_verified (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS congress_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  congress_year INT NOT NULL,
  registration_fee DECIMAL(10,2) NOT NULL DEFAULT 400.00,
  payment_status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  country_snapshot VARCHAR(120) NOT NULL,
  city_snapshot VARCHAR(120) NOT NULL,
  school_snapshot VARCHAR(220) NOT NULL,
  matricula_snapshot VARCHAR(60) NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_year (user_id, congress_year),
  INDEX idx_congress_status (payment_status),
  CONSTRAINT fk_congress_user FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reset controlado de usuarios admin (conserva ids secuenciales)
DELETE FROM admin_users;

-- password_hash generado por PHP password_hash(PASSWORD_DEFAULT)
INSERT INTO admin_users (username, full_name, email, password_hash, role, is_active)
VALUES
('admin', 'Administrador General', 'admin@renovatec.local', '$2y$10$i2ZMqlItOffMSmCEb.5Et.hZCJN6ec0.57givaI9nX7WHZ1O4T3ni', 'superadmin', 1),
('staff', 'Personal Operativo', 'staff@renovatec.local', '$2y$10$qkVbZXy4M6ytluQsdiTwy.iqd2yiSIkysZrkvmdkWkaJOXI1Emeqm', 'staff', 1);

-- Mantener y normalizar catalogo de categorias
CREATE TABLE IF NOT EXISTS competition_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(50) UNIQUE NOT NULL,
  category_name VARCHAR(150) NOT NULL,
  description TEXT,
  max_weight VARCHAR(50),
  difficulty_level INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM competition_categories;

INSERT INTO competition_categories (category_code, category_name, description, max_weight, difficulty_level, is_active)
VALUES
('robot-guerra-1lb', 'Robot de guerra 1 lb', 'Robots de combate de 1 libra de peso', '1 lb', 3, 1),
('robot-guerra-3lb', 'Robot de guerra 3 lb', 'Robots de combate de 3 libras de peso', '3 lb', 4, 1),
('seguidor-linea-profesional', 'Seguidor de linea profesional', 'Competencia de seguimiento de linea nivel profesional', 'Variable', 4, 1),
('seguidor-linea-amateur', 'Seguidor de linea amateur', 'Competencia de seguimiento de linea nivel amateur', 'Variable', 2, 1),
('carros-rc', 'Carros RC', 'Vehiculos de control remoto para pruebas de velocidad y maniobra', 'Variable', 2, 1),
('soccer-rc', 'Soccer RC', 'Competencia tipo futbol con robots de control remoto', 'Variable', 3, 1),
('mini-sumo-rc', 'Mini sumo RC', 'Robots de control remoto luchando en un ring', '500 g', 3, 1),
('robot-insecto', 'Robot insecto', 'Robots tipo insecto con desplazamiento especializado', 'Variable', 4, 1);

-- Mantener y normalizar etapas de registro
CREATE TABLE IF NOT EXISTS registration_stages (
  id INT PRIMARY KEY,
  stage_name VARCHAR(100) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  price_per_robot INT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  color_code VARCHAR(10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM registration_stages;

INSERT INTO registration_stages (id, stage_name, start_date, end_date, price_per_robot, description, is_active, color_code)
VALUES
(1, 'Etapa 1', '2026-04-01 00:00:00', '2026-06-30 23:59:59', 130, 'Primera etapa: Promocion temprana', 1, '#28a745'),
(2, 'Etapa 2', '2026-07-01 00:00:00', '2026-08-31 23:59:59', 200, 'Segunda etapa: Registro regular', 1, '#007bff'),
(3, 'Etapa 3', '2026-09-01 00:00:00', '2026-10-23 23:59:59', 350, 'Tercera etapa: Ultima oportunidad', 1, '#fd7e14');

-- Opcional: reiniciar autoincrement de tablas operativas principales
ALTER TABLE teams AUTO_INCREMENT = 1;
ALTER TABLE team_members AUTO_INCREMENT = 1;
ALTER TABLE robots AUTO_INCREMENT = 1;
ALTER TABLE payment_receipts AUTO_INCREMENT = 1;
ALTER TABLE participant_checkins AUTO_INCREMENT = 1;
ALTER TABLE participant_robot_checkins AUTO_INCREMENT = 1;
ALTER TABLE legal_acceptance AUTO_INCREMENT = 1;
ALTER TABLE audit_log AUTO_INCREMENT = 1;
ALTER TABLE admin_users AUTO_INCREMENT = 1;
ALTER TABLE congress_registrations AUTO_INCREMENT = 1;
ALTER TABLE platform_users AUTO_INCREMENT = 1;
ALTER TABLE congress_enrollment_requests AUTO_INCREMENT = 1;
ALTER TABLE camp_registrations AUTO_INCREMENT = 1;
ALTER TABLE inscripciones_taller AUTO_INCREMENT = 1;
ALTER TABLE workshop_enrollments AUTO_INCREMENT = 1;
ALTER TABLE workshop_attendance_sessions AUTO_INCREMENT = 1;
ALTER TABLE talleres AUTO_INCREMENT = 1;
ALTER TABLE workshops AUTO_INCREMENT = 1;
ALTER TABLE workshop_days AUTO_INCREMENT = 1;
ALTER TABLE workshop_images AUTO_INCREMENT = 1;
ALTER TABLE workshop_instructors AUTO_INCREMENT = 1;
ALTER TABLE conferences AUTO_INCREMENT = 1;
ALTER TABLE conference_images AUTO_INCREMENT = 1;

SELECT 'Inicio limpio aplicado. Datos operativos reiniciados y catalogos esenciales cargados.' AS status;
