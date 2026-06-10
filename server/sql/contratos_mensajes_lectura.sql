-- Lectura individual por usuario de mensajes de contratación (aprobaciones/rechazos)

CREATE TABLE IF NOT EXISTS contratos_mensajes_lectura (
  user_email VARCHAR(255) NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  leido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_email, event_id),
  KEY idx_cm_lectura_event (event_id),
  KEY idx_cm_lectura_user_fecha (user_email, leido_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
