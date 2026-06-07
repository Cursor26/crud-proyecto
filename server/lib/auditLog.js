const crypto = require('crypto');
const { extractClientIp, normalizeClientIp } = require('./clientIp');

const MAX_FAILED_ATTEMPTS = Number(process.env.AUDIT_MAX_FAILED_LOGINS || 5);
const LOCKOUT_MINUTES = Number(process.env.AUDIT_LOCKOUT_MINUTES || 15);

const ROL_LABELS = {
  admin: 'Administrador',
  contratacion: 'Contratación',
  director: 'Director',
};

function rolLabel(codigo) {
  const k = String(codigo || '').trim().toLowerCase();
  return ROL_LABELS[k] || k || '—';
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function lockoutKey(identifier) {
  return normalizeIdentifier(identifier);
}

function getClientMeta(req) {
  const ip = extractClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 512) || null;
  return { ip, userAgent };
}

function mapRowIp(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    ip_address: normalizeClientIp(row.ip_address) || row.ip_address || null,
  };
}

function formatAuditMessage(event) {
  const actor = event.actor_nombre || event.actor_email || 'Sistema';
  let details = {};
  try {
    details = event.details_json
      ? typeof event.details_json === 'string'
        ? JSON.parse(event.details_json)
        : event.details_json
      : {};
  } catch {
    details = {};
  }

  if (event.category === 'role') {
    if (event.action === 'user_role_change') {
      const from = rolLabel(details.rol_anterior);
      const to = rolLabel(details.rol_nuevo);
      return `${actor} cambió el rol de ${event.target_label || event.target_id}: de ${from} → ${to}`;
    }
    if (event.action === 'user_created') {
      return `${actor} creó el usuario ${event.target_label || event.target_id} con rol ${rolLabel(details.rol_nuevo)}`;
    }
    if (event.action === 'user_active_change') {
      const estado = details.activo ? 'activo' : 'inactivo';
      return `${actor} ${details.activo ? 'habilitó' : 'deshabilitó'} al usuario ${event.target_label || event.target_id}`;
    }
    if (event.action === 'user_deleted') {
      return `${actor} eliminó el usuario ${event.target_label || event.target_id}`;
    }
  }

  if (event.category === 'delete') {
    if (event.action === 'contrato_archived') {
      return `${actor} eliminó (archivó) el contrato ${event.target_label || event.target_id}`;
    }
  }

  if (event.category === 'restore') {
    if (event.action === 'contrato_restored') {
      return `${actor} restauró el contrato ${event.target_label || event.target_id}`;
    }
  }

  return details.mensaje || `${actor}: ${event.action} sobre ${event.target_label || event.target_type || 'registro'}`;
}

function isRestoreEvent(event) {
  return event.category === 'restore';
}

