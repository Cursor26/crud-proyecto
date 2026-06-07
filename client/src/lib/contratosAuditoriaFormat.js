/** Textos de auditoría de contratos (UTF-8 en cliente; no depende del encoding del servidor). */

export const ACCION_PENDIENTE_LABELS = {
  alta: 'Alta',
  edicion: 'Edición',
  cancelacion: 'Cancelación',
  cancelacion_archivo: 'Cancelación y eliminación',
  archivo: 'Eliminación',
};

export const TIPO_EVENTO_LABELS = {
  solicitud: 'Solicitud',
  aprobacion: 'Aprobación',
  rechazo: 'Rechazo',
  eliminacion: 'Eliminación',
  recordatorio: 'Recordatorio',
  recordatorio_manual: 'Recordatorio manual',
  recordatorio_automatico: 'Recordatorio automático',
  actualizacion: 'Actualización',
};

export const DISPARADOR_LABELS = {
  manual_ui: 'Manual (usuario)',
  ejecutar_ahora: 'Automático (ejecutar ahora)',
  programador: 'Automático (programador)',
};

function parseDetails(raw, fallback = {}) {
  if (raw == null || raw === '') {
    return fallback && typeof fallback === 'object' ? { ...fallback } : {};
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : {};
  } catch {
    return fallback && typeof fallback === 'object' ? { ...fallback } : {};
  }
}

function actorDesdeDetails(details, fallbackActor) {
  return details.ejecutado_por || details.aprobado_por || details.resuelto_por || fallbackActor;
}

function solicitanteDesdeDetails(details) {
  return details.solicitado_por || details.solicitante || null;
}

