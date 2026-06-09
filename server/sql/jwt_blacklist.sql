CREATE TABLE IF NOT EXISTS jwt_token_blacklist (
  jti VARCHAR(64) NOT NULL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_jwt_blacklist_expires (expires_at),
  KEY idx_jwt_blacklist_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