function createAuditService(dbQuery) {
  async function ensureAuditTables() {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '..', 'sql', 'audit_system.sql');
    const raw = fs.readFileSync(sqlPath, 'utf8');
    const statements = raw
      .split(';')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await dbQuery(stmt);
    }
  }

  async function getLockout(identifier) {
    const key = lockoutKey(identifier);
    if (!key) return null;
    const rows = await dbQuery(
      'SELECT identifier_key, fail_count, locked_until, last_fail_at FROM audit_login_lockouts WHERE identifier_key = ? LIMIT 1',
      [key]
    );
    return rows[0] || null;
  }

  async function isLocked(identifier) {
    const row = await getLockout(identifier);
    if (!row?.locked_until) return { locked: false };
    const until = new Date(row.locked_until);
    if (until > new Date()) {
      return {
        locked: true,
        lockedUntil: until,
        failCount: Number(row.fail_count || 0),
      };
    }
    await dbQuery('UPDATE audit_login_lockouts SET locked_until = NULL WHERE identifier_key = ?', [
      lockoutKey(identifier),
    ]);
    return { locked: false };
  }

  async function recordFailedLogin({ identifier, userEmail, reason, ip, userAgent }) {
    const key = lockoutKey(identifier);
    await dbQuery(
      `INSERT INTO audit_failed_logins (identifier_attempted, user_email, reason, ip_address, user_agent)
       VALUES (?,?,?,?,?)`,
      [String(identifier || '').trim(), userEmail || null, reason, normalizeClientIp(ip), userAgent]
    );

    if (!key) return { failCount: 0, locked: false };

    const rows = await dbQuery(
      'SELECT fail_count, locked_until FROM audit_login_lockouts WHERE identifier_key = ? LIMIT 1',
      [key]
    );
    let failCount = Number(rows[0]?.fail_count || 0) + 1;
    let lockedUntil = null;

    if (failCount >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }

    await dbQuery(
      `INSERT INTO audit_login_lockouts (identifier_key, fail_count, locked_until, last_fail_at)
       VALUES (?,?,?,NOW())
       ON DUPLICATE KEY UPDATE fail_count = VALUES(fail_count), locked_until = VALUES(locked_until), last_fail_at = NOW()`,
      [key, failCount, lockedUntil]
    );

    return { failCount, locked: Boolean(lockedUntil), lockedUntil };
  }

  async function clearLockout(identifier) {
    const key = lockoutKey(identifier);
    if (!key) return;
    await dbQuery(
      'UPDATE audit_login_lockouts SET fail_count = 0, locked_until = NULL, last_fail_at = NULL WHERE identifier_key = ?',
      [key]
    );
  }

  async function recordLoginSession({ email, nombre, rol, ip, userAgent }) {
    const result = await dbQuery(
      `INSERT INTO audit_sessions (user_email, user_nombre, user_rol, ip_address, user_agent)
       VALUES (?,?,?,?,?)`,
      [email, nombre, rol, normalizeClientIp(ip), userAgent]
    );
    return result.insertId;
  }

  async function recordLogout(email) {
    const normalized = normalizeIdentifier(email);
    if (!normalized) return;
    await dbQuery(
      `UPDATE audit_sessions
          SET logout_at = NOW()
        WHERE user_email = ?
          AND logout_at IS NULL
        ORDER BY login_at DESC
        LIMIT 1`,
      [normalized]
    );
  }

  async function logEvent({
    category,
    action,
    actor,
    targetType,
    targetId,
    targetLabel,
    details,
    req,
  }) {
    const meta = req ? getClientMeta(req) : { ip: null, userAgent: null };
    const actorEmail = actor?.email ? normalizeIdentifier(actor.email) : null;
    const payload = details && typeof details === 'object' ? JSON.stringify(details) : null;
    await dbQuery(
      `INSERT INTO audit_events
        (category, action, actor_email, actor_nombre, target_type, target_id, target_label, details_json, ip_address, user_agent)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        category,
        action,
        actorEmail,
        actor?.nombre || null,
        targetType || null,
        targetId != null ? String(targetId) : null,
        targetLabel || null,
        payload,
        normalizeClientIp(meta.ip),
        meta.userAgent,
      ]
    );
  }

  async function listSessions({ desde, hasta, email, limit = 100, offset = 0 }) {
    const where = [];
    const params = [];
    if (desde) {
      where.push('login_at >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('login_at <= ?');
      params.push(hasta);
    }
    if (email) {
      where.push('LOWER(user_email) LIKE ?');
      params.push(`%${normalizeIdentifier(email)}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);
    const rows = await dbQuery(
      `SELECT id, user_email, user_nombre, user_rol, login_at, logout_at, ip_address, user_agent
         FROM audit_sessions
         ${whereSql}
         ORDER BY login_at DESC
         LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
    return rows.map(mapRowIp);
  }

  async function listFailedLogins({ desde, hasta, identifier, limit = 100, offset = 0 }) {
    const where = [];
    const params = [];
    if (desde) {
      where.push('created_at >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('created_at <= ?');
      params.push(hasta);
    }
    if (identifier) {
      where.push('(LOWER(identifier_attempted) LIKE ? OR LOWER(COALESCE(user_email,\'\')) LIKE ?)');
      const q = `%${normalizeIdentifier(identifier)}%`;
      params.push(q, q);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);
    const rows = await dbQuery(
      `SELECT id, identifier_attempted, user_email, reason, ip_address, user_agent, created_at
         FROM audit_failed_logins
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
    return rows.map(mapRowIp);
  }

  async function listFailedSummary({ hours = 24 }) {
    const h = Math.min(Math.max(Number(hours) || 24, 1), 168);
    const rows = await dbQuery(
      `SELECT
          COALESCE(NULLIF(LOWER(TRIM(user_email)), ''), LOWER(TRIM(identifier_attempted))) AS cuenta,
          identifier_attempted,
          user_email,
          COUNT(*) AS intentos,
          MAX(created_at) AS ultimo_intento,
          MAX(ip_address) AS ultima_ip
         FROM audit_failed_logins
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY cuenta, identifier_attempted, user_email
        HAVING intentos >= 1
        ORDER BY intentos DESC, ultimo_intento DESC
        LIMIT 100`,
      [h]
    );
    const lockouts = await dbQuery(
      `SELECT identifier_key, fail_count, locked_until, last_fail_at
         FROM audit_login_lockouts
        WHERE locked_until IS NOT NULL AND locked_until > NOW()
        ORDER BY locked_until DESC`
    );
    return {
      grouped: rows.map((r) => ({
        ...r,
        ultima_ip: normalizeClientIp(r.ultima_ip) || r.ultima_ip || null,
      })),
      lockouts,
    };
  }

  async function listEvents({ category, scope, desde, hasta, limit = 100, offset = 0 }) {
    const where = [];
    const params = [];
    if (scope === 'changes') {
      where.push(`category IN ('delete', 'restore')`);
    } else if (scope === 'roles') {
      where.push(`category = 'role'`);
    } else if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (desde) {
      where.push('created_at >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('created_at <= ?');
      params.push(hasta);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);
    const rows = await dbQuery(
      `SELECT id, category, action, actor_email, actor_nombre, target_type, target_id, target_label,
              details_json, ip_address, user_agent, created_at
         FROM audit_events
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
    return rows.map((row) => mapRowIp({
      ...row,
      mensaje: formatAuditMessage(row),
      tipo_cambio: isRestoreEvent(row) ? 'restauracion' : 'eliminacion',
    }));
  }

  return {
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_MINUTES,
    rolLabel,
    getClientMeta,
    ensureAuditTables,
    isLocked,
    recordFailedLogin,
    clearLockout,
    recordLoginSession,
    recordLogout,
    logEvent,
    listSessions,
    listFailedLogins,
    listFailedSummary,
    listEvents,
  };
}

module.exports = { createAuditService, rolLabel, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES };
