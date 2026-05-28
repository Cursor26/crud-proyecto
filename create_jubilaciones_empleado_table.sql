-- Jubilaciones y retiros: registro de salidas definitivas de empleados (bd_crud).
-- Ejecutar en phpMyAdmin o MySQL Workbench.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `jubilaciones_empleado` (
  `id_jubilacion` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `tipo_salida` varchar(100) NOT NULL COMMENT 'Ej. Jubilación ordinaria, Retiro voluntario, Renuncia',
  `fecha_efectiva` date NOT NULL COMMENT 'Fecha en que deja de prestar servicios',
  `motivo` text NOT NULL COMMENT 'Resumen o causa del retiro',
  `observaciones` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_jubilacion`),
  KEY `idx_jub_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_jub_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM jubilaciones_empleado ORDER BY fecha_efectiva DESC, id_jubilacion DESC LIMIT 5;
