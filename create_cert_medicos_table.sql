-- Script SQL para crear tabla CERTIFICADOS MEDICOS en bd_crud

USE bd_crud;

CREATE TABLE IF NOT EXISTS `cert_medicos` (
  `id_cert_medico` int(11) NOT NULL AUTO_INCREMENT,
  `carnet_identidad` varchar(20) NOT NULL COMMENT 'FK empleado',
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `dias_licencia` int(11) DEFAULT NULL,
  `medico_nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cert_medico`),
  KEY `carnet_identidad` (`carnet_identidad`),
  CONSTRAINT `cert_medicos_ibfk_1` FOREIGN KEY (`carnet_identidad`) REFERENCES `empleados` (`carnet_identidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos ejemplo (requiere empleados existentes)
-- INSERT INTO `cert_medicos` ... ;

SELECT * FROM cert_medicos ORDER BY id_cert_medico;
