// --- Ensamblado: login/contratos/usuarios (tuyo) + RRHH/producción (compañero) + frontend (tuyo) ---


const express = require ("express");
const app = express();
app.set('trust proxy', true);
const mysql = require('mysql2');
const cors = require("cors");
const helmet = require('helmet');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();
const {
  STORAGE_ROOT,
  ACTIVOS_DIR,
  saveActivoPdf,
  saveActivoDocumento,
  saveArchivoPdf,
  copyFileToArchivo,
  resolveAbsPath,
  removeDirIfExists,
  calcRetencionHasta,
  contentTypeFromNombre,
} = require('./lib/contratosDocumentosStorage');
const {
  envSmtpConfig,
  buildMailerFromSmtp,
  getEffectiveCorreoConfig,
  saveCorreoConfigToDb,
  publicCorreoConfig,
  decryptPass,
} = require('./lib/sistemaCorreo');
const {
  resolveJwtSecret,
  buildCorsOptions,
  createAuthRateLimiters,
} = require('./lib/securityConfig');
const { isPublicApiPath } = require('./lib/apiPublicPaths');

const JWT_SECRET = resolveJwtSecret();
const authRateLimiters = createAuthRateLimiters();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors(buildCorsOptions(process.env.APP_BASE_URL || 'http://localhost:3000')));
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  app.use(authRateLimiters.api);
}
app.use(express.json({ limit: '50mb' }));
/* Express 5: sin cuerpo, express.json puede dejar req.body en undefined; normalizamos para rutas que desestructuran el body. */
app.use((req, res, next) => {
  if (req.body === undefined || req.body === null) {
    req.body = {};
  }
  next();
});

app.use(cookieParser());

const {
  SQL_USUARIO_AUTH,
  SQL_USUARIO_LIST,
  SQL_CONTRATO_SELECT,
  idRolDesdeCodigo,
  idsContratoDesdeBody,
  prioridadDesdeBody,
} = require('./db/queryHelpers');

const db = mysql.createPool({
  /* 127.0.0.1 evita ::1 con XAMPP en Windows (ECONNREFUSED en localhost) */
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password:
    process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== null
      ? String(process.env.DB_PASSWORD)
      : '',
  database: process.env.DB_NAME || 'bd_crud',
  charset: 'utf8mb4',
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
const SMTP_REQUIRED = String(process.env.SMTP_REQUIRED || 'false').toLowerCase() === 'true';
const MAIL_FALLBACK_MODE = String(process.env.MAIL_FALLBACK_MODE || 'graceful').toLowerCase();
const RESET_LINK_FALLBACK_ENABLED = String(process.env.RESET_LINK_FALLBACK_ENABLED || 'true').toLowerCase() === 'true';

const dbQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const { createMailOutboxService } = require('./lib/mailOutbox');
const mailOutbox = createMailOutboxService(dbQuery);

const { createAuditService } = require('./lib/auditLog');
const audit = createAuditService(dbQuery);
const { createJwtBlacklistService } = require('./lib/jwtBlacklist');
const jwtBlacklist = createJwtBlacklistService(dbQuery);
const { createContratosAuditoriaService } = require('./lib/contratosAuditoria');
const contratosAuditoria = createContratosAuditoriaService(dbQuery, audit);
const { createContratosMensajesService } = require('./lib/contratosMensajes');
const contratosMensajes = createContratosMensajesService(dbQuery);
const { createRbacService } = require('./lib/rbac');
const rbac = createRbacService(dbQuery);
const { createContratosRecordatoriosService } = require('./lib/contratosRecordatorios');
const { createContratosNotificacionesEventosService } = require('./lib/contratosNotificacionesEventos');
const { createContratosCorreoPlantillasService } = require('./lib/contratosCorreoPlantillas');
const {
  prepareContactosNivelesForSave,
  validarContactosNivelesParaGuardar,
} = require('./lib/contratosCorreosNiveles');
const { contactosFromContrato } = require('./lib/contratosContactosNotificacion');
const { prepareAnexosForSave } = require('./lib/contratosAnexos');
const {
  usuarioDesdeReq,
  normalizarAprobacionEstado,
  aplicarDatosContratoDesdeBody,
  aprobarContratoPendiente,
  rechazarContratoPendiente,
} = require('./lib/contratosAprobacion');
const {
  sqlMarcarRevisionPendiente,
  normalizarRevisionJuridicaEstado,
  verificarAprobar,
  verificarRechazar,
  retirarSolicitudDevuelta,
  listarComentarios,
  agregarComentario,
  marcarComentarioRealizado,
} = require('./lib/contratosRevisionJuridica');
const {
  listarAdjuntos: listarAdjuntosJuridico,
  obtenerAdjunto: obtenerAdjuntoJuridico,
} = require('./lib/contratosJuridicoAdjuntos');
const { ejecutarArchivoContrato } = require('./lib/contratosArchivo');
const { validarNumeroContratoUnico } = require('./lib/contratosNumeroUnico');
const { createContratosExportExpedienteService } = require('./lib/contratosExportExpediente');
const mailHealth = require('./lib/mailHealth');
const contratosExportExpediente = createContratosExportExpedienteService(dbQuery);
console.log('[export-expediente] Formato índice: PDF (indice_contratos.pdf)');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const hashResetToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const isSmtpTransientError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNRESET', 'EHOSTUNREACH', 'ENOTFOUND'].includes(code) ||
    message.includes('greeting never received') ||
    message.includes('timeout')
  );
};
const uniquePush = (arr, item, keyFn) => {
  const key = keyFn(item);
  if (!arr.some((x) => keyFn(x) === key)) arr.push(item);
};

const createMailer = () => buildMailerFromSmtp(envSmtpConfig());

let mailer = createMailer();

const reloadMailerFromConfig = async () => {
  const cfg = await getEffectiveCorreoConfig(dbQuery);
  const next = buildMailerFromSmtp(cfg);
  mailer.mode = next.mode;
  mailer.transporters = next.transporters;
  mailer.transporter = next.transporter;
  mailer.from = next.from;
  mailer.source = next.source;
};

const SMTP_VERIFY_TIMEOUT_MS = Number(process.env.SMTP_VERIFY_TIMEOUT_MS || 10000);
const SMTP_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS || 22000);

const verifyMailerSmtp = async () => {
  let lastError = null;
  for (const t of mailer.transporters || []) {
    try {
      await t.transporter.verify();
      mailer.transporter = t.transporter;
      console.log(`SMTP verificado usando ${t.label}`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Fallo SMTP verify en ${t.label}:`, error?.code || error?.message || error);
    }
  }
  throw lastError || new Error('No se pudo verificar ningún transporte SMTP.');
};

const verifyMailer = async () => {
  if (mailer.mode === 'smtp') {
    try {
      await mailHealth.withTimeout(verifyMailerSmtp(), SMTP_VERIFY_TIMEOUT_MS, 'SMTP verify');
      mailHealth.markAvailable();
      return;
    } catch (error) {
      mailHealth.markUnavailable(error);
      throw error;
    }
  }
  if (SMTP_REQUIRED) {
    throw new Error('SMTP_REQUIRED=true pero faltan variables SMTP_HOST/SMTP_USER/SMTP_PASS');
  }
  mailHealth.markAvailable();
};

const sendMailWithFallbackInternal = async (mailOptions) => {
  const transporters = mailer.transporters || [{ label: 'smtp', transporter: mailer.transporter }];
  const startIndex = transporters.findIndex((t) => t.transporter === mailer.transporter);
  const ordered =
    startIndex > 0
      ? [...transporters.slice(startIndex), ...transporters.slice(0, startIndex)]
      : transporters;

  let lastError = null;
  for (const t of ordered) {
    try {
      const result = await t.transporter.sendMail(mailOptions);
      mailer.transporter = t.transporter;
      return result;
    } catch (error) {
      lastError = error;
      if (!isSmtpTransientError(error)) break;
      console.warn(`SMTP send falló en ${t.label}:`, error?.code || error?.message || error);
    }
  }
  throw lastError || new Error('No se pudo enviar correo por SMTP.');
};

const sendMailWithFallback = async (mailOptions, { force = false } = {}) => {
  if (mailer.mode !== 'smtp') {
    return mailer.transporter.sendMail(mailOptions);
  }

  if (!force && !mailHealth.isAvailable()) {
    throw mailHealth.createUnavailableError();
  }

  try {
    const result = await mailHealth.withTimeout(
      sendMailWithFallbackInternal(mailOptions),
      SMTP_SEND_TIMEOUT_MS,
      'SMTP send'
    );
    mailHealth.markAvailable();
    return result;
  } catch (error) {
    if (isSmtpTransientError(error) || String(error?.code || '').toUpperCase() === 'ETIMEDOUT') {
      mailHealth.markUnavailable(error);
    }
    throw error;
  }
};

const shouldUseGracefulMailFallback = (error) =>
  MAIL_FALLBACK_MODE === 'graceful' && isSmtpTransientError(error);

const isMailQueueableError = (error) => {
  if (String(error?.code || '').toUpperCase() === 'MAIL_UNAVAILABLE') return true;
  return isSmtpTransientError(error) || String(error?.code || '').toUpperCase() === 'ETIMEDOUT';
};

const MAIL_QUEUED_MESSAGE =
  'El correo quedó en cola y se enviará automáticamente cuando SMTP esté disponible.';

async function sendOrEnqueueMail({ tipo, refKey, destino, subject, text, html, payload }) {
  const mailOpts = { from: mailer.from, to: destino, subject, text, html };
  if (mailer.mode !== 'smtp') {
    const result = await sendMailWithFallback(mailOpts);
    return { sent: true, result };
  }
  if (!mailHealth.isAvailable()) {
    await mailOutbox.enqueue({
      tipo,
      refKey,
      destino,
      asunto: subject,
      cuerpoTexto: text,
      cuerpoHtml: html,
      payload,
    });
    return { queued: true };
  }
  try {
    const result = await sendMailWithFallback(mailOpts);
    return { sent: true, result };
  } catch (error) {
    if (isMailQueueableError(error)) {
      await mailOutbox.enqueue({
        tipo,
        refKey,
        destino,
        asunto: subject,
        cuerpoTexto: text,
        cuerpoHtml: html,
        payload,
      });
      return { queued: true };
    }
    throw error;
  }
}

async function mailStatusWithPending() {
  const pending = await mailOutbox.countPending().catch(() => 0);
  if (mailer.mode !== 'smtp') {
    return { smtp_disponible: true, modo: mailer.mode || 'dev', correos_pendientes: pending };
  }
  return { ...mailHealth.getStatus(), correos_pendientes: pending };
}

const correoPlantillas = createContratosCorreoPlantillasService(dbQuery);

const notificacionesContrato = createContratosNotificacionesEventosService(dbQuery, {
  SQL_CONTRATO_SELECT,
  normalizeEmail,
  isValidEmail,
  sendMailWithFallback,
  mailer,
  correoPlantillas,
  mailOutbox,
  isMailQueueableError,
  mailHealth,
});

const recordatoriosContratos = createContratosRecordatoriosService(dbQuery, {
  SQL_CONTRATO_SELECT,
  normalizeEmail,
  isValidEmail,
  sendMailWithFallback,
  mailer,
  shouldUseGracefulMailFallback,
  isMailQueueableError,
  mailOutbox,
  onRecordatorioAudit: (payload) => contratosAuditoria.logRecordatorio(payload),
  correoPlantillas,
});

async function flushMailOutbox() {
  if (mailer.mode !== 'smtp') return { sent: 0, failed: 0, pending: 0, skipped: true };
  const result = await mailOutbox.processPending(
    (opts) =>
      sendMailWithFallback({ from: mailer.from, ...opts }, { force: true }),
    {
      onSent: async (row) => {
        let payload = row.payload_json;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            payload = {};
          }
        }
        if (payload?.kind === 'recordatorio' && recordatoriosContratos.completeQueuedReminder) {
          await recordatoriosContratos.completeQueuedReminder(payload, row.destino);
        }
      },
    }
  );
  if (result.sent > 0) {
    console.log(
      `[MAIL-OUTBOX] Enviados ${result.sent} correo(s) pendiente(s). Quedan ${result.pending}.`
    );
  }
  return result;
}

mailHealth.onSmtpAvailable(() => {
  flushMailOutbox().catch((err) => console.warn('[MAIL-OUTBOX] flush:', err?.message || err));
});

function dispararNotificacionContrato(numero, evento, extra = {}) {
  notificacionesContrato.disparar(numero, evento, extra).catch(() => {});
}

function dispararNotificacionesAprobacion(numero, accion, resueltoPor, extra = {}) {
  dispararNotificacionContrato(numero, 'aprobacion_resuelta', {
    accion,
    resueltoPor,
    ...extra,
  });
  if (accion === 'edicion') {
    dispararNotificacionContrato(numero, 'modificado', { accion, resueltoPor, ...extra });
  } else if (accion === 'cancelacion' || accion === 'cancelacion_archivo') {
    dispararNotificacionContrato(numero, 'cancelado', { accion, resueltoPor, ...extra });
  }
  if (accion === 'archivo' || accion === 'cancelacion_archivo') {
    dispararNotificacionContrato(numero, 'eliminado', { accion, resueltoPor, ...extra });
  }
}

function dispararNotificacionPendiente(numero, accion, solicitadoPor, extra = {}) {
  dispararNotificacionContrato(numero, 'pendiente_aprobacion', {
    accion,
    solicitadoPor,
    ...extra,
  });
}

const ensurePasswordResetTable = async () => {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      requested_ip VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prt_email (email),
      INDEX idx_prt_token_hash (token_hash),
      INDEX idx_prt_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

const ensureContratoCorreoColumn = async () => {
  const rows = await dbQuery(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_generales'
        AND COLUMN_NAME = 'correo_notificacion'`
  );
  const exists = Number(rows?.[0]?.cnt || 0) > 0;
  if (!exists) {
    await dbQuery('ALTER TABLE contratos_generales ADD COLUMN correo_notificacion VARCHAR(255) NULL AFTER empresa');
  }
};

const ensureContratoContactosNotificacionColumn = async () => {
  const rows = await dbQuery(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_generales'
        AND COLUMN_NAME = 'contactos_notificacion'`
  );
  const exists = Number(rows?.[0]?.cnt || 0) > 0;
  if (!exists) {
    await dbQuery(
      'ALTER TABLE contratos_generales ADD COLUMN contactos_notificacion JSON NULL AFTER correo_notificacion'
    );
  }
};

const ensureContratoContactosNivelesColumn = async () => {
  const rows = await dbQuery(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_generales'
        AND COLUMN_NAME = 'contactos_niveles'`
  );
  const exists = Number(rows?.[0]?.cnt || 0) > 0;
  if (!exists) {
    await dbQuery(
      'ALTER TABLE contratos_generales ADD COLUMN contactos_niveles JSON NULL AFTER contactos_notificacion'
    );
  }
};

const ensureContratoCanceladoColumns = async () => {
  const defs = [
    {
      name: 'cancelado',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN cancelado TINYINT(1) NOT NULL DEFAULT 0 AFTER fecha_fin',
    },
    {
      name: 'cancelado_en',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN cancelado_en DATETIME NULL AFTER cancelado',
    },
    {
      name: 'cancelado_por',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN cancelado_por VARCHAR(255) NULL AFTER cancelado_en',
    },
  ];
  for (const def of defs) {
    const rows = await dbQuery(
      `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'contratos_generales'
          AND COLUMN_NAME = ?`,
      [def.name]
    );
    const exists = Number(rows?.[0]?.cnt || 0) > 0;
    if (!exists) await dbQuery(def.sql);
  }
};

const ensureJwtBlacklistTable = async () => {
  const sqlPath = path.join(__dirname, 'sql', 'jwt_blacklist.sql');
  const raw = fs.readFileSync(sqlPath, 'utf8');
  await dbQuery(raw.trim());
};

const ensureUsuariosSecurityAuditColumns = async () => {
  const defs = [
    { name: 'activo', sql: 'ALTER TABLE usuarios ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER rol' },
    { name: 'created_by', sql: 'ALTER TABLE usuarios ADD COLUMN created_by VARCHAR(255) NULL AFTER activo' },
    { name: 'created_at', sql: 'ALTER TABLE usuarios ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_by' },
    { name: 'updated_by', sql: 'ALTER TABLE usuarios ADD COLUMN updated_by VARCHAR(255) NULL AFTER created_at' },
    { name: 'updated_at', sql: 'ALTER TABLE usuarios ADD COLUMN updated_at DATETIME NULL AFTER updated_by' },
    { name: 'foto_perfil', sql: 'ALTER TABLE usuarios ADD COLUMN foto_perfil MEDIUMTEXT NULL AFTER updated_at' },
    { name: 'telefono', sql: 'ALTER TABLE usuarios ADD COLUMN telefono CHAR(8) NULL AFTER nombre' },
    {
      name: 'password_changed_at',
      sql: 'ALTER TABLE usuarios ADD COLUMN password_changed_at DATETIME NULL AFTER password',
    },
  ];

  for (const def of defs) {
    const rows = await dbQuery(
      `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'usuarios'
          AND COLUMN_NAME = ?`,
      [def.name]
    );
    const exists = Number(rows?.[0]?.cnt || 0) > 0;
    if (!exists) await dbQuery(def.sql);
  }
};

const ensureContratosArchivoTables = async () => {
  const sqlPath = path.join(__dirname, 'sql', 'contratos_archivo.sql');
  const raw = fs.readFileSync(sqlPath, 'utf8');
  const statements = raw
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await dbQuery(stmt);
  }
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
};

const ensureContratoAnexosColumn = async () => {
  const rows = await dbQuery(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_generales'
        AND COLUMN_NAME = 'anexos'`
  );
  const exists = Number(rows?.[0]?.cnt || 0) > 0;
  if (!exists) {
    await dbQuery('ALTER TABLE contratos_generales ADD COLUMN anexos JSON NULL AFTER suplementos');
  }
};

const ensureContratosDocumentosColumns = async () => {
  const defs = [
    {
      name: 'tipo_documento',
      sql: "ALTER TABLE contratos_documentos ADD COLUMN tipo_documento VARCHAR(20) NOT NULL DEFAULT 'contrato' AFTER numero_contrato",
    },
    {
      name: 'numero_suplemento',
      sql: 'ALTER TABLE contratos_documentos ADD COLUMN numero_suplemento SMALLINT UNSIGNED NULL AFTER tipo_documento',
    },
  ];
  for (const def of defs) {
    const rows = await dbQuery(
      `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'contratos_documentos'
          AND COLUMN_NAME = ?`,
      [def.name]
    );
    const exists = Number(rows?.[0]?.cnt || 0) > 0;
    if (!exists) await dbQuery(def.sql);
  }
};

const ensureContratoVigenciaVarchar = async () => {
  const rows = await dbQuery(
    `SELECT DATA_TYPE AS tipo
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_generales'
        AND COLUMN_NAME = 'vigencia'
      LIMIT 1`
  );
  const tipo = String(rows?.[0]?.tipo || '').toLowerCase();
  if (tipo && tipo !== 'varchar' && tipo !== 'char') {
    await dbQuery('ALTER TABLE contratos_generales MODIFY vigencia VARCHAR(32) NULL DEFAULT NULL');
  }
  const arch = await dbQuery(
    `SELECT DATA_TYPE AS tipo
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_archivo'
        AND COLUMN_NAME = 'vigencia'
      LIMIT 1`
  );
  const tipoArch = String(arch?.[0]?.tipo || '').toLowerCase();
  if (tipoArch && tipoArch !== 'varchar' && tipoArch !== 'char') {
    await dbQuery('ALTER TABLE contratos_archivo MODIFY vigencia VARCHAR(32) NULL DEFAULT NULL');
  }
};

const ensureContratosRecordatoriosTable = async () => {
  const sqlPath = path.join(__dirname, 'sql', 'contratos_recordatorios.sql');
  const raw = fs.readFileSync(sqlPath, 'utf8');
  const statements = raw
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await dbQuery(stmt);
  }
};

const ensureContratoPrioridadColumn = async () => {
  const rows = await dbQuery(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contratos_generales'
        AND COLUMN_NAME = 'prioridad'`
  );
  if (Number(rows?.[0]?.cnt || 0) > 0) return;
  try {
    await dbQuery(
      "ALTER TABLE contratos_generales ADD COLUMN prioridad VARCHAR(10) NOT NULL DEFAULT 'media' AFTER id_tipo_contrato"
    );
  } catch (err) {
    if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
  }
};

const ensureContratoAprobacionColumns = async () => {
  const defs = [
    {
      name: 'aprobacion_estado',
      sql: "ALTER TABLE contratos_generales ADD COLUMN aprobacion_estado VARCHAR(20) NOT NULL DEFAULT 'aprobado' AFTER cancelado_por",
    },
    {
      name: 'aprobacion_accion',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_accion VARCHAR(20) NULL AFTER aprobacion_estado',
    },
    {
      name: 'aprobacion_propuesta',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_propuesta JSON NULL AFTER aprobacion_accion',
    },
    {
      name: 'aprobacion_solicitado_por',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_solicitado_por VARCHAR(255) NULL AFTER aprobacion_propuesta',
    },
    {
      name: 'aprobacion_solicitado_en',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_solicitado_en DATETIME NULL AFTER aprobacion_solicitado_por',
    },
    {
      name: 'aprobacion_resuelto_por',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_resuelto_por VARCHAR(255) NULL AFTER aprobacion_solicitado_en',
    },
    {
      name: 'aprobacion_resuelto_en',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_resuelto_en DATETIME NULL AFTER aprobacion_resuelto_por',
    },
    {
      name: 'aprobacion_resolucion_nota',
      sql: 'ALTER TABLE contratos_generales ADD COLUMN aprobacion_resolucion_nota VARCHAR(500) NULL AFTER aprobacion_resuelto_en',
    },
  ];
  for (const def of defs) {
    const rows = await dbQuery(
      `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'contratos_generales'
          AND COLUMN_NAME = ?`,
      [def.name]
    );
    const exists = Number(rows?.[0]?.cnt || 0) > 0;
    if (!exists) await dbQuery(def.sql);
  }
};

const runSqlMigrationFile = async (filename) => {
  const sqlPath = path.join(__dirname, 'sql', filename);
  const raw = fs.readFileSync(sqlPath, 'utf8');
  const statements = raw
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean);
  for (const stmt of statements) {
    try {
      await dbQuery(stmt);
    } catch (err) {
      if (err?.code !== 'ER_DUP_FIELDNAME' && err?.code !== 'ER_TABLE_EXISTS_ERROR') {
        throw err;
      }
    }
  }
};

