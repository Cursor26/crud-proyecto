-- bd_crud normalizada (3FN/BCNF) — generado 2026-05-26T09:38:40.457Z
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS bd_crud;
CREATE DATABASE bd_crud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bd_crud;

CREATE TABLE roles (
  id_rol TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uk_roles_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  email VARCHAR(100) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  id_rol TINYINT UNSIGNED NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) DEFAULT NULL,
  updated_at DATETIME DEFAULT NULL,
  PRIMARY KEY (email),
  KEY fk_usuarios_rol (id_rol),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  requested_ip VARCHAR(45) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prt_email (email),
  KEY idx_prt_hash (token_hash)
) ENGINE=InnoDB;

CREATE TABLE catalogo_tipo_contraparte (
  id_contraparte TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo TINYINT NOT NULL COMMENT '0=cliente, 1=proveedor (legacy)',
  nombre VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_contraparte),
  UNIQUE KEY uk_contraparte_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE catalogo_tipo_contrato (
  id_tipo_contrato SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_tipo_contrato),
  UNIQUE KEY uk_tipo_contrato_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE contratos_generales (
  numero_contrato VARCHAR(50) NOT NULL,
  id_contraparte TINYINT UNSIGNED NOT NULL,
  empresa VARCHAR(255) NOT NULL,
  correo_notificacion VARCHAR(255) DEFAULT NULL,
  suplementos TEXT,
  vigencia DECIMAL(10,2) DEFAULT NULL,
  id_tipo_contrato SMALLINT UNSIGNED DEFAULT NULL,
  fecha_inicio DATE DEFAULT NULL,
  fecha_fin DATE DEFAULT NULL,
  PRIMARY KEY (numero_contrato),
  KEY fk_contrato_contraparte (id_contraparte),
  KEY fk_contrato_tipo (id_tipo_contrato),
  CONSTRAINT fk_contrato_contraparte FOREIGN KEY (id_contraparte) REFERENCES catalogo_tipo_contraparte (id_contraparte),
  CONSTRAINT fk_contrato_tipo FOREIGN KEY (id_tipo_contrato) REFERENCES catalogo_tipo_contrato (id_tipo_contrato)
) ENGINE=InnoDB;

CREATE TABLE departamentos (
  id_departamento INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  id_padre INT DEFAULT NULL,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_departamento),
  KEY fk_departamento_padre (id_padre),
  CONSTRAINT fk_departamento_padre FOREIGN KEY (id_padre) REFERENCES departamentos (id_departamento)
) ENGINE=InnoDB;

CREATE TABLE cargos (
  id_cargo INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  salario_base DECIMAL(10,2) DEFAULT NULL,
  id_departamento INT DEFAULT NULL,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_cargo),
  UNIQUE KEY uk_cargo_nombre (nombre),
  KEY fk_cargo_departamento (id_departamento),
  CONSTRAINT fk_cargo_departamento FOREIGN KEY (id_departamento) REFERENCES departamentos (id_departamento)
) ENGINE=InnoDB;

CREATE TABLE empleados (
  carnet_identidad CHAR(11) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  puesto VARCHAR(100) NOT NULL,
  telefono CHAR(8) DEFAULT NULL,
  id_departamento INT DEFAULT NULL,
  beneficios TEXT,
  resultados_auditorias TEXT,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_baja DATE DEFAULT NULL,
  motivo_baja VARCHAR(500) DEFAULT NULL,
  nivel_escolar VARCHAR(120) DEFAULT NULL,
  superacion_en_proceso VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (carnet_identidad),
  KEY fk_empleado_departamento (id_departamento),
  CONSTRAINT fk_empleado_departamento FOREIGN KEY (id_departamento) REFERENCES departamentos (id_departamento)
) ENGINE=InnoDB;

