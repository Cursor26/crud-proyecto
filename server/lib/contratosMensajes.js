/**
 * Mensajes visibles de contratación (aprobaciones, rechazos, jurídico) con lectura por usuario.
 */

const { ACCION_PENDIENTE_LABELS } = require('./contratosAuditoria');

const MENSAJE_ACTIONS = [
  'contrato_aprobado',
  'contrato_rechazado',
  'contrato_aprobacion_rechazada',
  'contrato_verificacion_juridica_aprobada',
  'contrato_verificacion_juridica_rechazada',
];

const TIPO_LABELS = {
  aprobacion: 'Aprobación',
  rechazo: 'Rechazo',
  juridico_aprobado: 'Verificación jurídica',
  juridico_rechazado: 'Devolución jurídica',
};

function parseDetails(raw) {
  if (raw == null || raw === '') return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function accionLabel(accion) {
  const k = String(accion || '').toLowerCase();
  return ACCION_PENDIENTE_LABELS[k] || accion || 'operación';
}

function splitTargetLabel(label, targetId) {
  const raw = String(label || '').trim();
  const num = String(targetId || '').trim();
  if (!raw) return { numero: num, empresa: '' };
  const sep = raw.indexOf(' — ');
  if (sep >= 0) {
    return { numero: raw.slice(0, sep).trim() || num, empresa: raw.slice(sep + 3).trim() };
  }
  const sep2 = raw.indexOf(' · ');
  if (sep2 >= 0) {
    return { numero: raw.slice(0, sep2).trim() || num, empresa: raw.slice(sep2 + 3).trim() };
  }
  return { numero: num || raw, empresa: '' };
}

function mapTipoEvento(action) {
  switch (action) {
    case 'contrato_aprobado':
      return 'aprobacion';
    case 'contrato_rechazado':
    case 'contrato_aprobacion_rechazada':
      return 'rechazo';
    case 'contrato_verificacion_juridica_aprobada':
      return 'juridico_aprobado';
    case 'contrato_verificacion_juridica_rechazada':
      return 'juridico_rechazado';
    default:
      return 'actualizacion';
  }
}

function buildTitulo(action, details) {
  const accion = accionLabel(details.accion || details.accion_pendiente);
  switch (action) {
    case 'contrato_aprobado':
      return `Aprobación de ${accion.toLowerCase()}`;
    case 'contrato_rechazado':
    case 'contrato_aprobacion_rechazada':
      return `Rechazo de ${accion.toLowerCase()}`;
    case 'contrato_verificacion_juridica_aprobada':
      return 'Verificación jurídica aprobada';
    case 'contrato_verificacion_juridica_rechazada':
      return `Devolución jurídica (${accionLabel(details.tipo || 'observado').toLowerCase()})`;
    default:
      return 'Actualización de contrato';
  }
}

function formatMensajeRow(row, leido) {
  const details = parseDetails(row.details_json);
  const { numero, empresa } = splitTargetLabel(row.target_label, row.target_id);
  const tipo = mapTipoEvento(row.action);
  const motivo =
    String(details.motivo || details.nota || row.revision_juridica_nota || '').trim() || null;
  const actor = row.actor_nombre || row.actor_email || 'Sistema';

  return {
    id: Number(row.id),
    tipo,
    tipo_label: TIPO_LABELS[tipo] || tipo,
    titulo: buildTitulo(row.action, details),
    motivo,
    numero_contrato: numero,
    empresa,
    actor,
    actor_email: row.actor_email || null,
    accion: details.accion || details.accion_pendiente || null,
    created_at: row.created_at,
    leido: Boolean(leido),
  };
}

function createContratosMensajesService(dbQuery) {
  async function ensureTable() {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '..', 'sql', 'contratos_mensajes_lectura.sql');
    const raw = fs.readFileSync(sqlPath, 'utf8');
    const statements = raw
      .split(';')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await dbQuery(stmt);
    }
  }

  function actionsSqlIn() {
    return MENSAJE_ACTIONS.map(() => '?').join(', ');
  }

  async function countNoLeidos(userEmail) {
    const email = String(userEmail || '').trim().toLowerCase();
    if (!email) return 0;
    const rows = await dbQuery(
      `SELECT COUNT(*) AS n
         FROM audit_events e
        WHERE e.action IN (${actionsSqlIn()})
          AND e.target_type = 'contrato'
          AND NOT EXISTS (
            SELECT 1 FROM contratos_mensajes_lectura l
             WHERE l.event_id = e.id AND LOWER(TRIM(l.user_email)) = ?
          )`,
      [...MENSAJE_ACTIONS, email]
    );
    return Number(rows[0]?.n) || 0;
  }

  async function listMensajes(userEmail, { limit = 80, offset = 0 } = {}) {
    const email = String(userEmail || '').trim().toLowerCase();
    const lim = Math.min(Math.max(Number(limit) || 80, 1), 200);
    const off = Math.max(Number(offset) || 0, 0);

    const rows = await dbQuery(
      `SELECT e.id, e.action, e.actor_email, e.actor_nombre, e.target_id, e.target_label,
              e.details_json, e.created_at,
              CASE WHEN l.event_id IS NOT NULL THEN 1 ELSE 0 END AS leido
         FROM audit_events e
         LEFT JOIN contratos_mensajes_lectura l
           ON l.event_id = e.id AND LOWER(TRIM(l.user_email)) = ?
        WHERE e.action IN (${actionsSqlIn()})
          AND e.target_type = 'contrato'
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?`,
      [email, ...MENSAJE_ACTIONS, lim, off]
    );

    const mensajes = rows.map((row) => formatMensajeRow(row, Number(row.leido) === 1));
    const no_leidos = await countNoLeidos(email);
    return { mensajes, no_leidos, total: mensajes.length };
  }

  async function marcarLeidos(userEmail, eventIds = []) {
    const email = String(userEmail || '').trim().toLowerCase();
    if (!email) return { marcados: 0 };

    const ids = [...new Set((Array.isArray(eventIds) ? eventIds : []).map((id) => Number(id)).filter((n) => n > 0))];
    if (!ids.length) return { marcados: 0 };

    const placeholders = ids.map(() => '?').join(', ');
    const result = await dbQuery(
      `INSERT IGNORE INTO contratos_mensajes_lectura (user_email, event_id)
       SELECT ?, id FROM audit_events WHERE id IN (${placeholders})`,
      [email, ...ids]
    );
    return { marcados: Number(result.affectedRows) || 0 };
  }

  async function marcarTodosLeidos(userEmail) {
    const email = String(userEmail || '').trim().toLowerCase();
    if (!email) return { marcados: 0 };

    const result = await dbQuery(
      `INSERT IGNORE INTO contratos_mensajes_lectura (user_email, event_id)
       SELECT ?, e.id
         FROM audit_events e
        WHERE e.action IN (${actionsSqlIn()})
          AND e.target_type = 'contrato'
          AND NOT EXISTS (
            SELECT 1 FROM contratos_mensajes_lectura l
             WHERE l.event_id = e.id AND LOWER(TRIM(l.user_email)) = ?
          )`,
      [email, ...MENSAJE_ACTIONS, email]
    );
    return { marcados: Number(result.affectedRows) || 0 };
  }

  return {
    ensureTable,
    countNoLeidos,
    listMensajes,
    marcarLeidos,
    marcarTodosLeidos,
    MENSAJE_ACTIONS,
  };
}

module.exports = { createContratosMensajesService, MENSAJE_ACTIONS };
