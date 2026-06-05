import { contactosFromContrato, resumenCorreosNotificacion } from './contratosContactosNotificacion';
import { convertirVigenciaLegible } from './convertirVigenciaLegible';
import { parseSuplementosFromContrato } from './contratosSuplementos';
import { parseAnexosFromContrato } from './contratosAnexos';

export function parsePropuestaAprobacion(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function normTexto(val) {
  return String(val ?? '').trim();
}

function normParte(val) {
  if (typeof val === 'boolean') return val ? 'Proveedor' : 'Cliente';
  if (val === 'proveedor' || val === 'cliente') {
    return val === 'proveedor' ? 'Proveedor' : 'Cliente';
  }
  return Number(val) === 1 ? 'Proveedor' : 'Cliente';
}

function normFecha(val) {
  if (!val) return '';
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return normTexto(val);
  return d.toISOString().slice(0, 10);
}

function normPrioridad(val) {
  const s = normTexto(val).toLowerCase();
  if (s === 'alta' || s === 'media' || s === 'baja') return s;
  return s || 'media';
}

function resumenContactosDesdePropuesta(propuesta) {
  if (!propuesta) return '—';
  const list = Array.isArray(propuesta.contactos_notificacion)
    ? propuesta.contactos_notificacion
    : contactosFromContrato({
        contactos_notificacion: propuesta.contactos_notificacion,
        correo_notificacion: propuesta.correo_notificacion,
      });
  if (!list.length) return '—';
  return list
    .map((c) => {
      const nombre = normTexto(c.nombre);
      const correo = normTexto(c.correo);
      return nombre ? `${nombre} <${correo}>` : correo;
    })
    .join(', ');
}

function resumenSuplementosTexto(raw) {
  const { legacyText, items } = parseSuplementosFromContrato({ suplementos: raw });
  if (legacyText) return legacyText;
  if (!items.length) return '—';
  return items.map((it) => `#${it.numero} ${it.nombre || 'sin nombre'} (${it.tipo})`).join('; ');
}

function resumenAnexosTexto(raw) {
  const { activo, items } = parseAnexosFromContrato({ anexos: raw });
  if (!activo && !items.length) return 'Sin anexos';
  if (!items.length) return 'Anexos activos (sin archivos listados)';
  return `${items.length} anexo(s): ${items.map((it) => `#${it.numero} ${it.nombre || 'sin nombre'}`).join('; ')}`;
}

function pushCambio(cambios, label, antes, despues) {
  const a = normTexto(antes) || '—';
  const d = normTexto(despues) || '—';
  if (a === d) return;
  cambios.push({ label, antes: a, despues: d });
}

/**
 * Compara contrato vigente en BD vs propuesta guardada en aprobacion_propuesta.
 * @returns {{ label, antes, despues }[]}
 */
export function cambiosEdicionPendiente(contratoActual, propuestaRaw, opts = {}) {
  const propuesta = parsePropuestaAprobacion(propuestaRaw);
  if (!propuesta || !contratoActual) return [];

  const fmtFecha = opts.fmtFecha || ((v) => normFecha(v) || '—');
  const tipoLegible = opts.tipoLegible || ((t) => normTexto(t) || '—');

  const cambios = [];

  pushCambio(
    cambios,
    'N° contrato',
    contratoActual.numero_contrato,
    propuesta.numero_contrato
  );
  pushCambio(cambios, 'Parte', normParte(contratoActual.proveedor_cliente), normParte(propuesta.proveedor_cliente));
  pushCambio(cambios, 'Empresa', contratoActual.empresa, propuesta.empresa);
  pushCambio(
    cambios,
    'Tipo de contrato',
    tipoLegible(contratoActual.tipo_contrato),
    tipoLegible(propuesta.tipo_contrato)
  );
  pushCambio(
    cambios,
    'Prioridad',
    normPrioridad(contratoActual.prioridad),
    normPrioridad(propuesta.prioridad)
  );
  pushCambio(
    cambios,
    'Vigencia',
    convertirVigenciaLegible(contratoActual.vigencia) || '—',
    convertirVigenciaLegible(propuesta.vigencia) || '—'
  );
  pushCambio(
    cambios,
    'Fecha inicio',
    fmtFecha(contratoActual.fecha_inicio),
    fmtFecha(propuesta.fecha_inicio)
  );
  pushCambio(
    cambios,
    'Fecha fin',
    fmtFecha(contratoActual.fecha_fin),
    fmtFecha(propuesta.fecha_fin)
  );
  pushCambio(
    cambios,
    'Contactos notificación',
    resumenCorreosNotificacion(contratoActual) || '—',
    resumenContactosDesdePropuesta(propuesta)
  );
  pushCambio(
    cambios,
    'Suplementos',
    resumenSuplementosTexto(contratoActual.suplementos),
    resumenSuplementosTexto(propuesta.suplementos)
  );
  pushCambio(cambios, 'Anexos', resumenAnexosTexto(contratoActual.anexos), resumenAnexosTexto(propuesta.anexos));

  return cambios;
}

const LABEL_A_CAMPO = {
  'N° contrato': 'numero_contrato',
  Parte: 'parte',
  Empresa: 'empresa',
  'Tipo de contrato': 'tipo_contrato',
  Prioridad: 'prioridad',
  Vigencia: 'vigencia',
  'Fecha inicio': 'fecha_inicio',
  'Fecha fin': 'fecha_fin',
  'Contactos notificación': 'contactos',
  Suplementos: 'suplementos',
  Anexos: 'anexos',
};

/** @returns {Set<string>} */
export function clavesCamposModificadosEdicion(contratoActual, propuestaRaw, opts = {}) {
  const cambios = cambiosEdicionPendiente(contratoActual, propuestaRaw, opts);
  const keys = new Set();
  for (const c of cambios) {
    const k = LABEL_A_CAMPO[c.label];
    if (k) keys.add(k);
  }
  return keys;
}

export function tieneCambiosEdicionPendiente(contratoActual, propuestaRaw, opts = {}) {
  return clavesCamposModificadosEdicion(contratoActual, propuestaRaw, opts).size > 0;
}

export function contactosDesdePropuesta(propuesta) {
  if (!propuesta) return [];
  if (Array.isArray(propuesta.contactos_notificacion)) {
    return contactosFromContrato({
      contactos_notificacion: propuesta.contactos_notificacion,
      correo_notificacion: propuesta.correo_notificacion,
    });
  }
  return contactosFromContrato({
    contactos_notificacion: null,
    correo_notificacion: propuesta.correo_notificacion,
  });
}

/**
 * Líneas para mostrar en Pendientes según tipo de solicitud.
 */
export function lineasResumenPendiente(contrato, opts = {}) {
  const accion = String(contrato?.aprobacion_accion || '').toLowerCase();
  const fmtFecha = opts.fmtFecha || ((v) => normFecha(v) || '—');
  const tipoLegible = opts.tipoLegible || ((t) => normTexto(t) || '—');

  if (accion === 'cancelacion') {
    return [{ tipo: 'mensaje', texto: 'Se solicita cancelar este contrato.' }];
  }

  if (accion === 'alta') {
    return [
      { tipo: 'mensaje', texto: 'Nuevo contrato propuesto:' },
      { tipo: 'dato', label: 'N° contrato', valor: contrato.numero_contrato },
      { tipo: 'dato', label: 'Empresa', valor: contrato.empresa || '—' },
      { tipo: 'dato', label: 'Parte', valor: normParte(contrato.proveedor_cliente) },
      { tipo: 'dato', label: 'Tipo', valor: tipoLegible(contrato.tipo_contrato) },
      {
        tipo: 'dato',
        label: 'Vigencia',
        valor: convertirVigenciaLegible(contrato.vigencia) || '—',
      },
      {
        tipo: 'dato',
        label: 'Fechas',
        valor: `${fmtFecha(contrato.fecha_inicio)} → ${fmtFecha(contrato.fecha_fin)}`,
      },
    ];
  }

  if (accion === 'edicion') {
    const cambios = cambiosEdicionPendiente(contrato, contrato.aprobacion_propuesta, opts);
    if (!cambios.length) {
      return [
        {
          tipo: 'mensaje',
          texto: 'Modificación enviada; no se detectaron cambios en los datos principales del formulario.',
        },
      ];
    }
    return cambios.map((c) => ({ tipo: 'cambio', ...c }));
  }

  return [{ tipo: 'mensaje', texto: 'Solicitud pendiente de aprobación.' }];
}
