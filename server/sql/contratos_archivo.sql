-- Archivo histórico de contratos (retención 5 años) + documentos activos en servidor

CREATE TABLE IF NOT EXISTS contratos_archivo (
  id_archivo INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_contrato VARCHAR(50) NOT NULL,
  id_contraparte TINYINT UNSIGNED NOT NULL,
  empresa VARCHAR(255) NOT NULL,
  correo_notificacion VARCHAR(255) DEFAULT NULL,
  suplementos TEXT,
  vigencia DECIMAL(10,2) DEFAULT NULL,
  id_tipo_contrato SMALLINT UNSIGNED DEFAULT NULL,
  tipo_contrato VARCHAR(100) DEFAULT NULL,
  fecha_inicio DATE DEFAULT NULL,
  fecha_fin DATE DEFAULT NULL,
  eliminado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminado_por VARCHAR(255) DEFAULT NULL,
  motivo VARCHAR(500) DEFAULT NULL,
  retencion_hasta DATE NOT NULL,
  PRIMARY KEY (id_archivo),
  KEY idx_archivo_numero (numero_contrato),
  KEY idx_archivo_eliminado_en (eliminado_en),
  KEY idx_archivo_retencion (retencion_hasta),
  KEY idx_archivo_empresa (empresa(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contratos_archivo_documentos (
  id_documento INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_archivo INT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_relativa VARCHAR(512) NOT NULL,
  tamano_bytes INT UNSIGNED DEFAULT NULL,
  subido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_documento),
  KEY fk_archivo_doc (id_archivo),
  CONSTRAINT fk_archivo_doc FOREIGN KEY (id_archivo) REFERENCES contratos_archivo (id_archivo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contratos_documentos (
  id_documento INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_contrato VARCHAR(50) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_relativa VARCHAR(512) NOT NULL,
  tamano_bytes INT UNSIGNED DEFAULT NULL,
  cliente_id VARCHAR(64) DEFAULT NULL,
  subido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_documento),
  KEY idx_contrato_doc_num (numero_contrato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