const ensureContratoRevisionJuridicaSchema = async () => {
  await runSqlMigrationFile('contratos_revision_juridica.sql');
  await runSqlMigrationFile('contratos_juridico_comentarios_realizado.sql');
};

const ensureDirectorContratosApprove = async () => {
  await dbQuery(
    `UPDATE rbac_role_permissions rp
     INNER JOIN roles r ON r.id_rol = rp.id_rol
     SET rp.can_approve = 1
     WHERE r.codigo = 'director' AND rp.module_codigo = 'contratos'`
  );
};

const contratoAprobacionDeps = (extra = {}) => ({
  idsContratoDesdeBody,
  prioridadDesdeBody,
  prepareContactosNivelesForSave,
  prepareAnexosForSave,
  resolveAbsPath,
  archivarContratoActivo: (numero, opts) => ejecutarArchivoContrato(dbQuery, numero, opts),
  ...extra,
});

const ensureCatalogoTipoContratoActivo = async () => {
  const rows = await dbQuery(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'catalogo_tipo_contrato'
        AND COLUMN_NAME = 'activo'`
  );
  if (Number(rows?.[0]?.cnt || 0) === 0) {
    try {
      await dbQuery(
        'ALTER TABLE catalogo_tipo_contrato ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER nombre'
      );
    } catch (err) {
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
  const defaults = ['Alimento', 'Servicio', 'Compra', 'Otro'];
  for (const nombre of defaults) {
    await dbQuery('INSERT IGNORE INTO catalogo_tipo_contrato (nombre, activo) VALUES (?, 1)', [nombre]);
  }
};

const ensureConfigSistemaTable = async () => {
  const sqlPath = path.join(__dirname, 'sql', 'config_sistema.sql');
  const raw = fs.readFileSync(sqlPath, 'utf8');
  await dbQuery(raw.trim());
};

const ensureUserPreferencesTable = async () => {
  const sqlPath = path.join(__dirname, 'sql', 'user_preferences.sql');
  const raw = fs.readFileSync(sqlPath, 'utf8');
  await dbQuery(raw.trim());
};

const normalizarRol = (value) => String(value || '').trim().toLowerCase();
const rolValido = async (rol) => rbac.roleCodigoExists(rol);
const emailValido = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const passwordFuerte = (value) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(value || ''));
const normalizarActivo = (value) =>
  value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true' ? 1 : 0;

function parseTelefonoOptional(value) {
  if (value === null || value === undefined) return { ok: true, value: null };
  const raw = String(value).trim();
  if (!raw) return { ok: true, value: null };
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) {
    return { ok: false, message: 'El teléfono debe tener 8 dígitos (opcional).' };
  }
  return { ok: true, value: digits.slice(-8) };
}

function buildJwtPayload(usuario) {
  return {
    email: usuario.email,
    nombre: usuario.nombre,
    rol: normalizarRol(usuario.rol),
    id_rol: usuario.id_rol,
    jti: crypto.randomUUID(),
  };
}

function signUserToken(usuario) {
  return jwt.sign(buildJwtPayload(usuario), JWT_SECRET, { expiresIn: '8h' });
}

async function migrateUserPrimaryEmail(oldEmail, newEmail) {
  const oldNorm = String(oldEmail || '').trim().toLowerCase();
  const newNorm = String(newEmail || '').trim().toLowerCase();
  if (!oldNorm || !newNorm || oldNorm === newNorm) return;
  const prefs = await dbQuery('SELECT preferences_json FROM user_preferences WHERE email = ? LIMIT 1', [oldNorm]);
  if (prefs?.length) {
    await dbQuery(
      `INSERT INTO user_preferences (email, preferences_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE preferences_json = VALUES(preferences_json), updated_at = CURRENT_TIMESTAMP`,
      [newNorm, prefs[0].preferences_json]
    );
    await dbQuery('DELETE FROM user_preferences WHERE email = ?', [oldNorm]);
  }
  await dbQuery(
    'UPDATE password_reset_tokens SET email = ? WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
    [newNorm, oldNorm]
  );
}

//Usuarios y seguridad



// ==================== MIDDLEWARES ====================

// Middleware para verificar token JWT (firma, blacklist, usuario activo, cambio de contraseña)
const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    req.authToken = token;

    if (user?.jti && (await jwtBlacklist.isRevoked(user.jti))) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }

    const email = normalizeEmail(user?.email);
    if (email) {
      const rows = await dbQuery(
        'SELECT activo, password_changed_at FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1',
        [email]
      );
      if (rows?.length) {
        if (Number(rows[0].activo) === 0) {
          return res.status(403).json({ message: 'Usuario inactivo. Contacta al administrador.' });
        }
        const pwdChangedAt = rows[0].password_changed_at;
        if (pwdChangedAt && user?.iat) {
          const changedTs = Math.floor(new Date(pwdChangedAt).getTime() / 1000);
          if (Number(user.iat) < changedTs) {
            return res.status(403).json({ message: 'Token inválido o expirado' });
          }
        }
      }
    }

    return next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
};

// Middleware para autorizar según roles (recibe un array de roles permitidos)
const autorizarRol = (rolesPermitidos) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No autenticado' });
  try {
    const inferred = rbac.resolveRouteAction(req.method, req.path);
    if (inferred) {
      const perms = await rbac.getPermissionsByCodigo(req.user.rol);
      if (rbac.hasPermission(perms, inferred.module, inferred.action)) return next();
      if (!rbac.hasAnyPermission(perms) && rbac.legacyRoleAllowed(req.user.rol, rolesPermitidos)) {
        return next();
      }
      return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
    }
    if (rbac.legacyRoleAllowed(req.user.rol, rolesPermitidos)) return next();
    return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
  } catch (err) {
    console.error('autorizarRol:', err);
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }
};

const autorizarPermiso = (module, action) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No autenticado' });
  try {
    const perms = await rbac.getPermissionsByCodigo(req.user.rol);
    if (rbac.hasPermission(perms, module, action)) return next();
    return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
  } catch (err) {
    console.error('autorizarPermiso:', err);
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }
};

/** RNF-SEG-03: JWT obligatorio en toda ruta no pública (las rutas pueden añadir RBAC adicional). */
app.use((req, res, next) => {
  if (isPublicApiPath(req.path, req.method)) return next();
  return verificarToken(req, res, next);
});

// ==================== RUTAS DE AUTENTICACIÓN ====================

// LOGIN (público): correo o nombre de usuario
app.post('/login', authRateLimiters.login, async (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.email || req.body?.usuario || '').trim();
  const password = req.body?.password;
  const sqlLogin = `${SQL_USUARIO_AUTH} WHERE (LOWER(TRIM(u.email)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.nombre)) = LOWER(TRIM(?)))`;
  const { ip, userAgent } = audit.getClientMeta(req);

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
  }

  try {
    const lock = await audit.isLocked(identifier);
    if (lock.locked) {
      await audit.recordFailedLogin({
        identifier,
        userEmail: null,
        reason: 'locked',
        ip,
        userAgent,
      });
      const until = lock.lockedUntil ? new Date(lock.lockedUntil).toLocaleString('es-ES') : '';
      return res.status(429).json({
        message: `Acceso bloqueado temporalmente por demasiados intentos fallidos. Intente de nuevo después de ${until}.`,
        lockedUntil: lock.lockedUntil,
      });
    }

    const results = await dbQuery(sqlLogin, [identifier, identifier]);
    if (results.length === 0) {
      await audit.recordFailedLogin({
        identifier,
        userEmail: null,
        reason: 'user_not_found',
        ip,
        userAgent,
      });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = results[0];
    if (Number(usuario.activo) === 0) {
      await audit.recordFailedLogin({
        identifier,
        userEmail: usuario.email,
        reason: 'user_inactive',
        ip,
        userAgent,
      });
      return res.status(403).json({ message: 'Usuario inactivo. Contacta al administrador.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      const fail = await audit.recordFailedLogin({
        identifier,
        userEmail: usuario.email,
        reason: 'bad_password',
        ip,
        userAgent,
      });
      if (fail.locked) {
        return res.status(429).json({
          message: `Demasiados intentos fallidos. Cuenta bloqueada temporalmente (${audit.LOCKOUT_MINUTES} min).`,
          lockedUntil: fail.lockedUntil,
        });
      }
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const rolCanonico = normalizarRol(usuario.rol);
    if (!rolCanonico || !(await rolValido(rolCanonico))) {
      return res.status(500).json({ message: 'Usuario sin rol válido en la base de datos' });
    }

    const permisos = await rbac.getPermissionsByCodigo(rolCanonico);

    await audit.clearLockout(identifier);
    await audit.clearLockout(usuario.email);

    await audit.recordLoginSession({
      email: usuario.email,
      nombre: usuario.nombre,
      rol: rolCanonico,
      ip,
      userAgent,
    });

    const token = jwt.sign(
      buildJwtPayload({ ...usuario, rol: rolCanonico }),
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Login exitoso',
      token,
      permisos,
      usuario: {
        email: usuario.email,
        nombre: usuario.nombre,
        rol: rolCanonico,
        id_rol: usuario.id_rol,
        fotoPerfil:
          usuario.foto_perfil && String(usuario.foto_perfil).trim()
            ? String(usuario.foto_perfil)
            : null,
      },
    });
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

app.post('/auth/logout', verificarToken, async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim();
    if (req.user?.jti) await jwtBlacklist.revokeToken(req.user);
    if (email) await audit.recordLogout(email);
    return res.json({ message: 'Sesión cerrada' });
  } catch (error) {
    console.error('Error en /auth/logout:', error);
    return res.status(500).json({ message: 'Error al registrar cierre de sesión' });
  }
});

// Vista previa de avatar en login (público): solo devuelve foto si el identificador coincide exactamente.
app.get('/auth/mail-estado', async (req, res) => {
  try {
    return res.json(await mailStatusWithPending());
  } catch (err) {
    return res.status(500).json({ message: err.message || String(err) });
  }
});

// Deshabilitado: el avatar en login se sirve solo desde caché local del dispositivo (post-login previo).
app.get('/auth/login-avatar', authRateLimiters.loginAvatar, (_req, res) => {
  return res.json({ fotoPerfil: null });
});

app.post('/auth/forgot-password', authRateLimiters.passwordReset, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const genericMessage = 'Si el correo existe en el sistema, te enviamos instrucciones para restablecer tu contraseña.';
  let resetUrl = null;

  if (!email) {
    return res.status(200).json({ message: genericMessage });
  }

  try {
    const users = await dbQuery(
      'SELECT email, nombre FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1',
      [email]
    );

    if (!users.length) {
      return res.status(200).json({ message: genericMessage });
    }

    const user = users[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const ttlMs = Math.max(PASSWORD_RESET_TTL_MINUTES, 5) * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await dbQuery('DELETE FROM password_reset_tokens WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', [user.email]);
    const { ip: requestedIp } = audit.getClientMeta(req);
    await dbQuery(
      'INSERT INTO password_reset_tokens (email, token_hash, expires_at, requested_ip) VALUES (?, ?, ?, ?)',
      [user.email, tokenHash, expiresAt, requestedIp]
    );

    const baseUrl = String(APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    resetUrl = `${baseUrl}/?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`;

    const resetSubject = 'Recuperación de contraseña';
    const resetText = `Hola ${user.nombre || ''},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace (expira en ${Math.max(PASSWORD_RESET_TTL_MINUTES, 5)} minutos):\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`;
    const resetHtml = `
        <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;">
          <p>Hola ${user.nombre || ''},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#14532d;color:#fff;text-decoration:none;border-radius:6px;">
              Restablecer contraseña
            </a>
          </p>
          <p>Este enlace expira en ${Math.max(PASSWORD_RESET_TTL_MINUTES, 5)} minutos.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `;

    const mailDelivery = await sendOrEnqueueMail({
      tipo: 'password_reset',
      refKey: user.email,
      destino: user.email,
      subject: resetSubject,
      text: resetText,
      html: resetHtml,
      payload: { kind: 'password_reset', email: user.email },
    });

    const response = { message: genericMessage };
    if (mailDelivery.queued) {
      response.queued = true;
      response.deliveryWarning = true;
    }
    if (mailer.mode === 'dev') {
      response.devResetUrl = resetUrl;
      response.devMailPreview = mailDelivery.result?.message ? String(mailDelivery.result.message) : null;
    } else if (mailDelivery.queued && RESET_LINK_FALLBACK_ENABLED) {
      response.devResetUrl = resetUrl;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error en /auth/forgot-password:', error);
    const smtpCode = String(error?.code || '').toUpperCase();
    if (shouldUseGracefulMailFallback(error)) {
      const response = {
        message: `No se pudo enviar correo ahora mismo (${smtpCode || 'SIN_CODIGO'}), pero puedes continuar con el enlace temporal.`,
        deliveryWarning: true,
      };
      if (RESET_LINK_FALLBACK_ENABLED) response.devResetUrl = resetUrl;
      return res.status(200).json(response);
    }
    return res.status(500).json({
      message: `No se pudo procesar la solicitud de recuperación (${smtpCode || 'ERROR_INTERNO'}).`,
    });
  }
});

app.post('/auth/reset-password', authRateLimiters.passwordReset, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: 'Datos incompletos para restablecer contraseña.' });
  }

  if (!passwordFuerte(newPassword)) {
    return res.status(400).json({
      message: 'La nueva contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.',
    });
  }

  try {
    const tokenHash = hashResetToken(token);
    const tokens = await dbQuery(
      `SELECT id
         FROM password_reset_tokens
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
          AND token_hash = ?
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1`,
      [email, tokenHash]
    );

    if (!tokens.length) {
      return res.status(400).json({ message: 'El enlace de recuperación es inválido o expiró.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userResult = await dbQuery(
      'UPDATE usuarios SET password = ?, password_changed_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [hashedPassword, email]
    );

    if (!userResult?.affectedRows) {
      return res.status(404).json({ message: 'No se encontró el usuario para restablecer contraseña.' });
    }

    await dbQuery('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokens[0].id]);
    await dbQuery(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND used_at IS NULL',
      [email]
    );

    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error en /auth/reset-password:', error);
    return res.status(500).json({ message: 'No se pudo restablecer la contraseña.' });
  }
});

// ==================== RUTAS PARA GESTIÓN DE USUARIOS (SOLO ADMIN) ====================

// Obtener todos los usuarios (sin contraseñas)
app.get("/usuarios", verificarToken, autorizarRol(['admin']), (req, res) => {
  db.query(`${SQL_USUARIO_LIST} ORDER BY u.nombre ASC`, (err, results) => {
    if (err) return res.status(500).json({ message: err.message || 'Error al listar usuarios' });
    res.send(results);
  });
});

// Crear usuario (solo admin)
app.post("/create-usuario", verificarToken, autorizarRol(['admin']), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const nombre = String(req.body?.nombre || '').trim();
  const password = String(req.body?.password || '');
  const rol = normalizarRol(req.body?.rol);
  const activo = normalizarActivo(req.body?.activo ?? 1);
  const telefonoParsed = parseTelefonoOptional(req.body?.telefono);
  const actorRol = normalizarRol(req.user?.rol);
  const actorEmail = String(req.user?.email || req.user?.nombre || 'sistema').trim().toLowerCase();

  if (!email || !nombre || !password || !rol) {
    return res.status(400).json({ message: 'Email, nombre, contraseña y rol son obligatorios.' });
  }
  if (!emailValido(email)) return res.status(400).json({ message: 'Email inválido.' });
  if (!telefonoParsed.ok) return res.status(400).json({ message: telefonoParsed.message });
  if (!(await rolValido(rol))) return res.status(400).json({ message: 'Rol inválido.' });
  if (!passwordFuerte(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.' });
  }
  try {
    const idRol = await idRolDesdeCodigo(dbQuery, rol);
    if (!idRol) return res.status(400).json({ message: 'Rol inválido en catálogo.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      `INSERT INTO usuarios
        (email, nombre, telefono, password, id_rol, activo, created_by, created_at, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
      [email, nombre, telefonoParsed.value, hashedPassword, idRol, activo, actorEmail, actorEmail],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'El email ya existe' });
          return res.status(500).send(err);
        }
        audit
          .logEvent({
            category: 'role',
            action: 'user_created',
            actor: { email: actorEmail, nombre: req.user?.nombre },
            targetType: 'usuario',
            targetId: email,
            targetLabel: nombre || email,
            details: { rol_nuevo: rol, activo },
            req,
          })
          .catch((e) => console.warn('audit user_created:', e?.message || e));
        res.status(201).json({ message: 'Usuario creado' });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Error al encriptar' });
  }
});



