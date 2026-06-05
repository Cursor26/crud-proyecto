-- Columna activo para desactivar tipos sin borrar referencias en contratos

ALTER TABLE catalogo_tipo_contrato
  ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER nombre;
