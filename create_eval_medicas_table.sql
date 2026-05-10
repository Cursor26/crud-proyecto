-- Evaluaciones / chequeos médicos periódicos de empleados (bd_crud).
-- Ejecutar en phpMyAdmin o MySQL Workbench.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `eval_medicas` (
  `id_eval_medica` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL,
  `fecha_evaluacion` date NOT NULL,
  `tipo_chequeo` varchar(100) NOT NULL DEFAULT 'Periódico' COMMENT 'Ej. Periódico, Ingreso, Post-incidente',
  `resultado` varchar(200) NOT NULL COMMENT 'Ej. Apto, Apto con restricciones',
  `medico_nombre` varchar(150) NOT NULL,
  `proximo_chequeo` date DEFAULT NULL COMMENT 'Próximo control programado',
  `observaciones` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_eval_medica`),
  KEY `idx_evalmed_carnet` (`carnet_identidad`),
  KEY `idx_evalmed_fecha` (`fecha_evaluacion`),
  CONSTRAINT `fk_evalmed_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM eval_medicas ORDER BY fecha_evaluacion DESC, id_eval_medica DESC LIMIT 5;