CREATE TABLE historial_laboral (
  id INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  tipo_cambio ENUM('puesto','departamento','salario') NOT NULL,
  valor_anterior VARCHAR(255) DEFAULT NULL,
  valor_nuevo VARCHAR(255) DEFAULT NULL,
  fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_hist_carnet (carnet_identidad),
  CONSTRAINT fk_hist_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE licencias_empleado (
  id_licencia INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_registro DATE DEFAULT NULL,
  observaciones TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_licencia),
  KEY fk_licencia_carnet (carnet_identidad),
  CONSTRAINT fk_licencia_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE asistencias (
  id_asistencia INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  codigo_asistencia VARCHAR(100) DEFAULT NULL,
  desc_causas TEXT,
  horas_trabajadas DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY (id_asistencia),
  UNIQUE KEY uk_asistencias_carnet (carnet_identidad),
  CONSTRAINT fk_asistencias_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE certificaciones (
  id_certificacion INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  certificacion VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_certificacion),
  UNIQUE KEY uk_cert_carnet (carnet_identidad),
  CONSTRAINT fk_cert_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE cursos (
  id_curso INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  curso VARCHAR(255) DEFAULT NULL,
  descr TEXT,
  logrado TINYINT(1) DEFAULT 0,
  fech_fin_curso DATE DEFAULT NULL,
  PRIMARY KEY (id_curso),
  UNIQUE KEY uk_cursos_carnet (carnet_identidad),
  CONSTRAINT fk_cursos_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE evalcapacitacion (
  id_evalcap INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  evaluacion VARCHAR(255) DEFAULT NULL,
  descr TEXT,
  PRIMARY KEY (id_evalcap),
  UNIQUE KEY uk_evalcap_carnet (carnet_identidad),
  CONSTRAINT fk_evalcap_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones (
  id_evaluacion INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  evaluacion VARCHAR(255) DEFAULT NULL,
  descr TEXT,
  PRIMARY KEY (id_evaluacion),
  UNIQUE KEY uk_eval_carnet (carnet_identidad),
  CONSTRAINT fk_eval_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE objetivos (
  id_objetivo INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  objetivo VARCHAR(255) DEFAULT NULL,
  descr TEXT,
  logrado TINYINT(1) DEFAULT 0,
  fecha_logrado DATE DEFAULT NULL,
  PRIMARY KEY (id_objetivo),
  UNIQUE KEY uk_obj_carnet (carnet_identidad),
  CONSTRAINT fk_obj_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE salarios (
  id_salario INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  salario_neto DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY (id_salario),
  UNIQUE KEY uk_salario_carnet (carnet_identidad),
  CONSTRAINT fk_salario_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE seguridad (
  id_seguridad INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  acceso VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_seguridad),
  UNIQUE KEY uk_seguridad_carnet (carnet_identidad),
  CONSTRAINT fk_seguridad_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE segseguridad (
  id_seg INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  PRIMARY KEY (id_seg),
  UNIQUE KEY uk_segseg_carnet (carnet_identidad),
  CONSTRAINT fk_segseg_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE segseguridad_incidencia (
  id_incidencia INT NOT NULL AUTO_INCREMENT,
  id_seg INT NOT NULL,
  orden TINYINT NOT NULL,
  cantidad INT DEFAULT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_incidencia),
  UNIQUE KEY uk_segseg_orden (id_seg, orden),
  CONSTRAINT fk_incidencia_seg FOREIGN KEY (id_seg) REFERENCES segseguridad (id_seg) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vacaciones (
  id_vacacion INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  fecha_inicio DATE DEFAULT NULL,
  fecha_fin DATE DEFAULT NULL,
  dias_totales INT DEFAULT NULL,
  motivo VARCHAR(255) DEFAULT NULL,
  aprobado TINYINT(1) DEFAULT 0,
  observaciones TEXT,
  PRIMARY KEY (id_vacacion),
  UNIQUE KEY uk_vacaciones_carnet (carnet_identidad),
  CONSTRAINT fk_vacaciones_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE turnos_trabajo (
  id_turno INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  nombre_turno VARCHAR(120) NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  dias_aplicacion VARCHAR(150) NOT NULL DEFAULT 'Lunes a viernes',
  horas_diarias DECIMAL(5,2) DEFAULT NULL,
  observaciones TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_turno),
  KEY fk_turno_carnet (carnet_identidad),
  CONSTRAINT fk_turno_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE grupos_trabajo (
  id_grupo INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_grupo)
) ENGINE=InnoDB;

CREATE TABLE grupo_miembros (
  id_grupo INT NOT NULL,
  carnet_identidad CHAR(11) NOT NULL,
  PRIMARY KEY (id_grupo, carnet_identidad),
  CONSTRAINT fk_gm_grupo FOREIGN KEY (id_grupo) REFERENCES grupos_trabajo (id_grupo),
  CONSTRAINT fk_gm_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE asistencia_grupal (
  id_asistencia INT NOT NULL AUTO_INCREMENT,
  id_grupo INT NOT NULL,
  fecha DATE NOT NULL,
  miembros_presentes INT NOT NULL,
  miembros_total INT NOT NULL,
  observaciones TEXT,
  PRIMARY KEY (id_asistencia),
  KEY fk_asist_grupal_grupo (id_grupo),
  CONSTRAINT fk_asist_grupal_grupo FOREIGN KEY (id_grupo) REFERENCES grupos_trabajo (id_grupo)
) ENGINE=InnoDB;

CREATE TABLE cert_medicos (
  id_cert_medico INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE DEFAULT NULL,
  dias_licencia INT DEFAULT NULL,
  medico_nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo TINYINT DEFAULT 1,
  PRIMARY KEY (id_cert_medico),
  KEY fk_cert_med_carnet (carnet_identidad),
  CONSTRAINT fk_cert_med_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE eval_medicas (
  id_eval_medica INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  fecha_evaluacion DATE NOT NULL,
  tipo_chequeo VARCHAR(100) NOT NULL DEFAULT 'Periódico',
  resultado VARCHAR(200) NOT NULL,
  medico_nombre VARCHAR(150) NOT NULL,
  proximo_chequeo DATE DEFAULT NULL,
  observaciones TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_eval_medica),
  KEY fk_eval_med_carnet (carnet_identidad),
  CONSTRAINT fk_eval_med_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE sanciones_empleado (
  id_sancion INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  tipo_sancion VARCHAR(100) NOT NULL,
  motivo TEXT NOT NULL,
  fecha_aplicacion DATE NOT NULL,
  dias_suspension INT DEFAULT NULL,
  observaciones TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_sancion),
  KEY fk_sancion_carnet (carnet_identidad),
  CONSTRAINT fk_sancion_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE reconocimientos_empleado (
  id_reconocimiento INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  tipo_reconocimiento VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_otorgamiento DATE NOT NULL,
  valor_estimulo DECIMAL(10,2) DEFAULT NULL,
  observaciones TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_reconocimiento),
  KEY fk_recon_carnet (carnet_identidad),
  CONSTRAINT fk_recon_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE jubilaciones_empleado (
  id_jubilacion INT NOT NULL AUTO_INCREMENT,
  carnet_identidad CHAR(11) NOT NULL,
  tipo_salida VARCHAR(100) NOT NULL,
  fecha_efectiva DATE NOT NULL,
  motivo TEXT,
  observaciones TEXT,
  activo TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_jubilacion),
  KEY fk_jub_carnet (carnet_identidad),
  CONSTRAINT fk_jub_carnet FOREIGN KEY (carnet_identidad) REFERENCES empleados (carnet_identidad)
) ENGINE=InnoDB;

CREATE TABLE prod_modulo (
  id_modulo TINYINT UNSIGNED NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  PRIMARY KEY (id_modulo),
  UNIQUE KEY uk_prod_modulo_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE prod_metrica (
  id_metrica SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave VARCHAR(80) NOT NULL,
  PRIMARY KEY (id_metrica),
  UNIQUE KEY uk_prod_metrica_clave (clave)
) ENGINE=InnoDB;

CREATE TABLE prod_registro (
  id_registro BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_modulo TINYINT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  creado_por VARCHAR(255) DEFAULT NULL,
  actualizado_por VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_registro),
  UNIQUE KEY uk_prod_modulo_fecha (id_modulo, fecha),
  CONSTRAINT fk_prod_reg_modulo FOREIGN KEY (id_modulo) REFERENCES prod_modulo (id_modulo)
) ENGINE=InnoDB;

CREATE TABLE prod_valor (
  id_registro BIGINT UNSIGNED NOT NULL,
  id_metrica SMALLINT UNSIGNED NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id_registro, id_metrica),
  CONSTRAINT fk_pv_reg FOREIGN KEY (id_registro) REFERENCES prod_registro (id_registro) ON DELETE CASCADE,
  CONSTRAINT fk_pv_met FOREIGN KEY (id_metrica) REFERENCES prod_metrica (id_metrica)
) ENGINE=InnoDB;

CREATE TABLE historico_produccion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_modulo TINYINT UNSIGNED NOT NULL,
  fecha_dato DATE NOT NULL,
  accion VARCHAR(32) NOT NULL,
  usuario_email VARCHAR(255) DEFAULT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_hist_prod_mod (id_modulo),
  CONSTRAINT fk_hist_prod_mod FOREIGN KEY (id_modulo) REFERENCES prod_modulo (id_modulo)
) ENGINE=InnoDB;

CREATE TABLE historico_produccion_valor (
  id_historico BIGINT UNSIGNED NOT NULL,
  id_metrica SMALLINT UNSIGNED NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id_historico, id_metrica),
  CONSTRAINT fk_hpv_hist FOREIGN KEY (id_historico) REFERENCES historico_produccion (id) ON DELETE CASCADE,
  CONSTRAINT fk_hpv_met FOREIGN KEY (id_metrica) REFERENCES prod_metrica (id_metrica)
) ENGINE=InnoDB;

INSERT INTO roles (id_rol, codigo, nombre) VALUES
(1,'admin','Administrador'),
(2,'rrhh','Recursos Humanos'),
(3,'contratacion','Contratación'),
(4,'produccion','Producción / Estadística'),
(5,'estadistica','Estadística'),
(6,'director','Director');

INSERT INTO catalogo_tipo_contraparte (id_contraparte, codigo, nombre) VALUES
(1, 0, 'Cliente'),
(2, 1, 'Proveedor');

INSERT INTO prod_modulo (id_modulo, codigo, nombre) VALUES
(1, 'sacrificio', 'Sacrificio vacuno'),
(2, 'matadero', 'Matadero vivo'),
(3, 'leche', 'Leche');


INSERT INTO prod_metrica (id_metrica, clave) VALUES (1, 'Nazareno_Acopio');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (2, 'Nazareno_Cabras');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (3, 'Nazareno_ORGA');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (4, 'Nazareno_Ollo');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (5, 'Nazareno_Perd');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (6, 'Nazareno_Poblac_CAMP');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (7, 'Nazareno_Produccion_total');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (8, 'Nazareno_Queso_ALGIBE');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (9, 'Nazareno_Queso_COMP');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (10, 'Nazareno_Recria');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (11, 'Nazareno_TOTAL');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (12, 'Nazareno_Torll');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (13, 'Nazareno_Total_contra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (14, 'Nazareno_Total_indust');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (15, 'Nazareno_Total_ventas');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (16, 'Nazareno_Vacas_ordeño');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (17, 'Nazareno_Vacas_total');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (18, 'Nazareno_Vaq');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (19, 'Nazareno_Vtas_Trab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (20, 'Rosafe_Acopio');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (21, 'Rosafe_Cabras');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (22, 'Rosafe_ORGA');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (23, 'Rosafe_Ollo');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (24, 'Rosafe_Perd');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (25, 'Rosafe_Poblac_CAMP');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (26, 'Rosafe_Produccion_total');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (27, 'Rosafe_Queso_ALGIBE');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (28, 'Rosafe_Queso_COMP');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (29, 'Rosafe_Recria');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (30, 'Rosafe_TOTAL');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (31, 'Rosafe_Torll');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (32, 'Rosafe_Total_contra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (33, 'Rosafe_Total_indust');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (34, 'Rosafe_Total_ventas');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (35, 'Rosafe_Vacas_ordeño');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (36, 'Rosafe_Vacas_total');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (37, 'Rosafe_Vaq');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (38, 'Rosafe_Vtas_Trab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (39, 'Zenea_Acopio');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (40, 'Zenea_Cabras');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (41, 'Zenea_ORGA');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (42, 'Zenea_Ollo');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (43, 'Zenea_Perd');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (44, 'Zenea_Poblac_CAMP');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (45, 'Zenea_Produccion_total');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (46, 'Zenea_Queso_ALGIBE');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (47, 'Zenea_Queso_COMP');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (48, 'Zenea_Recria');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (49, 'Zenea_TOTAL');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (50, 'Zenea_Torll');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (51, 'Zenea_Total_contra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (52, 'Zenea_Total_indust');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (53, 'Zenea_Total_ventas');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (54, 'Zenea_Vacas_ordeño');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (55, 'Zenea_Vacas_total');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (56, 'Zenea_Vaq');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (57, 'Zenea_Vtas_Trab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (58, 'aniojas_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (59, 'aniojas_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (60, 'aniojas_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (61, 'aniojas_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (62, 'aniojas_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (63, 'aniojas_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (64, 'aniojas_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (65, 'aniojas_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (66, 'aniojas_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (67, 'aniojas_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (68, 'aniojas_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (69, 'aniojas_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (70, 'aniojas_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (71, 'aniojas_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (72, 'aniojas_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (73, 'aniojas_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (74, 'aniojas_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (75, 'aniojas_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (76, 'aniojas_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (77, 'aniojas_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (78, 'aniojas_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (79, 'aniojas_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (80, 'aniojas_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (81, 'aniojas_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (82, 'aniojas_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (83, 'aniojas_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (84, 'aniojas_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (85, 'aniojas_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (86, 'aniojas_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (87, 'aniojas_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (88, 'aniojos_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (89, 'aniojos_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (90, 'aniojos_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (91, 'aniojos_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (92, 'aniojos_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (93, 'aniojos_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (94, 'aniojos_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (95, 'aniojos_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (96, 'aniojos_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (97, 'aniojos_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (98, 'aniojos_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (99, 'aniojos_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (100, 'aniojos_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (101, 'aniojos_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (102, 'aniojos_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (103, 'aniojos_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (104, 'aniojos_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (105, 'aniojos_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (106, 'aniojos_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (107, 'aniojos_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (108, 'aniojos_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (109, 'aniojos_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (110, 'aniojos_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (111, 'aniojos_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (112, 'aniojos_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (113, 'aniojos_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (114, 'aniojos_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (115, 'aniojos_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (116, 'aniojos_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (117, 'aniojos_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (118, 'bueyes_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (119, 'bueyes_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (120, 'bueyes_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (121, 'bueyes_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (122, 'bueyes_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (123, 'bueyes_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (124, 'bueyes_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (125, 'bueyes_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (126, 'bueyes_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (127, 'bueyes_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (128, 'bueyes_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (129, 'bueyes_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (130, 'bueyes_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (131, 'bueyes_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (132, 'bueyes_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (133, 'bueyes_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (134, 'bueyes_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (135, 'bueyes_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (136, 'bueyes_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (137, 'bueyes_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (138, 'bueyes_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (139, 'bueyes_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (140, 'bueyes_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (141, 'bueyes_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (142, 'bueyes_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (143, 'bueyes_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (144, 'bueyes_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (145, 'bueyes_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (146, 'bueyes_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (147, 'bueyes_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (148, 'novillas_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (149, 'novillas_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (150, 'novillas_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (151, 'novillas_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (152, 'novillas_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (153, 'novillas_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (154, 'novillas_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (155, 'novillas_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (156, 'novillas_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (157, 'novillas_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (158, 'novillas_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (159, 'novillas_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (160, 'novillas_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (161, 'novillas_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (162, 'novillas_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (163, 'novillas_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (164, 'novillas_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (165, 'novillas_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (166, 'novillas_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (167, 'novillas_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (168, 'novillas_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (169, 'novillas_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (170, 'novillas_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (171, 'novillas_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (172, 'novillas_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (173, 'novillas_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (174, 'novillas_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (175, 'novillas_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (176, 'novillas_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (177, 'novillas_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (178, 'novillos_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (179, 'novillos_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (180, 'novillos_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (181, 'novillos_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (182, 'novillos_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (183, 'novillos_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (184, 'novillos_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (185, 'novillos_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (186, 'novillos_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (187, 'novillos_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (188, 'novillos_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (189, 'novillos_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (190, 'novillos_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (191, 'novillos_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (192, 'novillos_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (193, 'novillos_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (194, 'novillos_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (195, 'novillos_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (196, 'novillos_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (197, 'novillos_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (198, 'novillos_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (199, 'novillos_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (200, 'novillos_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (201, 'novillos_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (202, 'novillos_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (203, 'novillos_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (204, 'novillos_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (205, 'novillos_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (206, 'novillos_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (207, 'novillos_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (208, 'terneras_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (209, 'terneras_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (210, 'terneras_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (211, 'terneras_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (212, 'terneras_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (213, 'terneras_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (214, 'terneras_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (215, 'terneras_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (216, 'terneras_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (217, 'terneras_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (218, 'terneras_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (219, 'terneras_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (220, 'terneras_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (221, 'terneras_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (222, 'terneras_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (223, 'terneras_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (224, 'terneras_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (225, 'terneras_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (226, 'terneras_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (227, 'terneras_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (228, 'terneras_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (229, 'terneras_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (230, 'terneras_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (231, 'terneras_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (232, 'terneras_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (233, 'terneras_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (234, 'terneras_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (235, 'terneras_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (236, 'terneras_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (237, 'terneras_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (238, 'terneros_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (239, 'terneros_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (240, 'terneros_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (241, 'terneros_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (242, 'terneros_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (243, 'terneros_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (244, 'terneros_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (245, 'terneros_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (246, 'terneros_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (247, 'terneros_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (248, 'terneros_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (249, 'terneros_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (250, 'terneros_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (251, 'terneros_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (252, 'terneros_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (253, 'terneros_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (254, 'terneros_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (255, 'terneros_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (256, 'terneros_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (257, 'terneros_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (258, 'terneros_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (259, 'terneros_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (260, 'terneros_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (261, 'terneros_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (262, 'terneros_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (263, 'terneros_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (264, 'terneros_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (265, 'terneros_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (266, 'terneros_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (267, 'terneros_Tm_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (268, 'vacas_Cab');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (269, 'vacas_Cab_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (270, 'vacas_Cab_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (271, 'vacas_Cab_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (272, 'vacas_Cbz_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (273, 'vacas_Cbz_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (274, 'vacas_Cbz_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (275, 'vacas_Cbz_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (276, 'vacas_Cbz_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (277, 'vacas_Cbz_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (278, 'vacas_Cbz_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (279, 'vacas_Cbz_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (280, 'vacas_Cbz_st');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (281, 'vacas_Cbz_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (282, 'vacas_Cbz_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (283, 'vacas_Kg');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (284, 'vacas_Kg_1ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (285, 'vacas_Kg_2da');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (286, 'vacas_Kg_3ra');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (287, 'vacas_Kg_4ta');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (288, 'vacas_Kg_in');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (289, 'vacas_Kg_ind');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (290, 'vacas_Kg_m');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (291, 'vacas_Kg_p');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (292, 'vacas_Kg_sal');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (293, 'vacas_Kg_sc');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (294, 'vacas_Kg_se');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (295, 'vacas_Kg_t');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (296, 'vacas_Kg_tur');
INSERT INTO prod_metrica (id_metrica, clave) VALUES (297, 'vacas_Tm_st');
INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES ('admin@admin.com', 'Administrador Permanente', '$2b$10$5ULdEwJFz5KI7Udfno/pOuiyqj7PYM6XtScFeyGcWjOq2/iu9ccQi', 1, 1, NULL, '2026-02-28 18:56:10', NULL, NULL);
INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES ('contratacion@contratacion.com', 'contratacion', '$2b$10$5k.UBaJN1L0Y8zzdABZ/nualaieLSoqxL36zZGNalcVVQqAuVhggu', 3, 1, NULL, '2026-04-16 10:35:29', NULL, NULL);
INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES ('director@director.com', 'directorPro', '$2b$10$HQGuZF2hP0ODHLHWBA.xC.1.MmR4XpYVviTne0XpyWSDhkFexjlNm', 6, 1, NULL, '2026-04-24 11:43:42', NULL, NULL);
INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES ('estadistica@estadistica.com', 'estadistica', '$2b$10$FKD40n8BDhooS2Fpg9BlM.ExEX/uXhiulgcxXwTcMCPiRIPTGAitq', 5, 1, NULL, '2026-04-24 11:43:17', NULL, NULL);
INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES ('ppp@ppp.com', 'ppp', '$2b$10$/OQLJoCTkvfz/zZvJTJOY.hxjZVu1F7wM8ANVd5kbog8Q.vbtS4hy', 5, 1, 'admin@admin.com', '2026-05-02 09:57:22', 'admin@admin.com', '2026-05-02 11:57:22');
INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES ('rrhh@rrhh.com', 'rrhh', '$2b$10$.eEkN6BM.5KjBdSIZeoNruaE3yPLD3VwUHYZ11eoue2CUNjenWep6', 2, 1, NULL, '2026-02-28 19:01:41', NULL, NULL);
INSERT INTO password_reset_tokens (id, email, token_hash, expires_at, used_at, requested_ip, created_at) VALUES (3, 'ppp@ppp.com', '2af2aedcc0e1ff597e139d54e63ee1b6d9693a580fb528a84fe6588671738f46', '2026-05-02 13:01:20', NULL, '::1', '2026-05-02 10:01:20');
INSERT INTO catalogo_tipo_contrato (id_tipo_contrato, nombre) VALUES (1, 'Compra');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('11', 2, 'Empresa De Tito . 8', NULL, 'T 9.', 0.02, 1, '2026-04-24', '2026-05-01');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('333', 2, '4444.....D', NULL, 'U', 4, 1, '2026-04-24', '2030-04-24');
INSERT INTO catalogo_tipo_contrato (id_tipo_contrato, nombre) VALUES (2, 'Alimento');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('55', 1, '5', NULL, '5', 5, 2, '2026-04-14', '2031-04-14');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('5555', 1, '55', NULL, '55556', 5, NULL, '2026-04-25', '2031-04-25');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('678', 2, '', NULL, '', 8, NULL, '2026-04-10', '2034-04-10');
INSERT INTO catalogo_tipo_contrato (id_tipo_contrato, nombre) VALUES (3, 'Servicio');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('7', 1, '5', NULL, '55556', 5, 3, '2026-04-25', '2031-04-25');
INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES ('9', 2, 'U', NULL, 'U', 5.99, 1, '2026-04-26', '2032-04-21');
INSERT INTO departamentos (`id_departamento`, `nombre`, `descripcion`, `id_padre`, `activo`) VALUES (2, '111', 'hh', NULL, 1);
INSERT INTO departamentos (`id_departamento`, `nombre`, `descripcion`, `id_padre`, `activo`) VALUES (3, '11232', NULL, NULL, 1);
INSERT INTO departamentos (`id_departamento`, `nombre`, `descripcion`, `id_padre`, `activo`) VALUES (4, '44', NULL, NULL, 1);
INSERT IGNORE INTO departamentos (nombre, descripcion, activo) VALUES ('111', NULL, 1);
INSERT INTO cargos (id_cargo, nombre, descripcion, salario_base, id_departamento, activo) VALUES (1, '99', '99', 99, (SELECT id_departamento FROM departamentos WHERE nombre = '111' LIMIT 1), 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, telefono, id_departamento, beneficios, resultados_auditorias, activo, fecha_baja, motivo_baja, nivel_escolar, superacion_en_proceso) VALUES ('00000000000', '00', '00', '00', '00000000', NULL, '0', '0', 1, NULL, NULL, 'TÃ©cnico', '0');
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, telefono, id_departamento, beneficios, resultados_auditorias, activo, fecha_baja, motivo_baja, nivel_escolar, superacion_en_proceso) VALUES ('00000000088', '88', '88', '00', '88888888', NULL, '88', '88', 1, NULL, NULL, 'TÃ©cnico', '88');
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('00000000077', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('55667788899', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('00000000044', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('00000000033', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('00000000055', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('33344455566', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('22233344456', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('22233344455', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('77788899900', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES ('77788899911', '(Migrado)', '(Referenciado)', 'Sin asignar', 1);
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (1, '22233344455', 'departamento', 'w', 'Departamento de Contratacion', '2026-04-04 11:45:01');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (2, '77788899900', 'puesto', 'director', 'Custodio', '2026-04-12 16:00:18');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (3, '77788899900', 'salario', '80', '400', '2026-04-12 16:00:18');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (4, '77788899900', 'puesto', 'Custodio', 'Director', '2026-04-12 16:01:17');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (5, '77788899900', 'puesto', 'Director', 'uik', '2026-04-15 13:45:40');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (6, '77788899900', 'salario', '400', '666', '2026-04-15 13:45:40');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (7, '22233344455', 'departamento', 'Departamento de Contratacion', 'Departamento de Estadistica', '2026-04-16 11:52:12');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (8, '77788899911', 'puesto', 'ttt', 'ooo', '2026-04-19 11:55:23');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (9, '22233344456', 'puesto', 'e', 'jjj', '2026-04-19 12:01:37');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (10, '55667788899', 'puesto', '9', 'ooo', '2026-04-19 12:02:36');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (11, '33344455566', 'puesto', 'Ejecutivo', 'Gerente', '2026-04-26 11:11:20');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (12, '00000000088', 'puesto', '88', '99', '2026-04-28 11:07:53');
INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (13, '00000000088', 'puesto', '99', '00', '2026-04-28 11:09:47');
INSERT INTO asistencias (carnet_identidad, codigo_asistencia, desc_causas, horas_trabajadas) VALUES ('00000000077', 'AUSENCIA', '99', 99);
INSERT INTO certificaciones (carnet_identidad, certificacion) VALUES ('55667788899', '777');
INSERT INTO cursos (carnet_identidad, curso, descr, logrado, fech_fin_curso) VALUES ('00000000044', '44', '44', 1, '4444-04-04');
INSERT INTO evalcapacitacion (carnet_identidad, evaluacion, descr) VALUES ('00000000033', '33', '3');
INSERT INTO evalcapacitacion (carnet_identidad, evaluacion, descr) VALUES ('55667788899', '777', '88');
INSERT INTO evaluaciones (carnet_identidad, evaluacion, descr) VALUES ('55667788899', '6', '8');
INSERT INTO objetivos (carnet_identidad, objetivo, descr, logrado, fecha_logrado) VALUES ('00000000044', '4', 'yuuyt', 1, '2222-02-01');
INSERT INTO objetivos (carnet_identidad, objetivo, descr, logrado, fecha_logrado) VALUES ('00000000055', '55', '77', 1, '6666-05-05');
INSERT INTO salarios (carnet_identidad, salario_neto) VALUES ('33344455566', 3000);
INSERT INTO seguridad (carnet_identidad, acceso) VALUES ('00000000077', 'AdministraciÃ³n');
INSERT INTO vacaciones (carnet_identidad, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones) VALUES ('22233344456', '2026-04-05', '2026-04-23', 19, '', 1, '');
INSERT INTO vacaciones (carnet_identidad, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones) VALUES ('55667788899', '2026-04-10', '2026-04-25', 16, 'oo', 1, 'oo');
INSERT INTO segseguridad (carnet_identidad) VALUES ('00000000077');
INSERT INTO segseguridad_incidencia (id_seg, orden, cantidad, descripcion) VALUES ((SELECT id_seg FROM segseguridad WHERE carnet_identidad = '00000000077' LIMIT 1), 1, 9, '9');
INSERT INTO segseguridad_incidencia (id_seg, orden, cantidad, descripcion) VALUES ((SELECT id_seg FROM segseguridad WHERE carnet_identidad = '00000000077' LIMIT 1), 2, 9, '9');
INSERT INTO segseguridad_incidencia (id_seg, orden, cantidad, descripcion) VALUES ((SELECT id_seg FROM segseguridad WHERE carnet_identidad = '00000000077' LIMIT 1), 3, 9, '9');
INSERT INTO turnos_trabajo (`id_turno`, `carnet_identidad`, `nombre_turno`, `hora_entrada`, `hora_salida`, `dias_aplicacion`, `horas_diarias`, `observaciones`, `activo`) VALUES (1, '22233344456', 'dd', '03:33:00', '03:33:00', 'Lunes a viernes', NULL, 'rrr', 1);
INSERT INTO turnos_trabajo (`id_turno`, `carnet_identidad`, `nombre_turno`, `hora_entrada`, `hora_salida`, `dias_aplicacion`, `horas_diarias`, `observaciones`, `activo`) VALUES (2, '22233344456', '6', '06:06:00', '06:06:00', 'Lunes a viernes', 666.5, '66', 1);
INSERT INTO turnos_trabajo (`id_turno`, `carnet_identidad`, `nombre_turno`, `hora_entrada`, `hora_salida`, `dias_aplicacion`, `horas_diarias`, `observaciones`, `activo`) VALUES (3, '00000000077', '99', '09:09:00', '09:09:00', 'Lunes a viernes', 99, '99', 1);
INSERT INTO grupos_trabajo (`id_grupo`, `nombre`, `descripcion`, `activo`) VALUES (3, 'g2', 'g2', 1);
INSERT INTO grupos_trabajo (`id_grupo`, `nombre`, `descripcion`, `activo`) VALUES (4, 'oo', 'oo', 1);
INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (2, '22233344456');
INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (3, '33344455566');
INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (3, '00000000077');
INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (4, '55667788899');
INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (4, '00000000077');
INSERT INTO asistencia_grupal (`id_asistencia`, `id_grupo`, `fecha`, `miembros_presentes`, `miembros_total`, `observaciones`) VALUES (2, 2, '2026-04-04', 1, 1, NULL);
INSERT INTO asistencia_grupal (`id_asistencia`, `id_grupo`, `fecha`, `miembros_presentes`, `miembros_total`, `observaciones`) VALUES (3, 4, '2026-04-19', 1, 1, NULL);
INSERT INTO asistencia_grupal (`id_asistencia`, `id_grupo`, `fecha`, `miembros_presentes`, `miembros_total`, `observaciones`) VALUES (4, 4, '2026-04-08', 1, 1, NULL);
INSERT INTO cert_medicos (`id_cert_medico`, `carnet_identidad`, `fecha_emision`, `fecha_vencimiento`, `dias_licencia`, `medico_nombre`, `descripcion`, `activo`) VALUES (2, '33344455566', '2026-03-12', '2026-03-14', 6, '5', '5', 1);
INSERT INTO eval_medicas (`id_eval_medica`, `carnet_identidad`, `fecha_evaluacion`, `tipo_chequeo`, `resultado`, `medico_nombre`, `proximo_chequeo`, `observaciones`, `activo`) VALUES (1, '33344455566', '2026-04-26', 'PeriÃ³dico', 'Apto', '99', '9999-09-09', '99', 1);
INSERT INTO sanciones_empleado (`id_sancion`, `carnet_identidad`, `tipo_sancion`, `motivo`, `fecha_aplicacion`, `dias_suspension`, `observaciones`, `activo`) VALUES (1, '33344455566', '99', '99', '2026-04-26', 99, '99', 1);
INSERT INTO reconocimientos_empleado (`id_reconocimiento`, `carnet_identidad`, `tipo_reconocimiento`, `descripcion`, `fecha_otorgamiento`, `valor_estimulo`, `observaciones`, `activo`) VALUES (2, '22233344456', 'YY', 'RR', '2026-04-04', 145, NULL, 1);
INSERT INTO reconocimientos_empleado (`id_reconocimiento`, `carnet_identidad`, `tipo_reconocimiento`, `descripcion`, `fecha_otorgamiento`, `valor_estimulo`, `observaciones`, `activo`) VALUES (3, '33344455566', '99', '9', '2026-04-26', 9, '9', 1);
INSERT INTO jubilaciones_empleado (`id_jubilacion`, `carnet_identidad`, `tipo_salida`, `fecha_efectiva`, `motivo`, `observaciones`, `activo`) VALUES (3, '22233344456', 'jub', '2026-04-19', 'mal', 'mal', 1);
INSERT INTO jubilaciones_empleado (`id_jubilacion`, `carnet_identidad`, `tipo_salida`, `fecha_efectiva`, `motivo`, `observaciones`, `activo`) VALUES (4, '33344455566', 'JubilaciÃ³n anticipada', '2026-04-26', '8', NULL, 1);
INSERT INTO prod_registro (id_registro, id_modulo, fecha, creado_por, actualizado_por) VALUES (1, 1, '1999-01-09', 'admin@tudominio.com', 'admin@tudominio.com');
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 218, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 232, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 222, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 236, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 214, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 228, 0.01);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 217, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 231, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 221, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 235, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 216, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 230, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 211, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 234, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 219, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 233, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 220, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 237, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 68, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 82, 11);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 72, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 86, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 64, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 78, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 67, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 81, 0.01);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 71, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 85, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 66, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 80, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 61, 0.01);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 84, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 69, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 83, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 70, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 87, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 158, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 172, -555);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 162, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 176, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 154, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 168, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 157, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 171, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 161, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 175, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 156, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 170, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 151, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 174, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 159, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 173, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 160, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 177, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 278, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 292, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 282, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 296, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 274, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 288, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 277, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 291, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 281, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 295, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 276, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 290, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 271, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 294, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 279, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 293, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 280, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 297, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 248, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 262, -0.01);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 252, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 266, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 244, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 258, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 247, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 261, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 251, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 265, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 246, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 260, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 241, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 264, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 249, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 263, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 250, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 267, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 98, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 112, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 102, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 116, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 94, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 108, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 97, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 111, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 101, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 115, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 96, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 110, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 91, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 114, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 99, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 113, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 100, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 117, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 188, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 202, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 192, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 206, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 184, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 198, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 187, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 201, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 191, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 205, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 186, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 200, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 181, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 204, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 189, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 203, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 190, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 207, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 128, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 142, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 132, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 146, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 124, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 138, 0.01);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 127, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 141, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 131, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 145, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 126, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 140, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 121, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 144, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 129, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 143, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 130, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (1, 147, 1);
INSERT INTO prod_registro (id_registro, id_modulo, fecha, creado_por, actualizado_por) VALUES (2, 1, '2026-04-27', 'estadistica@estadistica.com', 'estadistica@estadistica.com');
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 218, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 232, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 222, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 236, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 214, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 228, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 217, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 231, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 221, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 235, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 216, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 230, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 211, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 234, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 219, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 233, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 220, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 237, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 68, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 82, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 72, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 86, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 64, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 78, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 67, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 81, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 71, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 85, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 66, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 80, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 61, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 84, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 69, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 83, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 70, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 87, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 158, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 172, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 162, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 176, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 154, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 168, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 157, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 171, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 161, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 175, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 156, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 170, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 151, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 174, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 159, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 173, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 160, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 177, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 278, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 292, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 282, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 296, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 274, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 288, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 277, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 291, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 281, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 295, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 276, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 290, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 271, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 294, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 279, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 293, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 280, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 297, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 248, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 262, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 252, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 266, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 244, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 258, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 247, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 261, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 251, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 265, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 246, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 260, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 241, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 264, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 249, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 263, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 250, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 267, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 98, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 112, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 102, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 116, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 94, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 108, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 97, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 111, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 101, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 115, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 96, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 110, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 91, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 114, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 99, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 113, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 100, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 117, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 188, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 202, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 192, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 206, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 184, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 198, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 187, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 201, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 191, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 205, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 186, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 200, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 181, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 204, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 189, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 203, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 190, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 207, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 128, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 142, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 132, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 146, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 124, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 138, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 127, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 141, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 131, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 145, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 126, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 140, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 121, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 144, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 129, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 143, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 130, 0);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (2, 147, 0);
INSERT INTO prod_registro (id_registro, id_modulo, fecha, creado_por, actualizado_por) VALUES (3, 2, '2026-03-09', NULL, NULL);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 215, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 229, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 213, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 227, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 212, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 224, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 209, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 225, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 210, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 226, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 208, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 223, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 65, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 79, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 63, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 77, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 62, 11);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 74, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 59, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 75, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 60, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 76, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 58, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 73, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 155, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 169, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 153, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 167, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 152, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 164, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 149, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 165, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 150, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 166, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 148, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 163, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 275, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 289, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 273, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 287, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 272, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 284, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 269, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 285, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 270, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 286, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 268, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 283, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 245, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 259, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 243, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 257, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 242, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 254, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 239, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 255, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 240, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 256, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 238, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 253, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 95, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 109, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 93, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 107, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 92, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 104, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 89, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 105, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 90, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 106, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 88, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 103, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 185, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 199, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 183, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 197, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 182, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 194, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 179, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 195, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 180, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 196, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 178, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 193, 0.99);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 125, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 139, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 123, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 137, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 122, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 134, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 119, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 135, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 120, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 136, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 118, 1);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (3, 133, 1);
INSERT INTO prod_registro (id_registro, id_modulo, fecha, creado_por, actualizado_por) VALUES (4, 2, '2026-04-25', 'estadistica@estadistica.com', 'estadistica@estadistica.com');
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 215, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 229, -0.02);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 213, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 227, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 212, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 224, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 209, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 225, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 210, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 226, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 208, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 223, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 65, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 79, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 63, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 77, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 62, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 74, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 59, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 75, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 60, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 76, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 58, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 73, 77);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 155, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 169, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 153, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 167, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 152, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 164, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 149, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 165, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 150, 0.02);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 166, 6.98);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 148, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 163, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 275, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 289, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 273, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 287, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 272, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 284, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 269, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 285, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 270, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 286, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 268, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 283, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 245, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 259, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 243, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 257, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 242, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 254, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 239, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 255, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 240, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 256, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 238, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 253, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 95, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 109, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 93, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 107, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 92, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 104, 77);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 89, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 105, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 90, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 106, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 88, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 103, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 185, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 199, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 183, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 197, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 182, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 194, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 179, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 195, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 180, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 196, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 178, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 193, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 125, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 139, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 123, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 137, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 122, -0.01);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 134, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 119, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 135, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 120, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 136, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 118, 7);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (4, 133, 7);
INSERT INTO prod_registro (id_registro, id_modulo, fecha, creado_por, actualizado_por) VALUES (5, 3, '2026-04-14', 'admin@tudominio.com', 'estadistica@estadistica.com');
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 55, 888);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 45, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 53, 7.99);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 51, 88);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 52, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 39, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 46, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 47, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 42, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 44, 88);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 57, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 41, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 49, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 48, 88);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 56, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 40, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 50, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 43, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 36, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 26, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 34, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 32, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 33, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 20, 0.02);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 27, 0.02);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 28, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 23, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 25, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 38, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 22, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 30, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 29, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 37, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 21, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 31, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 24, 7.98);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 17, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 7, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 15, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 13, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 14, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 1, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 8, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 9, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 4, 7.99);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 6, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 19, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 3, 88);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 11, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 10, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 18, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 2, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 12, 8);
INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (5, 5, 8);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (1, 1, '2026-03-09', 'actualizacion', 'admin@tudominio.com', '2026-04-12 16:52:32');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 218, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 232, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 222, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 236, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 214, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 228, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 217, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 231, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 221, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 235, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 216, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 230, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 211, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 234, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 219, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 233, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 220, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 237, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 68, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 82, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 72, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 86, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 64, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 78, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 67, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 81, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 71, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 85, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 66, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 80, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 61, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 84, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 69, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 83, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 70, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 87, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 158, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 172, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 162, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 176, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 154, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 168, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 157, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 171, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 161, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 175, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 156, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 170, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 151, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 174, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 159, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 173, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 160, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 177, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 278, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 292, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 282, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 296, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 274, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 288, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 277, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 291, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 281, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 295, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 276, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 290, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 271, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 294, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 279, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 293, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 280, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 297, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 248, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 262, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 252, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 266, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 244, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 258, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 247, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 261, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 251, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 265, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 246, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 260, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 241, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 264, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 249, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 263, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 250, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 267, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 98, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 112, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 102, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 116, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 94, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 108, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 97, 4.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 111, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 101, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 115, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 96, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 110, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 91, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 114, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 99, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 113, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 100, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 117, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 188, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 202, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 192, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 206, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 184, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 198, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 187, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 201, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 191, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 205, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 186, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 200, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 181, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 204, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 189, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 203, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 190, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 207, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 128, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 142, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 132, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 146, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 124, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 138, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 127, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 141, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 131, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 145, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 126, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 140, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 121, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 144, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 129, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 143, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 130, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (1, 147, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (2, 1, '2026-03-09', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:31:47');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 218, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 232, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 222, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 236, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 214, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 228, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 217, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 231, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 221, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 235, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 216, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 230, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 211, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 234, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 219, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 233, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 220, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 237, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 68, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 82, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 72, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 86, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 64, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 78, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 67, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 81, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 71, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 85, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 66, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 80, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 61, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 84, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 69, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 83, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 70, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 87, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 158, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 172, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 162, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 176, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 154, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 168, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 157, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 171, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 161, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 175, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 156, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 170, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 151, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 174, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 159, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 173, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 160, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 177, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 278, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 292, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 282, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 296, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 274, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 288, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 277, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 291, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 281, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 295, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 276, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 290, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 271, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 294, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 279, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 293, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 280, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 297, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 248, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 262, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 252, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 266, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 244, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 258, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 247, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 261, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 251, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 265, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 246, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 260, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 241, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 264, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 249, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 263, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 250, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 267, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 98, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 112, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 102, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 116, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 94, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 108, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 97, 4.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 111, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 101, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 115, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 96, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 110, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 91, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 114, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 99, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 113, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 100, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 117, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 188, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 202, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 192, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 206, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 184, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 198, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 187, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 201, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 191, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 205, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 186, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 200, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 181, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 204, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 189, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 203, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 190, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 207, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 128, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 142, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 132, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 146, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 124, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 138, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 127, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 141, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 131, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 145, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 126, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 140, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 121, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 144, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 129, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 143, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 130, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (2, 147, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (3, 1, '2026-03-09', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:32:12');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 218, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 232, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 222, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 236, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 214, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 228, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 217, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 231, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 221, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 235, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 216, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 230, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 211, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 234, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 219, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 233, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 220, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 237, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 68, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 82, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 72, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 86, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 64, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 78, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 67, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 81, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 71, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 85, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 66, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 80, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 61, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 84, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 69, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 83, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 70, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 87, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 158, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 172, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 162, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 176, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 154, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 168, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 157, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 171, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 161, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 175, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 156, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 170, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 151, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 174, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 159, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 173, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 160, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 177, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 278, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 292, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 282, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 296, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 274, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 288, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 277, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 291, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 281, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 295, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 276, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 290, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 271, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 294, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 279, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 293, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 280, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 297, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 248, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 262, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 252, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 266, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 244, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 258, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 247, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 261, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 251, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 265, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 246, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 260, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 241, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 264, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 249, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 263, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 250, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 267, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 98, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 112, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 102, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 116, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 94, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 108, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 97, 4.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 111, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 101, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 115, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 96, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 110, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 91, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 114, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 99, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 113, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 100, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 117, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 188, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 202, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 192, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 206, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 184, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 198, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 187, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 201, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 191, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 205, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 186, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 200, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 181, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 204, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 189, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 203, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 190, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 207, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 128, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 142, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 132, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 146, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 124, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 138, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 127, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 141, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 131, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 145, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 126, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 140, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 121, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 144, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 129, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 143, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 130, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (3, 147, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (4, 1, '2026-03-09', 'eliminacion', 'admin@tudominio.com', '2026-04-18 14:32:18');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 218, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 232, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 222, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 236, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 214, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 228, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 217, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 231, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 221, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 235, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 216, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 230, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 211, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 234, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 219, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 233, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 220, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 237, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 68, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 82, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 72, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 86, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 64, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 78, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 67, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 81, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 71, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 85, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 66, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 80, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 61, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 84, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 69, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 83, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 70, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 87, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 158, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 172, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 162, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 176, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 154, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 168, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 157, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 171, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 161, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 175, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 156, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 170, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 151, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 174, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 159, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 173, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 160, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 177, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 278, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 292, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 282, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 296, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 274, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 288, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 277, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 291, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 281, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 295, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 276, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 290, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 271, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 294, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 279, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 293, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 280, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 297, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 248, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 262, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 252, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 266, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 244, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 258, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 247, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 261, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 251, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 265, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 246, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 260, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 241, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 264, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 249, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 263, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 250, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 267, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 98, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 112, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 102, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 116, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 94, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 108, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 97, 4.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 111, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 101, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 115, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 96, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 110, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 91, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 114, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 99, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 113, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 100, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 117, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 188, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 202, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 192, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 206, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 184, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 198, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 187, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 201, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 191, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 205, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 186, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 200, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 181, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 204, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 189, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 203, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 190, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 207, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 128, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 142, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 132, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 146, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 124, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 138, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 127, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 141, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 131, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 145, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 126, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 140, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 121, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 144, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 129, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 143, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 130, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (4, 147, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (5, 2, '2026-04-17', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:36:13');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 215, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 229, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 213, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 227, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 212, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 224, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 209, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 225, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 210, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 226, 4.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 208, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 223, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 65, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 79, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 63, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 77, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 62, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 74, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 59, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 75, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 60, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 76, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 58, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 73, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 155, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 169, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 153, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 167, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 152, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 164, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 149, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 165, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 150, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 166, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 148, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 163, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 275, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 289, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 273, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 287, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 272, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 284, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 269, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 285, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 270, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 286, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 268, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 283, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 245, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 259, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 243, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 257, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 242, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 254, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 239, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 255, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 240, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 256, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 238, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 253, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 95, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 109, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 93, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 107, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 92, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 104, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 89, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 105, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 90, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 106, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 88, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 103, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 185, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 199, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 183, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 197, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 182, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 194, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 179, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 195, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 180, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 196, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 178, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 193, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 125, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 139, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 123, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 137, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 122, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 134, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 119, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 135, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 120, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 136, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 118, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (5, 133, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (6, 2, '2026-04-17', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:36:18');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 215, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 229, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 213, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 227, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 212, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 224, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 209, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 225, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 210, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 226, 4.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 208, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 223, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 65, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 79, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 63, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 77, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 62, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 74, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 59, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 75, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 60, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 76, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 58, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 73, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 155, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 169, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 153, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 167, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 152, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 164, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 149, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 165, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 150, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 166, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 148, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 163, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 275, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 289, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 273, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 287, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 272, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 284, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 269, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 285, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 270, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 286, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 268, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 283, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 245, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 259, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 243, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 257, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 242, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 254, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 239, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 255, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 240, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 256, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 238, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 253, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 95, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 109, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 93, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 107, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 92, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 104, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 89, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 105, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 90, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 106, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 88, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 103, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 185, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 199, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 183, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 197, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 182, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 194, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 179, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 195, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 180, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 196, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 178, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 193, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 125, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 139, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 123, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 137, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 122, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 134, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 119, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 135, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 120, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 136, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 118, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (6, 133, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (7, 2, '2026-04-17', 'eliminacion', 'admin@tudominio.com', '2026-04-18 14:36:22');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 215, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 229, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 213, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 227, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 212, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 224, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 209, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 225, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 210, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 226, 4.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 208, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 223, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 65, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 79, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 63, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 77, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 62, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 74, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 59, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 75, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 60, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 76, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 58, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 73, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 155, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 169, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 153, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 167, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 152, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 164, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 149, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 165, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 150, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 166, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 148, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 163, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 275, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 289, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 273, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 287, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 272, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 284, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 269, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 285, -0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 270, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 286, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 268, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 283, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 245, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 259, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 243, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 257, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 242, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 254, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 239, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 255, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 240, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 256, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 238, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 253, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 95, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 109, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 93, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 107, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 92, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 104, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 89, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 105, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 90, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 106, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 88, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 103, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 185, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 199, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 183, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 197, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 182, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 194, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 179, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 195, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 180, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 196, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 178, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 193, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 125, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 139, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 123, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 137, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 122, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 134, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 119, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 135, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 120, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 136, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 118, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (7, 133, 5);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (8, 3, '2222-02-01', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:38:36');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 55, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 45, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 53, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 51, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 52, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 39, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 46, 22);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 47, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 42, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 44, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 57, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 41, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 49, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 48, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 56, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 40, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 50, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 43, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 36, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 26, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 34, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 32, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 33, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 20, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 27, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 28, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 23, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 25, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 38, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 22, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 30, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 29, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 37, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 21, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 31, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 24, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 17, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 7, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 15, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 13, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 14, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 1, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 8, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 9, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 4, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 6, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 19, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 3, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 11, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 10, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 18, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 2, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 12, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (8, 5, 2);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (9, 3, '2222-02-01', 'eliminacion', 'admin@tudominio.com', '2026-04-18 14:38:41');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 55, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 45, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 53, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 51, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 52, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 39, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 46, 22);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 47, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 42, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 44, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 57, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 41, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 49, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 48, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 56, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 40, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 50, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 43, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 36, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 26, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 34, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 32, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 33, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 20, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 27, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 28, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 23, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 25, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 38, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 22, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 30, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 29, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 37, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 21, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 31, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 24, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 17, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 7, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 15, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 13, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 14, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 1, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 8, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 9, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 4, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 6, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 19, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 3, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 11, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 10, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 18, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 2, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 12, 2);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (9, 5, 2);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (10, 3, '2026-04-13', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:38:46');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 55, -888);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 45, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 53, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 51, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 52, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 39, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 46, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 47, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 42, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 44, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 57, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 41, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 49, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 48, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 56, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 40, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 50, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 43, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 36, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 26, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 34, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 32, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 33, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 20, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 27, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 28, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 23, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 25, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 38, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 22, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 30, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 29, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 37, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 21, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 31, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 24, 7.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 17, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 7, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 15, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 13, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 14, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 1, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 8, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 9, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 4, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 6, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 19, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 3, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 11, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 10, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 18, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 2, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 12, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (10, 5, 8);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (11, 3, '2026-04-13', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:38:55');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 55, -888);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 45, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 53, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 51, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 52, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 39, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 46, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 47, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 42, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 44, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 57, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 41, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 49, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 48, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 56, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 40, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 50, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 43, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 36, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 26, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 34, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 32, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 33, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 20, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 27, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 28, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 23, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 25, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 38, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 22, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 30, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 29, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 37, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 21, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 31, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 24, 7.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 17, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 7, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 15, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 13, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 14, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 1, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 8, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 9, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 4, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 6, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 19, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 3, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 11, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 10, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 18, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 2, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 12, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (11, 5, 8);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (12, 3, '2026-04-13', 'actualizacion', 'admin@tudominio.com', '2026-04-18 14:39:25');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 55, -888);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 45, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 53, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 51, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 52, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 39, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 46, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 47, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 42, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 44, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 57, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 41, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 49, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 48, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 56, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 40, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 50, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 43, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 36, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 26, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 34, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 32, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 33, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 20, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 27, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 28, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 23, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 25, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 38, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 22, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 30, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 29, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 37, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 21, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 31, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 24, 7.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 17, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 7, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 15, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 13, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 14, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 1, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 8, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 9, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 4, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 6, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 19, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 3, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 11, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 10, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 18, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 2, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 12, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (12, 5, 8);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (13, 3, '2026-04-13', 'actualizacion', 'estadistica@estadistica.com', '2026-04-27 15:08:55');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 55, -888);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 45, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 53, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 51, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 52, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 39, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 46, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 47, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 42, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 44, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 57, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 41, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 49, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 48, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 56, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 40, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 50, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 43, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 36, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 26, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 34, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 32, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 33, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 20, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 27, 0.02);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 28, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 23, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 25, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 38, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 22, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 30, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 29, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 37, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 21, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 31, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 24, 7.98);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 17, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 7, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 15, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 13, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 14, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 1, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 8, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 9, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 4, 7.99);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 6, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 19, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 3, 88);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 11, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 10, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 18, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 2, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 12, 8);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (13, 5, 8);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (14, 1, '2026-04-26', 'actualizacion', 'estadistica@estadistica.com', '2026-04-27 15:09:28');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 218, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 232, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 222, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 236, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 214, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 228, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 217, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 231, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 221, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 235, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 216, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 230, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 211, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 234, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 219, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 233, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 220, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 237, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 68, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 82, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 72, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 86, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 64, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 78, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 67, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 81, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 71, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 85, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 66, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 80, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 61, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 84, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 69, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 83, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 70, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 87, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 158, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 172, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 162, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 176, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 154, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 168, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 157, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 171, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 161, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 175, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 156, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 170, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 151, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 174, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 159, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 173, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 160, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 177, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 278, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 292, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 282, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 296, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 274, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 288, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 277, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 291, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 281, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 295, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 276, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 290, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 271, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 294, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 279, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 293, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 280, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 297, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 248, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 262, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 252, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 266, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 244, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 258, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 247, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 261, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 251, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 265, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 246, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 260, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 241, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 264, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 249, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 263, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 250, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 267, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 98, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 112, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 102, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 116, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 94, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 108, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 97, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 111, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 101, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 115, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 96, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 110, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 91, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 114, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 99, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 113, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 100, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 117, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 188, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 202, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 192, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 206, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 184, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 198, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 187, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 201, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 191, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 205, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 186, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 200, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 181, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 204, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 189, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 203, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 190, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 207, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 128, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 142, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 132, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 146, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 124, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 138, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 127, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 141, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 131, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 145, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 126, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 140, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 121, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 144, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 129, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 143, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 130, 0);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (14, 147, 0);
INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (15, 1, '2026-03-07', 'eliminacion', 'estadistica@estadistica.com', '2026-04-27 15:09:42');
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 218, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 232, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 222, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 236, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 214, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 228, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 217, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 231, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 221, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 235, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 216, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 230, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 211, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 234, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 219, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 233, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 220, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 237, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 68, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 82, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 72, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 86, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 64, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 78, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 67, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 81, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 71, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 85, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 66, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 80, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 61, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 84, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 69, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 83, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 70, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 87, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 158, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 172, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 162, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 176, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 154, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 168, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 157, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 171, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 161, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 175, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 156, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 170, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 151, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 174, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 159, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 173, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 160, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 177, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 278, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 292, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 282, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 296, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 274, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 288, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 277, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 291, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 281, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 295, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 276, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 290, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 271, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 294, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 279, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 293, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 280, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 297, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 248, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 262, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 252, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 266, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 244, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 258, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 247, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 261, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 251, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 265, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 246, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 260, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 241, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 264, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 249, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 263, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 250, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 267, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 98, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 112, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 102, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 116, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 94, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 108, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 97, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 111, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 101, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 115, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 96, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 110, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 91, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 114, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 99, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 113, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 100, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 117, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 188, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 202, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 192, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 206, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 184, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 198, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 187, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 201, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 191, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 205, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 186, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 200, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 181, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 204, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 189, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 203, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 190, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 207, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 128, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 142, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 132, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 146, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 124, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 138, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 127, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 141, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 131, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 145, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 126, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 140, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 121, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 144, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 129, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 143, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 130, 5);
INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (15, 147, 5);
SET FOREIGN_KEY_CHECKS = 1;

-- Migración: usuarios: 6 filas; empleados: 2 ok, 0 omitidos; empleados tras referencias: 12; historial_laboral: 13 ok, 0 omitidos; asistencias: 1 ok, 0 omitidos; certificaciones: 1 ok, 0 omitidos; cursos: 1 ok, 0 omitidos; evalcapacitacion: 2 ok, 0 omitidos; evaluaciones: 1 ok, 0 omitidos; objetivos: 2 ok, 0 omitidos; salarios: 1 ok, 0 omitidos; seguridad: 1 ok, 0 omitidos; vacaciones: 2 ok, 0 omitidos; segseguridad: 1; turnos_trabajo: 3; grupos_trabajo: 2; grupo_miembros: 5; asistencia_grupal: 3; cert_medicos: 1; eval_medicas: 1; sanciones_empleado: 1; reconocimientos_empleado: 2; jubilaciones_empleado: 2; licencias_empleado: 0; sacrificio_vacuno: 2 registros, 288 valores; matadero_vivo: 2 registros, 192 valores; leche: 1 registros, 54 valores; historico_produccion: 15