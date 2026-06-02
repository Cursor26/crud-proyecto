-- Auditoría de accesos y acciones críticas (solo consulta admin)

CREATE TABLE IF NOT EXISTS audit_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_email VARCHAR(255) NOT NULL,
  user_nombre VARCHAR(255) DEFAULT NULL,
  user_rol VARCHAR(50) DEFAULT NULL,
  login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at DATETIME DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_sessions_user (user_email),
  KEY idx_audit_sessions_login (login_at),
  KEY idx_audit_sessions_open (user_email, logout_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_failed_logins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier_attempted VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) DEFAULT NULL,
  reason VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_failed_identifier (identifier_attempted),
  KEY idx_audit_failed_created (created_at),
  KEY idx_audit_failed_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_login_lockouts (
  identifier_key VARCHAR(255) NOT NULL,
  fail_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME DEFAULT NULL,
  last_fail_at DATETIME DEFAULT NULL,
  PRIMARY KEY (identifier_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category VARCHAR(40) NOT NULL,
  action VARCHAR(60) NOT NULL,
  actor_email VARCHAR(255) DEFAULT NULL,
  actor_nombre VARCHAR(255) DEFAULT NULL,
  target_type VARCHAR(80) DEFAULT NULL,
  target_id VARCHAR(255) DEFAULT NULL,
  target_label VARCHAR(500) DEFAULT NULL,
  details_json JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_events_category (category),
  KEY idx_audit_events_created (created_at),
  KEY idx_audit_events_actor (actor_email),
  KEY idx_audit_events_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
