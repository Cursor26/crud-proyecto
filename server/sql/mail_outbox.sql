CREATE TABLE IF NOT EXISTS mail_outbox (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(64) NOT NULL,
  ref_key VARCHAR(255) NULL,
  destino VARCHAR(255) NOT NULL,
  asunto VARCHAR(500) NOT NULL,
  cuerpo_texto MEDIUMTEXT NULL,
  cuerpo_html MEDIUMTEXT NULL,
  payload_json JSON NULL,
  estado ENUM('pendiente', 'enviado', 'fallido') NOT NULL DEFAULT 'pendiente',
  intentos INT NOT NULL DEFAULT 0,
  ultimo_error VARCHAR(500) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_en DATETIME NULL,
  KEY idx_mail_outbox_pendiente (estado, creado_en),
  KEY idx_mail_outbox_dedup (estado, tipo, ref_key, destino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
