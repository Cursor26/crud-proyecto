/**
 * Genera bd_crud_normalizada.sql desde el dump bd_crud.sql
 * Ejecutar: node "esta es/build-normalized-sql.mjs"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { CAMPOS_SACRIFICIO, CAMPOS_MATADERO, CAMPOS_LECHE } = require('../server/validateProduccion.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(
  'C:',
  'Users',
  'KevinACL Carcharodón',
  'Downloads',
  'Normalizando base de datos',
  'bd prueba',
  'prueba 1',
  'bd_crud.sql'
);
const OUT = path.join(__dirname, 'bd_crud_normalizada.sql');

const HEMBRA = ['terneras', 'aniojas', 'novillas', 'vacas'];
const MACHO = ['terneros', 'aniojos', 'novillos', 'bueyes'];
const TOTAL_SM = new Set(['total1', 'total2']);
const PLANTAS = ['Zenea', 'Rosafe', 'Nazareno'];
const TOTALES_LECHE = new Set(['total1', 'total2', 'total3', 'total4', 'total5', 'total']);

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function carnetNorm(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length > 11) return null;
  return d.padStart(11, '0');
}

function parseInsertBlocks(sql, table) {
  const re = new RegExp(`INSERT INTO \\\`${table}\\\` VALUES ([^;]+);`, 'g');
  const blocks = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

/** Parser simple de tuplas MySQL dump */
function parseTuples(block) {
  const rows = [];
  let i = 0;
  while (i < block.length) {
    if (block[i] !== '(') {
      i++;
      continue;
    }
    i++;
    const vals = [];
    let cur = '';
    let inStr = false;
    let strCh = '';
    while (i < block.length) {
      const ch = block[i];
      if (inStr) {
        if (ch === '\\' && i + 1 < block.length) {
          cur += block[i + 1];
          i += 2;
          continue;
        }
        if (ch === strCh) {
          inStr = false;
          vals.push(cur);
          cur = '';
          i++;
          continue;
        }
        cur += ch;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"') {
        inStr = true;
        strCh = ch;
        i++;
        continue;
      }
      if (ch === ')') {
        if (cur !== '' && cur !== ',') vals.push(coerceToken(cur.trim()));
        rows.push(vals);
        i++;
        break;
      }
      if (ch === ',') {
        if (cur.trim() !== '') vals.push(coerceToken(cur.trim()));
        cur = '';
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
  }
  return rows;
}

function coerceToken(t) {
  if (t === 'NULL') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function metricasStore(modulo) {
  const all =
    modulo === 'sacrificio' ? CAMPOS_SACRIFICIO
      : modulo === 'matadero' ? CAMPOS_MATADERO
        : CAMPOS_LECHE;
  return all.filter((k) => {
    const idx = k.indexOf('_');
    const cat = k.slice(0, idx);
    if (modulo === 'leche') return !TOTALES_LECHE.has(cat);
    return !TOTAL_SM.has(cat);
  });
}

function extractCreateColumns(sql, table) {
  const re = new RegExp(`CREATE TABLE \\\`${table}\\\` \\(([\\s\\S]*?)\\) ENGINE`, 'i');
  const m = sql.match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('`'))
    .map((l) => l.match(/^`([^`]+)`/)?.[1])
    .filter(Boolean);
}

function rowToObject(cols, vals) {
  const o = {};
  cols.forEach((c, i) => {
    o[c] = vals[i];
  });
  return o;
}

function readSource() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`No se encontró dump: ${SOURCE}`);
  }
  return fs.readFileSync(SOURCE, 'latin1');
}

function ddl() {
  return `-- bd_crud normalizada (3FN/BCNF) — generado ${new Date().toISOString()}
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

`;
}

function main() {
  const sql = readSource();
  const lines = [];
  const log = [];
  lines.push(ddl());

  const metricaIds = new Map();
  let nextMetId = 1;
  const allMetrics = [...new Set([...metricasStore('sacrificio'), ...metricasStore('matadero'), ...metricasStore('leche')])].sort();
  for (const clave of allMetrics) {
    metricaIds.set(clave, nextMetId++);
    lines.push(`INSERT INTO prod_metrica (id_metrica, clave) VALUES (${metricaIds.get(clave)}, ${esc(clave)});`);
  }

  const rolMap = {
    admin: 1, rrhh: 2, contratacion: 3, produccion: 4, estadistica: 5, director: 6,
  };

  // USUARIOS
  const uCols = extractCreateColumns(sql, 'usuarios');
  const uBlocks = parseInsertBlocks(sql, 'usuarios');
  let usuariosOk = 0;
  for (const block of uBlocks) {
    for (const tup of parseTuples(block)) {
      const o = rowToObject(uCols, tup);
      const idRol = rolMap[String(o.rol || '').toLowerCase()] || 2;
      lines.push(
        `INSERT INTO usuarios (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at) VALUES (${esc(o.email)}, ${esc(o.nombre)}, ${esc(o.password)}, ${idRol}, ${o.activo ?? 1}, ${esc(o.created_by)}, ${o.created_at ? esc(o.created_at) : 'CURRENT_TIMESTAMP'}, ${esc(o.updated_by)}, ${o.updated_at ? esc(o.updated_at) : 'NULL'});`
      );
      usuariosOk++;
    }
  }
  log.push(`usuarios: ${usuariosOk} filas`);

  // password_reset_tokens if any
  if (sql.includes('CREATE TABLE `password_reset_tokens`')) {
    const prCols = extractCreateColumns(sql, 'password_reset_tokens');
    for (const block of parseInsertBlocks(sql, 'password_reset_tokens')) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(prCols, tup);
        lines.push(
          `INSERT INTO password_reset_tokens (id, email, token_hash, expires_at, used_at, requested_ip, created_at) VALUES (${esc(o.id)}, ${esc(o.email)}, ${esc(o.token_hash)}, ${esc(o.expires_at)}, ${esc(o.used_at)}, ${esc(o.requested_ip)}, ${esc(o.created_at)});`
        );
      }
    }
  }

  const tipoContratoIds = new Map();
  let nextTipo = 1;
  function tipoContratoId(nombre) {
    const n = String(nombre || '').trim() || '(Sin tipo)';
    if (!tipoContratoIds.has(n)) {
      tipoContratoIds.set(n, nextTipo++);
      lines.push(`INSERT INTO catalogo_tipo_contrato (id_tipo_contrato, nombre) VALUES (${tipoContratoIds.get(n)}, ${esc(n)});`);
    }
    return tipoContratoIds.get(n);
  }

  // CONTRATOS
  const cCols = extractCreateColumns(sql, 'contratos_generales');
  for (const block of parseInsertBlocks(sql, 'contratos_generales')) {
    for (const tup of parseTuples(block)) {
      const o = rowToObject(cCols, tup);
      const idCon = Number(o.proveedor_cliente) === 1 ? 2 : 1;
      const idTipo = o.tipo_contrato ? tipoContratoId(o.tipo_contrato) : 'NULL';
      lines.push(
        `INSERT INTO contratos_generales (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia, id_tipo_contrato, fecha_inicio, fecha_fin) VALUES (${esc(o.numero_contrato)}, ${idCon}, ${esc(o.empresa)}, ${esc(o.correo_notificacion)}, ${esc(o.suplementos)}, ${esc(o.vigencia)}, ${idTipo}, ${esc(o.fecha_inicio)}, ${esc(o.fecha_fin)});`
      );
    }
  }

  const empleadoSet = new Set();

  function migrateEmpleadoFirst() {
    const eCols = extractCreateColumns(sql, 'empleados');
    let ok = 0;
    let skip = 0;
    for (const block of parseInsertBlocks(sql, 'empleados')) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(eCols, tup);
        const carnet = carnetNorm(o.carnet_identidad);
        if (!carnet) {
          skip++;
          continue;
        }
        empleadoSet.add(carnet);
        const tel = o.telefono != null ? String(o.telefono).replace(/\D/g, '').slice(-8) : null;
        lines.push(
          `INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, telefono, id_departamento, beneficios, resultados_auditorias, activo, fecha_baja, motivo_baja, nivel_escolar, superacion_en_proceso) VALUES (${esc(carnet)}, ${esc(o.nombre)}, ${esc(o.apellidos)}, ${esc(o.puesto)}, ${tel ? esc(tel.padStart(8, '0').slice(-8)) : 'NULL'}, ${esc(o.id_departamento)}, ${esc(o.beneficios)}, ${esc(o.resultados_auditorias)}, ${o.activo ?? 1}, ${esc(o.fecha_baja)}, ${esc(o.motivo_baja)}, ${esc(o.nivel_escolar)}, ${esc(o.superacion_en_proceso)});`
        );
        ok++;
      }
    }
    log.push(`empleados: ${ok} ok, ${skip} omitidos`);
  }

  // departamentos, cargos, etc. before empleados FK - departamentos has self FK
  for (const table of ['departamentos', 'cargos']) {
    const cols = extractCreateColumns(sql, table);
    if (!cols.length) continue;
    for (const block of parseInsertBlocks(sql, table)) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(cols, tup);
        if (table === 'cargos') {
          const depName = o.departamento;
          let idDep = 'NULL';
          if (depName) {
            lines.push(`INSERT IGNORE INTO departamentos (nombre, descripcion, activo) VALUES (${esc(depName)}, NULL, 1);`);
            idDep = `(SELECT id_departamento FROM departamentos WHERE nombre = ${esc(depName)} LIMIT 1)`;
          }
          lines.push(
            `INSERT INTO cargos (id_cargo, nombre, descripcion, salario_base, id_departamento, activo) VALUES (${esc(o.id_cargo)}, ${esc(o.nombre)}, ${esc(o.descripcion)}, ${esc(o.salario_base)}, ${idDep}, ${o.activo ?? 1});`
          );
        } else {
          const vals = cols.map((c) => esc(o[c]));
          lines.push(`INSERT INTO ${table} (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${vals.join(', ')});`);
        }
      }
    }
  }

  migrateEmpleadoFirst();

  function registrarCarnetReferenciado(raw) {
    const c = carnetNorm(raw);
    if (!c) return;
    if (empleadoSet.has(c)) return;
    empleadoSet.add(c);
    lines.push(
      `INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, activo) VALUES (${esc(c)}, '(Migrado)', '(Referenciado)', 'Sin asignar', 1);`
    );
  }

  const tablasConCarnet = [
    'asistencias', 'certificaciones', 'cursos', 'evalcapacitacion', 'evaluaciones', 'objetivos',
    'salarios', 'seguridad', 'segseguridad', 'vacaciones', 'turnos_trabajo', 'grupo_miembros',
    'cert_medicos', 'eval_medicas', 'sanciones_empleado', 'reconocimientos_empleado',
    'jubilaciones_empleado', 'licencias_empleado', 'historial_laboral',
  ];
  for (const table of tablasConCarnet) {
    const cols = extractCreateColumns(sql, table);
    if (!cols.length) continue;
    const keyCol = cols.includes('id_tabla') ? 'id_tabla' : cols.includes('carnet_identidad') ? 'carnet_identidad' : null;
    if (!keyCol) continue;
    for (const block of parseInsertBlocks(sql, table)) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(cols, tup);
        registrarCarnetReferenciado(o[keyCol]);
      }
    }
  }
  log.push(`empleados tras referencias: ${empleadoSet.size}`);

  function migrateSatelite(table, mapFn, name) {
    const cols = extractCreateColumns(sql, table);
    if (!cols.length) return;
    let ok = 0;
    let skip = 0;
    for (const block of parseInsertBlocks(sql, table)) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(cols, tup);
        const mapped = mapFn(o);
        if (!mapped) {
          skip++;
          continue;
        }
        const { insertSql } = mapped;
        lines.push(insertSql);
        ok++;
      }
    }
    log.push(`${name}: ${ok} ok, ${skip} omitidos`);
  }

  migrateSatelite('historial_laboral', (o) => {
    const c = carnetNorm(o.carnet_identidad);
    if (!c || !empleadoSet.has(c)) return null;
    return {
      insertSql: `INSERT INTO historial_laboral (id, carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES (${esc(o.id)}, ${esc(c)}, ${esc(o.tipo_cambio)}, ${esc(o.valor_anterior)}, ${esc(o.valor_nuevo)}, ${esc(o.fecha_cambio)});`,
    };
  }, 'historial_laboral');

  const sateliteSimple = [
    ['asistencias', 'asistencias', (o, c) => `INSERT INTO asistencias (carnet_identidad, codigo_asistencia, desc_causas, horas_trabajadas) VALUES (${esc(c)}, ${esc(o.codigo_asistencia)}, ${esc(o.desc_causas)}, ${esc(o.horas_trabajadas)});`],
    ['certificaciones', 'certificaciones', (o, c) => `INSERT INTO certificaciones (carnet_identidad, certificacion) VALUES (${esc(c)}, ${esc(o.certificacion)});`],
    ['cursos', 'cursos', (o, c) => `INSERT INTO cursos (carnet_identidad, curso, descr, logrado, fech_fin_curso) VALUES (${esc(c)}, ${esc(o.curso)}, ${esc(o.descr)}, ${o.logrado ?? 0}, ${esc(o.fech_fin_curso)});`],
    ['evalcapacitacion', 'evalcapacitacion', (o, c) => `INSERT INTO evalcapacitacion (carnet_identidad, evaluacion, descr) VALUES (${esc(c)}, ${esc(o.evaluacion)}, ${esc(o.descr)});`],
    ['evaluaciones', 'evaluaciones', (o, c) => `INSERT INTO evaluaciones (carnet_identidad, evaluacion, descr) VALUES (${esc(c)}, ${esc(o.evaluacion)}, ${esc(o.descr)});`],
    ['objetivos', 'objetivos', (o, c) => `INSERT INTO objetivos (carnet_identidad, objetivo, descr, logrado, fecha_logrado) VALUES (${esc(c)}, ${esc(o.objetivo)}, ${esc(o.descr)}, ${o.logrado ?? 0}, ${esc(o.fecha_logrado)});`],
    ['salarios', 'salarios', (o, c) => `INSERT INTO salarios (carnet_identidad, salario_neto) VALUES (${esc(c)}, ${esc(o.salario_neto)});`],
    ['seguridad', 'seguridad', (o, c) => `INSERT INTO seguridad (carnet_identidad, acceso) VALUES (${esc(c)}, ${esc(o.acceso)});`],
    ['vacaciones', 'vacaciones', (o, c) => `INSERT INTO vacaciones (carnet_identidad, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones) VALUES (${esc(c)}, ${esc(o.fecha_inicio)}, ${esc(o.fecha_fin)}, ${esc(o.dias_totales)}, ${esc(o.motivo)}, ${o.aprobado ?? 0}, ${esc(o.observaciones)});`],
  ];

  for (const [oldTable, , build] of sateliteSimple) {
    migrateSatelite(oldTable, (o) => {
      const c = carnetNorm(o.id_tabla ?? o.carnet_identidad);
      if (!c || !empleadoSet.has(c)) return null;
      return { insertSql: build(o, c) };
    }, oldTable);
  }

  // segseguridad + incidencias
  const segCols = extractCreateColumns(sql, 'segseguridad');
  let segOk = 0;
  for (const block of parseInsertBlocks(sql, 'segseguridad')) {
    for (const tup of parseTuples(block)) {
      const o = rowToObject(segCols, tup);
      const c = carnetNorm(o.id_tabla);
      if (!c || !empleadoSet.has(c)) continue;
      lines.push(`INSERT INTO segseguridad (carnet_identidad) VALUES (${esc(c)});`);
      const idSeg = `(SELECT id_seg FROM segseguridad WHERE carnet_identidad = ${esc(c)} LIMIT 1)`;
      for (const [orden, cant, desc] of [
        [1, o.cant_accuno, o.desc_uno],
        [2, o.cant_accdos, o.desc_dos],
        [3, o.cant_acctres, o.desc_tres],
      ]) {
        lines.push(`INSERT INTO segseguridad_incidencia (id_seg, orden, cantidad, descripcion) VALUES (${idSeg}, ${orden}, ${esc(cant)}, ${esc(desc)});`);
      }
      segOk++;
    }
  }
  log.push(`segseguridad: ${segOk}`);

  for (const table of [
    'turnos_trabajo', 'grupos_trabajo', 'grupo_miembros', 'asistencia_grupal',
    'cert_medicos', 'eval_medicas', 'sanciones_empleado', 'reconocimientos_empleado',
    'jubilaciones_empleado', 'licencias_empleado',
  ]) {
    const cols = extractCreateColumns(sql, table);
    if (!cols.length) continue;
    let ok = 0;
    for (const block of parseInsertBlocks(sql, table)) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(cols, tup);
        if (o.carnet_identidad !== undefined) {
          const c = carnetNorm(o.carnet_identidad);
          if (!c || !empleadoSet.has(c)) continue;
          o.carnet_identidad = c;
        }
        if (table === 'grupo_miembros') {
          const c = carnetNorm(o.carnet_identidad);
          if (!c || !empleadoSet.has(c)) continue;
          lines.push(`INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (${esc(o.id_grupo)}, ${esc(c)});`);
          ok++;
          continue;
        }
        const useCols = cols.filter((c) => c !== 'id_tabla');
        const vals = useCols.map((c) => esc(o[c]));
        lines.push(`INSERT INTO ${table} (${useCols.map((c) => `\`${c}\``).join(', ')}) VALUES (${vals.join(', ')});`);
        ok++;
      }
    }
    log.push(`${table}: ${ok}`);
  }

  let regId = 1;
  const regByKey = new Map();

  function migrateProd(oldTable, modulo, idMod) {
    const cols = extractCreateColumns(sql, oldTable);
    const store = new Set(metricasStore(modulo));
    let rows = 0;
    let vals = 0;
    for (const block of parseInsertBlocks(sql, oldTable)) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(cols, tup);
        const fecha = o.fecha;
        const key = `${idMod}|${fecha}`;
        if (!regByKey.has(key)) {
          regByKey.set(key, regId);
          lines.push(
            `INSERT INTO prod_registro (id_registro, id_modulo, fecha, creado_por, actualizado_por) VALUES (${regId}, ${idMod}, ${esc(fecha)}, ${esc(o.creado_por)}, ${esc(o.actualizado_por)});`
          );
          regId++;
        }
        const idReg = regByKey.get(key);
        for (const clave of store) {
          if (o[clave] === undefined || o[clave] === null) continue;
          const idMet = metricaIds.get(clave);
          lines.push(`INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (${idReg}, ${idMet}, ${esc(o[clave])});`);
          vals++;
        }
        rows++;
      }
    }
    log.push(`${oldTable}: ${rows} registros, ${vals} valores`);
  }

  migrateProd('sacrificio_vacuno', 'sacrificio', 1);
  migrateProd('matadero_vivo', 'matadero', 2);
  migrateProd('leche', 'leche', 3);

  // Historico from JSON
  const hCols = extractCreateColumns(sql, 'produccion_historico');
  const modMap = { sacrificio: 1, matadero: 2, leche: 3 };
  let histOk = 0;
  if (hCols.length) {
    for (const block of parseInsertBlocks(sql, 'produccion_historico')) {
      for (const tup of parseTuples(block)) {
        const o = rowToObject(hCols, tup);
        const idMod = modMap[o.fuente] || 1;
        const hid = o.id;
        lines.push(
          `INSERT INTO historico_produccion (id, id_modulo, fecha_dato, accion, usuario_email, creado_en) VALUES (${esc(hid)}, ${idMod}, ${esc(o.fecha_dato)}, ${esc(o.accion)}, ${esc(o.usuario_email)}, ${esc(o.creado_en)});`
        );
        let datos = {};
        try {
          datos = JSON.parse(o.datos_json || '{}');
        } catch (_) {}
        const store = metricasStore(o.fuente || 'sacrificio');
        for (const clave of store) {
          if (datos[clave] === undefined) continue;
          const idMet = metricaIds.get(clave);
          if (!idMet) continue;
          lines.push(
            `INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (${esc(hid)}, ${idMet}, ${esc(datos[clave] ?? 0)});`
          );
        }
        histOk++;
      }
    }
  }
  log.push(`historico_produccion: ${histOk}`);

  lines.push('SET FOREIGN_KEY_CHECKS = 1;\n');
  lines.push(`-- Migración: ${log.join('; ')}`);

  fs.mkdirSync(__dirname, { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log('Generado:', OUT);
  console.log(log.join('\n'));
}

main();
