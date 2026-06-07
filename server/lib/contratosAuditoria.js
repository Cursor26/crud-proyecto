/**
 * Auditoría de movimientos en el módulo de contratos.
 */

const { normalizeClientIp } = require('./clientIp');

const ACCION_PENDIENTE_LABELS = {
  alta: 'Alta',
  edicion: 'Edición',
  cancelacion: 'Cancelación',
  cancelacion_archivo: 'Cancelación y eliminación',
  archivo: 'Eliminación',
};

const TIPO_EVENTO_LABELS = {
  solicitud: 'Solicitud',
  aprobacion: 'Aprobación',
  rechazo: 'Rechazo',
  eliminacion: 'Eliminación',
  recordatorio: 'Recordatorio',
  recordatorio_manual: 'Recordatorio manual',
  recordatorio_automatico: 'Recordatorio automático',
  actualizacion: 'Actualización',
};

const DISPARADOR_LABELS = {
  manual_ui: 'Manual (usuario)',
  ejecutar_ahora: 'Automático (ejecutar ahora)',
  programador: 'Automático (programador)',
};

function actorDesdeDetails(details, fallbackActor) {
  return (
    details.ejecutado_por ||
    details.aprobado_por ||
    details.resuelto_por ||
    fallbackActor
  );
}

function solicitanteDesdeDetails(details) {
  return details.solicitado_por || details.solicitante || null;
}

/** ::1 = localhost en IPv6 (misma máquina que el servidor). */
function formatIpDisplay(ip) {
  return normalizeClientIp(ip) || null;
}

