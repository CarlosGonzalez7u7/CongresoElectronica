-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: renovatec_db
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '50d17b74-b469-11f0-b954-14cb196a05bb:1-2725';

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('superadmin','reviewer','staff') COLLATE utf8mb4_unicode_ci DEFAULT 'staff',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_admin_active` (`is_active`),
  KEY `idx_admin_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
INSERT INTO `admin_users` VALUES (1,'admin','Administrador General','admin@renovatec.local','$2y$10$Gr8n5SCyHTtxSiEdosF/pu1smMqHqK7obwEaenRdb7xgEjAKXSDhW','superadmin',1,'2026-03-31 04:06:13','2026-04-01 01:46:08','2026-04-01 01:46:08');
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changes` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_action` (`action`),
  KEY `idx_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `camp_registrations`
--

DROP TABLE IF EXISTS `camp_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `camp_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT 'platform_users.id',
  `congress_registration_id` int NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '200.00',
  `status` enum('pending','confirmed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_camp_user` (`user_id`),
  KEY `congress_registration_id` (`congress_registration_id`),
  KEY `idx_camp_status` (`status`),
  CONSTRAINT `camp_registrations_ibfk_1` FOREIGN KEY (`congress_registration_id`) REFERENCES `congress_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `camp_registrations`
--

LOCK TABLES `camp_registrations` WRITE;
/*!40000 ALTER TABLE `camp_registrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `camp_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competition_categories`
--

DROP TABLE IF EXISTS `competition_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competition_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `max_weight` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `difficulty_level` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competition_categories`
--

