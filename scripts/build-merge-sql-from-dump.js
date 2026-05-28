/**
 * Lee bd_crud_(1).sql (dump del compañero) y genera merge_companero_bd_crud.sql:
 * esquema mínimo + datos con INSERT IGNORE / merges seguros.
 *
 * Uso: node scripts/build-merge-sql-from-dump.js [ruta-al-dump.sql]
 */
const fs = require('fs');
const path = require('path');

const dumpPath =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || '',
    'AppData',
    'Local',
    'Packages',
    '38833FF26BA1D.UnigramPreview_g9c9v27vpyspw',
    'LocalState',
    '0',
    'documents',
    'bd_crud_(1).sql'
  );

const outPath = path.join(__dirname, '..', 'merge_companero_bd_crud.sql');

if (!fs.existsSync(dumpPath)) {
  console.error('No existe el dump:', dumpPath);
  process.exit(1);
}

const text = fs.readFileSync(dumpPath, 'utf8');
const lines = text.split(/\r?\n/);
const inserts = lines.filter((l) => l.startsWith('INSERT INTO'));

/** Divide el interior de VALUES en tuplas completas `( ... ), ( ... )`. */
function splitValueTuples(body) {
  const rows = [];
  let depth = 0;
  let cur = '';
  let inStr = false;
  let strCh = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      cur += c;
      if (c === '\\' && body[i + 1]) {
        cur += body[++i];
        continue;
      }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inStr = true;
      strCh = c;
      cur += c;
      continue;
    }
    if (c === '(') {
      depth++;
      cur += c;
      continue;
    }
    if (c === ')') {
      depth--;
      cur += c;
      continue;
    }
    if (c === ',' && depth === 0) {
      rows.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) rows.push(cur.trim());
  return rows;
}

/** Campos de una tupla (sin paréntesis exterior). */
function splitTupleFields(inner) {
  const fields = [];
  let cur = '';
  let depth = 0;
  let inStr = false;
  let strCh = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      cur += c;
      if (c === '\\' && inner[i + 1]) {
        cur += inner[++i];
        continue;
      }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inStr = true;
      strCh = c;
      cur += c;
      continue;
    }
    if (c === '(') {
      depth++;
      cur += c;
      continue;
    }
    if (c === ')') {
      depth--;
      cur += c;
      continue;
    }
    if (c === ',' && depth === 0) {
      fields.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) fields.push(cur.trim());
  return fields;
}

function sqlQuoteCarnet(raw) {
  const s = String(raw || '').trim();
  if (s === '' || s.toUpperCase() === 'NULL') return 'NULL';
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) return s;
  if (/^[-+]?\d+(\.\d+)?$/.test(s)) return `'${s}'`;
  return `'${s.replace(/'/g, "''")}'`;
}

/** Quita primera columna (suelta PK auto_increment) de cada tupla en INSERT INTO `t`. */
function stripFirstTupleColumn(insertLine) {
  const m = insertLine.match(/^INSERT INTO `([^`]+)` VALUES (.+);$/);
  if (!m) return insertLine.replace(/;$/, '');
  const tuples = splitValueTuples(m[2]);
  const stripped = tuples.map((row) => {
    if (!row.startsWith('(')) return row;
    let depth2 = 0;
    let comma = -1;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === "'" || ch === '"') {
        const q = ch;
        i++;
        while (i < row.length) {
          if (row[i] === '\\') {
            i += 2;
            continue;
          }
          if (row[i] === q) break;
          i++;
        }
        continue;
      }
      if (ch === '(') depth2++;
      else if (ch === ')') depth2--;
      else if (ch === ',' && depth2 === 1 && comma === -1) comma = i;
    }
    if (comma === -1) return row;
    return '(' + row.slice(comma + 1).replace(/^\s*/, '');
  });
  return stripped.join(',');
}

/** Dump antiguo: carnet, nombre, apellidos, puesto, tel, id_dep, salario, beneficios, cursos, cert, lic, resultados, activo, ... */
function buildEmpleadosMerge(insertLine) {
  const m = insertLine.match(/^INSERT INTO `empleados` VALUES (.+);$/);
  if (!m) return '';
  const tuples = splitValueTuples(m[1]);
  const mapped = [];
  for (const tup of tuples) {
    if (!tup.startsWith('(')) continue;
    const inner = tup.slice(1, -1);
    const f = splitTupleFields(inner);
    if (f.length < 17) continue;
    const carnet = sqlQuoteCarnet(f[0]);
    const out = [
      carnet,
      f[1],
      f[2],
      f[3],
      f[4],
      f[5],
      f[7],
      f[12],
      f[13],
      f[14],
      f[15],
      f[16],
    ].join(',');
    mapped.push(`(${out})`);
  }
  return mapped.join(',\n');
}

const preamble = `-- Fusionar datos del dump del compañero en tu bd_crud (MySQL 5.7+).
-- Generado por scripts/build-merge-sql-from-dump.js — revisar antes de ejecutar.
-- Respaldo completo recomendado.

