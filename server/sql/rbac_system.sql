-- RBAC: roles personalizados y permisos por módulo

ALTER TABLE roles
  ADD COLUMN descripcion VARCHAR(255) NULL AFTER nombre,
  ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER descripcion,
  ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER is_system,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER activo;

CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  id_rol TINYINT UNSIGNED NOT NULL,
  module_codigo VARCHAR(40) NOT NULL,
  can_view TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  can_export TINYINT(1) NOT NULL DEFAULT 0,
  can_approve TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id_rol, module_codigo),
  CONSTRAINT fk_rbac_perm_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE roles SET is_system = 1 WHERE codigo IN ('admin','contratacion','director');
