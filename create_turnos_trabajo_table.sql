-- Turnos de trabajo: asignación de horario y turno por empleado (bd_crud).
-- Ejecutar en phpMyAdmin o MySQL Workbench.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `turnos_trabajo` (
  `id_turno` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `nombre_turno` varchar(120) NOT NULL COMMENT 'Nombre del turno (ej. Mañana, Nocturno A)',
  `hora_entrada` time NOT NULL,
  `hora_salida` time NOT NULL,
  `dias_aplicacion` varchar(150) NOT NULL DEFAULT 'Lunes a viernes' COMMENT 'Días en que aplica el turno',
  `horas_diarias` decimal(5,2) DEFAULT NULL COMMENT 'Horas de trabajo por día (opcional)',
  `observaciones` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_turno`),
  KEY `idx_turno_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_turno_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM turnos_trabajo ORDER BY id_turno DESC LIMIT 5;