// Actualizar usuario (solo admin). La contraseña es opcional.
app.put("/update-usuario/:email", verificarToken, autorizarRol(['admin']), async (req, res) => {
  const emailAnterior = String(req.params.email || '').trim();
  const nuevoEmail = String(req.body?.email || '').trim().toLowerCase();
  const nombre = String(req.body?.nombre || '').trim();
  const password = String(req.body?.password || '');
  const rol = normalizarRol(req.body?.rol);
  const activo = normalizarActivo(req.body?.activo ?? 1);
  const telefonoParsed = parseTelefonoOptional(req.body?.telefono);
  const actorRol = normalizarRol(req.user?.rol);
  const actorEmail = String(req.user?.email || req.user?.nombre || 'sistema').trim().toLowerCase();

  if (!emailAnterior || !nuevoEmail || !nombre || !rol) {
    return res.status(400).json({ message: 'Email, nombre y rol son obligatorios' });
  }
  if (!emailValido(nuevoEmail)) return res.status(400).json({ message: 'Email inválido.' });
  if (!telefonoParsed.ok) return res.status(400).json({ message: telefonoParsed.message });
  if (!(await rolValido(rol))) return res.status(400).json({ message: 'Rol inválido.' });
  if (password && !passwordFuerte(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.' });
  }

  const targetRows = await dbQuery(
    `${SQL_USUARIO_AUTH} WHERE u.email = ? OR LOWER(TRIM(u.email)) = LOWER(TRIM(?)) LIMIT 1`,
    [emailAnterior, emailAnterior]
  );
  if (!targetRows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
  const usuarioAntes = targetRows[0];
  const rolAnterior = normalizarRol(usuarioAntes.rol);
  const activoAnterior = Number(usuarioAntes.activo);
  const targetEmail = String(usuarioAntes.email || emailAnterior).trim().toLowerCase();
  const esPropioUsuario = actorEmail && targetEmail && actorEmail === targetEmail;

  let rolFinal = rol;
  let activoFinal = activo;
  if (esPropioUsuario) {
    rolFinal = rolAnterior;
    activoFinal = activoAnterior;
  }

  const idRolFinal = await idRolDesdeCodigo(dbQuery, rolFinal);
  if (!idRolFinal) return res.status(400).json({ message: 'Rol inválido en catálogo.' });

  let query =
    'UPDATE usuarios SET email = TRIM(?), nombre = ?, telefono = ?, id_rol = ?, activo = ?, updated_by = ?, updated_at = NOW()';
  let params = [nuevoEmail, nombre, telefonoParsed.value, idRolFinal, activoFinal, actorEmail];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    query += ', password = ?, password_changed_at = NOW()';
    params.push(hashedPassword);
  }

  query += ' WHERE email = ? OR LOWER(TRIM(email)) = LOWER(TRIM(?))';
  params.push(emailAnterior, emailAnterior);

  db.query(query, params, async (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'El email ya existe para otro usuario' });
      }
      return res.status(500).json({ message: err.message || 'Error al actualizar usuario' });
    }
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const actor = { email: actorEmail, nombre: req.user?.nombre };
    const label = nombre || nuevoEmail;
    try {
      if (rolAnterior && rolFinal !== rolAnterior) {
        await audit.logEvent({
          category: 'role',
          action: 'user_role_change',
          actor,
          targetType: 'usuario',
          targetId: nuevoEmail,
          targetLabel: label,
          details: { rol_anterior: rolAnterior, rol_nuevo: rolFinal },
          req,
        });
      }
      if (activoAnterior !== activoFinal) {
        await audit.logEvent({
          category: 'role',
          action: 'user_active_change',
          actor,
          targetType: 'usuario',
          targetId: nuevoEmail,
          targetLabel: label,
          details: { activo: Boolean(activoFinal), activo_anterior: Boolean(activoAnterior) },
          req,
        });
      }
    } catch (auditErr) {
      console.warn('audit update-usuario:', auditErr?.message || auditErr);
    }
    return res.json({ message: 'Usuario actualizado' });
  });
});

