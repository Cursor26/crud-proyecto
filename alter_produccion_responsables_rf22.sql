-- RF22 — Responsables de registros estadísticos de producción
-- Ejecutar en bd_crud. Omita el ALTER si la columna ya existe.

USE bd_crud;

ALTER TABLE `sacrificio_vacuno` ADD COLUMN `creado_por` varchar(255) NULL DEFAULT NULL;
ALTER TABLE `sacrificio_vacuno` ADD COLUMN `actualizado_por` varchar(255) NULL DEFAULT NULL;

ALTER TABLE `matadero_vivo` ADD COLUMN `creado_por` varchar(255) NULL DEFAULT NULL;
ALTER TABLE `matadero_vivo` ADD COLUMN `actualizado_por` varchar(255) NULL DEFAULT NULL;

ALTER TABLE `leche` ADD COLUMN `creado_por` varchar(255) NULL DEFAULT NULL;
ALTER TABLE `leche` ADD COLUMN `actualizado_por` varchar(255) NULL DEFAULT NULL;
