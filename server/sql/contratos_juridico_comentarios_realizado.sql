ALTER TABLE contratos_juridico_comentarios
  ADD COLUMN realizado TINYINT(1) NOT NULL DEFAULT 0 AFTER texto,
  ADD COLUMN realizado_por VARCHAR(255) NULL AFTER realizado,
  ADD COLUMN realizado_en DATETIME NULL AFTER realizado_por;
