-- RF16: estado activo / baja de empleados (MySQL 5.7)
-- Ejecutar en bd_crud. Si alguna columna ya existe, omita ese ALTER.

USE bd_crud;

ALTER TABLE empleados ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE empleados ADD COLUMN fecha_baja DATE NULL DEFAULT NULL;

ALTER TABLE empleados ADD COLUMN motivo_baja VARCHAR(500) NULL DEFAULT NULL;
