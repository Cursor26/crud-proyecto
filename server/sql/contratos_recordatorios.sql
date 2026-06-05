-- Registro de recordatorios de vencimiento enviados (manual o automático)

CREATE TABLE IF NOT EXISTS contratos_recordatorios_envios (
  id_envio INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_contrato VARCHAR(50) NOT NULL,
  dias_antes_vencimiento SMALLINT NOT NULL,
  correo_destino VARCHAR(255) NOT NULL,
  origen ENUM('automatico', 'manual') NOT NULL DEFAULT 'automatico',
  resultado ENUM('ok', 'error', 'advertencia') NOT NULL DEFAULT 'ok',
  mensaje VARCHAR(500) DEFAULT NULL,
  enviado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_envio),
  KEY idx_rec_numero (numero_contrato),
  KEY idx_rec_enviado (enviado_en),
  KEY idx_rec_dias (dias_antes_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
