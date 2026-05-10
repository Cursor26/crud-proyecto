-- RF19: nivel escolar y superación en proceso (MySQL 5.7)
-- Ejecutar en bd_crud. Si alguna columna ya existe, omita ese ALTER.

USE bd_crud;

ALTER TABLE empleados ADD COLUMN nivel_escolar VARCHAR(120) NULL DEFAULT NULL;

ALTER TABLE empleados ADD COLUMN superacion_en_proceso VARCHAR(500) NULL DEFAULT NULL COMMENT 'Capacitación o estudios en curso';
