-- Script SQL para crear tabla CARGOS en bd_crud
-- Ejecutar en phpMyAdmin o MySQL Workbench

USE bd_crud;

CREATE TABLE IF NOT EXISTS `cargos` (
  `id_cargo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `salario_base` decimal(10,2) DEFAULT NULL,
  `departamento` varchar(50) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cargo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de ejemplo (opcional)
INSERT INTO `cargos` (`nombre`, `descripcion`, `salario_base`, `departamento`, `activo`) VALUES
('Gerente General', 'Responsable de la dirección estratégica de la empresa', 2500.00, 'Dirección', 1),
('Jefe de Producción', 'Supervisa todas las operaciones de producción', 1800.00, 'Producción', 1),
('Analista RRHH', 'Gestión de personal y capacitaciones', 1200.00, 'RRHH', 1),
('Operario de Matadero', 'Operaciones en matadero vivo', 900.00, 'Producción', 1);

-- Verificar creación
SELECT * FROM cargos ORDER BY id_cargo;
