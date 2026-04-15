-- Sanciones aplicadas a empleados (bd_crud).
-- Ejecutar en phpMyAdmin o MySQL Workbench.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `sanciones_empleado` (
  `id_sancion` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `tipo_sancion` varchar(100) NOT NULL COMMENT 'Ej. Apercibimiento, Amonestación escrita, Suspensión',
  `motivo` text NOT NULL,
  `fecha_aplicacion` date NOT NULL,
  `dias_suspension` int(11) DEFAULT NULL COMMENT 'Solo si aplica suspensión por días',
  `observaciones` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_sancion`),
  KEY `idx_sancion_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_sancion_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM sanciones_empleado ORDER BY fecha_aplicacion DESC, id_sancion DESC LIMIT 5;