// Eliminar usuario (solo admin)
app.delete("/delete-usuario/:email", verificarToken, autorizarRol(['admin']), async (req, res) => {
  const { email } = req.params;
  const actorEmail = String(req.user?.email || req.user?.nombre || 'sistema').trim().toLowerCase();
  const targetEmail = String(email || '').trim().toLowerCase();
  if (actorEmail && targetEmail && actorEmail === targetEmail) {
    return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta.' });
  }
  try {
    const rows = await dbQuery(`${SQL_USUARIO_AUTH} WHERE u.email = ? LIMIT 1`, [email]);
    if (!rows?.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const target = rows[0];
    await dbQuery('DELETE FROM usuarios WHERE email = ?', [email]);
    await audit.logEvent({
      category: 'role',
      action: 'user_deleted',
      actor: { email: actorEmail, nombre: req.user?.nombre },
      targetType: 'usuario',
      targetId: email,
      targetLabel: target.nombre || email,
      details: { rol: normalizarRol(target.rol), email },
      req,
    });
    return res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al eliminar usuario' });
  }
});

// ==================== AUDITORÍA (SOLO ADMIN) ====================

app.get('/audit/sessions', verificarToken, autorizarRol(['admin']), async (req, res) => {
  try {
    const rows = await audit.listSessions({
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      email: req.query.email || null,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(rows);
  } catch (err) {
    console.error('audit/sessions:', err);
    return res.status(500).json({ message: err.message || 'Error al listar sesiones' });
  }
});

app.get('/audit/failed-logins', verificarToken, autorizarRol(['admin']), async (req, res) => {
  try {
    const rows = await audit.listFailedLogins({
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      identifier: req.query.identifier || null,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(rows);
  } catch (err) {
    console.error('audit/failed-logins:', err);
    return res.status(500).json({ message: err.message || 'Error al listar intentos fallidos' });
  }
});

app.get('/audit/failed-summary', verificarToken, autorizarRol(['admin']), async (req, res) => {
  try {
    const data = await audit.listFailedSummary({ hours: req.query.hours });
    return res.json(data);
  } catch (err) {
    console.error('audit/failed-summary:', err);
    return res.status(500).json({ message: err.message || 'Error al resumir intentos fallidos' });
  }
});

app.get('/audit/events', verificarToken, autorizarRol(['admin']), async (req, res) => {
  try {
    const rows = await audit.listEvents({
      category: req.query.category || null,
      scope: req.query.scope || null,
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(rows);
  } catch (err) {
    console.error('audit/events:', err);
    return res.status(500).json({ message: err.message || 'Error al listar eventos' });
  }
});

// ==================== RBAC — ROLES Y PERMISOS ====================

app.get('/rbac/modules', verificarToken, autorizarPermiso('usuarios', 'view'), (req, res) => {
  res.json({
    modules: rbac.RBAC_MODULES,
    actions: rbac.RBAC_ACTIONS,
  });
});

app.get('/rbac/roles', verificarToken, autorizarPermiso('usuarios', 'view'), async (req, res) => {
  try {
    const roles = await rbac.listRoles();
    return res.json(roles);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al listar roles' });
  }
});

app.get('/rbac/roles/:id_rol', verificarToken, autorizarPermiso('usuarios', 'view'), async (req, res) => {
  try {
    const role = await rbac.getRoleWithPermissions(Number(req.params.id_rol));
    if (!role) return res.status(404).json({ message: 'Rol no encontrado' });
    return res.json(role);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al cargar rol' });
  }
});

app.post('/rbac/roles', verificarToken, autorizarPermiso('usuarios', 'create'), async (req, res) => {
  try {
    const role = await rbac.createRole({
      nombre: req.body?.nombre,
      descripcion: req.body?.descripcion,
      codigo: req.body?.codigo,
      permisos: req.body?.permisos,
    });
    return res.status(201).json(role);
  } catch (err) {
    return res.status(400).json({ message: err.message || 'No se pudo crear el rol' });
  }
});

app.put('/rbac/roles/:id_rol', verificarToken, autorizarPermiso('usuarios', 'edit'), async (req, res) => {
  try {
    const role = await rbac.updateRole(Number(req.params.id_rol), {
      nombre: req.body?.nombre,
      descripcion: req.body?.descripcion,
      activo: req.body?.activo,
      permisos: req.body?.permisos,
    });
    return res.json(role);
  } catch (err) {
    const code = err.message?.includes('no encontrado') ? 404 : 400;
    return res.status(code).json({ message: err.message || 'No se pudo actualizar el rol' });
  }
});

app.delete('/rbac/roles/:id_rol', verificarToken, autorizarPermiso('usuarios', 'delete'), async (req, res) => {
  try {
    await rbac.deleteRole(Number(req.params.id_rol));
    return res.json({ message: 'Rol eliminado' });
  } catch (err) {
    const code = err.message?.includes('no encontrado') ? 404 : 400;
    return res.status(code).json({ message: err.message || 'No se pudo eliminar el rol' });
  }
});

app.get('/rbac/me/permissions', verificarToken, async (req, res) => {
  try {
    const permisos = await rbac.getPermissionsByCodigo(req.user?.rol);
    return res.json({ permisos, rol: normalizarRol(req.user?.rol) });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al cargar permisos' });
  }
});






























// ==================== RECORDATORIOS AUTOMÁTICOS CONTRATOS ====================

app.get('/config/recordatorios-contratos', verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  try {
    const config = await recordatoriosContratos.loadConfig();
    const envios = await recordatoriosContratos.listEnvios(30);
    const tipos = await dbQuery(
      `SELECT id_tipo_contrato, nombre, COALESCE(activo, 1) AS activo
         FROM catalogo_tipo_contrato
        ORDER BY activo DESC, nombre ASC`
    );
    return res.json({ config, ultimos_envios: envios, tipos_contrato: tipos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al cargar configuración.' });
  }
});

app.put('/config/recordatorios-contratos', verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  try {
    const updatedBy = String(req.user?.email || req.user?.nombre || '').trim() || null;
    const config = await recordatoriosContratos.saveConfig(req.body || {}, updatedBy);
    return res.json({ ok: true, message: 'Configuración de recordatorios guardada.', config });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al guardar.' });
  }
});

app.post('/config/recordatorios-contratos/restablecer', verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  try {
    const updatedBy = String(req.user?.email || req.user?.nombre || '').trim() || null;
    const config = await recordatoriosContratos.resetUiConfig(updatedBy);
    return res.json({ ok: true, message: 'Recordatorios restablecidos a los valores predeterminados.', config });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al restablecer.' });
  }
});

app.get('/config/contratos-correo-plantillas', verificarToken, autorizarRol(['contratacion', 'director']), async (req, res) => {
  try {
    const plantillas = await correoPlantillas.loadPlantillas();
    return res.json({
      plantillas,
      placeholders: correoPlantillas.PLACEHOLDER_HELP,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al cargar plantillas.' });
  }
});

app.put('/config/contratos-correo-plantillas', verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  try {
    const updatedBy = String(req.user?.email || req.user?.nombre || '').trim() || null;
    const plantillas = await correoPlantillas.savePlantillas(req.body?.plantillas || req.body || {}, updatedBy);
    return res.json({ ok: true, message: 'Plantillas de correo guardadas.', plantillas });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al guardar plantillas.' });
  }
});

app.post('/config/contratos-correo-plantillas/restablecer', verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  try {
    const updatedBy = String(req.user?.email || req.user?.nombre || '').trim() || null;
    const plantillas = await correoPlantillas.resetPlantillas(updatedBy);
    return res.json({ ok: true, message: 'Plantillas restablecidas a los valores predeterminados.', plantillas });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al restablecer plantillas.' });
  }
});

app.post('/config/contratos-correo-plantillas/probar', verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  const destino = normalizeEmail(req.body?.email || req.user?.email);
  if (!destino || !isValidEmail(destino)) {
    return res.status(400).json({ message: 'Indique un correo de prueba válido.' });
  }
  try {
    const mail = await correoPlantillas.buildMailPrueba({
      tipo: req.body?.tipo,
      plantilla: req.body?.plantilla,
    });
    const delivery = await sendOrEnqueueMail({
      tipo: 'prueba_plantilla',
      refKey: `${destino}:${req.body?.tipo || 'default'}`,
      destino,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      payload: { kind: 'prueba_plantilla' },
    });
    if (delivery.queued) {
      return res.json({ ok: true, queued: true, message: MAIL_QUEUED_MESSAGE });
    }
    return res.json({ ok: true, message: `Correo de prueba enviado a ${destino}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'No se pudo enviar el correo de prueba.' });
  }
});

app.post(
  '/contratos/recordatorios/ejecutar-ahora',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    try {
      const result = await recordatoriosContratos.ejecutarAutomaticos({
        forzar: Boolean(req.body?.forzar),
        auditActor: { email: req.user?.email, nombre: req.user?.nombre },
        auditDisparador: 'ejecutar_ahora',
        auditReq: req,
      });
      if (result.skipped && result.reason === 'desactivado') {
        return res.status(400).json({
          message: 'Los recordatorios automáticos están desactivados. Actívelos en Correo del sistema o use forzar en admin.',
          result,
        });
      }
      return res.json({
        message: `Proceso completado: ${result.enviados} enviado(s), ${result.encolados || 0} en cola, ${result.omitidos} omitido(s), ${result.errores} error(es).`,
        result,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: err.message || 'Error al ejecutar recordatorios.' });
    }
  }
);

app.get(
  '/contratos/recordatorios-envios',
  verificarToken,
  autorizarRol(['contratacion', 'director']),
  async (req, res) => {
    try {
      const lim = Number(req.query.limit) || 50;
      const rows = await recordatoriosContratos.listEnvios(lim);
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ message: err.message || 'Error al listar envíos.' });
    }
  }
);

// ==================== CONFIGURACIÓN CORREO (admin) ====================

app.get('/config/correo/estado', verificarToken, async (req, res) => {
  try {
    return res.json(await mailStatusWithPending());
  } catch (err) {
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.get('/config/correo', verificarToken, autorizarPermiso('usuarios', 'view'), async (req, res) => {
  try {
    const cfg = await getEffectiveCorreoConfig(dbQuery);
    let passwordSet = Boolean(cfg.smtp_pass);
    if (cfg.source === 'db') {
      const row = await dbQuery('SELECT valor FROM config_sistema WHERE clave = ? LIMIT 1', ['smtp_pass']);
      passwordSet = Boolean(row[0]?.valor && decryptPass(row[0].valor));
    } else {
      passwordSet = Boolean(process.env.SMTP_PASS);
    }
    return res.json({
      ...publicCorreoConfig(cfg, passwordSet),
      mailerMode: mailer.mode,
      ...mailHealth.getStatus(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.put('/config/correo', verificarToken, autorizarPermiso('usuarios', 'edit'), async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const useDb = body.use_db_config === true || body.use_db_config === 1 || body.use_db_config === '1';

  if (useDb) {
    if (!String(body.smtp_host || '').trim() || !String(body.smtp_user || '').trim()) {
      return res.status(400).json({ message: 'Host SMTP y usuario son obligatorios.' });
    }
    const hasNewPass = Boolean(String(body.smtp_pass || '').trim());
    if (!hasNewPass) {
      const prev = await dbQuery('SELECT valor FROM config_sistema WHERE clave = ? LIMIT 1', ['smtp_pass']);
      const prevPass = prev[0]?.valor ? decryptPass(prev[0].valor) : '';
      if (!prevPass) {
        return res.status(400).json({ message: 'Indique la contraseña SMTP al activar la configuración en base de datos.' });
      }
    }
  }

  try {
    const updatedBy = String(req.user?.email || req.user?.nombre || '').trim() || null;
    await saveCorreoConfigToDb(dbQuery, body, updatedBy);
    await reloadMailerFromConfig();
    const cfg = await getEffectiveCorreoConfig(dbQuery);
    const row = await dbQuery('SELECT valor FROM config_sistema WHERE clave = ? LIMIT 1', ['smtp_pass']);
    const passwordSet =
      cfg.source === 'db'
        ? Boolean(row[0]?.valor && decryptPass(row[0].valor))
        : Boolean(process.env.SMTP_PASS);
    return res.json({
      ok: true,
      message: useDb
        ? 'Correo de servicio guardado. Los recordatorios usarán esta cuenta.'
        : 'Se usará la configuración de server/.env.',
      ...publicCorreoConfig(cfg, passwordSet),
      mailerMode: mailer.mode,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.post('/config/correo/probar', verificarToken, autorizarPermiso('usuarios', 'edit'), async (req, res) => {
  const destino = normalizeEmail(req.body?.email || req.user?.email);
  if (!destino || !isValidEmail(destino)) {
    return res.status(400).json({ message: 'Indique un correo de prueba válido.' });
  }
  try {
    const delivery = await sendOrEnqueueMail({
      tipo: 'prueba_smtp',
      refKey: destino,
      destino,
      subject: 'Prueba — correo de servicio del sistema',
      text:
        'Este es un correo de prueba del sistema de gestión.\n' +
        'Si lo recibió, la configuración SMTP del remitente es correcta.\n',
      html: '<p>Este es un correo de <strong>prueba</strong> del sistema de gestión.</p><p>Si lo recibió, la configuración SMTP del remitente es correcta.</p>',
      payload: { kind: 'prueba_smtp' },
    });
    if (delivery.queued) {
      return res.json({ ok: true, queued: true, message: MAIL_QUEUED_MESSAGE });
    }
    return res.json({ ok: true, message: `Correo de prueba enviado a ${destino}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

function isValidProfilePhotoDataUrl(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string') return false;
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return false;
  if (value.length > 600000) return false;
  return true;
}

app.get('/user/profile-photo', verificarToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(400).json({ message: 'Usuario no identificado' });
    const rows = await dbQuery('SELECT foto_perfil FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1', [
      email,
    ]);
    const raw = rows?.[0]?.foto_perfil;
    const fotoPerfil = raw && String(raw).trim() ? String(raw) : null;
    return res.json({ fotoPerfil });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.put('/user/profile-photo', verificarToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(400).json({ message: 'Usuario no identificado' });
    const fotoPerfil = req.body?.fotoPerfil ?? null;
    if (!isValidProfilePhotoDataUrl(fotoPerfil)) {
      return res.status(400).json({ message: 'Imagen no válida. Use JPG, PNG o WebP (máx. ~400 KB).' });
    }
    await dbQuery(
      'UPDATE usuarios SET foto_perfil = ?, updated_by = ?, updated_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [fotoPerfil, email, email]
    );
    return res.json({ ok: true, fotoPerfil: fotoPerfil || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.get('/user/profile', verificarToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(400).json({ message: 'Usuario no identificado' });
    const rows = await dbQuery(
      `SELECT u.email, u.nombre, u.telefono, u.foto_perfil, r.codigo AS rol, r.id_rol
         FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))
        LIMIT 1`,
      [email]
    );
    if (!rows?.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const row = rows[0];
    const rawFoto = row.foto_perfil;
    return res.json({
      email: row.email,
      nombre: row.nombre,
      telefono: row.telefono || null,
      rol: normalizarRol(row.rol),
      id_rol: row.id_rol,
      fotoPerfil: rawFoto && String(rawFoto).trim() ? String(rawFoto) : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.put('/user/profile', verificarToken, async (req, res) => {
  try {
    const emailActual = normalizeEmail(req.user?.email);
    if (!emailActual) return res.status(400).json({ message: 'Usuario no identificado' });

    const nombre = String(req.body?.nombre || '').trim();
    const nuevoEmail = String(req.body?.email ?? emailActual).trim().toLowerCase();
    const telefonoParsed = parseTelefonoOptional(req.body?.telefono);
    const currentPassword = String(req.body?.currentPassword || '');

    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ message: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }
    if (!emailValido(nuevoEmail)) return res.status(400).json({ message: 'Email inválido.' });
    if (!telefonoParsed.ok) return res.status(400).json({ message: telefonoParsed.message });

    const rows = await dbQuery(`${SQL_USUARIO_AUTH} WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?)) LIMIT 1`, [
      emailActual,
    ]);
    if (!rows?.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const usuario = rows[0];
    const emailCambia = nuevoEmail !== emailActual;

    if (emailCambia) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Indique su contraseña actual para cambiar el correo electrónico.' });
      }
      const passwordValida = await bcrypt.compare(currentPassword, usuario.password);
      if (!passwordValida) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta.' });
      }
      const dup = await dbQuery(
        'SELECT email FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND LOWER(TRIM(email)) <> LOWER(TRIM(?)) LIMIT 1',
        [nuevoEmail, emailActual]
      );
      if (dup?.length) return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
      await migrateUserPrimaryEmail(emailActual, nuevoEmail);
    }

    await dbQuery(
      `UPDATE usuarios
          SET email = ?, nombre = ?, telefono = ?, updated_by = ?, updated_at = NOW()
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`,
      [nuevoEmail, nombre, telefonoParsed.value, emailActual, emailActual]
    );

    const profileRows = await dbQuery(
      'SELECT email, nombre, telefono, foto_perfil FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1',
      [nuevoEmail]
    );
    const updated = profileRows[0];
    const fotoPerfil =
      updated?.foto_perfil && String(updated.foto_perfil).trim() ? String(updated.foto_perfil) : null;

    const payload = {
      ok: true,
      usuario: {
        email: updated.email,
        nombre: updated.nombre,
        telefono: updated.telefono || null,
        fotoPerfil,
        rol: normalizarRol(usuario.rol),
        id_rol: usuario.id_rol,
      },
    };

    if (emailCambia) {
      payload.token = signUserToken({ ...usuario, email: nuevoEmail, nombre });
    }

    return res.json(payload);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
    }
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.put('/user/change-password', verificarToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(400).json({ message: 'Usuario no identificado' });

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword) {
      return res.status(400).json({ message: 'Indique su contraseña actual.' });
    }
    if (!passwordFuerte(newPassword)) {
      return res.status(400).json({
        message: 'La nueva contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.',
      });
    }

    const rows = await dbQuery(`${SQL_USUARIO_AUTH} WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?)) LIMIT 1`, [email]);
    if (!rows?.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    const passwordValida = await bcrypt.compare(currentPassword, rows[0].password);
    if (!passwordValida) return res.status(401).json({ message: 'Contraseña actual incorrecta.' });

    const mismaQueActual = await bcrypt.compare(newPassword, rows[0].password);
    if (mismaQueActual) {
      return res.status(400).json({ message: 'La nueva contraseña debe ser distinta de la actual.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbQuery(
      'UPDATE usuarios SET password = ?, password_changed_at = NOW(), updated_by = ?, updated_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [hashedPassword, email, email]
    );
    if (req.user?.jti) await jwtBlacklist.revokeToken(req.user);

    return res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

// ==================== PREFERENCIAS DE USUARIO ====================

app.get('/user/preferences', verificarToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(400).json({ message: 'Usuario no identificado' });
    const rows = await dbQuery(
      'SELECT preferences_json, updated_at FROM user_preferences WHERE email = ? LIMIT 1',
      [email]
    );
    if (!rows?.length) return res.json({ preferences: null, updated_at: null });
    let preferences = null;
    try {
      preferences = JSON.parse(rows[0].preferences_json || '{}');
    } catch (_) {
      preferences = null;
    }
    return res.json({ preferences, updated_at: rows[0].updated_at });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.put('/user/preferences', verificarToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(400).json({ message: 'Usuario no identificado' });
    const preferences = req.body?.preferences;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ message: 'Preferencias inválidas' });
    }
    await dbQuery(
      `INSERT INTO user_preferences (email, preferences_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE preferences_json = VALUES(preferences_json), updated_at = CURRENT_TIMESTAMP`,
      [email, JSON.stringify(preferences)]
    );
    return res.json({ ok: true, message: 'Preferencias guardadas' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.post("/create", verificarToken, autorizarRol(['admin']), (req, res)=>{
    const nombre = req.body.nombre;
    const edad = req.body.edad;
    const pais = req.body.pais;
    const cargo = req.body.cargo;
    const anios = req.body.anios;
    
    db.query('INSERT INTO tabla1 (nombre,edad,pais,cargo,anios) VALUES(?,?,?,?,?)', [nombre, edad, pais, cargo, anios],
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});





app.put("/update", verificarToken, autorizarRol(['admin']), (req, res)=>{
    const id = req.body.id;
    const nombre = req.body.nombre;
    const edad = req.body.edad;
    const pais = req.body.pais;
    const cargo = req.body.cargo;
    const anios = req.body.anios;
    
    db.query('UPDATE tabla1 SET nombre=?,edad=?,pais=?,cargo=?,anios=? WHERE id=?', [nombre, edad, pais, cargo, anios,id],
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});



app.delete("/delete/:id", verificarToken, autorizarRol(['admin']), (req, res)=>{
    const id = req.params.id;

    
    db.query('DELETE FROM tabla1  WHERE id=?', id,
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});



app.get("/tabla1", verificarToken, autorizarRol(['admin']), (req, res)=>{

    
    db.query('SELECT * FROM tabla1',
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});














//Parte de contratos_generales y empleados:

//Contratos:

// ==================== CATÁLOGO TIPOS DE CONTRATO ====================
const ROLES_CONTRATOS_LECTURA = ['contratacion', 'director', 'abogado'];
const ROLES_CONTRATOS_GESTION = ['contratacion'];

function dispararNotificacionRevisionJuridica(numero, accion, solicitadoPor, extra = {}) {
  notificacionesContrato.disparar(numero, 'pendiente_revision_juridica', {
    accion,
    solicitadoPor,
    ...extra,
  }).catch(() => {});
}

function dispararNotificacionJuridicaResuelta(numero, evento, resueltoPor, extra = {}) {
  notificacionesContrato.disparar(numero, evento, { resueltoPor, ...extra }).catch(() => {});
}

app.get(
  '/catalogo/tipos-contrato',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    try {
      const todos = String(req.query.todos || '') === '1';
      const whereActivo = todos ? '' : ' WHERE t.activo = 1';
      const rows = await dbQuery(
        `SELECT t.id_tipo_contrato, t.nombre, COALESCE(t.activo, 1) AS activo,
                (SELECT COUNT(*) FROM contratos_generales c WHERE c.id_tipo_contrato = t.id_tipo_contrato) AS num_contratos
           FROM catalogo_tipo_contrato t
           ${whereActivo}
          ORDER BY t.activo DESC, t.nombre ASC`
      );
      return res.json(rows);
    } catch (err) {
      console.error('GET /catalogo/tipos-contrato:', err);
      return res.status(500).json({ message: 'Error al listar tipos de contrato.' });
    }
  }
);

app.post(
  '/catalogo/tipos-contrato',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_GESTION),
  async (req, res) => {
    const nombre = String(req.body?.nombre || '').trim();
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    if (nombre.length > 100) return res.status(400).json({ message: 'El nombre no puede superar 100 caracteres.' });
    try {
      const dup = await dbQuery(
        'SELECT id_tipo_contrato FROM catalogo_tipo_contrato WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1',
        [nombre]
      );
      if (dup.length) {
        return res.status(409).json({ message: `Ya existe un tipo con el nombre «${nombre}».` });
      }
      const ins = await dbQuery('INSERT INTO catalogo_tipo_contrato (nombre, activo) VALUES (?, 1)', [nombre]);
      return res.status(201).json({
        id_tipo_contrato: ins.insertId,
        nombre,
        activo: 1,
        num_contratos: 0,
      });
    } catch (err) {
      console.error('POST /catalogo/tipos-contrato:', err);
      return res.status(500).json({ message: 'Error al crear el tipo de contrato.' });
    }
  }
);

app.put(
  '/catalogo/tipos-contrato/:id',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_GESTION),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identificador inválido.' });
    const nombreBody = req.body?.nombre;
    const activoBody = req.body?.activo;
    const hasNombre = nombreBody !== undefined && nombreBody !== null;
    const hasActivo = activoBody !== undefined && activoBody !== null;
    if (!hasNombre && !hasActivo) {
      return res.status(400).json({ message: 'Indique nombre y/o estado activo.' });
    }
    try {
      const existing = await dbQuery(
        'SELECT id_tipo_contrato, nombre, COALESCE(activo, 1) AS activo FROM catalogo_tipo_contrato WHERE id_tipo_contrato = ? LIMIT 1',
        [id]
      );
      if (!existing.length) return res.status(404).json({ message: 'Tipo de contrato no encontrado.' });

      let nombre = existing[0].nombre;
      let activo = Number(existing[0].activo);

      if (hasNombre) {
        nombre = String(nombreBody).trim();
        if (!nombre) return res.status(400).json({ message: 'El nombre no puede estar vacío.' });
        const dup = await dbQuery(
          'SELECT id_tipo_contrato FROM catalogo_tipo_contrato WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND id_tipo_contrato <> ? LIMIT 1',
          [nombre, id]
        );
        if (dup.length) {
          return res.status(409).json({ message: `Ya existe otro tipo con el nombre «${nombre}».` });
        }
      }
      if (hasActivo) activo = normalizarActivo(activoBody);

      await dbQuery('UPDATE catalogo_tipo_contrato SET nombre = ?, activo = ? WHERE id_tipo_contrato = ?', [
        nombre,
        activo,
        id,
      ]);

      const countRows = await dbQuery(
        'SELECT COUNT(*) AS cnt FROM contratos_generales WHERE id_tipo_contrato = ?',
        [id]
      );
      return res.json({
        id_tipo_contrato: id,
        nombre,
        activo,
        num_contratos: Number(countRows[0]?.cnt || 0),
      });
    } catch (err) {
      console.error('PUT /catalogo/tipos-contrato/:id:', err);
      return res.status(500).json({ message: 'Error al actualizar el tipo de contrato.' });
    }
  }
);

// ==================== RUTAS PARA CONTRATOS ====================

app.post("/create-contrato", verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  const {
    numero_contrato,
    empresa,
    suplementos,
    vigencia,
    fecha_inicio,
    fecha_fin,
  } = req.body;
  const solicitadoPor = usuarioDesdeReq(req);
  try {
    const numeroFinal = await validarNumeroContratoUnico(dbQuery, numero_contrato);

    const errNiveles = validarContactosNivelesParaGuardar(req.body, {
      esProveedor: req.body?.proveedor_cliente,
    });
    if (errNiveles) return res.status(400).json({ message: errNiveles });

    const { idContraparte, idTipo } = await idsContratoDesdeBody(dbQuery, req.body);
    const prioridad = prioridadDesdeBody(req.body);
    const { contactosJson, correoPrincipal, nivelesJson } = prepareContactosNivelesForSave(req.body);
    const anexosJson = prepareAnexosForSave(req.body);
    await dbQuery(
      `INSERT INTO contratos_generales
        (numero_contrato, id_contraparte, empresa, correo_notificacion, contactos_notificacion, contactos_niveles, suplementos, anexos, vigencia, id_tipo_contrato, prioridad, fecha_inicio, fecha_fin,
         aprobacion_estado, aprobacion_accion, aprobacion_solicitado_por, aprobacion_solicitado_en, revision_juridica_estado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pendiente','alta',?,NOW(),'pendiente')`,
      [
        numeroFinal,
        idContraparte,
        empresa,
        correoPrincipal,
        contactosJson,
        nivelesJson,
        suplementos,
        anexosJson,
        vigencia,
        idTipo,
        prioridad,
        fecha_inicio,
        fecha_fin,
        solicitadoPor,
      ]
    );
    dispararNotificacionRevisionJuridica(numeroFinal, 'alta', solicitadoPor, { empresa });
    try {
      await contratosAuditoria.logContrato(req, {
        action: 'contrato_alta_solicitada',
        numero: numeroFinal,
        empresa,
        details: { accion: 'alta', solicitado_por: solicitadoPor },
      });
    } catch (auditErr) {
      console.warn('audit contrato alta:', auditErr?.message || auditErr);
    }
    res.json({
      ok: true,
      pendiente: true,
      message: 'El contrato quedó pendiente. No se activará hasta que se verifique la solicitud y posteriormente se autorice.',
    });
  } catch (err) {
    console.log(err);
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: `El número de contrato «${String(numero_contrato || '').trim()}» ya está registrado. Cada contrato debe tener un número único.`,
      });
    }
    res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.put("/update-contrato", verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const {
    numero_contrato,
    numero_contrato_original,
    empresa,
    suplementos,
    vigencia,
    fecha_inicio,
    fecha_fin,
  } = body;
  const numeroNuevo = numero_contrato == null ? '' : String(numero_contrato).trim();
  const hasNumeroOriginal = Object.prototype.hasOwnProperty.call(body, 'numero_contrato_original');
  const numeroOriginalRaw = hasNumeroOriginal ? numero_contrato_original : numero_contrato;
  let numeroContratoWhere = numeroOriginalRaw == null ? '' : String(numeroOriginalRaw).trim();
  if (!numeroContratoWhere || numeroContratoWhere === 'null' || numeroContratoWhere === 'undefined') {
    numeroContratoWhere = numeroNuevo;
  }

  if (!numeroNuevo) {
    return res.status(400).json({ message: 'El número de contrato no puede estar vacío.' });
  }

  const solicitadoPor = usuarioDesdeReq(req);

  try {
    if (numeroNuevo !== numeroContratoWhere) {
      await validarNumeroContratoUnico(dbQuery, numeroNuevo);
    }

    const errNiveles = validarContactosNivelesParaGuardar(body, {
      esProveedor: body.proveedor_cliente,
    });
    if (errNiveles) return res.status(400).json({ message: errNiveles });

    const operacion = String(body.operacion || '').trim().toLowerCase();
    const renovacionConEdicion = Boolean(body.renovacion_con_edicion);

    const existentes = await dbQuery(
      `SELECT numero_contrato, aprobacion_estado, aprobacion_accion, COALESCE(cancelado, 0) AS cancelado,
              CASE WHEN fecha_fin IS NOT NULL AND fecha_fin < CURDATE() THEN 1 ELSE 0 END AS vencido
         FROM contratos_generales
        WHERE numero_contrato = ?
        LIMIT 1`,
      [numeroContratoWhere]
    );
    if (!existentes.length) {
      return res.status(404).json({
        message: `No existe un contrato con número «${numeroContratoWhere}».`,
      });
    }

    const actual = existentes[0];
    const estadoAprob = normalizarAprobacionEstado(actual.aprobacion_estado);
    const accionAprob = String(actual.aprobacion_accion || '').toLowerCase();

    if (operacion !== 'renovacion') {
      if (Number(actual.cancelado) === 1) {
        return res.status(400).json({
          message: 'No se puede editar un contrato cancelado. Use Renovar para reactivarlo.',
        });
      }
      if (Number(actual.vencido) === 1) {
        return res.status(400).json({
          message: 'No se puede editar un contrato vencido. Use Renovar para reactivarlo.',
        });
      }
    }

    if (operacion === 'renovacion' && !renovacionConEdicion) {
      const { result, numeroNuevo: numFinal } = await aplicarDatosContratoDesdeBody(
        dbQuery,
        contratoAprobacionDeps(),
        numeroContratoWhere,
        body
      );
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_renovado',
          numero: numFinal,
          empresa,
          details: {
            fecha_inicio,
            fecha_fin,
            solicitado_por: solicitadoPor,
          },
        });
      } catch (auditErr) {
        console.warn('audit contrato renovado:', auditErr?.message || auditErr);
      }
      return res.json({
        ok: true,
        affectedRows: Number(result.affectedRows) || 0,
        numero_contrato: numFinal,
        message: 'Contrato renovado correctamente.',
      });
    }

    if (estadoAprob === 'pendiente' && accionAprob === 'cancelacion') {
      return res.status(409).json({
        message: 'Hay una solicitud de cancelación pendiente. Espere su resolución antes de editar.',
      });
    }

    if (estadoAprob === 'pendiente' && accionAprob === 'alta') {
      const { result, numeroNuevo: numFinal } = await aplicarDatosContratoDesdeBody(
        dbQuery,
        contratoAprobacionDeps(),
        numeroContratoWhere,
        body
      );
      await dbQuery(
        `UPDATE contratos_generales
            SET aprobacion_solicitado_por = ?,
                aprobacion_solicitado_en = NOW(),
                aprobacion_propuesta = NULL,
                ${sqlMarcarRevisionPendiente()}
          WHERE numero_contrato = ?`,
        [solicitadoPor, numFinal]
      );
      const nRows = Number(result.affectedRows) || 0;
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_alta_actualizada',
          numero: numFinal,
          empresa,
          details: { accion: 'alta', solicitado_por: solicitadoPor },
        });
      } catch (auditErr) {
        console.warn('audit contrato alta actualizada:', auditErr?.message || auditErr);
      }
      return res.json({
        ok: true,
        pendiente: true,
        affectedRows: nRows,
        numero_contrato: numFinal,
        message: 'El contrato quedó pendiente. No se activará hasta que se verifique la solicitud y posteriormente se autorice.',
      });
    }

    const revisionDevuelta = ['observado', 'rechazado', 'correcciones_requeridas'];
    const existentesRev = await dbQuery(
      `SELECT revision_juridica_estado FROM contratos_generales WHERE numero_contrato = ? LIMIT 1`,
      [numeroContratoWhere]
    );
    const revActual = normalizarRevisionJuridicaEstado(existentesRev[0]?.revision_juridica_estado);

    if (
      estadoAprob === 'aprobado' ||
      (estadoAprob === 'pendiente' && accionAprob === 'edicion') ||
      (estadoAprob === 'pendiente' && revisionDevuelta.includes(revActual))
    ) {
      const propuestaJson = JSON.stringify(body);
      await dbQuery(
        `UPDATE contratos_generales
            SET aprobacion_estado = 'pendiente',
                aprobacion_accion = 'edicion',
                aprobacion_propuesta = ?,
                aprobacion_solicitado_por = ?,
                aprobacion_solicitado_en = NOW(),
                aprobacion_resuelto_por = NULL,
                aprobacion_resuelto_en = NULL,
                aprobacion_resolucion_nota = NULL,
                ${sqlMarcarRevisionPendiente()}
          WHERE numero_contrato = ?`,
        [propuestaJson, solicitadoPor, numeroContratoWhere]
      );
      dispararNotificacionRevisionJuridica(numeroContratoWhere, 'edicion', solicitadoPor, { empresa });
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_edicion_solicitada',
          numero: numeroContratoWhere,
          empresa,
          details: { accion: 'edicion', solicitado_por: solicitadoPor },
        });
      } catch (auditErr) {
        console.warn('audit contrato edición:', auditErr?.message || auditErr);
      }
      return res.json({
        ok: true,
        pendiente: true,
        numero_contrato: numeroContratoWhere,
        message: 'Los cambios quedaron pendientes. El contrato activo no se modifica hasta que se verifique la solicitud y posteriormente se autorice.',
      });
    }

    return res.status(409).json({ message: 'Estado de aprobación no válido para editar este contrato.' });
  } catch (err) {
    console.log(err);
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.post(
  '/contratos/:numero_contrato/cancelar',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    const canceladoPor = String(req.user?.email || req.user?.nombre || '').trim() || null;

    try {
      const rows = await dbQuery(
        `SELECT numero_contrato, fecha_fin, COALESCE(cancelado, 0) AS cancelado,
                aprobacion_estado, aprobacion_accion, revision_juridica_estado
           FROM contratos_generales
          WHERE numero_contrato = ?
          LIMIT 1`,
        [numero]
      );
      if (!rows.length) return res.status(404).json({ message: 'Contrato no encontrado.' });

      const c = rows[0];
      if (Number(c.cancelado) === 1) {
        return res.status(400).json({ message: 'El contrato ya está cancelado.' });
      }
      const estadoAprob = normalizarAprobacionEstado(c.aprobacion_estado);
      const accionAprob = String(c.aprobacion_accion || '').toLowerCase();
      const revJur = normalizarRevisionJuridicaEstado(c.revision_juridica_estado);
      const revisionDevuelta = ['observado', 'rechazado', 'correcciones_requeridas'];
      if (estadoAprob === 'pendiente' && !revisionDevuelta.includes(revJur)) {
        return res.status(409).json({
          message: 'Este contrato ya tiene una solicitud pendiente de aprobación.',
        });
      }
      const vencido = await dbQuery(
        `SELECT 1 AS ok FROM contratos_generales
          WHERE numero_contrato = ? AND fecha_fin IS NOT NULL AND fecha_fin < CURDATE()
          LIMIT 1`,
        [numero]
      );
      if (vencido.length) {
        return res.status(400).json({ message: 'Los contratos vencidos no se pueden cancelar; use eliminar.' });
      }

      const solicitarArchivo = Boolean(req.body?.archivar);
      const motivoCancelacion = String(req.body?.motivo || '').trim().slice(0, 500);
      if (!motivoCancelacion) {
        return res.status(400).json({ message: 'Debe indicar el motivo de la baja.' });
      }
      const propuestaCancelacion = JSON.stringify({
        motivo: motivoCancelacion,
        ...(solicitarArchivo ? { archivar: true } : {}),
      });
      const accionPendiente = solicitarArchivo ? 'cancelacion_archivo' : 'cancelacion';

      await dbQuery(
        `UPDATE contratos_generales
            SET aprobacion_estado = 'pendiente',
                aprobacion_accion = ?,
                aprobacion_propuesta = ?,
                aprobacion_solicitado_por = ?,
                aprobacion_solicitado_en = NOW(),
                aprobacion_resuelto_por = NULL,
                aprobacion_resuelto_en = NULL,
                aprobacion_resolucion_nota = NULL,
                cancelado = 0,
                cancelado_en = NULL,
                cancelado_por = NULL,
                ${sqlMarcarRevisionPendiente()}
          WHERE numero_contrato = ?`,
        [accionPendiente, propuestaCancelacion, canceladoPor, numero]
      );

      dispararNotificacionRevisionJuridica(numero, accionPendiente, canceladoPor, { motivo: motivoCancelacion });
      try {
        const empRows = await dbQuery('SELECT empresa FROM contratos_generales WHERE numero_contrato = ? LIMIT 1', [
          numero,
        ]);
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_cancelacion_solicitada',
          numero,
          empresa: empRows[0]?.empresa,
          details: {
            accion: accionPendiente,
            archivar: solicitarArchivo,
            motivo: motivoCancelacion,
            solicitado_por: canceladoPor,
          },
        });
      } catch (auditErr) {
        console.warn('audit contrato cancelación:', auditErr?.message || auditErr);
      }
      return res.json({
        ok: true,
        pendiente: true,
        accion: accionPendiente,
        numero_contrato: numero,
        message: solicitarArchivo
          ? 'La cancelación y archivo quedaron pendientes. El contrato sigue en la lista hasta que se verifique la solicitud y posteriormente se autorice.'
          : 'La cancelación quedó pendiente. El contrato sigue activo hasta que se verifique la solicitud y posteriormente se autorice.',
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/solicitar-archivo',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    const solicitadoPor = String(req.user?.email || req.user?.nombre || '').trim() || null;
    const motivo = String(req.body?.motivo || '').trim().slice(0, 500);
    if (!motivo) {
      return res.status(400).json({ message: 'Debe indicar el motivo de la baja.' });
    }

    try {
      const rows = await dbQuery(
        `SELECT numero_contrato, COALESCE(cancelado, 0) AS cancelado, fecha_fin,
                aprobacion_estado, aprobacion_accion, revision_juridica_estado
           FROM contratos_generales
          WHERE numero_contrato = ?
          LIMIT 1`,
        [numero]
      );
      if (!rows.length) return res.status(404).json({ message: 'Contrato no encontrado.' });

      const c = rows[0];
      const estadoAprob = normalizarAprobacionEstado(c.aprobacion_estado);
      const revJur = normalizarRevisionJuridicaEstado(c.revision_juridica_estado);
      const revisionDevuelta = ['observado', 'rechazado', 'correcciones_requeridas'];
      if (estadoAprob === 'pendiente' && !revisionDevuelta.includes(revJur)) {
        return res.status(409).json({
          message: 'Este contrato ya tiene una solicitud pendiente de aprobación.',
        });
      }

      const esCancelado = Number(c.cancelado) === 1;
      const esVencido =
        c.fecha_fin != null && String(c.fecha_fin).slice(0, 10) < new Date().toISOString().slice(0, 10);
      if (!esCancelado && !esVencido) {
        return res.status(400).json({
          message: 'Solo se puede solicitar archivo de contratos cancelados o vencidos.',
        });
      }

      const propuesta = JSON.stringify({ motivo, archivar: true });

      await dbQuery(
        `UPDATE contratos_generales
            SET aprobacion_estado = 'pendiente',
                aprobacion_accion = 'archivo',
                aprobacion_propuesta = ?,
                aprobacion_solicitado_por = ?,
                aprobacion_solicitado_en = NOW(),
                aprobacion_resuelto_por = NULL,
                aprobacion_resuelto_en = NULL,
                aprobacion_resolucion_nota = NULL,
                ${sqlMarcarRevisionPendiente()}
          WHERE numero_contrato = ?`,
        [propuesta, solicitadoPor, numero]
      );

      dispararNotificacionRevisionJuridica(numero, 'archivo', solicitadoPor, { motivo });
      try {
        const empRows = await dbQuery('SELECT empresa FROM contratos_generales WHERE numero_contrato = ? LIMIT 1', [
          numero,
        ]);
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_archivo_solicitado',
          numero,
          empresa: empRows[0]?.empresa,
          details: { accion: 'archivo', motivo, solicitado_por: solicitadoPor },
        });
      } catch (auditErr) {
        console.warn('audit contrato archivo solicitado:', auditErr?.message || auditErr);
      }
      return res.json({
        ok: true,
        pendiente: true,
        accion: 'archivo',
        numero_contrato: numero,
        message: 'La solicitud de archivo quedó pendiente. El contrato sigue visible hasta que se verifique la solicitud y posteriormente se autorice.',
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/verificar-aprobar',
  verificarToken,
  autorizarPermiso('contratos', 'verify'),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    const resueltoPor = usuarioDesdeReq(req);
    try {
      const result = await verificarAprobar(dbQuery, numero, resueltoPor);
      dispararNotificacionJuridicaResuelta(numero, 'revision_juridica_aprobada', resueltoPor, {
        accion: result.accion,
        empresa: result.empresa,
      });
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_verificacion_juridica_aprobada',
          numero,
          empresa: result.empresa,
          details: { accion: result.accion, verificado_por: resueltoPor },
        });
      } catch (auditErr) {
        console.warn('audit verificación jurídica:', auditErr?.message || auditErr);
      }
      return res.json({
        ...result,
        message: 'Verificación jurídica aprobada. El contrato pasa a aprobación operativa.',
      });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.log(err);
      return res.status(status).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/verificar-rechazar',
  verificarToken,
  autorizarPermiso('contratos', 'verify'),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    const resueltoPor = usuarioDesdeReq(req);
    const tipo = String(req.body?.tipo || '').trim().toLowerCase();
    const motivo = String(req.body?.motivo || '').trim();
    const documentos = Array.isArray(req.body?.documentos) ? req.body.documentos : [];
    try {
      const result = await verificarRechazar(dbQuery, numero, resueltoPor, tipo, motivo, documentos);
      dispararNotificacionJuridicaResuelta(numero, 'revision_juridica_devuelta', resueltoPor, {
        accion: result.accion,
        empresa: result.empresa,
        motivo: result.motivo,
        tipo: result.revision_juridica_estado,
      });
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_verificacion_juridica_rechazada',
          numero,
          empresa: result.empresa,
          details: {
            accion: result.accion,
            tipo: result.revision_juridica_estado,
            motivo: result.motivo,
            verificado_por: resueltoPor,
          },
        });
      } catch (auditErr) {
        console.warn('audit verificación jurídica rechazo:', auditErr?.message || auditErr);
      }
      return res.json({
        ...result,
        message:
          result.adjuntos?.length > 0
            ? 'Contrato devuelto al contratador con observaciones jurídicas y documentos adjuntos.'
            : 'Contrato devuelto al contratador con observaciones jurídicas.',
      });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.log(err);
      return res.status(status).json({ message: err.message || String(err) });
    }
  }
);

app.get(
  '/contratos/:numero_contrato/juridico-adjuntos',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    try {
      const rows = await listarAdjuntosJuridico(dbQuery, numero);
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.get(
  '/contratos/:numero_contrato/juridico-adjuntos/:id_adjunto',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    const idAdjunto = Number(req.params.id_adjunto);
    if (!numero || !idAdjunto) return res.status(400).json({ message: 'Parámetros inválidos.' });
    try {
      const row = await obtenerAdjuntoJuridico(dbQuery, numero, idAdjunto);
      if (!row) return res.status(404).json({ message: 'Adjunto no encontrado.' });
      const abs = resolveAbsPath(row.ruta_relativa);
      if (!fs.existsSync(abs)) return res.status(404).json({ message: 'Archivo no encontrado en disco.' });
      const nombreArchivo = String(row.nombre_archivo || 'documento');
      res.setHeader('Content-Type', contentTypeFromNombre(nombreArchivo));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nombreArchivo.replace(/"/g, '')}"`
      );
      return res.sendFile(abs);
    } catch (err) {
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/retirar-solicitud',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    const solicitadoPor = usuarioDesdeReq(req);
    try {
      const result = await retirarSolicitudDevuelta(dbQuery, numero, solicitadoPor);
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_solicitud_retirada',
          numero,
          empresa: result.empresa,
          details: { accion: result.accion, solicitado_por: solicitadoPor },
        });
      } catch (auditErr) {
        console.warn('audit retirar solicitud:', auditErr?.message || auditErr);
      }
      return res.json({
        ...result,
        message: result.eliminado
          ? 'La solicitud fue cancelada y el contrato eliminado.'
          : 'La solicitud fue cancelada. El contrato activo se mantiene sin cambios.',
      });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.log(err);
      return res.status(status).json({ message: err.message || String(err) });
    }
  }
);

app.get(
  '/contratos/:numero_contrato/juridico-comentarios',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    try {
      const rows = await listarComentarios(dbQuery, numero);
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/juridico-comentarios',
  verificarToken,
  autorizarPermiso('contratos', 'verify'),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    const accion = String(req.body?.accion || 'crear').trim().toLowerCase();
    try {
      if (accion === 'marcar_realizado') {
        const result = await marcarComentarioRealizado(dbQuery, numero, req.body?.id_comentario, {
          realizado: req.body?.realizado,
          usuario: usuarioDesdeReq(req),
        });
        return res.json(result);
      }

      const result = await agregarComentario(dbQuery, numero, {
        email: req.user?.email,
        nombre: req.user?.nombre,
        texto: req.body?.texto,
        tipo: req.body?.tipo,
      });
      return res.json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/aprobar',
  verificarToken,
  autorizarPermiso('contratos', 'approve'),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    const resueltoPor = usuarioDesdeReq(req);
    const documentosCliente = Array.isArray(req.body?.documentos) ? req.body.documentos : [];
    try {
      const infoRows = await dbQuery(
        `SELECT empresa, aprobacion_solicitado_por
           FROM contratos_generales
          WHERE numero_contrato = ?
          LIMIT 1`,
        [numero]
      );
      const infoPrev = infoRows[0] || {};

      const result = await aprobarContratoPendiente(
        dbQuery,
        contratoAprobacionDeps({ documentosClienteAprobar: documentosCliente }),
        numero,
        resueltoPor
      );

      dispararNotificacionesAprobacion(result.numero_contrato || numero, result.accion, resueltoPor, {
        empresa: result.empresa || infoPrev.empresa,
        solicitadoPor: infoPrev.aprobacion_solicitado_por,
      });

      try {
        const solicitadoPor = infoPrev.aprobacion_solicitado_por || null;
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_aprobado',
          numero: result.numero_contrato || numero,
          empresa: result.empresa || infoPrev.empresa,
          details: {
            accion: result.accion,
            motivo: result.motivo || null,
            id_archivo: result.id_archivo || null,
            solicitado_por: solicitadoPor,
            aprobado_por: resueltoPor,
          },
        });
        if (result.accion === 'cancelacion_archivo' || result.accion === 'archivo') {
          const eliminacionDetails = {
            motivo: result.motivo,
            id_archivo: result.id_archivo,
            aprobacion: true,
            directo: false,
            solicitado_por: solicitadoPor,
            aprobado_por: resueltoPor,
          };
          await contratosAuditoria.logContrato(req, {
            action: 'contrato_eliminado_efectivo',
            numero: result.numero_contrato || numero,
            empresa: result.empresa || infoPrev.empresa,
            details: eliminacionDetails,
          });
          await audit.logEvent({
            category: 'delete',
            action: 'contrato_archived',
            actor: { email: req.user?.email, nombre: req.user?.nombre },
            targetType: 'contrato',
            targetId: numero,
            targetLabel: result.empresa ? `${numero} — ${result.empresa}` : numero,
            details: eliminacionDetails,
            req,
          });
        }
      } catch (auditErr) {
        console.warn('audit contrato aprobado:', auditErr?.message || auditErr);
      }
      return res.json(result);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.log(err);
      return res.status(status).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/rechazar',
  verificarToken,
  autorizarPermiso('contratos', 'approve'),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });
    const resueltoPor = usuarioDesdeReq(req);
    const motivo = String(req.body?.motivo || '').trim().slice(0, 500);
    if (!motivo) {
      return res.status(400).json({ message: 'Debe indicar el motivo del rechazo.' });
    }
    try {
      const infoRows = await dbQuery(
        `SELECT empresa, aprobacion_solicitado_por, aprobacion_accion
           FROM contratos_generales
          WHERE numero_contrato = ?
          LIMIT 1`,
        [numero]
      );
      const infoPrev = infoRows[0] || {};

      const result = await rechazarContratoPendiente(
        dbQuery,
        contratoAprobacionDeps(),
        numero,
        resueltoPor,
        motivo
      );

      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_rechazado',
          numero,
          empresa: result.empresa || infoPrev.empresa,
          details: {
            accion: result.accion || infoPrev.aprobacion_accion,
            motivo,
            solicitado_por: infoPrev.aprobacion_solicitado_por || null,
            rechazado_por: resueltoPor,
          },
        });
      } catch (auditErr) {
        console.warn('audit contrato rechazado:', auditErr?.message || auditErr);
      }
      return res.json(result);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.log(err);
      return res.status(status).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/archivar',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    const motivo = String(req.body?.motivo || '').trim().slice(0, 500) || null;
    const documentosCliente = Array.isArray(req.body?.documentos) ? req.body.documentos : [];
    const eliminadoPor = String(req.user?.email || req.user?.nombre || '').trim() || null;

    try {
      const archivado = await ejecutarArchivoContrato(dbQuery, numero, {
        motivo,
        documentosCliente,
        eliminadoPor,
      });

      const eliminacionDetails = {
        motivo,
        id_archivo: archivado.id_archivo,
        empresa: archivado.empresa,
        directo: true,
        ejecutado_por: eliminadoPor,
      };
      try {
        await contratosAuditoria.logContrato(req, {
          action: 'contrato_eliminado_efectivo',
          numero,
          empresa: archivado.empresa,
          details: eliminacionDetails,
        });
      } catch (auditErr) {
        console.warn('audit contrato eliminado directo:', auditErr?.message || auditErr);
      }
      await audit.logEvent({
        category: 'delete',
        action: 'contrato_archived',
        actor: { email: req.user?.email, nombre: req.user?.nombre },
        targetType: 'contrato',
        targetId: numero,
        targetLabel: archivado.empresa ? `${numero} — ${archivado.empresa}` : numero,
        details: eliminacionDetails,
        req,
      });

      return res.json({
        ok: true,
        id_archivo: archivado.id_archivo,
        retencion_hasta: archivado.retencion_hasta,
        documentos: archivado.documentos,
      });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.log(err);
      return res.status(status).json({ message: err.message || err.sqlMessage || String(err) });
    }
  }
);

app.get('/contratos/auditoria', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  try {
    const rows = await contratosAuditoria.listEventos({
      tab: req.query.tab,
      numero: req.query.numero,
      desde: req.query.desde,
      hasta: req.query.hasta,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(rows);
  } catch (err) {
    console.error('GET /contratos/auditoria:', err);
    return res.status(500).json({ message: err.message || 'No se pudo cargar la auditoría de contratos.' });
  }
});

app.get('/contratos/mensajes', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim();
    const data = await contratosMensajes.listMensajes(email, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(data);
  } catch (err) {
    console.error('GET /contratos/mensajes:', err);
    return res.status(500).json({ message: err.message || 'No se pudieron cargar los mensajes.' });
  }
});

app.get('/contratos/mensajes/no-leidos', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim();
    const no_leidos = await contratosMensajes.countNoLeidos(email);
    return res.json({ no_leidos });
  } catch (err) {
    console.error('GET /contratos/mensajes/no-leidos:', err);
    return res.status(500).json({ message: err.message || 'No se pudo consultar mensajes nuevos.' });
  }
});

app.post('/contratos/mensajes/marcar-leidos', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const marcarTodos = req.body?.todos === true || req.body?.marcar_todos === true;
    const result = marcarTodos
      ? await contratosMensajes.marcarTodosLeidos(email)
      : await contratosMensajes.marcarLeidos(email, ids);
    const no_leidos = await contratosMensajes.countNoLeidos(email);
    return res.json({ ...result, no_leidos });
  } catch (err) {
    console.error('POST /contratos/mensajes/marcar-leidos:', err);
    return res.status(500).json({ message: err.message || 'No se pudieron marcar los mensajes.' });
  }
});

app.get('/contratos-archivo', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  const busqueda = String(req.query.busqueda || '').trim();
  const anio = String(req.query.anio || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  try {
    const params = [];
    let where = '1=1';
    if (busqueda) {
      where += ' AND (a.numero_contrato LIKE ? OR a.empresa LIKE ? OR a.tipo_contrato LIKE ?)';
      const like = `%${busqueda}%`;
      params.push(like, like, like);
    }
    if (anio && /^\d{4}$/.test(anio)) {
      where += ' AND YEAR(a.eliminado_en) = ?';
      params.push(Number(anio));
    }

    const rows = await dbQuery(
      `SELECT a.id_archivo, a.numero_contrato, a.id_contraparte, a.empresa, a.correo_notificacion,
              a.suplementos, a.vigencia, a.tipo_contrato, a.fecha_inicio, a.fecha_fin,
              a.eliminado_en, a.eliminado_por, a.motivo, a.retencion_hasta,
              cp.codigo AS proveedor_cliente,
              (SELECT COUNT(*) FROM contratos_archivo_documentos d WHERE d.id_archivo = a.id_archivo) AS num_documentos,
              DATEDIFF(a.retencion_hasta, CURDATE()) AS dias_restantes_retencion
         FROM contratos_archivo a
         INNER JOIN catalogo_tipo_contraparte cp ON cp.id_contraparte = a.id_contraparte
        WHERE ${where}
        ORDER BY a.eliminado_en DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.get('/contratos-archivo/:id_archivo', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  const idArchivo = Number(req.params.id_archivo);
  if (!idArchivo) return res.status(400).json({ message: 'ID de archivo inválido.' });

  try {
    const rows = await dbQuery(
      `SELECT a.*, cp.codigo AS proveedor_cliente,
              DATEDIFF(a.retencion_hasta, CURDATE()) AS dias_restantes_retencion
         FROM contratos_archivo a
         INNER JOIN catalogo_tipo_contraparte cp ON cp.id_contraparte = a.id_contraparte
        WHERE a.id_archivo = ?
        LIMIT 1`,
      [idArchivo]
    );
    if (!rows.length) return res.status(404).json({ message: 'Expediente archivado no encontrado.' });

    const documentos = await dbQuery(
      `SELECT id_documento, nombre_archivo, tamano_bytes, subido_en
         FROM contratos_archivo_documentos
        WHERE id_archivo = ?
        ORDER BY id_documento ASC`,
      [idArchivo]
    );
    return res.json({ ...rows[0], documentos });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.get(
  '/contratos-archivo/:id_archivo/documentos/:id_documento',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const idArchivo = Number(req.params.id_archivo);
    const idDocumento = Number(req.params.id_documento);
    if (!idArchivo || !idDocumento) return res.status(400).json({ message: 'Parámetros inválidos.' });

    try {
      const rows = await dbQuery(
        `SELECT d.nombre_archivo, d.ruta_relativa
           FROM contratos_archivo_documentos d
          WHERE d.id_documento = ? AND d.id_archivo = ?
          LIMIT 1`,
        [idDocumento, idArchivo]
      );
      if (!rows.length) return res.status(404).json({ message: 'Documento no encontrado.' });

      const abs = resolveAbsPath(rows[0].ruta_relativa);
      if (!fs.existsSync(abs)) return res.status(404).json({ message: 'Archivo PDF no encontrado en disco.' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${String(rows[0].nombre_archivo || 'documento.pdf').replace(/"/g, '')}"`
      );
      return res.sendFile(abs);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.get(
  '/contratos-documentos',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    try {
      const rows = await dbQuery(
        `SELECT id_documento, numero_contrato, tipo_documento, numero_suplemento,
                nombre_archivo, tamano_bytes, cliente_id, subido_en
           FROM contratos_documentos
          ORDER BY numero_contrato ASC, id_documento ASC`
      );
      return res.json(rows);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/:numero_contrato/documentos',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    const documentos = Array.isArray(req.body?.documentos) ? req.body.documentos : [];
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    try {
      const exists = await dbQuery('SELECT numero_contrato FROM contratos_generales WHERE numero_contrato = ? LIMIT 1', [
        numero,
      ]);
      if (!exists.length) return res.status(404).json({ message: 'Contrato no encontrado.' });

      const guardados = [];
      for (const item of documentos) {
        const dataUrl = String(item?.dataUrl || '');
        if (!dataUrl) continue;
        const nombre = String(item?.nombre || 'Contrato.pdf').trim();
        const clienteId = item?.clienteId != null ? String(item.clienteId) : null;

        if (clienteId) {
          const prev = await dbQuery(
            'SELECT id_documento, ruta_relativa FROM contratos_documentos WHERE numero_contrato = ? AND cliente_id = ? LIMIT 1',
            [numero, clienteId]
          );
          if (prev.length) {
            const oldAbs = resolveAbsPath(prev[0].ruta_relativa);
            if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
            await dbQuery('DELETE FROM contratos_documentos WHERE id_documento = ?', [prev[0].id_documento]);
          }
        }

        const tipoRaw = String(item?.tipoDocumento || item?.tipo_documento || 'contrato').toLowerCase();
        const tipoDoc =
          tipoRaw === 'suplemento' ? 'suplemento' : tipoRaw === 'anexo' ? 'anexo' : 'contrato';
        const numOrden =
          (tipoDoc === 'suplemento' || tipoDoc === 'anexo') &&
          Number(item?.numeroSuplemento ?? item?.numero_suplemento ?? item?.numeroAnexo ?? item?.numero_anexo) > 0
            ? Number(
                item.numeroSuplemento ?? item.numero_suplemento ?? item.numeroAnexo ?? item.numero_anexo
              )
            : null;
        const mimeHint = item?.mimeType || item?.mime_type || null;
        const saved = saveActivoDocumento(numero, nombre, dataUrl, mimeHint);
        const insert = await dbQuery(
          `INSERT INTO contratos_documentos
            (numero_contrato, tipo_documento, numero_suplemento, nombre_archivo, ruta_relativa, tamano_bytes, cliente_id)
           VALUES (?,?,?,?,?,?,?)`,
          [numero, tipoDoc, numOrden, saved.nombreArchivo, saved.rutaRelativa, saved.tamanoBytes, clienteId]
        );
        guardados.push({
          id_documento: insert.insertId,
          nombre_archivo: saved.nombreArchivo,
          tamano_bytes: saved.tamanoBytes,
          cliente_id: clienteId,
          tipo_documento: tipoDoc,
          numero_suplemento: numOrden,
        });
      }

      return res.json({ ok: true, documentos: guardados });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.get(
  '/contratos/:numero_contrato/informacion',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    try {
      const rows = await dbQuery(`${SQL_CONTRATO_SELECT} WHERE c.numero_contrato = ? LIMIT 1`, [numero]);
      if (!rows.length) return res.status(404).json({ message: 'Contrato no encontrado.' });

      const contrato = rows[0];
      const diasRestantes = recordatoriosContratos.calcDiasRestantes(contrato.fecha_fin);
      let estado = 'Activo';
      if (Number(contrato.cancelado) === 1) estado = 'Cancelado';
      else if (Number(contrato.vencido) === 1) estado = 'Vencido';
      else if (diasRestantes != null && diasRestantes <= 30 && diasRestantes >= 0) estado = 'Por vencer';

      const config = await recordatoriosContratos.loadConfig();
      const regla = recordatoriosContratos.describeReglaRecordatorio(contrato, config);
      const documentos = await dbQuery(
        `SELECT id_documento, tipo_documento, numero_suplemento, nombre_archivo, tamano_bytes, cliente_id, subido_en
           FROM contratos_documentos
          WHERE numero_contrato = ?
          ORDER BY id_documento ASC`,
        [numero]
      );
      const envios = await recordatoriosContratos.listEnviosByContrato(numero, 100);

      return res.json({
        contrato: { ...contrato, dias_restantes: diasRestantes, estado },
        documentos,
        recordatorios: {
          automaticos_activos: config.activo,
          correo_destino: contrato.correo_notificacion,
          contactos_destino: contactosFromContrato(contrato),
          hitos_dias: regla.hitos,
          regla_origen: regla.origen,
          regla_descripcion: regla.descripcion,
          envios,
        },
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || 'Error al cargar información del contrato.' });
    }
  }
);

app.get(
  '/contratos/:numero_contrato/documentos',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    try {
      const rows = await dbQuery(
        `SELECT id_documento, tipo_documento, numero_suplemento, nombre_archivo, tamano_bytes, cliente_id, subido_en
           FROM contratos_documentos
          WHERE numero_contrato = ?
          ORDER BY id_documento ASC`,
        [numero]
      );
      return res.json(rows);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.get(
  '/contratos/:numero_contrato/documentos/:id_documento',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    const idDocumento = Number(req.params.id_documento);
    if (!numero || !idDocumento) return res.status(400).json({ message: 'Parámetros inválidos.' });

    try {
      const rows = await dbQuery(
        `SELECT nombre_archivo, ruta_relativa
           FROM contratos_documentos
          WHERE id_documento = ? AND numero_contrato = ?
          LIMIT 1`,
        [idDocumento, numero]
      );
      if (!rows.length) return res.status(404).json({ message: 'Documento no encontrado.' });

      const abs = resolveAbsPath(rows[0].ruta_relativa);
      if (!fs.existsSync(abs)) return res.status(404).json({ message: 'Archivo no encontrado en disco.' });

      const nombreArchivo = String(rows[0].nombre_archivo || 'documento');
      res.setHeader('Content-Type', contentTypeFromNombre(nombreArchivo));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nombreArchivo.replace(/"/g, '')}"`
      );
      return res.sendFile(abs);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.delete(
  '/contratos/:numero_contrato/documentos/:id_documento',
  verificarToken,
  autorizarRol(['contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    const idDocumento = Number(req.params.id_documento);
    if (!numero || !idDocumento) return res.status(400).json({ message: 'Parámetros inválidos.' });

    try {
      const rows = await dbQuery(
        `SELECT ruta_relativa FROM contratos_documentos WHERE id_documento = ? AND numero_contrato = ? LIMIT 1`,
        [idDocumento, numero]
      );
      if (!rows.length) return res.status(404).json({ message: 'Documento no encontrado.' });

      const abs = resolveAbsPath(rows[0].ruta_relativa);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
      await dbQuery('DELETE FROM contratos_documentos WHERE id_documento = ?', [idDocumento]);
      return res.json({ ok: true });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message || String(err) });
    }
  }
);

app.post(
  '/contratos/exportar-expediente',
  verificarToken,
  autorizarRol(ROLES_CONTRATOS_LECTURA),
  async (req, res) => {
    const numeros = Array.isArray(req.body?.numeros) ? req.body.numeros : [];
    const exportadoPor = String(req.user?.email || req.user?.nombre || '').trim() || 'usuario';
    try {
      await contratosExportExpediente.streamExpedienteZip(res, { numeros, exportadoPor });
    } catch (err) {
      console.error('POST /contratos/exportar-expediente:', err);
      if (!res.headersSent) {
        return res
          .status(err.status || 500)
          .json({ message: err.message || 'No se pudo exportar el expediente.' });
      }
      res.end();
    }
  }
);

app.get('/contratos', verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), async (req, res) => {
  try {
    const rows = await dbQuery(`${SQL_CONTRATO_SELECT} ORDER BY c.numero_contrato ASC`);
    return res.json(JSON.parse(JSON.stringify(rows)));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.post("/send-contrato-reminder", verificarToken, autorizarRol(['contratacion']), async (req, res) => {
  const numeroContrato = String(req.body?.numero_contrato || '').trim();
  if (!numeroContrato) {
    return res.status(400).json({ message: 'Número de contrato requerido.' });
  }
  try {
    const rows = await dbQuery(`${SQL_CONTRATO_SELECT} WHERE c.numero_contrato = ? LIMIT 1`, [numeroContrato]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Contrato no encontrado.' });
    }

    const contrato = rows[0];
    if (Number(contrato.cancelado) === 1) {
      return res.status(400).json({ message: 'No se pueden enviar recordatorios de contratos cancelados.' });
    }
    if (normalizarAprobacionEstado(contrato.aprobacion_estado) === 'pendiente') {
      return res.status(400).json({ message: 'No se pueden enviar recordatorios de contratos pendientes de aprobación.' });
    }

    const diasRestantes = recordatoriosContratos.calcDiasRestantes(contrato.fecha_fin);
    const r = await recordatoriosContratos.sendReminderForContract(contrato, {
      origen: 'manual',
      diasAntes: diasRestantes != null ? diasRestantes : -1,
      skipDuplicateCheck: Boolean(req.body?.forzar),
      auditActor: { email: req.user?.email, nombre: req.user?.nombre },
      auditDisparador: 'manual_ui',
      auditReq: req,
    });

    if (r.skipped && r.reason === 'sin_correo') {
      return res.status(400).json({ message: 'Este contrato no tiene un correo de notificación válido.' });
    }
    if (r.skipped && r.reason === 'ya_enviado_hoy') {
      return res.status(409).json({
        message: 'Ya se envió un recordatorio hoy para este contrato. Use forzar=true para repetir.',
      });
    }
    if (!r.ok) {
      return res.status(500).json({ message: r.error || 'No se pudo enviar el recordatorio.' });
    }

    let msg;
    if (r.queued) {
      msg = `Recordatorio en cola para ${r.destino}; se enviará cuando SMTP esté disponible.`;
    } else if (r.warning) {
      msg = `No se pudo enviar el correo ahora mismo, pero el recordatorio quedó registrado para ${r.destino}.`;
    } else {
      msg = `Recordatorio enviado a ${r.destino}.`;
    }
    return res.status(200).json({
      message: msg,
      queued: Boolean(r.queued),
      deliveryWarning: Boolean(r.warning || r.queued),
    });
  } catch (error) {
    console.error('Error en /send-contrato-reminder:', error);
    return res.status(500).json({
      message: error?.message || 'No se pudo enviar el recordatorio por correo.',
    });
  }
});

const DB_STARTUP_TIMEOUT_MS = Number(process.env.DB_STARTUP_TIMEOUT_MS || 12000);

async function waitForDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const dbName = process.env.DB_NAME || 'bd_crud';
  console.log(`[server] Conectando a MySQL (${host} → ${dbName})…`);

  await Promise.race([
    new Promise((resolve, reject) => {
      db.query('SELECT 1 AS ok', (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'MySQL no respondió a tiempo. En XAMPP pulse Stop y Start en MySQL, espere a que quede en verde y vuelva a ejecutar node index.js.'
          )
        );
      }, DB_STARTUP_TIMEOUT_MS);
    }),
  ]);

  console.log('[server] MySQL conectado.');
}

async function bootstrapServer() {
  try {
    await waitForDatabase();
    console.log('[server] Preparando tablas y permisos…');

    await Promise.all([
      ensureJwtBlacklistTable(),
      ensurePasswordResetTable(),
      mailOutbox.ensureTable(),
      ensureContratoCorreoColumn(),
      ensureContratoContactosNotificacionColumn(),
      ensureContratoContactosNivelesColumn(),
      ensureContratoAnexosColumn(),
      ensureContratoVigenciaVarchar(),
      ensureContratoCanceladoColumns(),
      ensureUsuariosSecurityAuditColumns(),
      ensureContratosArchivoTables(),
      ensureContratosDocumentosColumns(),
      ensureCatalogoTipoContratoActivo(),
      ensureContratoPrioridadColumn(),
      ensureContratoAprobacionColumns(),
      ensureContratoRevisionJuridicaSchema(),
      ensureContratosRecordatoriosTable(),
      ensureConfigSistemaTable(),
      ensureUserPreferencesTable(),
      audit.ensureAuditTables(),
      rbac.ensureRbacSchema(),
      contratosMensajes.ensureTable(),
    ]);

    try {
      await jwtBlacklist.purgeExpired();
    } catch (err) {
      console.warn('No se pudo purgar jwt_token_blacklist:', err?.message || err);
    }

    try {
      await ensureDirectorContratosApprove();
    } catch (err) {
      console.warn('No se pudo actualizar permiso approve de director en contratos:', err?.message || err);
    }
    try {
      await reloadMailerFromConfig();
    } catch (err) {
      console.warn('No se pudo cargar config correo desde BD:', err?.message || err);
    }

    let smtpReady = false;
    try {
      await verifyMailer();
      smtpReady = true;
    } catch (err) {
      console.warn('SMTP no disponible al iniciar. La app continuará sin bloquearse:', err?.message || err);
    }

    const port = Number(process.env.PORT) || 3001;
    const listenHost = process.env.LISTEN_HOST || '0.0.0.0';
    const os = require('os');
    app.listen(port, listenHost, () => {
      recordatoriosContratos.startScheduler();
      if (smtpReady) {
        flushMailOutbox().catch((err) => console.warn('[MAIL-OUTBOX] flush inicial:', err?.message || err));
      }
      setInterval(() => {
        flushMailOutbox().catch((err) => console.warn('[MAIL-OUTBOX] flush periódico:', err?.message || err));
      }, 60000);
      setInterval(() => {
        jwtBlacklist.purgeExpired().catch((err) => {
          console.warn('purge jwt_token_blacklist:', err?.message || err);
        });
      }, 60 * 60 * 1000);
      console.log(`Corriendo en el puerto ${port} (escucha en ${listenHost})`);
      const lanIps = Object.values(os.networkInterfaces())
        .flat()
        .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
        .map((iface) => iface.address);
      if (lanIps.length) {
        console.log('[red] Acceso en LAN (móvil misma WiFi):');
        lanIps.forEach((ip) => {
          console.log(`  API:    http://${ip}:${port}`);
          console.log(`  React:  http://${ip}:3000  (npm start en client/)`);
        });
      }
      console.log(`Correo remitente: ${mailer.from} (origen: ${mailer.source || 'env'}, modo: ${mailer.mode})`);
      if (mailer.mode === 'dev') {
        console.log('Recuperación de contraseña: modo desarrollo (sin SMTP real).');
      } else if (smtpReady) {
        console.log('Recuperación de contraseña: SMTP activo.');
      } else {
        console.log('Recuperación de contraseña: SMTP configurado pero no disponible (se reintentará en cada envío).');
      }
    });
  } catch (err) {
    console.error('[server] No se pudo iniciar:', err?.message || err);
    if (err?.code === 'ECONNREFUSED') {
      console.error(
        'MySQL no responde. En XAMPP: inicie MySQL, importe bd_crud y use DB_HOST=127.0.0.1 en server/.env'
      );
    }
    if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Usuario o contraseña MySQL incorrectos. Revise DB_USER y DB_PASSWORD en server/.env');
    }
    if (err?.code === 'ER_BAD_DB_ERROR') {
      console.error('La base de datos no existe. Cree o importe bd_crud en phpMyAdmin.');
    }
    process.exit(1);
  }
}

bootstrapServer();