LOCK TABLES `competition_categories` WRITE;
/*!40000 ALTER TABLE `competition_categories` DISABLE KEYS */;
INSERT INTO `competition_categories` VALUES (1,'guerra-1lb','Guerra 1lb','Robots de combate de 1 libra de peso','1 lb',3,1,'2026-03-31 02:54:18'),(2,'mini-sumo-rc','Mini sumo RC','Robots de control remoto luchando en un ring','500 g',3,1,'2026-03-31 02:54:18'),(3,'robot-insecto','Robot insecto','Robots tipo insecto con desplazamiento especializado','Variable',4,1,'2026-03-31 02:54:18'),(4,'seguidor-linea','Seguidor de Línea','Robots que siguen un camino marcado a velocidad máxima','Variable',2,1,'2026-03-31 02:54:18'),(5,'sumo-autonomo','Sumó Autónomo','Robots que luchan automáticamente sin control remoto','3 kg',4,1,'2026-03-31 02:54:18'),(6,'construccion','Construcción','Categoría de construcción y diseño','Variable',3,1,'2026-03-31 02:54:18'),(7,'programacion','Programación','Categoría de reto de programación','Variable',5,1,'2026-03-31 02:54:18'),(16,'robot-guerra-1lb','Robot de guerra 1 lb','Robots de combate de 1 libra de peso','1 lb',3,1,'2026-04-23 00:05:37'),(17,'robot-guerra-3lb','Robot de guerra 3 lb','Robots de combate de 3 libras de peso','3 lb',4,1,'2026-04-23 00:05:37'),(18,'seguidor-linea-profesional','Seguidor de línea profesional','Competencia de seguimiento de línea nivel profesional','Variable',4,1,'2026-04-23 00:05:37'),(19,'seguidor-linea-amateur','Seguidor de línea amateur','Competencia de seguimiento de línea nivel amateur','Variable',2,1,'2026-04-23 00:05:37'),(20,'carros-rc','Carros RC','Vehículos de control remoto para pruebas de velocidad y maniobra','Variable',2,1,'2026-04-23 00:05:37'),(21,'soccer-rc','Soccer RC','Competencia tipo fútbol con robots de control remoto','Variable',3,1,'2026-04-23 00:05:37');
/*!40000 ALTER TABLE `competition_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `congress_enrollment_requests`
--

DROP TABLE IF EXISTS `congress_enrollment_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `congress_enrollment_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `congress_year` year NOT NULL DEFAULT '2026',
  `request_folio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_snapshot_json` longtext COLLATE utf8mb4_unicode_ci,
  `robots_snapshot_json` longtext COLLATE utf8mb4_unicode_ci,
  `members_snapshot_json` longtext COLLATE utf8mb4_unicode_ci,
  `includes_congress` tinyint(1) DEFAULT '1',
  `includes_robotics` tinyint(1) DEFAULT '0',
  `includes_camp` tinyint(1) DEFAULT '0',
  `congress_fee` decimal(10,2) DEFAULT '400.00',
  `robotics_fee` decimal(10,2) DEFAULT '0.00',
  `camp_fee` decimal(10,2) DEFAULT '0.00',
  `total_fee` decimal(10,2) DEFAULT '400.00',
  `receipt_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_filename` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_uploaded_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','approved','rejected','resubmit_requested') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by_admin_id` int DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_year` (`user_id`,`congress_year`),
  UNIQUE KEY `unique_request_folio` (`request_folio`),
  KEY `idx_cer_user` (`user_id`),
  KEY `idx_cer_status` (`status`),
  KEY `idx_cer_year` (`congress_year`),
  CONSTRAINT `fk_cer_user` FOREIGN KEY (`user_id`) REFERENCES `platform_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `congress_enrollment_requests`
--

LOCK TABLES `congress_enrollment_requests` WRITE;
/*!40000 ALTER TABLE `congress_enrollment_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `congress_enrollment_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `congress_registrations`
--

DROP TABLE IF EXISTS `congress_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `congress_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio_inscripcion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int NOT NULL,
  `congress_year` int NOT NULL,
  `registration_fee` decimal(10,2) NOT NULL DEFAULT '400.00',
  `payment_status` enum('pending','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `country_snapshot` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city_snapshot` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_snapshot` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL,
  `matricula_snapshot` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comprobante_ruta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_year` (`user_id`,`congress_year`),
  UNIQUE KEY `folio_inscripcion` (`folio_inscripcion`),
  KEY `idx_congress_status` (`payment_status`),
  CONSTRAINT `fk_congress_user` FOREIGN KEY (`user_id`) REFERENCES `platform_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `congress_registrations`
--

LOCK TABLES `congress_registrations` WRITE;
/*!40000 ALTER TABLE `congress_registrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `congress_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscripciones_taller`
--

DROP TABLE IF EXISTS `inscripciones_taller`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscripciones_taller` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `taller_id` int NOT NULL,
  `fecha_inscripcion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_taller_unico` (`user_id`),
  KEY `taller_id` (`taller_id`),
  CONSTRAINT `inscripciones_taller_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `platform_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inscripciones_taller_ibfk_2` FOREIGN KEY (`taller_id`) REFERENCES `talleres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscripciones_taller`
--

LOCK TABLES `inscripciones_taller` WRITE;
/*!40000 ALTER TABLE `inscripciones_taller` DISABLE KEYS */;
/*!40000 ALTER TABLE `inscripciones_taller` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `legal_acceptance`
--

DROP TABLE IF EXISTS `legal_acceptance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legal_acceptance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `accepted_liability` tinyint(1) DEFAULT '0',
  `accepted_terms` tinyint(1) DEFAULT '0',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_liability_team` (`team_id`),
  CONSTRAINT `legal_acceptance_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `legal_acceptance`
--

LOCK TABLES `legal_acceptance` WRITE;
/*!40000 ALTER TABLE `legal_acceptance` DISABLE KEYS */;
/*!40000 ALTER TABLE `legal_acceptance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participant_checkins`
--

DROP TABLE IF EXISTS `participant_checkins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participant_checkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `checkin_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `checked_in_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'ADMIN',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_checkin` (`team_id`),
  CONSTRAINT `participant_checkins_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participant_checkins`
--

LOCK TABLES `participant_checkins` WRITE;
/*!40000 ALTER TABLE `participant_checkins` DISABLE KEYS */;
/*!40000 ALTER TABLE `participant_checkins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participant_robot_checkins`
--

DROP TABLE IF EXISTS `participant_robot_checkins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participant_robot_checkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `robot_id` int NOT NULL,
  `arrived` tinyint(1) NOT NULL DEFAULT '0',
  `checkin_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `checked_in_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'ADMIN',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `category_snapshot` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `robot_name_snapshot` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_robot_checkin` (`robot_id`),
  KEY `idx_robot_team` (`team_id`),
  CONSTRAINT `participant_robot_checkins_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `participant_robot_checkins_ibfk_2` FOREIGN KEY (`robot_id`) REFERENCES `robots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participant_robot_checkins`
--

LOCK TABLES `participant_robot_checkins` WRITE;
/*!40000 ALTER TABLE `participant_robot_checkins` DISABLE KEYS */;
/*!40000 ALTER TABLE `participant_robot_checkins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_receipts`
--

DROP TABLE IF EXISTS `payment_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `total_amount` int NOT NULL,
  `number_of_robots` int NOT NULL,
  `approved_robots_count` int DEFAULT NULL,
  `price_per_robot` int NOT NULL,
  `receipt_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_size` int DEFAULT NULL,
  `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verification_date` timestamp NULL DEFAULT NULL,
  `verified_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_receipt` (`team_id`),
  CONSTRAINT `payment_receipts_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_receipts`
--

LOCK TABLES `payment_receipts` WRITE;
/*!40000 ALTER TABLE `payment_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_users`
--

DROP TABLE IF EXISTS `platform_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `control_number` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `career` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `semester` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `career_semester` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL,
  `matricula` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('alumno','tallerista','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'alumno',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `email_verification_code` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verification_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `uq_platform_control_number` (`control_number`),
  KEY `idx_platform_role` (`role`),
  KEY `idx_platform_active` (`is_active`),
  KEY `idx_platform_verified` (`email_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_users`
--

LOCK TABLES `platform_users` WRITE;
/*!40000 ALTER TABLE `platform_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `platform_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registration_stages`
--

DROP TABLE IF EXISTS `registration_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_stages` (
  `id` int NOT NULL,
  `stage_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `price_per_robot` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `color_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registration_stages`
--

LOCK TABLES `registration_stages` WRITE;
/*!40000 ALTER TABLE `registration_stages` DISABLE KEYS */;
INSERT INTO `registration_stages` VALUES (1,'Etapa 1','2024-04-01 00:00:00','2024-06-30 23:59:59',130,'Primera etapa: Promoción temprana',1,'#28a745'),(2,'Etapa 2','2024-07-01 00:00:00','2024-08-31 23:59:59',200,'Segunda etapa: Registro regular',1,'#007bff'),(3,'Etapa 3','2024-09-01 00:00:00','2024-10-23 23:59:59',350,'Tercera etapa: Última oportunidad',1,'#fd7e14');
/*!40000 ALTER TABLE `registration_stages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `robots`
--

DROP TABLE IF EXISTS `robots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `robots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `robot_number` int DEFAULT NULL,
  `robot_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_stage` int DEFAULT NULL,
  `robot_price` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_stage` (`registration_stage`),
  KEY `idx_robots_team` (`team_id`),
  CONSTRAINT `robots_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `robots`
--

LOCK TABLES `robots` WRITE;
/*!40000 ALTER TABLE `robots` DISABLE KEYS */;
/*!40000 ALTER TABLE `robots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `stage_statistics`
--

DROP TABLE IF EXISTS `stage_statistics`;
/*!50001 DROP VIEW IF EXISTS `stage_statistics`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `stage_statistics` AS SELECT 
 1 AS `id`,
 1 AS `stage_name`,
 1 AS `total_teams`,
 1 AS `verified_payments`,
 1 AS `total_robots`,
 1 AS `total_revenue`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `talleres`
--

DROP TABLE IF EXISTS `talleres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `talleres` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lugar` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cupo_maximo` int NOT NULL DEFAULT '20',
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `temario` text COLLATE utf8mb4_unicode_ci,
  `materiales` text COLLATE utf8mb4_unicode_ci,
  `imagenes_json` json DEFAULT NULL,
  `token_edicion` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_edicion` (`token_edicion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `talleres`
--

LOCK TABLES `talleres` WRITE;
/*!40000 ALTER TABLE `talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `member_number` int DEFAULT NULL,
  `member_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_captain` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_member` (`team_id`,`member_number`),
  KEY `idx_members_team` (`team_id`),
  CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `team_summary`
--

DROP TABLE IF EXISTS `team_summary`;
/*!50001 DROP VIEW IF EXISTS `team_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `team_summary` AS SELECT 
 1 AS `id`,
 1 AS `folio`,
 1 AS `captain_name`,
 1 AS `captain_email`,
 1 AS `school_name`,
 1 AS `total_members`,
 1 AS `total_robots`,
 1 AS `total_cost`,
 1 AS `registration_stage_name`,
 1 AS `payment_status`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `country_origin` enum('mexico','exterior') COLLATE utf8mb4_unicode_ci DEFAULT 'mexico',
  `state_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `institution_type` enum('preparatoria','universidad') COLLATE utf8mb4_unicode_ci DEFAULT 'preparatoria',
  `school_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `captain_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `captain_email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `captain_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_stage` int DEFAULT '1',
  `registration_price` int DEFAULT NULL,
  `payment_status` enum('pending','verified','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `qr_code` longblob,
  `qr_code_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `folio` (`folio`),
  KEY `idx_folio` (`folio`),
  KEY `idx_email` (`captain_email`),
  KEY `idx_stage` (`registration_stage`),
  KEY `idx_status` (`payment_status`),
  KEY `idx_teams_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workshop_attendance_sessions`
--

DROP TABLE IF EXISTS `workshop_attendance_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workshop_attendance_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workshop_id` int NOT NULL,
  `session_date` date NOT NULL,
  `opened_by_instructor_id` int DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `opened_by_instructor_id` (`opened_by_instructor_id`),
  KEY `idx_was_workshop` (`workshop_id`),
  KEY `idx_was_date` (`session_date`),
  CONSTRAINT `workshop_attendance_sessions_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workshop_attendance_sessions_ibfk_2` FOREIGN KEY (`opened_by_instructor_id`) REFERENCES `workshop_instructors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workshop_attendance_sessions`
--

LOCK TABLES `workshop_attendance_sessions` WRITE;
/*!40000 ALTER TABLE `workshop_attendance_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `workshop_attendance_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workshop_enrollments`
--

DROP TABLE IF EXISTS `workshop_enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workshop_enrollments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workshop_id` int NOT NULL,
  `user_id` int NOT NULL COMMENT 'platform_users.id',
  `enrolled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('enrolled','cancelled','attended','no_show') COLLATE utf8mb4_unicode_ci DEFAULT 'enrolled',
  `attendance_marked_at` timestamp NULL DEFAULT NULL,
  `attendance_marked_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_workshop_user` (`workshop_id`,`user_id`),
  KEY `idx_we_user` (`user_id`),
  KEY `idx_we_status` (`status`),
  CONSTRAINT `workshop_enrollments_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workshop_enrollments`
--

LOCK TABLES `workshop_enrollments` WRITE;
/*!40000 ALTER TABLE `workshop_enrollments` DISABLE KEYS */;
/*!40000 ALTER TABLE `workshop_enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workshop_instructors`
--

DROP TABLE IF EXISTS `workshop_instructors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workshop_instructors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `specialty` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by_admin_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_instructor_active` (`is_active`),
  KEY `idx_instructor_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workshop_instructors`
--

LOCK TABLES `workshop_instructors` WRITE;
/*!40000 ALTER TABLE `workshop_instructors` DISABLE KEYS */;
/*!40000 ALTER TABLE `workshop_instructors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workshops`
--

DROP TABLE IF EXISTS `workshops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workshops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `location` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Salón, aula o lugar externo',
  `location_type` enum('internal','external') COLLATE utf8mb4_unicode_ci DEFAULT 'internal' COMMENT 'internal=campus, external=fuera',
  `max_capacity` int NOT NULL DEFAULT '30',
  `instructor_id` int DEFAULT NULL,
  `schedule_date` date DEFAULT NULL COMMENT 'Fecha del taller',
  `schedule_start` time DEFAULT NULL COMMENT 'Hora inicio',
  `schedule_end` time DEFAULT NULL COMMENT 'Hora fin',
  `status` enum('draft','published','full','cancelled','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `topics` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array de temas',
  `materials` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array de materiales requeridos',
  `requirements` text COLLATE utf8mb4_unicode_ci COMMENT 'Requisitos para el alumno',
  `cover_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_admin_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_workshop_status` (`status`),
  KEY `idx_workshop_instructor` (`instructor_id`),
  KEY `idx_workshop_date` (`schedule_date`),
  CONSTRAINT `workshops_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `workshop_instructors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workshops`
--

LOCK TABLES `workshops` WRITE;
/*!40000 ALTER TABLE `workshops` DISABLE KEYS */;
/*!40000 ALTER TABLE `workshops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `stage_statistics`
--

/*!50001 DROP VIEW IF EXISTS `stage_statistics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `stage_statistics` AS select `rs`.`id` AS `id`,`rs`.`stage_name` AS `stage_name`,count(distinct `t`.`id`) AS `total_teams`,sum((case when (`t`.`payment_status` = 'verified') then 1 else 0 end)) AS `verified_payments`,count(distinct `r`.`id`) AS `total_robots`,sum(`r`.`robot_price`) AS `total_revenue` from ((`registration_stages` `rs` left join `teams` `t` on((`t`.`registration_stage` = `rs`.`id`))) left join `robots` `r` on((`t`.`id` = `r`.`team_id`))) group by `rs`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `team_summary`
--

/*!50001 DROP VIEW IF EXISTS `team_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `team_summary` AS select `t`.`id` AS `id`,`t`.`folio` AS `folio`,`t`.`captain_name` AS `captain_name`,`t`.`captain_email` AS `captain_email`,`t`.`school_name` AS `school_name`,count(distinct `m`.`id`) AS `total_members`,count(distinct `r`.`id`) AS `total_robots`,sum(`r`.`robot_price`) AS `total_cost`,`rs`.`stage_name` AS `registration_stage_name`,`t`.`payment_status` AS `payment_status`,`t`.`created_at` AS `created_at` from (((`teams` `t` left join `team_members` `m` on((`t`.`id` = `m`.`team_id`))) left join `robots` `r` on((`t`.`id` = `r`.`team_id`))) left join `registration_stages` `rs` on((`t`.`registration_stage` = `rs`.`id`))) group by `t`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-30 22:03:23
