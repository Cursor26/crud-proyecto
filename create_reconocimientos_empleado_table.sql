-- Reconocimientos: premios o estímulos a empleados destacados (bd_crud).
-- Ejecutar en phpMyAdmin o MySQL Workbench.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `reconocimientos_empleado` (
  `id_reconocimiento` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `tipo_reconocimiento` varchar(100) NOT NULL COMMENT 'Ej. Premio, Estímulo económico, Mención honorífica',
  `descripcion` text NOT NULL,
  `fecha_otorgamiento` date NOT NULL,
  `valor_estimulo` decimal(10,2) DEFAULT NULL COMMENT 'Monto opcional si aplica estímulo económico',
  `observaciones` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_reconocimiento`),
  KEY `idx_recon_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_recon_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM reconocimientos_empleado ORDER BY fecha_otorgamiento DESC, id_reconocimiento DESC LIMIT 5;