USE bd_crud;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- ---------- Esquema: columnas que suele tener el dump del compañero ----------
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER //
CREATE PROCEDURE add_column_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @s = CONCAT('ALTER TABLE \`', p_table, '\` ', p_ddl);
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_column_if_missing('leche', 'creado_por', 'ADD COLUMN creado_por VARCHAR(255) NULL AFTER total_Perd');
CALL add_column_if_missing('leche', 'actualizado_por', 'ADD COLUMN actualizado_por VARCHAR(255) NULL AFTER creado_por');

CALL add_column_if_missing('matadero_vivo', 'creado_por', 'ADD COLUMN creado_por VARCHAR(255) NULL AFTER total2_Kg');
CALL add_column_if_missing('matadero_vivo', 'actualizado_por', 'ADD COLUMN actualizado_por VARCHAR(255) NULL AFTER creado_por');

CALL add_column_if_missing('sacrificio_vacuno', 'creado_por', 'ADD COLUMN creado_por VARCHAR(255) NULL AFTER total2_Tm_st');
CALL add_column_if_missing('sacrificio_vacuno', 'actualizado_por', 'ADD COLUMN actualizado_por VARCHAR(255) NULL AFTER creado_por');

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- Tabla de prueba que aparece en dumps del compañero (no usada por el backend habitualmente).
CREATE TABLE IF NOT EXISTS tabla1 (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) DEFAULT NULL,
  edad INT DEFAULT NULL,
  pais VARCHAR(100) DEFAULT NULL,
  cargo VARCHAR(100) DEFAULT NULL,
  anios INT DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles usados en rutas del backend (incl. estadística, director, producción)
ALTER TABLE usuarios MODIFY COLUMN rol ENUM(
  'admin','contratacion','rrhh','estadistica','director','produccion'
) NOT NULL DEFAULT 'rrhh';

`;

let body = '';

for (const line of inserts) {
  const tm = line.match(/^INSERT INTO `([^`]+)` VALUES (.+);$/);
  if (!tm) continue;
  const tbl = tm[1];

  if (tbl === 'usuarios') {
    const vals = tm[2];
    body += `-- usuarios: actualiza nombre/rol/activo/auditoría sin pisar contraseña si ya existe\n`;
    body += `INSERT INTO usuarios (email, nombre, password, rol, activo, created_by, created_at, updated_by, updated_at) VALUES ${vals}\n`;
    body += `ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), rol = VALUES(rol), activo = VALUES(activo),\n`;
    body += `  created_by = COALESCE(VALUES(created_by), created_by),\n`;
    body += `  updated_by = VALUES(updated_by), updated_at = VALUES(updated_at);\n\n`;
    continue;
  }

  if (tbl === 'empleados') {
    body += `-- empleados (modelo actual: sin salario/cursos/cert/lic en la fila)\n`;
    body += `INSERT IGNORE INTO empleados (carnet_identidad, nombre, apellidos, puesto, telefono, id_departamento, beneficios, activo, fecha_baja, motivo_baja, nivel_escolar, superacion_en_proceso)\nVALUES\n`;
    body += `${buildEmpleadosMerge(line)};\n\n`;
    continue;
  }

  if (tbl === 'asistencia_grupal') {
    body += `INSERT IGNORE INTO asistencia_grupal (id_grupo, fecha, miembros_presentes, miembros_total, observaciones) VALUES ${stripFirstTupleColumn(
      line
    )};\n\n`;
    continue;
  }

  if (tbl === 'historial_laboral') {
    body += `INSERT IGNORE INTO historial_laboral (carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo, fecha_cambio) VALUES ${stripFirstTupleColumn(
      line
    )};\n\n`;
    continue;
  }

  if (tbl === 'password_reset_tokens') {
    body += `-- Token de reset del dump (opcional; suele estar caducado)\n`;
    body += `INSERT IGNORE INTO password_reset_tokens (id, email, token_hash, expires_at, used_at, requested_ip, created_at) VALUES ${tm[2]};\n\n`;
    continue;
  }

  body += `INSERT IGNORE INTO \`${tbl}\` VALUES ${tm[2]};\n\n`;
}

const footer = `
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
`;

fs.writeFileSync(outPath, preamble + body + footer, 'utf8');
console.log('Escrito:', outPath, '(bytes:', fs.statSync(outPath).size, ')');
