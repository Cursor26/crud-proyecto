-- Historial laboral (RF8): registra cambios de puesto, departamento y salario por empleado.
-- Ejecutar en phpMyAdmin o MySQL Workbench sobre bd_crud.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `historial_laboral` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `tipo_cambio` enum('puesto','departamento','salario') NOT NULL,
  `valor_anterior` varchar(255) DEFAULT NULL,
  `valor_nuevo` varchar(255) DEFAULT NULL,
  `fecha_cambio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_historial_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_historial_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM historial_laboral ORDER BY fecha_cambio DESC LIMIT 5;
