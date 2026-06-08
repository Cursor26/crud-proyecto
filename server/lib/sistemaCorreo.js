const crypto = require('crypto');
const nodemailer = require('nodemailer');

const CONFIG_KEYS = [
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_pass',
  'smtp_from',
  'use_db_config',
];

const { resolveJwtSecret } = require('./securityConfig');

const deriveKey = () => {
  const secret = resolveJwtSecret();
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const encryptPass = (plain) => {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
};

const decryptPass = (stored) => {
  if (!stored) return '';
  try {
    const [ivB64, tagB64, dataB64] = String(stored).split(':');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (_) {
    return '';
  }
};

const envSmtpConfig = () => ({
  smtp_host: String(process.env.SMTP_HOST || '').trim(),
  smtp_port: Number(process.env.SMTP_PORT || 587),
  smtp_secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  smtp_user: String(process.env.SMTP_USER || '').trim(),
  smtp_pass: String(process.env.SMTP_PASS || ''),
  smtp_from: String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim(),
  use_db_config: false,
  source: 'env',
});

const buildMailerFromSmtp = (cfg) => {
  const smtpHost = cfg.smtp_host;
  const smtpPort = Number(cfg.smtp_port || 587);
  const smtpUser = cfg.smtp_user;
  const smtpPass = cfg.smtp_pass;
  const smtpSecure = Boolean(cfg.smtp_secure);
  const smtpConnTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000);
  const smtpGreetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT || 12000);
  const smtpSocketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT || 20000);

  if (smtpHost && smtpUser && smtpPass) {
    const fallbacks = [
      { port: smtpPort, secure: smtpSecure },
      { port: 587, secure: false },
      { port: 465, secure: true },
    ];
    const seen = new Set();
    const transporters = [];
    for (const fb of fallbacks) {
      const key = `${fb.port}-${fb.secure}`;
      if (seen.has(key)) continue;
      seen.add(key);
      transporters.push({
        label: `${smtpHost}:${fb.port} secure=${fb.secure ? 'true' : 'false'}`,
        transporter: nodemailer.createTransport({
          host: smtpHost,
          port: fb.port,
          secure: fb.secure,
          requireTLS: !fb.secure,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: smtpConnTimeout,
          greetingTimeout: smtpGreetingTimeout,
          socketTimeout: smtpSocketTimeout,
        }),
      });
    }
    return {
      mode: 'smtp',
      transporters,
      transporter: transporters[0].transporter,
      from: cfg.smtp_from || smtpUser,
      source: cfg.source || 'env',
    };
  }
  return {
    mode: 'dev',
    transporter: nodemailer.createTransport({ jsonTransport: true }),
    from: cfg.smtp_from || 'no-reply@localhost',
    source: cfg.source || 'env',
  };
};

async function loadCorreoConfigFromDb(dbQuery) {
  const rows = await dbQuery('SELECT clave, valor FROM config_sistema WHERE clave IN (?)', [CONFIG_KEYS]);
  const map = {};
  for (const r of rows) map[r.clave] = r.valor;
  if (Number(map.use_db_config) !== 1) return null;

  const pass = decryptPass(map.smtp_pass);
  if (!map.smtp_host || !map.smtp_user || !pass) return null;

  return {
    smtp_host: String(map.smtp_host).trim(),
    smtp_port: Number(map.smtp_port || 587),
    smtp_secure: String(map.smtp_secure || '0') === '1',
    smtp_user: String(map.smtp_user).trim(),
    smtp_pass: pass,
    smtp_from: String(map.smtp_from || map.smtp_user).trim(),
    use_db_config: true,
    source: 'db',
  };
}

async function getEffectiveCorreoConfig(dbQuery) {
  const fromDb = await loadCorreoConfigFromDb(dbQuery);
  if (fromDb) return fromDb;
  return envSmtpConfig();
}

async function saveCorreoConfigToDb(dbQuery, body, updatedBy) {
  const useDb = body.use_db_config === true || body.use_db_config === 1 || body.use_db_config === '1';
  const entries = {
    use_db_config: useDb ? '1' : '0',
    smtp_host: String(body.smtp_host || '').trim(),
    smtp_port: String(Number(body.smtp_port) || 587),
    smtp_secure: body.smtp_secure === true || body.smtp_secure === 1 || body.smtp_secure === '1' ? '1' : '0',
    smtp_user: String(body.smtp_user || '').trim(),
    smtp_from: String(body.smtp_from || body.smtp_user || '').trim(),
  };

  if (body.smtp_pass && String(body.smtp_pass).trim()) {
    entries.smtp_pass = encryptPass(String(body.smtp_pass).trim());
  } else if (useDb) {
    const prev = await dbQuery('SELECT valor FROM config_sistema WHERE clave = ? LIMIT 1', ['smtp_pass']);
    if (prev[0]?.valor) entries.smtp_pass = prev[0].valor;
  } else {
    entries.smtp_pass = '';
  }

  for (const [clave, valor] of Object.entries(entries)) {
    await dbQuery(
      `INSERT INTO config_sistema (clave, valor, updated_by) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
      [clave, valor == null ? '' : String(valor), updatedBy || null]
    );
  }
}

function publicCorreoConfig(cfg, passwordSet) {
  return {
    smtp_host: cfg.smtp_host || '',
    smtp_port: Number(cfg.smtp_port) || 587,
    smtp_secure: Boolean(cfg.smtp_secure),
    smtp_user: cfg.smtp_user || '',
    smtp_from: cfg.smtp_from || '',
    use_db_config: Boolean(cfg.use_db_config),
    source: cfg.source || 'env',
    passwordSet: Boolean(passwordSet),
  };
}

module.exports = {
  CONFIG_KEYS,
  envSmtpConfig,
  buildMailerFromSmtp,
  loadCorreoConfigFromDb,
  getEffectiveCorreoConfig,
  saveCorreoConfigToDb,
  publicCorreoConfig,
  encryptPass,
  decryptPass,
};
