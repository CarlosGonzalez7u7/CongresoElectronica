SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. LIMPIEZA DE TORNEOS DE ROBÓTICA (Hijos primero, luego el padre)
-- =========================================================
DELETE FROM `participant_robot_checkins`;
DELETE FROM `participant_checkins`;
DELETE FROM `legal_acceptance`;
DELETE FROM `payment_receipts`;
DELETE FROM `team_members`;
DELETE FROM `robots`;
DELETE FROM `teams`;

-- Reiniciar contadores
ALTER TABLE `participant_robot_checkins` AUTO_INCREMENT = 1;
ALTER TABLE `participant_checkins` AUTO_INCREMENT = 1;
ALTER TABLE `legal_acceptance` AUTO_INCREMENT = 1;
ALTER TABLE `payment_receipts` AUTO_INCREMENT = 1;
ALTER TABLE `team_members` AUTO_INCREMENT = 1;
ALTER TABLE `robots` AUTO_INCREMENT = 1;
ALTER TABLE `teams` AUTO_INCREMENT = 1;

-- =========================================================
-- 2. LIMPIEZA DE TALLERES (WORKSHOPS) Y DEPENDENCIAS
-- =========================================================
DELETE FROM `workshop_attendance_sessions`;
DELETE FROM `workshop_days`;
DELETE FROM `workshop_enrollments`;
DELETE FROM `workshop_images`;
DELETE FROM `workshops`;

-- Reiniciar contadores
ALTER TABLE `workshop_attendance_sessions` AUTO_INCREMENT = 1;
ALTER TABLE `workshop_days` AUTO_INCREMENT = 1;
ALTER TABLE `workshop_enrollments` AUTO_INCREMENT = 1;
ALTER TABLE `workshop_images` AUTO_INCREMENT = 1;
ALTER TABLE `workshops` AUTO_INCREMENT = 1;

-- =========================================================
-- 3. LIMPIEZA DE CONGRESOS, CAMPAMENTOS Y CONFERENCIAS
-- =========================================================
DELETE FROM `camp_registrations`;
DELETE FROM `congress_registrations`;
DELETE FROM `congress_enrollment_requests`;
DELETE FROM `conference_images`;
DELETE FROM `conferences`;

-- Reiniciar contadores
ALTER TABLE `camp_registrations` AUTO_INCREMENT = 1;
ALTER TABLE `congress_registrations` AUTO_INCREMENT = 1;
ALTER TABLE `congress_enrollment_requests` AUTO_INCREMENT = 1;
ALTER TABLE `conference_images` AUTO_INCREMENT = 1;
ALTER TABLE `conferences` AUTO_INCREMENT = 1;

-- =========================================================
-- 4. LIMPIEZA DE LOGS Y DATOS TEMPORALES
-- =========================================================
DELETE FROM `audit_log`;
DELETE FROM `ip_rate_limits`;

-- Reiniciar contadores
ALTER TABLE `audit_log` AUTO_INCREMENT = 1;

-- Reactivar revisiones de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;