-- Grupos de trabajo y asistencia grupal (bd_crud).
-- Ejecutar en phpMyAdmin o MySQL Workbench.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `grupos_trabajo` (
  `id_grupo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `descripcion` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `grupo_miembros` (
  `id_grupo` int(11) NOT NULL,
  `carnet_identidad` varchar(20) NOT NULL,
  PRIMARY KEY (`id_grupo`,`carnet_identidad`),
  KEY `idx_gm_carnet` (`carnet_identidad`),
  CONSTRAINT `fk_gm_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `grupos_trabajo` (`id_grupo`) ON DELETE CASCADE,
  CONSTRAINT `fk_gm_empleado` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `asistencia_grupal` (
  `id_asistencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_grupo` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `miembros_presentes` int(11) NOT NULL,
  `miembros_total` int(11) NOT NULL COMMENT 'Total de miembros al momento del registro',
  `observaciones` text,
  PRIMARY KEY (`id_asistencia`),
  UNIQUE KEY `uq_grupo_fecha` (`id_grupo`,`fecha`),
  KEY `idx_ag_grupo` (`id_grupo`),
  CONSTRAINT `fk_ag_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `grupos_trabajo` (`id_grupo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT g.id_grupo, g.nombre,
       (SELECT COUNT(*) FROM grupo_miembros m WHERE m.id_grupo = g.id_grupo) AS num_miembros
FROM grupos_trabajo g;
