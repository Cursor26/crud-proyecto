// --- Ensamblado: login/contratos/usuarios (tuyo) + RRHH/producción (compañero) + frontend (tuyo) ---


const express = require ("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");

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

app.use(cors());
app.use(express.json({ limit: '50mb' }));
/* Express 5: sin cuerpo, express.json puede dejar req.body en undefined; normalizamos para rutas que desestructuran el body. */
app.use((req, res, next) => {
  if (req.body === undefined || req.body === null) {
    req.body = {};
  }
  next();
});

app.use(cookieParser());

const { validarSacrificio, validarMatadero, validarLeche } = require('./validateProduccion');
const {
  SQL_USUARIO_AUTH,
  SQL_USUARIO_LIST,
  SQL_CONTRATO_SELECT,
  idRolDesdeCodigo,
  idsContratoDesdeBody,
  prioridadDesdeBody,
} = require('./db/queryHelpers');

const db = mysql.createConnection({
  /* 127.0.0.1 evita ::1 con XAMPP en Windows (ECONNREFUSED en localhost) */
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password:
    process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== null
      ? String(process.env.DB_PASSWORD)
      : '',
  database: process.env.DB_NAME || 'bd_crud',
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

const { createAuditService } = require('./lib/auditLog');
const audit = createAuditService(dbQuery);
const { createRbacService } = require('./lib/rbac');
const rbac = createRbacService(dbQuery);
const { createContratosRecordatoriosService } = require('./lib/contratosRecordatorios');
const {
  prepareContactosForSave,
  contactosFromContrato,
} = require('./lib/contratosContactosNotificacion');
const { prepareAnexosForSave } = require('./lib/contratosAnexos');
const {
  usuarioDesdeReq,
  normalizarAprobacionEstado,
  aplicarDatosContratoDesdeBody,
  aprobarContratoPendiente,
  rechazarContratoPendiente,
} = require('./lib/contratosAprobacion');

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

const verifyMailer = async () => {
  if (mailer.mode === 'smtp') {
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
  }
  if (SMTP_REQUIRED) {
    throw new Error('SMTP_REQUIRED=true pero faltan variables SMTP_HOST/SMTP_USER/SMTP_PASS');
  }
};

const sendMailWithFallback = async (mailOptions) => {
  if (mailer.mode !== 'smtp') {
    return mailer.transporter.sendMail(mailOptions);
  }

  const transporters = mailer.transporters || [{ label: 'smtp', transporter: mailer.transporter }];
  const startIndex = transporters.findIndex((t) => t.transporter === mailer.transporter);
  const ordered = startIndex > 0
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

const shouldUseGracefulMailFallback = (error) =>
  MAIL_FALLBACK_MODE === 'graceful' && isSmtpTransientError(error);

const recordatoriosContratos = createContratosRecordatoriosService(dbQuery, {
  SQL_CONTRATO_SELECT,
  normalizeEmail,
  isValidEmail,
  sendMailWithFallback,
  mailer,
  shouldUseGracefulMailFallback,
});

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

const ensureUsuariosSecurityAuditColumns = async () => {
  const defs = [
    { name: 'activo', sql: 'ALTER TABLE usuarios ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER rol' },
    { name: 'created_by', sql: 'ALTER TABLE usuarios ADD COLUMN created_by VARCHAR(255) NULL AFTER activo' },
    { name: 'created_at', sql: 'ALTER TABLE usuarios ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_by' },
    { name: 'updated_by', sql: 'ALTER TABLE usuarios ADD COLUMN updated_by VARCHAR(255) NULL AFTER created_at' },
    { name: 'updated_at', sql: 'ALTER TABLE usuarios ADD COLUMN updated_at DATETIME NULL AFTER updated_by' },
    { name: 'foto_perfil', sql: 'ALTER TABLE usuarios ADD COLUMN foto_perfil MEDIUMTEXT NULL AFTER updated_at' },
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

const ensureDirectorContratosApprove = async () => {
  await dbQuery(
    `UPDATE rbac_role_permissions rp
     INNER JOIN roles r ON r.id_rol = rp.id_rol
     SET rp.can_approve = 1
     WHERE r.codigo = 'director' AND rp.module_codigo = 'contratos'`
  );
};

const contratoAprobacionDeps = () => ({
  idsContratoDesdeBody,
  prioridadDesdeBody,
  prepareContactosForSave,
  prepareAnexosForSave,
  resolveAbsPath,
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

//Usuarios y seguridad



// Clave secreta para JWT (en producción, ponla en .env)
const JWT_SECRET = process.env.JWT_SECRET || 'hgnfdignrejvmklehvmlSDJVHFDVDJMOdsjvmvjmnjsbmgiSDHUNVJDFVDNVBMJF84135165132164HDND8448340I/*/*/-*/**+';

// ==================== MIDDLEWARES ====================

// Middleware para verificar token JWT
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  if (!token) return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user; // guardamos los datos del usuario (email, nombre, rol)
    next();
  });
};

// Middleware para autorizar según roles (recibe un array de roles permitidos)
// Rol lógico: en BD aún puede existir "produccion"; se trata como "estadistica" para permisos.
const rolEfectivo = (rol) => (rol === 'produccion' ? 'estadistica' : rol);

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
// ==================== RUTAS DE AUTENTICACIÓN ====================

// LOGIN (público): correo o nombre de usuario
app.post('/login', async (req, res) => {
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
      {
        email: usuario.email,
        nombre: usuario.nombre,
        rol: rolCanonico,
        id_rol: usuario.id_rol,
      },
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
    if (email) await audit.recordLogout(email);
    return res.json({ message: 'Sesión cerrada' });
  } catch (error) {
    console.error('Error en /auth/logout:', error);
    return res.status(500).json({ message: 'Error al registrar cierre de sesión' });
  }
});

// Vista previa de avatar en login (público): solo devuelve foto si el identificador coincide exactamente.
app.get('/auth/login-avatar', async (req, res) => {
  try {
    const identifier = String(req.query?.identifier || '').trim();
    if (!identifier || identifier.length < 2) {
      return res.json({ fotoPerfil: null });
    }

    const rows = await dbQuery(
      `SELECT foto_perfil FROM usuarios
       WHERE (LOWER(TRIM(email)) = LOWER(TRIM(?)) OR LOWER(TRIM(nombre)) = LOWER(TRIM(?)))
         AND COALESCE(activo, 1) = 1
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows?.length) {
      return res.json({ fotoPerfil: null });
    }

    const raw = rows[0]?.foto_perfil;
    const fotoPerfil = raw && String(raw).trim() ? String(raw) : null;
    return res.json({ fotoPerfil });
  } catch (err) {
    console.error('Error en /auth/login-avatar:', err.message || err);
    return res.status(500).json({ message: 'Error al consultar avatar' });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
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
    await dbQuery(
      'INSERT INTO password_reset_tokens (email, token_hash, expires_at, requested_ip) VALUES (?, ?, ?, ?)',
      [user.email, tokenHash, expiresAt, req.ip || null]
    );

    const baseUrl = String(APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    resetUrl = `${baseUrl}/?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`;

    const mailResult = await sendMailWithFallback({
      from: mailer.from,
      to: user.email,
      subject: 'Recuperación de contraseña',
      text: `Hola ${user.nombre || ''},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace (expira en ${Math.max(PASSWORD_RESET_TTL_MINUTES, 5)} minutos):\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`,
      html: `
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
      `,
    });

    const response = { message: genericMessage };
    if (mailer.mode === 'dev') {
      response.devResetUrl = resetUrl;
      response.devMailPreview = mailResult?.message ? String(mailResult.message) : null;
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

app.post('/auth/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: 'Datos incompletos para restablecer contraseña.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
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
      'UPDATE usuarios SET password = ? WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
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
  const actorRol = normalizarRol(req.user?.rol);
  const actorEmail = String(req.user?.email || req.user?.nombre || 'sistema').trim().toLowerCase();

  if (!email || !nombre || !password || !rol) {
    return res.status(400).json({ message: 'Email, nombre, contraseña y rol son obligatorios.' });
  }
  if (!emailValido(email)) return res.status(400).json({ message: 'Email inválido.' });
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
        (email, nombre, password, id_rol, activo, created_by, created_at, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
      [email, nombre, hashedPassword, idRol, activo, actorEmail, actorEmail],
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
  const actorRol = normalizarRol(req.user?.rol);
  const actorEmail = String(req.user?.email || req.user?.nombre || 'sistema').trim().toLowerCase();

  if (!emailAnterior || !nuevoEmail || !nombre || !rol) {
    return res.status(400).json({ message: 'Email, nombre y rol son obligatorios' });
  }
  if (!emailValido(nuevoEmail)) return res.status(400).json({ message: 'Email inválido.' });
  if (!(await rolValido(rol))) return res.status(400).json({ message: 'Rol inválido.' });
  if (password && !passwordFuerte(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.' });
  }

  const idRol = await idRolDesdeCodigo(dbQuery, rol);
  if (!idRol) return res.status(400).json({ message: 'Rol inválido en catálogo.' });

  const targetRows = await dbQuery(
    `${SQL_USUARIO_AUTH} WHERE u.email = ? OR LOWER(TRIM(u.email)) = LOWER(TRIM(?)) LIMIT 1`,
    [emailAnterior, emailAnterior]
  );
  if (!targetRows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
  const usuarioAntes = targetRows[0];
  const rolAnterior = normalizarRol(usuarioAntes.rol);
  const activoAnterior = Number(usuarioAntes.activo);
  let query =
    'UPDATE usuarios SET email = TRIM(?), nombre = ?, id_rol = ?, activo = ?, updated_by = ?, updated_at = NOW()';
  let params = [nuevoEmail, nombre, idRol, activo, actorEmail];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    query += ', password = ?';
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
      if (rolAnterior && rol !== rolAnterior) {
        await audit.logEvent({
          category: 'role',
          action: 'user_role_change',
          actor,
          targetType: 'usuario',
          targetId: nuevoEmail,
          targetLabel: label,
          details: { rol_anterior: rolAnterior, rol_nuevo: rol },
          req,
        });
      }
      if (activoAnterior !== activo) {
        await audit.logEvent({
          category: 'role',
          action: 'user_active_change',
          actor,
          targetType: 'usuario',
          targetId: nuevoEmail,
          targetLabel: label,
          details: { activo: Boolean(activo), activo_anterior: Boolean(activoAnterior) },
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

app.get('/config/recordatorios-contratos', verificarToken, autorizarRol(['admin', 'contratacion']), async (req, res) => {
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

app.put('/config/recordatorios-contratos', verificarToken, autorizarRol(['admin', 'contratacion']), async (req, res) => {
  try {
    const updatedBy = String(req.user?.email || req.user?.nombre || '').trim() || null;
    const config = await recordatoriosContratos.saveConfig(req.body || {}, updatedBy);
    return res.json({ ok: true, message: 'Configuración de recordatorios guardada.', config });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Error al guardar.' });
  }
});

app.post(
  '/contratos/recordatorios/ejecutar-ahora',
  verificarToken,
  autorizarRol(['admin', 'contratacion']),
  async (req, res) => {
    try {
      const result = await recordatoriosContratos.ejecutarAutomaticos({
        forzar: Boolean(req.body?.forzar),
      });
      if (result.skipped && result.reason === 'desactivado') {
        return res.status(400).json({
          message: 'Los recordatorios automáticos están desactivados. Actívelos en Correo del sistema o use forzar en admin.',
          result,
        });
      }
      return res.json({
        message: `Proceso completado: ${result.enviados} enviado(s), ${result.omitidos} omitido(s), ${result.errores} error(es).`,
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
  autorizarRol(['admin', 'contratacion', 'director']),
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

app.get('/config/correo', verificarToken, autorizarRol(['admin']), async (req, res) => {
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
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.put('/config/correo', verificarToken, autorizarRol(['admin']), async (req, res) => {
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

app.post('/config/correo/probar', verificarToken, autorizarRol(['admin']), async (req, res) => {
  const destino = normalizeEmail(req.body?.email || req.user?.email);
  if (!destino || !isValidEmail(destino)) {
    return res.status(400).json({ message: 'Indique un correo de prueba válido.' });
  }
  try {
    await sendMailWithFallback({
      from: mailer.from,
      to: destino,
      subject: 'Prueba — correo de servicio del sistema',
      text:
        'Este es un correo de prueba del sistema de gestión.\n' +
        'Si lo recibió, la configuración SMTP del remitente es correcta.\n',
      html: '<p>Este es un correo de <strong>prueba</strong> del sistema de gestión.</p><p>Si lo recibió, la configuración SMTP del remitente es correcta.</p>',
    });
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
const ROLES_CONTRATOS_LECTURA = ['admin', 'contratacion', 'director'];
const ROLES_CONTRATOS_GESTION = ['admin', 'contratacion'];

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

app.post("/create-contrato", verificarToken, autorizarRol(['admin', 'contratacion']), async (req, res) => {
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
    const { idContraparte, idTipo } = await idsContratoDesdeBody(dbQuery, req.body);
    const prioridad = prioridadDesdeBody(req.body);
    const { contactosJson, correoPrincipal } = prepareContactosForSave(req.body);
    const anexosJson = prepareAnexosForSave(req.body);
    await dbQuery(
      `INSERT INTO contratos_generales
        (numero_contrato, id_contraparte, empresa, correo_notificacion, contactos_notificacion, suplementos, anexos, vigencia, id_tipo_contrato, prioridad, fecha_inicio, fecha_fin,
         aprobacion_estado, aprobacion_accion, aprobacion_solicitado_por, aprobacion_solicitado_en)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pendiente','alta',?,NOW())`,
      [
        numero_contrato,
        idContraparte,
        empresa,
        correoPrincipal,
        contactosJson,
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
    res.json({
      ok: true,
      pendiente: true,
      message: 'Contrato registrado y enviado a aprobación. Aparecerá activo cuando un autorizador lo apruebe.',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.put("/update-contrato", verificarToken, autorizarRol(['admin', 'contratacion']), async (req, res) => {
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
    const existentes = await dbQuery(
      `SELECT numero_contrato, aprobacion_estado, aprobacion_accion
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
                aprobacion_propuesta = NULL
          WHERE numero_contrato = ?`,
        [solicitadoPor, numFinal]
      );
      const nRows = Number(result.affectedRows) || 0;
      return res.json({
        ok: true,
        pendiente: true,
        affectedRows: nRows,
        numero_contrato: numFinal,
        message: 'Contrato actualizado y pendiente de aprobación.',
      });
    }

    if (estadoAprob === 'aprobado' || (estadoAprob === 'pendiente' && accionAprob === 'edicion')) {
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
                aprobacion_resolucion_nota = NULL
          WHERE numero_contrato = ?`,
        [propuestaJson, solicitadoPor, numeroContratoWhere]
      );
      return res.json({
        ok: true,
        pendiente: true,
        numero_contrato: numeroContratoWhere,
        message: 'Cambios enviados a aprobación. El contrato activo no cambia hasta que un autorizador los apruebe.',
      });
    }

    return res.status(409).json({ message: 'Estado de aprobación no válido para editar este contrato.' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
  }
});

app.post(
  '/contratos/:numero_contrato/cancelar',
  verificarToken,
  autorizarRol(['admin', 'contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    const canceladoPor = String(req.user?.email || req.user?.nombre || '').trim() || null;

    try {
      const rows = await dbQuery(
        `SELECT numero_contrato, fecha_fin, COALESCE(cancelado, 0) AS cancelado,
                aprobacion_estado, aprobacion_accion
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
      if (estadoAprob === 'pendiente') {
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

      await dbQuery(
        `UPDATE contratos_generales
            SET aprobacion_estado = 'pendiente',
                aprobacion_accion = 'cancelacion',
                aprobacion_propuesta = NULL,
                aprobacion_solicitado_por = ?,
                aprobacion_solicitado_en = NOW(),
                aprobacion_resuelto_por = NULL,
                aprobacion_resuelto_en = NULL,
                aprobacion_resolucion_nota = NULL,
                cancelado = 0,
                cancelado_en = NULL,
                cancelado_por = NULL
          WHERE numero_contrato = ?`,
        [canceladoPor, numero]
      );

      return res.json({
        ok: true,
        pendiente: true,
        numero_contrato: numero,
        message: 'Solicitud de cancelación enviada a aprobación.',
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
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
    try {
      const result = await aprobarContratoPendiente(dbQuery, contratoAprobacionDeps(), numero, resueltoPor);
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
      const result = await rechazarContratoPendiente(
        dbQuery,
        contratoAprobacionDeps(),
        numero,
        resueltoPor,
        motivo
      );
      await audit.logEvent({
        category: 'update',
        action: 'contrato_aprobacion_rechazada',
        actor: { email: req.user?.email, nombre: req.user?.nombre },
        targetType: 'contrato',
        targetId: numero,
        targetLabel: result.empresa ? `${numero} — ${result.empresa}` : numero,
        details: { accion: result.accion, motivo },
        req,
      });
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
  autorizarRol(['admin', 'contratacion']),
  async (req, res) => {
    const numero = String(req.params.numero_contrato || '').trim();
    if (!numero) return res.status(400).json({ message: 'Número de contrato requerido.' });

    const motivo = String(req.body?.motivo || '').trim().slice(0, 500) || null;
    const documentosCliente = Array.isArray(req.body?.documentos) ? req.body.documentos : [];
    const eliminadoPor = String(req.user?.email || req.user?.nombre || '').trim() || null;

    try {
      const rows = await dbQuery(
        `SELECT c.numero_contrato, c.id_contraparte, c.empresa, c.correo_notificacion, c.suplementos,
                c.vigencia, c.id_tipo_contrato, c.fecha_inicio, c.fecha_fin,
                COALESCE(tc.nombre, '') AS tipo_contrato
           FROM contratos_generales c
           LEFT JOIN catalogo_tipo_contrato tc ON tc.id_tipo_contrato = c.id_tipo_contrato
          WHERE c.numero_contrato = ?
          LIMIT 1`,
        [numero]
      );
      if (!rows.length) return res.status(404).json({ message: 'Contrato no encontrado.' });

      const c = rows[0];
      const eliminadoEn = new Date();
      const retencionHasta = calcRetencionHasta(eliminadoEn);

      const insertArchivo = await dbQuery(
        `INSERT INTO contratos_archivo
          (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia,
           id_tipo_contrato, tipo_contrato, fecha_inicio, fecha_fin, eliminado_en, eliminado_por, motivo, retencion_hasta)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          c.numero_contrato,
          c.id_contraparte,
          c.empresa,
          c.correo_notificacion,
          c.suplementos,
          c.vigencia,
          c.id_tipo_contrato,
          c.tipo_contrato,
          c.fecha_inicio,
          c.fecha_fin,
          eliminadoEn,
          eliminadoPor,
          motivo,
          retencionHasta,
        ]
      );
      const idArchivo = insertArchivo.insertId;
      const nombresGuardados = new Set();

      const docsActivos = await dbQuery(
        'SELECT id_documento, nombre_archivo, ruta_relativa FROM contratos_documentos WHERE numero_contrato = ?',
        [numero]
      );
      for (const doc of docsActivos) {
        const copied = copyFileToArchivo(idArchivo, doc.ruta_relativa, doc.nombre_archivo);
        if (!copied) continue;
        await dbQuery(
          `INSERT INTO contratos_archivo_documentos (id_archivo, nombre_archivo, ruta_relativa, tamano_bytes)
           VALUES (?,?,?,?)`,
          [idArchivo, copied.nombreArchivo, copied.rutaRelativa, copied.tamanoBytes]
        );
        nombresGuardados.add(String(copied.nombreArchivo).toLowerCase());
      }

      for (const item of documentosCliente) {
        const nombre = String(item?.nombre || 'Contrato.pdf').trim();
        const dataUrl = String(item?.dataUrl || '');
        if (!dataUrl) continue;
        const key = nombre.toLowerCase();
        if (nombresGuardados.has(key)) continue;
        try {
          const saved = saveArchivoPdf(idArchivo, nombre, dataUrl);
          await dbQuery(
            `INSERT INTO contratos_archivo_documentos (id_archivo, nombre_archivo, ruta_relativa, tamano_bytes)
             VALUES (?,?,?,?)`,
            [idArchivo, saved.nombreArchivo, saved.rutaRelativa, saved.tamanoBytes]
          );
          nombresGuardados.add(String(saved.nombreArchivo).toLowerCase());
        } catch (pdfErr) {
          console.warn('PDF cliente omitido al archivar:', pdfErr?.message || pdfErr);
        }
      }

      await dbQuery('DELETE FROM contratos_generales WHERE numero_contrato = ?', [numero]);
      removeDirIfExists(path.join(ACTIVOS_DIR, numero));

      await audit.logEvent({
        category: 'delete',
        action: 'contrato_archived',
        actor: { email: req.user?.email, nombre: req.user?.nombre },
        targetType: 'contrato',
        targetId: numero,
        targetLabel: c.empresa ? `${numero} — ${c.empresa}` : numero,
        details: { motivo, id_archivo: idArchivo, empresa: c.empresa },
        req,
      });

      return res.json({
        ok: true,
        id_archivo: idArchivo,
        retencion_hasta: retencionHasta,
        documentos: nombresGuardados.size,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
    }
  }
);

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
  autorizarRol(['admin', 'contratacion']),
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
  autorizarRol(['admin', 'contratacion']),
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

app.get("/contratos", verificarToken, autorizarRol(ROLES_CONTRATOS_LECTURA), (req, res) => {
  db.query(`${SQL_CONTRATO_SELECT} ORDER BY c.numero_contrato ASC`, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
    } else {
      const rows = Array.isArray(result) ? result : [];
      res.json(JSON.parse(JSON.stringify(rows)));
    }
  });
});

app.post("/send-contrato-reminder", verificarToken, autorizarRol(['admin', 'contratacion']), async (req, res) => {
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

    const msg = r.warning
      ? `No se pudo enviar el correo ahora mismo, pero el recordatorio quedó registrado para ${r.destino}.`
      : `Recordatorio enviado a ${r.destino}.`;
    return res.status(200).json({ message: msg, deliveryWarning: Boolean(r.warning) });
  } catch (error) {
    console.error('Error en /send-contrato-reminder:', error);
    return res.status(500).json({
      message: error?.message || 'No se pudo enviar el recordatorio por correo.',
    });
  }
});

//Empleados: 

// ==================== RUTAS PARA EMPLEADOS ====================
function validarCarnetEmpleado11(carnet) {
  const c = String(carnet ?? '').trim();
  if (!/^\d{11}$/.test(c)) return 'El carnet debe tener exactamente 11 dígitos (solo números).';
  return null;
}

function validarTelefonoEmpleado8(tel) {
  const t = String(tel ?? '').trim();
  if (!/^\d{8}$/.test(t)) return 'El teléfono debe tener exactamente 8 dígitos (solo números).';
  return null;
}

/** JOIN estándar: `departamento` y `salario_normal` vienen de tablas relacionadas (no columnas en `empleados`). */
const SQL_EMPLEADOS_LISTADO_BASE = `SELECT e.*,
  d.nombre AS departamento,
  s.salario_neto AS salario_normal
  FROM empleados e
  LEFT JOIN departamentos d ON d.id_departamento = e.id_departamento
  LEFT JOIN salarios s ON s.id_tabla = e.carnet_identidad`;

app.post("/create-empleado", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, nombre, apellidos, puesto, telefono, beneficios, resultados_auditorias, nivel_escolar, superacion_en_proceso } = req.body;
  const errC = validarCarnetEmpleado11(carnet_identidad);
  if (errC) return res.status(400).json({ message: errC });
  const errT = validarTelefonoEmpleado8(telefono);
  if (errT) return res.status(400).json({ message: errT });
  const nom = nombre != null ? String(nombre).trim() : '';
  const ape = apellidos != null ? String(apellidos).trim() : '';
  if (!nom || !ape) return res.status(400).json({ message: 'Nombre y apellidos son obligatorios.' });
  const p = puesto != null ? String(puesto).trim() : '';
  if (!p) return res.status(400).json({ message: 'El puesto es obligatorio.' });
  const c = String(carnet_identidad).trim();
  const t = String(telefono).trim();
  const nev = nivel_escolar != null ? String(nivel_escolar).trim() : '';
  if (!nev) return res.status(400).json({ message: 'El nivel escolar es obligatorio.' });
  db.query(
    'INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, telefono, beneficios, resultados_auditorias, nivel_escolar, superacion_en_proceso) VALUES (?,?,?,?,?,?,?,?,?)',
    [
      c,
      nom,
      ape,
      p,
      t,
      beneficios != null && String(beneficios).trim() !== '' ? String(beneficios).trim() : null,
      resultados_auditorias != null && String(resultados_auditorias).trim() !== '' ? String(resultados_auditorias).trim() : null,
      nev,
      superacion_en_proceso != null && String(superacion_en_proceso).trim() !== '' ? String(superacion_en_proceso).trim() : null,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else res.send(result);
    }
  );
});

app.put("/update-empleado", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, nombre, apellidos, puesto, telefono, beneficios, resultados_auditorias, nivel_escolar, superacion_en_proceso } = req.body;
  const errT = validarTelefonoEmpleado8(telefono);
  if (errT) return res.status(400).json({ message: errT });
  const carnet = carnet_identidad != null ? String(carnet_identidad).trim() : '';
  if (!carnet) return res.status(400).json({ message: 'Debe indicar el carnet del empleado.' });
  const nom = nombre != null ? String(nombre).trim() : '';
  const ape = apellidos != null ? String(apellidos).trim() : '';
  if (!nom || !ape) return res.status(400).json({ message: 'Nombre y apellidos son obligatorios.' });
  const p = puesto != null ? String(puesto).trim() : '';
  if (!p) return res.status(400).json({ message: 'El puesto es obligatorio.' });
  const t = String(telefono).trim();
  const nev = nivel_escolar != null ? String(nivel_escolar).trim() : '';
  if (!nev) return res.status(400).json({ message: 'El nivel escolar es obligatorio.' });
  const ben = beneficios != null && String(beneficios).trim() !== '' ? String(beneficios).trim() : null;
  const aud = resultados_auditorias != null && String(resultados_auditorias).trim() !== '' ? String(resultados_auditorias).trim() : null;
  const sup = superacion_en_proceso != null && String(superacion_en_proceso).trim() !== '' ? String(superacion_en_proceso).trim() : null;

  const normTxt = (v) => (v == null || v === '' ? '' : String(v).trim());

  db.query('SELECT puesto FROM empleados WHERE carnet_identidad = ?', [carnet], (selErr, rows) => {
    if (selErr) {
      console.log(selErr);
      return res.status(500).send(selErr);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    const prev = rows[0];
    const cambios = [];
    if (normTxt(prev.puesto) !== normTxt(p)) {
      cambios.push(['puesto', normTxt(prev.puesto) || null, normTxt(p) || null]);
    }

    const updateParams = [nom, ape, p, t, ben, aud, nev, sup, carnet];

    const finish = (updErr, result) => {
      if (updErr) {
        console.log(updErr);
        return res.status(500).send(updErr);
      }
      if (cambios.length === 0) return res.send(result);

      const placeholders = cambios.map(() => '(?, ?, ?, ?)').join(', ');
      const flat = cambios.flatMap(([tipo, ant, nue]) => [carnet, tipo, ant, nue]);
      db.query(
        `INSERT INTO historial_laboral (carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo) VALUES ${placeholders}`,
        flat,
        (insErr) => {
          if (insErr) {
            console.log(insErr);
            return res.status(500).send(insErr);
          }
          res.send(result);
        }
      );
    };

    db.query(
      'UPDATE empleados SET nombre=?, apellidos=?, puesto=?, telefono=?, beneficios=?, resultados_auditorias=?, nivel_escolar=?, superacion_en_proceso=? WHERE carnet_identidad=?',
      updateParams,
      finish
    );
  });
});

// Historial laboral: listado global (RF8) — debe ir antes de /historial-laboral/:carnet
app.get(
  "/historial-laboral",
  verificarToken,
  autorizarRol(['rrhh', 'director', 'contratacion']),
  (req, res) => {
    const lim = Math.min(500, Math.max(1, parseInt(String(req.query.limite || '300'), 10) || 300));
    db.query(
      `SELECT h.id, h.carnet_identidad, h.tipo_cambio, h.valor_anterior, h.valor_nuevo,
            DATE_FORMAT(h.fecha_cambio, '%Y-%m-%d %H:%i:%s') AS fecha_cambio,
            e.nombre, e.apellidos
     FROM historial_laboral h
     LEFT JOIN empleados e ON e.carnet_identidad = h.carnet_identidad
     ORDER BY h.fecha_cambio DESC, h.id DESC
     LIMIT ?`,
      [lim],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  }
);

// Historial laboral (RF8): por carnet
app.get("/historial-laboral/:carnet_identidad", verificarToken, autorizarRol(['rrhh', 'director', 'contratacion']), (req, res) => {
  const carnet = req.params.carnet_identidad;
  db.query(
    `SELECT id, tipo_cambio, valor_anterior, valor_nuevo,
            DATE_FORMAT(fecha_cambio, '%Y-%m-%d %H:%i:%s') AS fecha_cambio
     FROM historial_laboral WHERE carnet_identidad = ? ORDER BY fecha_cambio DESC, id DESC`,
    [carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.put(
  "/historial-laboral/:id",
  verificarToken,
  autorizarRol(['rrhh']),
  (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!id || id < 1) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const { tipo_cambio, valor_anterior, valor_nuevo } = req.body;
    const t = tipo_cambio != null && String(tipo_cambio).trim() ? String(tipo_cambio).trim() : null;
    const va = valor_anterior != null ? String(valor_anterior) : null;
    const vn = valor_nuevo != null ? String(valor_nuevo) : null;
    if (!t || (t !== 'puesto' && t !== 'departamento' && t !== 'salario')) {
      return res.status(400).json({ message: 'tipo_cambio debe ser puesto, departamento o salario' });
    }
    db.query(
      'UPDATE historial_laboral SET tipo_cambio = ?, valor_anterior = ?, valor_nuevo = ? WHERE id = ?',
      [t, va, vn, id],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Registro no encontrado' });
        }
        res.json({ message: 'Historial actualizado' });
      }
    );
  }
);

app.delete(
  "/historial-laboral/:id",
  verificarToken,
  autorizarRol(['rrhh']),
  (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!id || id < 1) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    db.query('DELETE FROM historial_laboral WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Registro no encontrado' });
      }
      res.json({ message: 'Movimiento eliminado del historial' });
    });
  }
);

app.delete("/delete-empleado/:carnet_identidad", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const carnet = req.params.carnet_identidad;
  db.query('DELETE FROM empleados WHERE carnet_identidad=?', [carnet], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    return res.send(result);
  });
});

app.get("/empleados", verificarToken, autorizarRol(['rrhh', 'director', 'contratacion', 'estadistica']), (req, res) => {
  const solo = req.query.solo_activos;
  const soloActivos = solo === '1' || solo === 'true';
  const where = soloActivos ? ' WHERE COALESCE(e.activo, 1) = 1' : '';
  db.query(`${SQL_EMPLEADOS_LISTADO_BASE}${where} ORDER BY e.apellidos, e.nombre`,
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else res.send(result);
    }
  );
});

// ==================== LICENCIAS POR EMPLEADO (tabla aparte) ====================
app.get("/licencias-empleado", verificarToken, autorizarRol(['rrhh', 'director', 'contratacion', 'estadistica']), (req, res) => {
  const filtro = req.query.carnet != null ? String(req.query.carnet).trim() : '';
  let sql = `SELECT l.id_licencia, l.carnet_identidad, l.descripcion,
      DATE_FORMAT(l.fecha_registro, '%Y-%m-%d') AS fecha_registro,
      l.observaciones, l.activo, e.nombre, e.apellidos
     FROM licencias_empleado l
     INNER JOIN empleados e ON e.carnet_identidad = l.carnet_identidad`;
  const params = [];
  if (filtro) {
    sql += ' WHERE l.carnet_identidad = ?';
    params.push(filtro);
  }
  sql += ' ORDER BY l.fecha_registro IS NULL, l.fecha_registro DESC, l.id_licencia DESC';
  db.query(sql, params, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

app.post("/create-licencia-empleado", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, descripcion, fecha_registro, observaciones, activo } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  if (!descripcion || !String(descripcion).trim()) {
    return res.status(400).json({ message: 'La descripción de la licencia es obligatoria' });
  }
  const fr =
    fecha_registro && String(fecha_registro).trim() ? String(fecha_registro).trim().slice(0, 10) : null;
  db.query(
    'INSERT INTO licencias_empleado (carnet_identidad, descripcion, fecha_registro, observaciones, activo) VALUES (?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(descripcion).trim(),
      fr,
      observaciones != null && String(observaciones).trim() ? String(observaciones).trim() : null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-licencia-empleado/:id_licencia", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_licencia = req.params.id_licencia;
  const { carnet_identidad, descripcion, fecha_registro, observaciones, activo } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  if (!descripcion || !String(descripcion).trim()) {
    return res.status(400).json({ message: 'La descripción de la licencia es obligatoria' });
  }
  const fr =
    fecha_registro && String(fecha_registro).trim() ? String(fecha_registro).trim().slice(0, 10) : null;
  db.query(
    'UPDATE licencias_empleado SET carnet_identidad = ?, descripcion = ?, fecha_registro = ?, observaciones = ?, activo = ? WHERE id_licencia = ?',
    [
      String(carnet_identidad).trim(),
      String(descripcion).trim(),
      fr,
      observaciones != null && String(observaciones).trim() ? String(observaciones).trim() : null,
      activo ? 1 : 0,
      id_licencia,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-licencia-empleado/:id_licencia", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_licencia = req.params.id_licencia;
  db.query('DELETE FROM licencias_empleado WHERE id_licencia = ?', [id_licencia], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// RF16 — Marcar empleados inactivos (bajas) o reactivarlos (admin / rrhh)
app.post("/empleado-baja", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, fecha_baja, motivo_baja } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  const fecha =
    fecha_baja && String(fecha_baja).trim()
      ? String(fecha_baja).trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const motivo = motivo_baja != null && String(motivo_baja).trim() ? String(motivo_baja).trim() : null;
  db.query(
    'UPDATE empleados SET activo = 0, fecha_baja = ?, motivo_baja = ? WHERE carnet_identidad = ?',
    [fecha, motivo, carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }
      res.json({ message: 'Baja registrada: empleado marcado como inactivo' });
    }
  );
});

// Corregir fecha/motivo de baja (solo empleados ya inactivos)
app.put("/empleado-baja", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, fecha_baja, motivo_baja } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  const fecha =
    fecha_baja && String(fecha_baja).trim() ? String(fecha_baja).trim().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const motivo = motivo_baja != null && String(motivo_baja).trim() ? String(motivo_baja).trim() : null;
  db.query('SELECT COALESCE(activo, 1) AS a FROM empleados WHERE carnet_identidad = ?', [carnet], (selErr, rows) => {
    if (selErr) {
      console.log(selErr);
      return res.status(500).send(selErr);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    if (Number(rows[0].a) === 1) {
      return res.status(400).json({ message: 'Solo se edita el detalle de baja de empleados inactivos' });
    }
    db.query(
      'UPDATE empleados SET fecha_baja = ?, motivo_baja = ? WHERE carnet_identidad = ? AND COALESCE(activo,0) = 0',
      [fecha, motivo, carnet],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'No se pudo actualizar' });
        }
        res.json({ message: 'Datos de baja actualizados' });
      }
    );
  });
});

app.post("/empleado-reactivar", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  db.query(
    'UPDATE empleados SET activo = 1, fecha_baja = NULL, motivo_baja = NULL WHERE carnet_identidad = ?',
    [carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }
      return res.json({ message: 'Empleado reactivado' });
    }
  );
});

// RF17 — Reporte de personal por departamento y/o cargo
app.get("/reporte-personal", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  const solo = req.query.solo_activos;
  const soloActivos = solo !== '0' && solo !== 'false';
  const dep = req.query.departamento != null ? String(req.query.departamento).trim() : '';
  const puestoF = req.query.puesto != null ? String(req.query.puesto).trim() : '';
  let sql = `${SQL_EMPLEADOS_LISTADO_BASE} WHERE 1=1`;
  const params = [];
  if (soloActivos) sql += ' AND COALESCE(e.activo, 1) = 1';
  if (dep) {
    sql += ' AND d.nombre LIKE ?';
    params.push(`%${dep}%`);
  }
  if (puestoF) {
    sql += ' AND e.puesto LIKE ?';
    params.push(`%${puestoF}%`);
  }
  sql += ' ORDER BY e.apellidos, e.nombre';
  db.query(sql, params, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// RF18 — Cambio de cargo (puesto) con registro en historial_laboral (salario: tabla `salarios`)
app.post("/empleado-cambio-cargo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, puesto_nuevo } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  if (puesto_nuevo == null || !String(puesto_nuevo).trim()) {
    return res.status(400).json({ message: 'Debe indicar el nuevo puesto o cargo' });
  }
  const carnet = String(carnet_identidad).trim();
  const nuevoPuesto = String(puesto_nuevo).trim();

  const normTxt = (v) => (v == null || v === '' ? '' : String(v).trim());

  db.query('SELECT puesto FROM empleados WHERE carnet_identidad = ?', [carnet], (selErr, rows) => {
    if (selErr) {
      console.log(selErr);
      return res.status(500).send(selErr);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    const prev = rows[0];
    if (normTxt(prev.puesto) === normTxt(nuevoPuesto)) {
      return res.status(400).json({ message: 'No hay cambios respecto al puesto actual' });
    }

    const cambios = [['puesto', normTxt(prev.puesto) || null, normTxt(nuevoPuesto) || null]];

    const finish = (updErr, result) => {
      if (updErr) {
        console.log(updErr);
        return res.status(500).send(updErr);
      }
      const placeholders = cambios.map(() => '(?, ?, ?, ?)').join(', ');
      const flat = cambios.flatMap(([tipo, ant, nue]) => [carnet, tipo, ant, nue]);
      db.query(
        `INSERT INTO historial_laboral (carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo) VALUES ${placeholders}`,
        flat,
        (insErr) => {
          if (insErr) {
            console.log(insErr);
            return res.status(500).send(insErr);
          }
          res.json({ message: 'Cambio de cargo registrado', affectedRows: result.affectedRows });
        }
      );
    };

    db.query('UPDATE empleados SET puesto = ? WHERE carnet_identidad = ?', [nuevoPuesto, carnet], finish);
  });
});

// RF21 / RF22 — Producción: histórico de cambios y responsables (email del JWT)
const emailUsuario = (req) => (req.user && req.user.email ? String(req.user.email) : null);

function fechaDatoProduccion(row) {
  if (!row || row.fecha == null) return null;
  if (row.fecha instanceof Date) return row.fecha.toISOString().slice(0, 10);
  const s = String(row.fecha);
  return s.split('T')[0].split(' ')[0];
}

function archivarProduccion(fuente, accion, req, fila, callback) {
  const fd = fechaDatoProduccion(fila);
  if (!fd) return callback(new Error('Sin fecha en registro'));
  let datosJson;
  try {
    datosJson = JSON.stringify(fila, (k, v) => {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return v;
    });
  } catch (e) {
    datosJson = '{}';
  }
  db.query(
    'INSERT INTO produccion_historico (fuente, fecha_dato, accion, datos_json, usuario_email) VALUES (?, ?, ?, ?, ?)',
    [fuente, fd, accion, datosJson, emailUsuario(req)],
    callback
  );
}

// RF21 — Consulta de histórico archivado (actualización / eliminación)
app.get('/produccion-historico', verificarToken, autorizarRol(['estadistica', 'director']), (req, res) => {
  let sql = `SELECT id, fuente, fecha_dato, accion, usuario_email,
    DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en,
    datos_json
    FROM produccion_historico WHERE 1=1`;
  const params = [];
  if (req.query.fuente) {
    sql += ' AND fuente = ?';
    params.push(req.query.fuente);
  }
  if (req.query.desde) {
    sql += ' AND fecha_dato >= ?';
    params.push(req.query.desde);
  }
  if (req.query.hasta) {
    sql += ' AND fecha_dato <= ?';
    params.push(req.query.hasta);
  }
  sql += ' ORDER BY creado_en DESC, id DESC LIMIT 500';
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const out = rows.map((r) => {
      let datos = null;
      try {
        datos = JSON.parse(r.datos_json);
      } catch (_) {}
      return { ...r, datos };
    });
    res.send(out);
  });
});

// RF23 — Totales de personal agrupados por departamento (vista global RRHH)
app.get('/reporte-consolidado-departamentos', verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  const sql = `SELECT 
      COALESCE(NULLIF(TRIM(d.nombre), ''), '(Sin departamento)') AS departamento,
      SUM(CASE WHEN COALESCE(e.activo, 1) = 1 THEN 1 ELSE 0 END) AS empleados_activos,
      SUM(CASE WHEN COALESCE(e.activo, 1) = 0 THEN 1 ELSE 0 END) AS empleados_inactivos,
      COUNT(*) AS total_empleados,
      SUM(CASE WHEN COALESCE(e.activo, 1) = 1 THEN IFNULL(s.salario_neto + 0, 0) ELSE 0 END) AS masa_salarial_activos
    FROM empleados e
    LEFT JOIN departamentos d ON d.id_departamento = e.id_departamento
    LEFT JOIN salarios s ON s.id_tabla = e.carnet_identidad
    GROUP BY COALESCE(NULLIF(TRIM(d.nombre), ''), '(Sin departamento)')
    ORDER BY departamento`;
  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});












//Sacrificio vacuno:

// ==================== RUTAS PARA SACRIFICIO VACUNO ====================
// (protegidas: solo admin y produccion)


// ==================== RUTAS PARA SACRIFICIO VACUNO ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros (ordenados por fecha) formateando la fecha como YYYY-MM-DD
app.get("/sacrificio", verificarToken, autorizarRol(['estadistica', 'director']), (req, res) => {
    // Usamos DATE_FORMAT para que la fecha venga como string sin hora
    db.query(
        `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, 
                terneras_Cbz_sal, terneras_Kg_sal, terneras_Cbz_tur, terneras_Kg_tur,
                terneras_Cbz_in, terneras_Kg_in, terneras_Cbz_p, terneras_Kg_p,
                terneras_Cbz_t, terneras_Kg_t, terneras_Cbz_m, terneras_Kg_m,
                terneras_Cab_se, terneras_Kg_se, terneras_Cbz_sc, terneras_Kg_sc,
                terneras_Cbz_st, terneras_Tm_st,
                aniojas_Cbz_sal, aniojas_Kg_sal, aniojas_Cbz_tur, aniojas_Kg_tur,
                aniojas_Cbz_in, aniojas_Kg_in, aniojas_Cbz_p, aniojas_Kg_p,
                aniojas_Cbz_t, aniojas_Kg_t, aniojas_Cbz_m, aniojas_Kg_m,
                aniojas_Cab_se, aniojas_Kg_se, aniojas_Cbz_sc, aniojas_Kg_sc,
                aniojas_Cbz_st, aniojas_Tm_st,
                novillas_Cbz_sal, novillas_Kg_sal, novillas_Cbz_tur, novillas_Kg_tur,
                novillas_Cbz_in, novillas_Kg_in, novillas_Cbz_p, novillas_Kg_p,
                novillas_Cbz_t, novillas_Kg_t, novillas_Cbz_m, novillas_Kg_m,
                novillas_Cab_se, novillas_Kg_se, novillas_Cbz_sc, novillas_Kg_sc,
                novillas_Cbz_st, novillas_Tm_st,
                vacas_Cbz_sal, vacas_Kg_sal, vacas_Cbz_tur, vacas_Kg_tur,
                vacas_Cbz_in, vacas_Kg_in, vacas_Cbz_p, vacas_Kg_p,
                vacas_Cbz_t, vacas_Kg_t, vacas_Cbz_m, vacas_Kg_m,
                vacas_Cab_se, vacas_Kg_se, vacas_Cbz_sc, vacas_Kg_sc,
                vacas_Cbz_st, vacas_Tm_st,
                total1_Cbz_sal, total1_Kg_sal, total1_Cbz_tur, total1_Kg_tur,
                total1_Cbz_in, total1_Kg_in, total1_Cbz_p, total1_Kg_p,
                total1_Cbz_t, total1_Kg_t, total1_Cbz_m, total1_Kg_m,
                total1_Cab_se, total1_Kg_se, total1_Cbz_sc, total1_Kg_sc,
                total1_Cbz_st, total1_Tm_st,
                terneros_Cbz_sal, terneros_Kg_sal, terneros_Cbz_tur, terneros_Kg_tur,
                terneros_Cbz_in, terneros_Kg_in, terneros_Cbz_p, terneros_Kg_p,
                terneros_Cbz_t, terneros_Kg_t, terneros_Cbz_m, terneros_Kg_m,
                terneros_Cab_se, terneros_Kg_se, terneros_Cbz_sc, terneros_Kg_sc,
                terneros_Cbz_st, terneros_Tm_st,
                aniojos_Cbz_sal, aniojos_Kg_sal, aniojos_Cbz_tur, aniojos_Kg_tur,
                aniojos_Cbz_in, aniojos_Kg_in, aniojos_Cbz_p, aniojos_Kg_p,
                aniojos_Cbz_t, aniojos_Kg_t, aniojos_Cbz_m, aniojos_Kg_m,
                aniojos_Cab_se, aniojos_Kg_se, aniojos_Cbz_sc, aniojos_Kg_sc,
                aniojos_Cbz_st, aniojos_Tm_st,
                novillos_Cbz_sal, novillos_Kg_sal, novillos_Cbz_tur, novillos_Kg_tur,
                novillos_Cbz_in, novillos_Kg_in, novillos_Cbz_p, novillos_Kg_p,
                novillos_Cbz_t, novillos_Kg_t, novillos_Cbz_m, novillos_Kg_m,
                novillos_Cab_se, novillos_Kg_se, novillos_Cbz_sc, novillos_Kg_sc,
                novillos_Cbz_st, novillos_Tm_st,
                bueyes_Cbz_sal, bueyes_Kg_sal, bueyes_Cbz_tur, bueyes_Kg_tur,
                bueyes_Cbz_in, bueyes_Kg_in, bueyes_Cbz_p, bueyes_Kg_p,
                bueyes_Cbz_t, bueyes_Kg_t, bueyes_Cbz_m, bueyes_Kg_m,
                bueyes_Cab_se, bueyes_Kg_se, bueyes_Cbz_sc, bueyes_Kg_sc,
                bueyes_Cbz_st, bueyes_Tm_st,
                total2_Cbz_sal, total2_Kg_sal, total2_Cbz_tur, total2_Kg_tur,
                total2_Cbz_in, total2_Kg_in, total2_Cbz_p, total2_Kg_p,


                total2_Cbz_t, total2_Kg_t, total2_Cbz_m, total2_Kg_m,
                total2_Cab_se, total2_Kg_se, total2_Cbz_sc, total2_Kg_sc,
                total2_Cbz_st, total2_Tm_st,
                creado_por, actualizado_por
         FROM sacrificio_vacuno 
         ORDER BY fecha DESC`,
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.send(result);
        }
    );
});

// Crear un nuevo registro (fecha única) — RF22 responsables
app.post("/create-sacrificio", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const v = validarSacrificio(req.body);
    if (!v.ok) {
        return res.status(400).json({ message: v.message, campo: v.campo });
    }
    const email = emailUsuario(req);
    const fields = { ...v.data };
    delete fields.creado_por;
    delete fields.actualizado_por;
    if (email) {
        fields.creado_por = email;
        fields.actualizado_por = email;
    }
    const columns = Object.keys(fields).join(', ');
    const values = Object.values(fields);
    const placeholders = values.map(() => '?').join(', ');

    db.query(
        `INSERT INTO sacrificio_vacuno (${columns}) VALUES (${placeholders})`,
        values,
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar — RF21 archiva versión anterior; RF22 actualiza responsable
app.put("/update-sacrificio/:fecha", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const fecha = req.params.fecha;
    const v = validarSacrificio(req.body);
    if (!v.ok) {
        return res.status(400).json({ message: v.message, campo: v.campo });
    }
    const email = emailUsuario(req);

    db.query('SELECT * FROM sacrificio_vacuno WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('sacrificio', 'actualizacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            const fields = { ...v.data };
            delete fields.fecha;
            delete fields.creado_por;
            if (anterior.creado_por != null && anterior.creado_por !== '') {
                fields.creado_por = anterior.creado_por;
            } else if (email) {
                fields.creado_por = email;
            }
            if (email) fields.actualizado_por = email;

            const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
            const values = [...Object.values(fields), fecha];

            db.query(
                `UPDATE sacrificio_vacuno SET ${updates} WHERE fecha = ?`,
                values,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

// Eliminar — RF21 archiva antes de borrar
app.delete("/delete-sacrificio/:fecha", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const fecha = req.params.fecha;
    db.query('SELECT * FROM sacrificio_vacuno WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('sacrificio', 'eliminacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            db.query(
                `DELETE FROM sacrificio_vacuno WHERE fecha = ?`,
                [fecha],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

















// ==================== RUTAS PARA MATADERO VIVO ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros (ordenados por fecha)
app.get("/matadero", verificarToken, autorizarRol(['estadistica', 'director']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha FROM matadero_vivo ORDER BY fecha DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro — RF22
app.post("/create-matadero", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const v = validarMatadero(req.body);
    if (!v.ok) {
        return res.status(400).json({ message: v.message, campo: v.campo });
    }
    const email = emailUsuario(req);
    const fields = { ...v.data };
    delete fields.creado_por;
    delete fields.actualizado_por;
    if (email) {
        fields.creado_por = email;
        fields.actualizado_por = email;
    }
    const columns = Object.keys(fields).join(', ');
    const values = Object.values(fields);
    const placeholders = values.map(() => '?').join(', ');

    db.query(
        `INSERT INTO matadero_vivo (${columns}) VALUES (${placeholders})`,
        values,
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar — RF21 + RF22
app.put("/update-matadero/:fecha", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const fecha = req.params.fecha;
    const v = validarMatadero(req.body);
    if (!v.ok) {
        return res.status(400).json({ message: v.message, campo: v.campo });
    }
    const email = emailUsuario(req);

    db.query('SELECT * FROM matadero_vivo WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('matadero', 'actualizacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            const fields = { ...v.data };
            delete fields.fecha;
            delete fields.creado_por;
            if (anterior.creado_por != null && anterior.creado_por !== '') {
                fields.creado_por = anterior.creado_por;
            } else if (email) {
                fields.creado_por = email;
            }
            if (email) fields.actualizado_por = email;

            const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
            const values = [...Object.values(fields), fecha];

            db.query(
                `UPDATE matadero_vivo SET ${updates} WHERE fecha = ?`,
                values,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

// Eliminar — RF21
app.delete("/delete-matadero/:fecha", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const fecha = req.params.fecha;
    db.query('SELECT * FROM matadero_vivo WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('matadero', 'eliminacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            db.query(
                `DELETE FROM matadero_vivo WHERE fecha = ?`,
                [fecha],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});














// ==================== RUTAS PARA LECHE ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros (ordenados por fecha)
app.get("/leche", verificarToken, autorizarRol(['estadistica', 'director']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha FROM leche ORDER BY fecha DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro — RF22
app.post("/create-leche", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const v = validarLeche(req.body);
    if (!v.ok) {
        return res.status(400).json({ message: v.message, campo: v.campo });
    }
    const email = emailUsuario(req);
    const fields = { ...v.data };
    delete fields.creado_por;
    delete fields.actualizado_por;
    if (email) {
        fields.creado_por = email;
        fields.actualizado_por = email;
    }
    const columns = Object.keys(fields).join(', ');
    const values = Object.values(fields);
    const placeholders = values.map(() => '?').join(', ');

    db.query(
        `INSERT INTO leche (${columns}) VALUES (${placeholders})`,
        values,
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar — RF21 + RF22
app.put("/update-leche/:fecha", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const fecha = req.params.fecha;
    const v = validarLeche(req.body);
    if (!v.ok) {
        return res.status(400).json({ message: v.message, campo: v.campo });
    }
    const email = emailUsuario(req);

    db.query('SELECT * FROM leche WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('leche', 'actualizacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            const fields = { ...v.data };
            delete fields.fecha;
            delete fields.creado_por;
            if (anterior.creado_por != null && anterior.creado_por !== '') {
                fields.creado_por = anterior.creado_por;
            } else if (email) {
                fields.creado_por = email;
            }
            if (email) fields.actualizado_por = email;

            const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
            const values = [...Object.values(fields), fecha];

            db.query(
                `UPDATE leche SET ${updates} WHERE fecha = ?`,
                values,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

// Eliminar — RF21
app.delete("/delete-leche/:fecha", verificarToken, autorizarRol(['estadistica']), (req, res) => {
    const fecha = req.params.fecha;
    db.query('SELECT * FROM leche WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('leche', 'eliminacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            db.query(
                `DELETE FROM leche WHERE fecha = ?`,
                [fecha],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});













// ==================== RUTAS PARA ASISTENCIAS ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros
app.get("/asistencias", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM asistencias ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-asistencia", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, codigo_asistencia, desc_causas, horas_trabajadas } = req.body;
    db.query(
        'INSERT INTO asistencias (id_tabla, codigo_asistencia, desc_causas, horas_trabajadas) VALUES (?, ?, ?, ?)',
        [id_tabla, codigo_asistencia, desc_causas, horas_trabajadas],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-asistencia/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { codigo_asistencia, desc_causas, horas_trabajadas } = req.body;
    db.query(
        'UPDATE asistencias SET codigo_asistencia = ?, desc_causas = ?, horas_trabajadas = ? WHERE id_tabla = ?',
        [codigo_asistencia, desc_causas, horas_trabajadas, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-asistencia/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM asistencias WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});













// ==================== RUTAS PARA CERTIFICACIONES ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/certificaciones", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM certificaciones ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-certificacion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, certificacion } = req.body;
    db.query(
        'INSERT INTO certificaciones (id_tabla, certificacion) VALUES (?, ?)',
        [id_tabla, certificacion],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-certificacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { certificacion } = req.body;
    db.query(
        'UPDATE certificaciones SET certificacion = ? WHERE id_tabla = ?',
        [certificacion, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-certificacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM certificaciones WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});






// ==================== RUTAS PARA CURSOS ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/cursos", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fech_fin_curso, "%Y-%m-%d") as fech_fin_curso FROM cursos ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-curso", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, curso, descr, logrado, fech_fin_curso } = req.body;
    db.query(
        'INSERT INTO cursos (id_tabla, curso, descr, logrado, fech_fin_curso) VALUES (?, ?, ?, ?, ?)',
        [id_tabla, curso, descr, logrado ? 1 : 0, fech_fin_curso],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-curso/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { curso, descr, logrado, fech_fin_curso } = req.body;
    db.query(
        'UPDATE cursos SET curso = ?, descr = ?, logrado = ?, fech_fin_curso = ? WHERE id_tabla = ?',
        [curso, descr, logrado ? 1 : 0, fech_fin_curso, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-curso/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM cursos WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});



// ==================== RUTAS PARA EVALCAPACITACION ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/evalcapacitacion", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM evalcapacitacion ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-evalcapacitacion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, evaluacion, descr } = req.body;
    db.query(
        'INSERT INTO evalcapacitacion (id_tabla, evaluacion, descr) VALUES (?, ?, ?)',
        [id_tabla, evaluacion, descr],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-evalcapacitacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { evaluacion, descr } = req.body;
    db.query(
        'UPDATE evalcapacitacion SET evaluacion = ?, descr = ? WHERE id_tabla = ?',
        [evaluacion, descr, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-evalcapacitacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM evalcapacitacion WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});






// ==================== RUTAS PARA EVALUACIONES ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/evaluaciones", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM evaluaciones ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-evaluacion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, evaluacion, descr } = req.body;
    db.query(
        'INSERT INTO evaluaciones (id_tabla, evaluacion, descr) VALUES (?, ?, ?)',
        [id_tabla, evaluacion, descr],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-evaluacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { evaluacion, descr } = req.body;
    db.query(
        'UPDATE evaluaciones SET evaluacion = ?, descr = ? WHERE id_tabla = ?',
        [evaluacion, descr, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-evaluacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM evaluaciones WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});






// ==================== RUTAS PARA OBJETIVOS ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/objetivos", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha_logrado, "%Y-%m-%d") as fecha_logrado FROM objetivos ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-objetivo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, objetivo, descr, logrado, fecha_logrado } = req.body;
    db.query(
        'INSERT INTO objetivos (id_tabla, objetivo, descr, logrado, fecha_logrado) VALUES (?, ?, ?, ?, ?)',
        [id_tabla, objetivo, descr, logrado ? 1 : 0, fecha_logrado || null],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-objetivo/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { objetivo, descr, logrado, fecha_logrado } = req.body;
    db.query(
        'UPDATE objetivos SET objetivo = ?, descr = ?, logrado = ?, fecha_logrado = ? WHERE id_tabla = ?',
        [objetivo, descr, logrado ? 1 : 0, fecha_logrado || null, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-objetivo/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM objetivos WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});













// ==================== RUTAS PARA SALARIOS ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/salarios", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM salarios ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-salario", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, salario_neto } = req.body;
    db.query(
        'INSERT INTO salarios (id_tabla, salario_neto) VALUES (?, ?)',
        [id_tabla, salario_neto],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-salario/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { salario_neto } = req.body;
    db.query(
        'UPDATE salarios SET salario_neto = ? WHERE id_tabla = ?',
        [salario_neto, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-salario/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM salarios WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});















// ==================== RUTAS PARA SEGSEGURIDAD ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/segseguridad", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM segseguridad ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-segseguridad", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres } = req.body;
    db.query(
        'INSERT INTO segseguridad (id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-segseguridad/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres } = req.body;
    db.query(
        'UPDATE segseguridad SET cant_accuno = ?, desc_uno = ?, cant_accdos = ?, desc_dos = ?, cant_acctres = ?, desc_tres = ? WHERE id_tabla = ?',
        [cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-segseguridad/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM segseguridad WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});











// ==================== RUTAS PARA SEGURIDAD ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/seguridad", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM seguridad ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-seguridad", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, acceso } = req.body;
    db.query(
        'INSERT INTO seguridad (id_tabla, acceso) VALUES (?, ?)',
        [id_tabla, acceso],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-seguridad/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { acceso } = req.body;
    db.query(
        'UPDATE seguridad SET acceso = ? WHERE id_tabla = ?',
        [acceso, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-seguridad/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM seguridad WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});


// ==================== RUTAS PARA CARGOS ====================
  // (protegidas: solo admin y rrhh)

  // Obtener todos los cargos (ordenados por id_cargo)
  app.get("/cargos", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT * FROM cargos ORDER BY id_cargo', (err, result) => {
      if (err) return res.status(500).send(err);
      res.send(result);
    });
  });

  // Crear un nuevo cargo
  app.post("/create-cargo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { nombre, descripcion, salario_base, departamento } = req.body;
    db.query(
      'INSERT INTO cargos (nombre, descripcion, salario_base, departamento) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, salario_base, departamento],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

  // Actualizar cargo por id_cargo
  app.put("/update-cargo/:id_cargo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_cargo = req.params.id_cargo;
    const { nombre, descripcion, salario_base, departamento, activo } = req.body;
    db.query(
      'UPDATE cargos SET nombre = ?, descripcion = ?, salario_base = ?, departamento = ?, activo = ? WHERE id_cargo = ?',
      [nombre, descripcion, salario_base, departamento, activo ? 1 : 0, id_cargo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

  // Eliminar cargo por id_cargo
app.delete("/delete-cargo/:id_cargo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_cargo = req.params.id_cargo;
    db.query(
      'DELETE FROM cargos WHERE id_cargo = ?',
      [id_cargo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

// ==================== RUTAS PARA DEPARTAMENTOS Y ASIGNACIÓN DE EMPLEADOS (RF15) ====================
// (protegidas: admin y rrhh)

app.get("/departamentos", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT d.id_departamento, d.nombre, d.descripcion, d.id_padre, d.activo,
            p.nombre AS nombre_padre,
            (SELECT COUNT(*) FROM empleados e WHERE e.id_departamento = d.id_departamento) AS num_empleados
     FROM departamentos d
     LEFT JOIN departamentos p ON p.id_departamento = d.id_padre
     ORDER BY d.nombre`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-departamento", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { nombre, descripcion, id_padre, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del departamento es obligatorio' });
  }
  const padre =
    id_padre === '' || id_padre === undefined || id_padre === null ? null : Number(id_padre);
  const padreFinal = padre != null && !Number.isNaN(padre) ? padre : null;
  db.query(
    'INSERT INTO departamentos (nombre, descripcion, id_padre, activo) VALUES (?, ?, ?, ?)',
    [String(nombre).trim(), descripcion || null, padreFinal, activo ? 1 : 0],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Ya existe un departamento con ese nombre' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-departamento/:id_departamento", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_departamento = req.params.id_departamento;
  const { nombre, descripcion, id_padre, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del departamento es obligatorio' });
  }
  const padre =
    id_padre === '' || id_padre === undefined || id_padre === null ? null : Number(id_padre);
  const padreFinal = padre != null && !Number.isNaN(padre) ? padre : null;
  if (padreFinal != null && String(padreFinal) === String(id_departamento)) {
    return res.status(400).json({ message: 'Un departamento no puede ser su propio superior' });
  }
  const nombreTrim = String(nombre).trim();
  db.query(
    'UPDATE departamentos SET nombre = ?, descripcion = ?, id_padre = ?, activo = ? WHERE id_departamento = ?',
    [nombreTrim, descripcion || null, padreFinal, activo ? 1 : 0, id_departamento],
    (err) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Ya existe un departamento con ese nombre' });
        }
        return res.status(500).send(err);
      }
      res.json({ message: 'Departamento actualizado' });
    }
  );
});

app.delete("/delete-departamento/:id_departamento", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_departamento = req.params.id_departamento;
  db.query('UPDATE departamentos SET id_padre = NULL WHERE id_padre = ?', [id_departamento], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    db.query('UPDATE empleados SET id_departamento = NULL WHERE id_departamento = ?', [id_departamento], (err2) => {
      if (err2) {
        console.log(err2);
        return res.status(500).send(err2);
      }
      db.query('DELETE FROM departamentos WHERE id_departamento = ?', [id_departamento], (err3, result) => {
        if (err3) {
          console.log(err3);
          return res.status(500).send(err3);
        }
        res.send(result);
      });
    });
  });
});

app.post("/asignar-empleado-departamento", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, id_departamento } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  const sinDepto =
    id_departamento === '' || id_departamento === undefined || id_departamento === null;
  if (sinDepto) {
    db.query('UPDATE empleados SET id_departamento = NULL WHERE carnet_identidad = ?', [carnet], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.json({ message: 'Empleado sin departamento asignado', result });
    });
    return;
  }
  const idDepto = Number(id_departamento);
  if (Number.isNaN(idDepto)) {
    return res.status(400).json({ message: 'Identificador de departamento no válido' });
  }
  db.query(
    `UPDATE empleados e
     INNER JOIN departamentos d ON d.id_departamento = ?
     SET e.id_departamento = d.id_departamento
     WHERE e.carnet_identidad = ?`,
    [idDepto, carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El departamento no existe' });
        }
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: 'No se encontró el empleado o el departamento' });
      }
      res.json({ message: 'Empleado asignado al departamento' });
    }
  );
});

// ==================== RUTAS PARA CERTIFICADOS MEDICOS ====================
// (protegidas: admin, rrhh, produccion)
app.get("/certificados-medicos", verificarToken, autorizarRol(['rrhh', 'estadistica', 'director']), (req, res) => {
  db.query('SELECT * FROM cert_medicos ORDER BY id_cert_medico', (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
});

app.post("/create-cert-medico", verificarToken, autorizarRol(['rrhh', 'estadistica']), (req, res) => {
  const { carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion } = req.body;
  db.query(
    'INSERT INTO cert_medicos (carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
    [carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.put("/update-cert-medico/:id_cert_medico", verificarToken, autorizarRol(['rrhh', 'estadistica']), (req, res) => {
  const id_cert_medico = req.params.id_cert_medico;
  const { carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion, activo } = req.body;
  db.query(
    'UPDATE cert_medicos SET carnet_identidad = ?, fecha_emision = ?, fecha_vencimiento = ?, dias_licencia = ?, medico_nombre = ?, descripcion = ?, activo = ? WHERE id_cert_medico = ?',
    [carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion, activo ? 1 : 0, id_cert_medico],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-cert-medico/:id_cert_medico", verificarToken, autorizarRol(['rrhh', 'estadistica']), (req, res) => {
  const id_cert_medico = req.params.id_cert_medico;
  db.query(
    'DELETE FROM cert_medicos WHERE id_cert_medico = ?',
    [id_cert_medico],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

// ==================== RUTAS PARA VACACIONES ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/vacaciones", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha_inicio, "%Y-%m-%d") as fecha_inicio, DATE_FORMAT(fecha_fin, "%Y-%m-%d") as fecha_fin FROM vacaciones ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-vacacion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const { id_tabla, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones } = req.body;
    db.query(
        'INSERT INTO vacaciones (id_tabla, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_tabla, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado ? 1 : 0, observaciones],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-vacacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones } = req.body;
    db.query(
        'UPDATE vacaciones SET fecha_inicio = ?, fecha_fin = ?, dias_totales = ?, motivo = ?, aprobado = ?, observaciones = ? WHERE id_tabla = ?',
        [fecha_inicio, fecha_fin, dias_totales, motivo, aprobado ? 1 : 0, observaciones, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-vacacion/:id_tabla", verificarToken, autorizarRol(['rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM vacaciones WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// ==================== RUTAS PARA TURNOS DE TRABAJO ====================
// (protegidas: admin y rrhh)

app.get("/turnos-trabajo", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT t.id_turno, t.carnet_identidad, t.nombre_turno,
            DATE_FORMAT(t.hora_entrada, '%H:%i') AS hora_entrada,
            DATE_FORMAT(t.hora_salida, '%H:%i') AS hora_salida,
            t.dias_aplicacion, t.horas_diarias, t.observaciones, t.activo,
            e.nombre, e.apellidos
     FROM turnos_trabajo t
     INNER JOIN empleados e ON e.carnet_identidad = t.carnet_identidad
     ORDER BY t.id_turno DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-turno", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, nombre_turno, hora_entrada, hora_salida, dias_aplicacion, horas_diarias, observaciones, activo } = req.body;
  if (!carnet_identidad || !nombre_turno || !hora_entrada || !hora_salida) {
    return res.status(400).json({ message: 'Carnet, nombre del turno, hora de entrada y hora de salida son obligatorios' });
  }
  const dias = dias_aplicacion && String(dias_aplicacion).trim() ? String(dias_aplicacion).trim() : 'Lunes a viernes';
  const horasD = horas_diarias === '' || horas_diarias == null ? null : Number(horas_diarias);
  db.query(
    'INSERT INTO turnos_trabajo (carnet_identidad, nombre_turno, hora_entrada, hora_salida, dias_aplicacion, horas_diarias, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [carnet_identidad, nombre_turno.trim(), hora_entrada, hora_salida, dias, Number.isNaN(horasD) ? null : horasD, observaciones || null, activo ? 1 : 0],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-turno/:id_turno", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_turno = req.params.id_turno;
  const { carnet_identidad, nombre_turno, hora_entrada, hora_salida, dias_aplicacion, horas_diarias, observaciones, activo } = req.body;
  if (!carnet_identidad || !nombre_turno || !hora_entrada || !hora_salida) {
    return res.status(400).json({ message: 'Carnet, nombre del turno, hora de entrada y hora de salida son obligatorios' });
  }
  const dias = dias_aplicacion && String(dias_aplicacion).trim() ? String(dias_aplicacion).trim() : 'Lunes a viernes';
  const horasD = horas_diarias === '' || horas_diarias == null ? null : Number(horas_diarias);
  db.query(
    'UPDATE turnos_trabajo SET carnet_identidad = ?, nombre_turno = ?, hora_entrada = ?, hora_salida = ?, dias_aplicacion = ?, horas_diarias = ?, observaciones = ?, activo = ? WHERE id_turno = ?',
    [carnet_identidad, nombre_turno.trim(), hora_entrada, hora_salida, dias, Number.isNaN(horasD) ? null : horasD, observaciones || null, activo ? 1 : 0, id_turno],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-turno/:id_turno", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_turno = req.params.id_turno;
  db.query('DELETE FROM turnos_trabajo WHERE id_turno = ?', [id_turno], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA GRUPOS DE TRABAJO Y ASISTENCIA GRUPAL ====================
// (protegidas: admin y rrhh)

app.get("/grupos-trabajo", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT g.id_grupo, g.nombre, g.descripcion, g.activo,
            (SELECT COUNT(*) FROM grupo_miembros m WHERE m.id_grupo = g.id_grupo) AS num_miembros
     FROM grupos_trabajo g
     ORDER BY g.id_grupo DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-grupo-trabajo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { nombre, descripcion, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del grupo es obligatorio' });
  }
  db.query(
    'INSERT INTO grupos_trabajo (nombre, descripcion, activo) VALUES (?, ?, ?)',
    [String(nombre).trim(), descripcion || null, activo ? 1 : 0],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-grupo-trabajo/:id_grupo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  const { nombre, descripcion, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del grupo es obligatorio' });
  }
  db.query(
    'UPDATE grupos_trabajo SET nombre = ?, descripcion = ?, activo = ? WHERE id_grupo = ?',
    [String(nombre).trim(), descripcion || null, activo ? 1 : 0, id_grupo],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-grupo-trabajo/:id_grupo", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  db.query('DELETE FROM grupos_trabajo WHERE id_grupo = ?', [id_grupo], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

app.get("/grupo-trabajo/:id_grupo/miembros", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  db.query(
    `SELECT m.carnet_identidad, e.nombre, e.apellidos
     FROM grupo_miembros m
     INNER JOIN empleados e ON e.carnet_identidad = m.carnet_identidad
     WHERE m.id_grupo = ?
     ORDER BY e.apellidos, e.nombre`,
    [id_grupo],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/grupo-trabajo/:id_grupo/miembros", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  const { carnet_identidad } = req.body;
  if (!carnet_identidad) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  db.query(
    'INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (?, ?)',
    [id_grupo, String(carnet_identidad).trim()],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'El empleado ya pertenece a este grupo' });
        }
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'Carnet o grupo no válido' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.delete("/grupo-trabajo/:id_grupo/miembros/:carnet_identidad", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { id_grupo, carnet_identidad } = req.params;
  db.query(
    'DELETE FROM grupo_miembros WHERE id_grupo = ? AND carnet_identidad = ?',
    [id_grupo, carnet_identidad],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.get("/asistencia-grupal", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT a.id_asistencia, a.id_grupo, DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
            a.miembros_presentes, a.miembros_total, a.observaciones, g.nombre AS nombre_grupo
     FROM asistencia_grupal a
     INNER JOIN grupos_trabajo g ON g.id_grupo = a.id_grupo
     ORDER BY a.fecha DESC, a.id_asistencia DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-asistencia-grupal", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { id_grupo, fecha, miembros_presentes, observaciones } = req.body;
  if (!id_grupo || !fecha) {
    return res.status(400).json({ message: 'Grupo y fecha son obligatorios' });
  }
  db.query('SELECT COUNT(*) AS c FROM grupo_miembros WHERE id_grupo = ?', [id_grupo], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const total = rows[0].c;
    if (total === 0) {
      return res.status(400).json({ message: 'El grupo no tiene miembros; agregue integrantes antes de registrar asistencia' });
    }
    let presentes = miembros_presentes;
    if (presentes === '' || presentes == null) presentes = total;
    presentes = parseInt(presentes, 10);
    if (Number.isNaN(presentes) || presentes < 0 || presentes > total) {
      return res.status(400).json({ message: `Los presentes deben estar entre 0 y ${total} (miembros del grupo)` });
    }
    db.query(
      'INSERT INTO asistencia_grupal (id_grupo, fecha, miembros_presentes, miembros_total, observaciones) VALUES (?, ?, ?, ?, ?)',
      [id_grupo, fecha, presentes, total, observaciones || null],
      (insErr, insRes) => {
        if (insErr) {
          console.log(insErr);
          if (insErr.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un registro de asistencia para ese grupo en esa fecha' });
          }
          return res.status(500).send(insErr);
        }
        res.status(201).send(insRes);
      }
    );
  });
});

app.put("/update-asistencia-grupal/:id_asistencia", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_asistencia = req.params.id_asistencia;
  const { id_grupo, fecha, miembros_presentes, observaciones } = req.body;
  if (!id_grupo || !fecha) {
    return res.status(400).json({ message: 'Grupo y fecha son obligatorios' });
  }
  db.query('SELECT COUNT(*) AS c FROM grupo_miembros WHERE id_grupo = ?', [id_grupo], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const total = rows[0].c;
    if (total === 0) {
      return res.status(400).json({ message: 'El grupo no tiene miembros' });
    }
    let presentes = miembros_presentes;
    if (presentes === '' || presentes == null) presentes = total;
    presentes = parseInt(presentes, 10);
    if (Number.isNaN(presentes) || presentes < 0 || presentes > total) {
      return res.status(400).json({ message: `Los presentes deben estar entre 0 y ${total}` });
    }
    db.query(
      'UPDATE asistencia_grupal SET id_grupo = ?, fecha = ?, miembros_presentes = ?, miembros_total = ?, observaciones = ? WHERE id_asistencia = ?',
      [id_grupo, fecha, presentes, total, observaciones || null, id_asistencia],
      (upErr, upRes) => {
        if (upErr) {
          console.log(upErr);
          if (upErr.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe asistencia para ese grupo en esa fecha' });
          }
          return res.status(500).send(upErr);
        }
        res.send(upRes);
      }
    );
  });
});

app.delete("/delete-asistencia-grupal/:id_asistencia", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_asistencia = req.params.id_asistencia;
  db.query('DELETE FROM asistencia_grupal WHERE id_asistencia = ?', [id_asistencia], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA SANCIONES A EMPLEADOS ====================
// (protegidas: admin y rrhh)

app.get("/sanciones-empleado", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT s.id_sancion, s.carnet_identidad, s.tipo_sancion, s.motivo,
            DATE_FORMAT(s.fecha_aplicacion, '%Y-%m-%d') AS fecha_aplicacion,
            s.dias_suspension, s.observaciones, s.activo,
            e.nombre, e.apellidos
     FROM sanciones_empleado s
     INNER JOIN empleados e ON e.carnet_identidad = s.carnet_identidad
     ORDER BY s.fecha_aplicacion DESC, s.id_sancion DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-sancion-empleado", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, tipo_sancion, motivo, fecha_aplicacion, dias_suspension, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_sancion || !String(tipo_sancion).trim() || !motivo || !String(motivo).trim() || !fecha_aplicacion) {
    return res.status(400).json({ message: 'Carnet, tipo de sanción, motivo y fecha de aplicación son obligatorios' });
  }
  const dias = dias_suspension === '' || dias_suspension == null ? null : parseInt(dias_suspension, 10);
  const diasVal = Number.isNaN(dias) ? null : dias;
  db.query(
    'INSERT INTO sanciones_empleado (carnet_identidad, tipo_sancion, motivo, fecha_aplicacion, dias_suspension, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(tipo_sancion).trim(),
      String(motivo).trim(),
      fecha_aplicacion,
      diasVal,
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-sancion-empleado/:id_sancion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_sancion = req.params.id_sancion;
  const { carnet_identidad, tipo_sancion, motivo, fecha_aplicacion, dias_suspension, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_sancion || !String(tipo_sancion).trim() || !motivo || !String(motivo).trim() || !fecha_aplicacion) {
    return res.status(400).json({ message: 'Carnet, tipo de sanción, motivo y fecha de aplicación son obligatorios' });
  }
  const dias = dias_suspension === '' || dias_suspension == null ? null : parseInt(dias_suspension, 10);
  const diasVal = Number.isNaN(dias) ? null : dias;
  db.query(
    'UPDATE sanciones_empleado SET carnet_identidad = ?, tipo_sancion = ?, motivo = ?, fecha_aplicacion = ?, dias_suspension = ?, observaciones = ?, activo = ? WHERE id_sancion = ?',
    [
      String(carnet_identidad).trim(),
      String(tipo_sancion).trim(),
      String(motivo).trim(),
      fecha_aplicacion,
      diasVal,
      observaciones || null,
      activo ? 1 : 0,
      id_sancion,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-sancion-empleado/:id_sancion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_sancion = req.params.id_sancion;
  db.query('DELETE FROM sanciones_empleado WHERE id_sancion = ?', [id_sancion], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA RECONOCIMIENTOS A EMPLEADOS ====================
// (protegidas: admin y rrhh)

app.get("/reconocimientos-empleado", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT r.id_reconocimiento, r.carnet_identidad, r.tipo_reconocimiento, r.descripcion,
            DATE_FORMAT(r.fecha_otorgamiento, '%Y-%m-%d') AS fecha_otorgamiento,
            r.valor_estimulo, r.observaciones, r.activo,
            e.nombre, e.apellidos
     FROM reconocimientos_empleado r
     INNER JOIN empleados e ON e.carnet_identidad = r.carnet_identidad
     ORDER BY r.fecha_otorgamiento DESC, r.id_reconocimiento DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-reconocimiento-empleado", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, tipo_reconocimiento, descripcion, fecha_otorgamiento, valor_estimulo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_reconocimiento || !String(tipo_reconocimiento).trim() || !descripcion || !String(descripcion).trim() || !fecha_otorgamiento) {
    return res.status(400).json({ message: 'Carnet, tipo de reconocimiento, descripción y fecha de otorgamiento son obligatorios' });
  }
  const val = valor_estimulo === '' || valor_estimulo == null ? null : Number(valor_estimulo);
  const valorFinal = val != null && !Number.isNaN(val) ? val : null;
  db.query(
    'INSERT INTO reconocimientos_empleado (carnet_identidad, tipo_reconocimiento, descripcion, fecha_otorgamiento, valor_estimulo, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(tipo_reconocimiento).trim(),
      String(descripcion).trim(),
      fecha_otorgamiento,
      valorFinal,
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-reconocimiento-empleado/:id_reconocimiento", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_reconocimiento = req.params.id_reconocimiento;
  const { carnet_identidad, tipo_reconocimiento, descripcion, fecha_otorgamiento, valor_estimulo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_reconocimiento || !String(tipo_reconocimiento).trim() || !descripcion || !String(descripcion).trim() || !fecha_otorgamiento) {
    return res.status(400).json({ message: 'Carnet, tipo de reconocimiento, descripción y fecha de otorgamiento son obligatorios' });
  }
  const val = valor_estimulo === '' || valor_estimulo == null ? null : Number(valor_estimulo);
  const valorFinal = val != null && !Number.isNaN(val) ? val : null;
  db.query(
    'UPDATE reconocimientos_empleado SET carnet_identidad = ?, tipo_reconocimiento = ?, descripcion = ?, fecha_otorgamiento = ?, valor_estimulo = ?, observaciones = ?, activo = ? WHERE id_reconocimiento = ?',
    [
      String(carnet_identidad).trim(),
      String(tipo_reconocimiento).trim(),
      String(descripcion).trim(),
      fecha_otorgamiento,
      valorFinal,
      observaciones || null,
      activo ? 1 : 0,
      id_reconocimiento,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-reconocimiento-empleado/:id_reconocimiento", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_reconocimiento = req.params.id_reconocimiento;
  db.query('DELETE FROM reconocimientos_empleado WHERE id_reconocimiento = ?', [id_reconocimiento], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA JUBILACIONES Y RETIROS (RF14) ====================
// (protegidas: admin y rrhh)

app.get("/jubilaciones-empleado", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
  db.query(
    `SELECT j.id_jubilacion, j.carnet_identidad, j.tipo_salida,
            DATE_FORMAT(j.fecha_efectiva, '%Y-%m-%d') AS fecha_efectiva,
            j.motivo, j.observaciones, j.activo,
            e.nombre, e.apellidos
     FROM jubilaciones_empleado j
     INNER JOIN empleados e ON e.carnet_identidad = j.carnet_identidad
     ORDER BY j.fecha_efectiva DESC, j.id_jubilacion DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-jubilacion-empleado", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const { carnet_identidad, tipo_salida, fecha_efectiva, motivo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_salida || !String(tipo_salida).trim() || !fecha_efectiva || !motivo || !String(motivo).trim()) {
    return res.status(400).json({ message: 'Carnet, tipo de salida, fecha efectiva y motivo son obligatorios' });
  }
  db.query(
    'INSERT INTO jubilaciones_empleado (carnet_identidad, tipo_salida, fecha_efectiva, motivo, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(tipo_salida).trim(),
      fecha_efectiva,
      String(motivo).trim(),
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-jubilacion-empleado/:id_jubilacion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_jubilacion = req.params.id_jubilacion;
  const { carnet_identidad, tipo_salida, fecha_efectiva, motivo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_salida || !String(tipo_salida).trim() || !fecha_efectiva || !motivo || !String(motivo).trim()) {
    return res.status(400).json({ message: 'Carnet, tipo de salida, fecha efectiva y motivo son obligatorios' });
  }
  db.query(
    'UPDATE jubilaciones_empleado SET carnet_identidad = ?, tipo_salida = ?, fecha_efectiva = ?, motivo = ?, observaciones = ?, activo = ? WHERE id_jubilacion = ?',
    [
      String(carnet_identidad).trim(),
      String(tipo_salida).trim(),
      fecha_efectiva,
      String(motivo).trim(),
      observaciones || null,
      activo ? 1 : 0,
      id_jubilacion,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-jubilacion-empleado/:id_jubilacion", verificarToken, autorizarRol(['rrhh']), (req, res) => {
  const id_jubilacion = req.params.id_jubilacion;
  db.query('DELETE FROM jubilaciones_empleado WHERE id_jubilacion = ?', [id_jubilacion], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA EVALUACIONES MÉDICAS (CHEQUEOS PERIÓDICOS) ====================
// (protegidas: admin, rrhh y producción — mismo criterio que cert. médicos)

app.get("/evaluaciones-medicas", verificarToken, autorizarRol(['rrhh', 'estadistica', 'director']), (req, res) => {
  db.query(
    `SELECT e.id_eval_medica, e.carnet_identidad,
            DATE_FORMAT(e.fecha_evaluacion, '%Y-%m-%d') AS fecha_evaluacion,
            e.tipo_chequeo, e.resultado, e.medico_nombre,
            DATE_FORMAT(e.proximo_chequeo, '%Y-%m-%d') AS proximo_chequeo,
            e.observaciones, e.activo,
            emp.nombre, emp.apellidos
     FROM eval_medicas e
     INNER JOIN empleados emp ON emp.carnet_identidad = e.carnet_identidad
     ORDER BY e.fecha_evaluacion DESC, e.id_eval_medica DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-evaluacion-medica", verificarToken, autorizarRol(['rrhh', 'estadistica']), (req, res) => {
  const { carnet_identidad, fecha_evaluacion, tipo_chequeo, resultado, medico_nombre, proximo_chequeo, observaciones, activo } = req.body;
  if (!carnet_identidad || !fecha_evaluacion || !resultado || !String(resultado).trim() || !medico_nombre || !String(medico_nombre).trim()) {
    return res.status(400).json({ message: 'Carnet, fecha de evaluación, resultado y nombre del médico son obligatorios' });
  }
  const tipo = tipo_chequeo && String(tipo_chequeo).trim() ? String(tipo_chequeo).trim() : 'Periódico';
  const prox = proximo_chequeo && String(proximo_chequeo).trim() ? proximo_chequeo : null;
  db.query(
    'INSERT INTO eval_medicas (carnet_identidad, fecha_evaluacion, tipo_chequeo, resultado, medico_nombre, proximo_chequeo, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      fecha_evaluacion,
      tipo,
      String(resultado).trim(),
      String(medico_nombre).trim(),
      prox,
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-evaluacion-medica/:id_eval_medica", verificarToken, autorizarRol(['rrhh', 'estadistica']), (req, res) => {
  const id_eval_medica = req.params.id_eval_medica;
  const { carnet_identidad, fecha_evaluacion, tipo_chequeo, resultado, medico_nombre, proximo_chequeo, observaciones, activo } = req.body;
  if (!carnet_identidad || !fecha_evaluacion || !resultado || !String(resultado).trim() || !medico_nombre || !String(medico_nombre).trim()) {
    return res.status(400).json({ message: 'Carnet, fecha de evaluación, resultado y nombre del médico son obligatorios' });
  }
  const tipo = tipo_chequeo && String(tipo_chequeo).trim() ? String(tipo_chequeo).trim() : 'Periódico';
  const prox = proximo_chequeo && String(proximo_chequeo).trim() ? proximo_chequeo : null;
  db.query(
    'UPDATE eval_medicas SET carnet_identidad = ?, fecha_evaluacion = ?, tipo_chequeo = ?, resultado = ?, medico_nombre = ?, proximo_chequeo = ?, observaciones = ?, activo = ? WHERE id_eval_medica = ?',
    [
      String(carnet_identidad).trim(),
      fecha_evaluacion,
      tipo,
      String(resultado).trim(),
      String(medico_nombre).trim(),
      prox,
      observaciones || null,
      activo ? 1 : 0,
      id_eval_medica,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-evaluacion-medica/:id_eval_medica", verificarToken, autorizarRol(['rrhh', 'estadistica']), (req, res) => {
  const id_eval_medica = req.params.id_eval_medica;
  db.query('DELETE FROM eval_medicas WHERE id_eval_medica = ?', [id_eval_medica], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});
Promise.all([
  ensurePasswordResetTable(),
  ensureContratoCorreoColumn(),
  ensureContratoContactosNotificacionColumn(),
  ensureContratoAnexosColumn(),
  ensureContratoVigenciaVarchar(),
  ensureContratoCanceladoColumns(),
  ensureUsuariosSecurityAuditColumns(),
  ensureContratosArchivoTables(),
  ensureContratosDocumentosColumns(),
  ensureCatalogoTipoContratoActivo(),
  ensureContratoPrioridadColumn(),
  ensureContratoAprobacionColumns(),
  ensureContratosRecordatoriosTable(),
  ensureConfigSistemaTable(),
  ensureUserPreferencesTable(),
  audit.ensureAuditTables(),
  rbac.ensureRbacSchema(),
])
  .then(async () => {
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
    app.listen(port, () => {
      recordatoriosContratos.startScheduler();
      console.log(`Corriendo en el puerto ${port}`);
      console.log(`Correo remitente: ${mailer.from} (origen: ${mailer.source || 'env'}, modo: ${mailer.mode})`);
      if (mailer.mode === 'dev') {
        console.log('Recuperación de contraseña: modo desarrollo (sin SMTP real).');
      } else if (smtpReady) {
        console.log('Recuperación de contraseña: SMTP activo.');
      } else {
        console.log('Recuperación de contraseña: SMTP configurado pero no disponible (se reintentará en cada envío).');
      }
    });
  })
  .catch((err) => {
    console.error('No se pudo preparar la base de datos inicial (tablas/columnas):', err);
    if (err?.code === 'ECONNREFUSED') {
      console.error(
        'MySQL no responde. En XAMPP: inicia MySQL, importa bd_crud y usa DB_HOST=127.0.0.1 en server/.env'
      );
    }
    process.exit(1);
  });