/** Repara textos guardados o generados con encoding roto (rechaz? → rechazó). */
export function repararTextoAuditoria(text) {
  if (text == null || text === '') return text;
  let s = String(text);
  const fixes = [
    [/rechaz\?/gi, 'rechazó'],
    [/solicit\?/gi, 'solicitó'],
    [/aprob\?/gi, 'aprobó'],
    [/actualiz\?/gi, 'actualizó'],
    [/elimin\?/gi, 'eliminó'],
    [/archiv\?/gi, 'archivó'],
    [/efectu\?/gi, 'efectuó'],
    [/envi\?/gi, 'envió'],
    [/dispar\?/gi, 'disparó'],
    [/Edici\?n/gi, 'Edición'],
    [/Cancelaci\?n/gi, 'Cancelación'],
    [/eliminaci\?n/gi, 'eliminación'],
    [/Eliminaci\?n/gi, 'Eliminación'],
    [/Aprobaci\?n/gi, 'Aprobación'],
    [/Actualizaci\?n/gi, 'Actualización'],
    [/autom\?tico/gi, 'automático'],
    [/Autom\?tico/gi, 'Automático'],
    [/\s+\?\s+/g, ' · '],
  ];
  for (const [pattern, replacement] of fixes) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function contratoRef(row) {
  const label = repararTextoAuditoria(row.target_label || row.target_id || '');
  return label || row.target_id || '—';
}

export function formatContratoAuditRow(row) {
  const actor = row.actor_nombre || row.actor_email || 'Sistema';
  const details = parseDetails(row.details_json, row.details);
  const accionPend = String(details.accion || details.accion_pendiente || '').toLowerCase();
  const accionLabel = ACCION_PENDIENTE_LABELS[accionPend] || accionPend || '—';
  const ref = contratoRef(row);

  let mensaje = details.mensaje || '';
  let tipoEvento = 'actualizacion';

  switch (row.action) {
    case 'contrato_alta_solicitada':
      tipoEvento = 'solicitud';
      mensaje = `${actor} solicitó el alta del contrato ${ref}`;
      break;
    case 'contrato_alta_actualizada':
      tipoEvento = 'actualizacion';
      mensaje = `${actor} actualizó la solicitud de alta del contrato ${ref}`;
      break;
    case 'contrato_edicion_solicitada':
      tipoEvento = 'solicitud';
      mensaje = `${actor} solicitó modificar el contrato ${ref}`;
      break;
    case 'contrato_cancelacion_solicitada':
      tipoEvento = 'solicitud';
      if (details.archivar || accionPend === 'cancelacion_archivo') {
        mensaje = `${actor} solicitó cancelar y eliminar el contrato ${ref}`;
      } else {
        mensaje = `${actor} solicitó cancelar el contrato ${ref}`;
      }
      break;
    case 'contrato_archivo_solicitado':
      tipoEvento = 'solicitud';
      mensaje = `${actor} solicitó eliminar (archivar) el contrato ${ref}`;
      break;
    case 'contrato_aprobado':
      tipoEvento = 'aprobacion';
      if (accionPend === 'archivo' || accionPend === 'cancelacion_archivo') {
        const sol = solicitanteDesdeDetails(details);
        mensaje = sol
          ? `${actor} aprobó la eliminación solicitada por ${sol} del contrato ${ref}`
          : `${actor} aprobó la eliminación del contrato ${ref}`;
      } else {
        const sol = solicitanteDesdeDetails(details);
        mensaje = sol
          ? `${actor} aprobó ${accionLabel.toLowerCase()} solicitada por ${sol} del contrato ${ref}`
          : `${actor} aprobó ${accionLabel.toLowerCase()} del contrato ${ref}`;
      }
      break;
    case 'contrato_rechazado':
    case 'contrato_aprobacion_rechazada':
      tipoEvento = 'rechazo';
      {
        const sol = solicitanteDesdeDetails(details);
        if (accionPend === 'archivo' || accionPend === 'cancelacion_archivo') {
          mensaje = sol
            ? `${actor} rechazó la eliminación solicitada por ${sol} del contrato ${ref}`
            : `${actor} rechazó la eliminación del contrato ${ref}`;
        } else {
          mensaje = sol
            ? `${actor} rechazó ${accionLabel.toLowerCase()} solicitada por ${sol} del contrato ${ref}`
            : `${actor} rechazó ${accionLabel.toLowerCase()} del contrato ${ref}`;
        }
      }
      break;
    case 'contrato_archived':
    case 'contrato_eliminado_efectivo':
      tipoEvento = 'eliminacion';
      if (details.directo) {
        mensaje = `${actorDesdeDetails(details, actor)} eliminó directamente (archivó) el contrato ${ref}`;
      } else if (details.aprobacion) {
        const sol = solicitanteDesdeDetails(details);
        const apr = details.aprobado_por || actor;
        mensaje = sol
          ? `${apr} efectuó la eliminación aprobada (solicitada por ${sol}) del contrato ${ref}`
          : `${apr} efectuó la eliminación aprobada del contrato ${ref}`;
      } else {
        mensaje = `${actor} eliminó (archivó) el contrato ${ref}`;
      }
      break;
    case 'contrato_recordatorio_manual':
      tipoEvento = 'recordatorio_manual';
      mensaje = `${actor} envió recordatorio manual del contrato ${ref}`;
      break;
    case 'contrato_recordatorio_automatico':
      tipoEvento = 'recordatorio_automatico';
      if (details.disparador === 'ejecutar_ahora' && actor !== 'Sistema') {
        mensaje = `${actor} disparó recordatorio automático del contrato ${ref}`;
      } else {
        mensaje = `Sistema envió recordatorio automático del contrato ${ref}`;
      }
      break;
    default:
      mensaje = mensaje || `${actor}: ${row.action} en ${ref || 'contrato'}`;
  }

  const disparadorLabel =
    DISPARADOR_LABELS[details.disparador] || details.disparador_label || details.disparador || '—';

  return {
    ...row,
    target_label: repararTextoAuditoria(row.target_label),
    details: {
      ...details,
      disparador_label: repararTextoAuditoria(disparadorLabel),
    },
    mensaje: repararTextoAuditoria(mensaje),
    tipo_evento: tipoEvento,
    tipo_evento_label: TIPO_EVENTO_LABELS[tipoEvento] || tipoEvento,
    accion_pendiente: accionPend || null,
    accion_pendiente_label: accionLabel,
  };
}