function parseDetails(raw) {
  if (raw == null || raw === '') return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function formatContratoAuditRow(row) {
  const actor = row.actor_nombre || row.actor_email || 'Sistema';
  const details = parseDetails(row.details_json);
  const accionPend = String(details.accion || details.accion_pendiente || '').toLowerCase();
  const accionLabel = ACCION_PENDIENTE_LABELS[accionPend] || accionPend || '—';

  let mensaje = details.mensaje || '';
  let tipoEvento = 'actualizacion';

  switch (row.action) {
    case 'contrato_alta_solicitada':
      tipoEvento = 'solicitud';
      mensaje = `${actor} solicitó el alta del contrato ${row.target_label || row.target_id}`;
      break;
    case 'contrato_alta_actualizada':
      tipoEvento = 'actualizacion';
      mensaje = `${actor} actualizó la solicitud de alta del contrato ${row.target_label || row.target_id}`;
      break;
    case 'contrato_edicion_solicitada':
      tipoEvento = 'solicitud';
      mensaje = `${actor} solicitó modificar el contrato ${row.target_label || row.target_id}`;
      break;
    case 'contrato_cancelacion_solicitada':
      tipoEvento = 'solicitud';
      if (details.archivar || accionPend === 'cancelacion_archivo') {
        mensaje = `${actor} solicitó cancelar y eliminar el contrato ${row.target_label || row.target_id}`;
      } else {
        mensaje = `${actor} solicitó cancelar el contrato ${row.target_label || row.target_id}`;
      }
      break;
    case 'contrato_archivo_solicitado':
      tipoEvento = 'solicitud';
      mensaje = `${actor} solicitó eliminar (archivar) el contrato ${row.target_label || row.target_id}`;
      break;
    case 'contrato_aprobado':
      tipoEvento = 'aprobacion';
      if (accionPend === 'archivo' || accionPend === 'cancelacion_archivo') {
        const sol = solicitanteDesdeDetails(details);
        mensaje = sol
          ? `${actor} aprobó la eliminación solicitada por ${sol} del contrato ${row.target_label || row.target_id}`
          : `${actor} aprobó la eliminación del contrato ${row.target_label || row.target_id}`;
      } else {
        const sol = solicitanteDesdeDetails(details);
        mensaje = sol
          ? `${actor} aprobó ${accionLabel.toLowerCase()} solicitada por ${sol} del contrato ${row.target_label || row.target_id}`
          : `${actor} aprobó ${accionLabel.toLowerCase()} del contrato ${row.target_label || row.target_id}`;
      }
      break;
    case 'contrato_rechazado':
    case 'contrato_aprobacion_rechazada':
      tipoEvento = 'rechazo';
      {
        const sol = solicitanteDesdeDetails(details);
        if (accionPend === 'archivo' || accionPend === 'cancelacion_archivo') {
          mensaje = sol
            ? `${actor} rechazó la eliminación solicitada por ${sol} del contrato ${row.target_label || row.target_id}`
            : `${actor} rechazó la eliminación del contrato ${row.target_label || row.target_id}`;
        } else {
          mensaje = sol
            ? `${actor} rechazó ${accionLabel.toLowerCase()} solicitada por ${sol} del contrato ${row.target_label || row.target_id}`
            : `${actor} rechazó ${accionLabel.toLowerCase()} del contrato ${row.target_label || row.target_id}`;
        }
      }
      break;
    case 'contrato_archived':
    case 'contrato_eliminado_efectivo':
      tipoEvento = 'eliminacion';
      if (details.directo) {
        mensaje = `${actorDesdeDetails(details, actor)} eliminó directamente (archivó) el contrato ${row.target_label || row.target_id}`;
      } else if (details.aprobacion) {
        const sol = solicitanteDesdeDetails(details);
        const apr = details.aprobado_por || actor;
        mensaje = sol
          ? `${apr} efectuó la eliminación aprobada (solicitada por ${sol}) del contrato ${row.target_label || row.target_id}`
          : `${apr} efectuó la eliminación aprobada del contrato ${row.target_label || row.target_id}`;
      } else {
        mensaje = `${actor} eliminó (archivó) el contrato ${row.target_label || row.target_id}`;
      }
      break;
    case 'contrato_recordatorio_manual':
      tipoEvento = 'recordatorio_manual';
      mensaje = `${actor} envió recordatorio manual del contrato ${row.target_label || row.target_id}`;
      break;
    case 'contrato_recordatorio_automatico':
      tipoEvento = 'recordatorio_automatico';
      if (details.disparador === 'ejecutar_ahora' && actor !== 'Sistema') {
        mensaje = `${actor} disparó recordatorio automático del contrato ${row.target_label || row.target_id}`;
      } else {
        mensaje = `Sistema envió recordatorio automático del contrato ${row.target_label || row.target_id}`;
      }
      break;
    default:
      mensaje = mensaje || `${actor}: ${row.action} en ${row.target_label || row.target_id || 'contrato'}`;
  }

  const ipDisplay = formatIpDisplay(row.ip_address);

  return {
    ...row,
    details,
    mensaje,
    tipo_evento: tipoEvento,
    tipo_evento_label: TIPO_EVENTO_LABELS[tipoEvento] || tipoEvento,
    accion_pendiente: accionPend || null,
    accion_pendiente_label: accionLabel,
    ip_address: ipDisplay || row.ip_address || null,
  };
}

/** Evita duplicar eliminación cuando ya existe contrato_eliminado_efectivo (mismo contrato, ~5 min). */
function dedupeEliminacionesDuplicadas(rows) {
  return rows.filter((row) => {
    if (row.action !== 'contrato_archived' || row.category !== 'delete') return true;
    const t = new Date(row.created_at).getTime();
    if (Number.isNaN(t)) return true;
    const duplicado = rows.some((other) => {
      if (other.action !== 'contrato_eliminado_efectivo' || other.target_id !== row.target_id) return false;
      const ot = new Date(other.created_at).getTime();
      return !Number.isNaN(ot) && Math.abs(ot - t) < 5 * 60 * 1000;
    });
    return !duplicado;
  });
}

function rowMatchesTab(row, tab) {
  const t = String(tab || 'todos').toLowerCase();
  if (t === 'todos') return true;

  const action = String(row.action || '');
  const details = parseDetails(row.details_json);
  const accion = String(details.accion || details.accion_pendiente || '').toLowerCase();

  if (t === 'solicitudes') {
    return (
      action.endsWith('_solicitada') ||
      action.endsWith('_solicitado') ||
      action === 'contrato_alta_actualizada'
    );
  }
  if (t === 'altas') {
    return (
      action === 'contrato_alta_solicitada' ||
      action === 'contrato_alta_actualizada' ||
      ((action === 'contrato_aprobado' || action === 'contrato_rechazado' || action === 'contrato_aprobacion_rechazada') &&
        accion === 'alta')
    );
  }
  if (t === 'ediciones') {
    return (
      action === 'contrato_edicion_solicitada' ||
      ((action === 'contrato_aprobado' || action === 'contrato_rechazado' || action === 'contrato_aprobacion_rechazada') &&
        accion === 'edicion')
    );
  }
  if (t === 'aprobaciones') {
    return (
      action === 'contrato_aprobado' ||
      action === 'contrato_rechazado' ||
      action === 'contrato_aprobacion_rechazada'
    );
  }
  if (t === 'cancelaciones') {
    return (
      action === 'contrato_cancelacion_solicitada' ||
      ((action === 'contrato_aprobado' || action === 'contrato_rechazado' || action === 'contrato_aprobacion_rechazada') &&
        (accion === 'cancelacion' || accion === 'cancelacion_archivo'))
    );
  }
  if (t === 'eliminaciones') {
    if (action === 'contrato_cancelacion_solicitada') {
      return accion === 'cancelacion_archivo' || Boolean(details.archivar);
    }
    return (
      action === 'contrato_archived' ||
      action === 'contrato_eliminado_efectivo' ||
      action === 'contrato_archivo_solicitado' ||
      ((action === 'contrato_aprobado' || action === 'contrato_rechazado' || action === 'contrato_aprobacion_rechazada') &&
        (accion === 'archivo' || accion === 'cancelacion_archivo'))
    );
  }
  if (t === 'correos') {
    return action === 'contrato_recordatorio_manual' || action === 'contrato_recordatorio_automatico';
  }
  return true;
}

function createContratosAuditoriaService(dbQuery, audit) {
  async function logContrato(req, { action, numero, empresa, details = {}, actorOverride } = {}) {
    const num = String(numero || '').trim();
    if (!num) return;
    const emp = String(empresa || '').trim();
    const actor = actorOverride || {
      email: req?.user?.email,
      nombre: req?.user?.nombre,
    };
    await audit.logEvent({
      category: 'contrato',
      action,
      actor,
      targetType: 'contrato',
      targetId: num,
      targetLabel: emp ? `${num} · ${emp}` : num,
      details,
      req: req || undefined,
    });
  }

  async function listEventos({ tab = 'todos', numero, desde, hasta, limit = 300, offset = 0 } = {}) {
    const where = [
      `(
        category = 'contrato'
        OR (category = 'delete' AND action IN ('contrato_archived', 'contrato_eliminado_efectivo'))
        OR (category = 'update' AND action = 'contrato_aprobacion_rechazada')
      )`,
      `target_type = 'contrato'`,
    ];
    const params = [];

    if (numero) {
      where.push('target_id = ?');
      params.push(String(numero).trim());
    }
    if (desde) {
      where.push('created_at >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('created_at <= ?');
      params.push(hasta);
    }

    const lim = Math.min(Math.max(Number(limit) || 300, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);

    const rows = await dbQuery(
      `SELECT id, category, action, actor_email, actor_nombre, target_type, target_id, target_label,
              details_json, ip_address, user_agent, created_at
         FROM audit_events
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );

    const formatted = dedupeEliminacionesDuplicadas(rows.map(formatContratoAuditRow));
    const tabKey = String(tab || 'todos').toLowerCase();
    if (tabKey === 'todos') return formatted;
    return formatted.filter((row) => rowMatchesTab(row, tabKey));
  }

  async function logRecordatorio({
    contrato,
    origen,
    diasAntes,
    destinos,
    destinoResumen,
    actor,
    disparador,
    eventoVencimiento,
    req,
  }) {
    const numero = String(contrato?.numero_contrato || '').trim();
    if (!numero) return;
    const esManual = origen === 'manual';
    const action = esManual ? 'contrato_recordatorio_manual' : 'contrato_recordatorio_automatico';
    const actorPayload = actor?.email || actor?.nombre
      ? { email: actor.email, nombre: actor.nombre }
      : { email: null, nombre: 'Sistema' };
    await logContrato(req || null, {
      action,
      numero,
      empresa: contrato?.empresa,
      details: {
        origen_envio: esManual ? 'manual' : 'automatico',
        disparador: disparador || (esManual ? 'manual_ui' : 'programador'),
        disparador_label: DISPARADOR_LABELS[disparador] || disparador || '—',
        dias_restantes: diasAntes,
        evento: eventoVencimiento || (diasAntes != null && diasAntes < 0 ? 'vencido' : 'por_vencer'),
        destino: destinoResumen || (Array.isArray(destinos) ? destinos.join(', ') : ''),
        destinos: Array.isArray(destinos) ? destinos : [],
      },
      actorOverride: actorPayload,
    });
  }

  return { logContrato, logRecordatorio, listEventos, formatContratoAuditRow, rowMatchesTab };
}

module.exports = {
  createContratosAuditoriaService,
  ACCION_PENDIENTE_LABELS,
  TIPO_EVENTO_LABELS,
  DISPARADOR_LABELS,
  formatContratoAuditRow,
};
