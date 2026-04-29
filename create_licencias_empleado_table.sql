-- Licencias de empleados en tabla aparte (ya no en la fila de `empleados`).
-- Ejecutar en bd_crud tras respaldar la base.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `licencias_empleado` (
  `id_licencia` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_registro` date DEFAULT NULL COMMENT 'Fecha de referencia o inscripción de la licencia',
  `observaciones` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_licencia`),
  KEY `idx_licencia_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_licencia_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opcional: volcar texto suelto antiguo desde empleados (una fila por empleado con dato)
-- INSERT INTO licencias_empleado (carnet_identidad, descripcion, fecha_registro, activo)
-- SELECT carnet_identidad, licencias, NULL, 1 FROM empleados WHERE licencias IS NOT NULL AND TRIM(licencias) <> '';
