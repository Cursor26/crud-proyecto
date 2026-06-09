ALTER TABLE contratos_generales
  ADD COLUMN revision_juridica_estado VARCHAR(40) NOT NULL DEFAULT 'na' AFTER aprobacion_resolucion_nota,
  ADD COLUMN revision_juridica_resuelto_por VARCHAR(255) NULL AFTER revision_juridica_estado,
  ADD COLUMN revision_juridica_resuelto_en DATETIME NULL AFTER revision_juridica_resuelto_por,
  ADD COLUMN revision_juridica_nota VARCHAR(500) NULL AFTER revision_juridica_resuelto_en;

CREATE TABLE IF NOT EXISTS contratos_juridico_comentarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  numero_contrato VARCHAR(50) NOT NULL,
  autor_email VARCHAR(255) NOT NULL,
  autor_nombre VARCHAR(255) NULL,
  tipo ENUM('comentario', 'nota_legal') NOT NULL DEFAULT 'comentario',
  texto TEXT NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_juridico_comentarios_contrato (numero_contrato, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contratos_juridico_adjuntos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  numero_contrato VARCHAR(50) NOT NULL,
  revision_juridica_estado VARCHAR(40) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_relativa VARCHAR(500) NOT NULL,
  tamano_bytes BIGINT NOT NULL DEFAULT 0,
  subido_por VARCHAR(255) NULL,
  subido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_juridico_adjuntos_contrato (numero_contrato, subido_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE contratos_generales
   SET revision_juridica_estado = 'pendiente'
 WHERE aprobacion_estado = 'pendiente'
   AND revision_juridica_estado = 'na';

UPDATE contratos_generales
   SET revision_juridica_estado = 'na'
 WHERE aprobacion_estado = 'aprobado'
   AND revision_juridica_estado = 'na';
