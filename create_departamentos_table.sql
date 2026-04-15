-- Departamentos y asignación de empleados (RF15) — bd_crud
-- Ejecutar en phpMyAdmin o MySQL Workbench.
-- Si la columna `id_departamento` ya existe en `empleados`, omita solo el ALTER TABLE.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `departamentos` (
  `id_departamento` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `id_padre` int(11) DEFAULT NULL COMMENT 'Departamento superior (organigrama)',
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `idx_depto_padre` (`id_padre`),
  CONSTRAINT `fk_depto_padre` FOREIGN KEY (`id_padre`) REFERENCES `departamentos` (`id_departamento`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `empleados`
  ADD COLUMN `id_departamento` int(11) NULL DEFAULT NULL AFTER `departamento`,
  ADD KEY `idx_emp_depto` (`id_departamento`),
  ADD CONSTRAINT `fk_empleado_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE SET NULL ON UPDATE CASCADE;

SELECT d.id_departamento, d.nombre, d.id_padre, d.activo FROM departamentos d ORDER BY d.nombre;
