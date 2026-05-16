-- =========================================================================
-- SCRIPT DE ACTUALIZACIÓN: Agregar tabla de imágenes para convocatorias
-- =========================================================================

CREATE TABLE IF NOT EXISTS `convocatoria_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `convocatoria_id` int(11) NOT NULL,
  `filename` varchar(300) NOT NULL,
  `url` varchar(500) NOT NULL,
  `caption` text DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_conv_img` (`convocatoria_id`),
  CONSTRAINT `fk_conv_img_convocatoria` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Asegurarse de que la columna descripcion soporte HTML pesado
ALTER TABLE `convocatorias` MODIFY `descripcion` LONGTEXT DEFAULT NULL;