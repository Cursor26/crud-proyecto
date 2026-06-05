import {
  isValidEmailNotificacion,
  normalizarContactoNotificacion,
  parseContactosNotificacion,
} from './contratosContactosNotificacion';

export const NIVELES_CORREO = [
  'proveedor_cliente',
  'notificaciones',
  'autorizado_manipular',
  'autorizado_aprobar',
];

export const MAX_CONTACTOS_POR_NIVEL = 12;

const LABELS_NIVEL_BASE = {
  notificaciones: 'Notificaciones',
  autorizado_manipular: 'Autorizado a manipular',
  autorizado_aprobar: 'Autorizado a aprobar',
};

export function labelNivelCorreo(nivel, opts = {}) {
  if (nivel === 'proveedor_cliente') {
    return opts.esProveedor ? 'Proveedor' : 'Cliente';
  }
  return LABELS_NIVEL_BASE[nivel] || nivel;
}

export function nivelesCorreoVacios() {
  return {
    proveedor_cliente: [],
    notificaciones: [],
    autorizado_manipular: [],
    autorizado_aprobar: [],
  };
}

function dedupeLista(lista) {
  const out = [];
  const seen = new Set();
  for (const item of lista || []) {
    const c = normalizarContactoNotificacion(item);
    if (!isValidEmailNotificacion(c.correo)) continue;
    if (seen.has(c.correo)) continue;
    seen.add(c.correo);
    out.push(c);
  }
  return out;
}

export function parseContactosNiveles(raw, legacyContrato) {
  if (raw == null || raw === '') {
    if (!legacyContrato) return nivelesCorreoVacios();
    const legacy = parseContactosNotificacion(
      legacyContrato.contactos_notificacion,
      legacyContrato.correo_notificacion
    );
    const out = nivelesCorreoVacios();
    if (legacy.length) out.notificaciones = legacy;
    return out;
  }
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return nivelesCorreoVacios();
    const out = nivelesCorreoVacios();
    for (const nivel of NIVELES_CORREO) {
      out[nivel] = dedupeLista(Array.isArray(data[nivel]) ? data[nivel] : []);
    }
    return out;
  } catch {
    return nivelesCorreoVacios();
  }
}

export function contactosNivelesFromContrato(contrato) {
  if (!contrato) return nivelesCorreoVacios();
  if (contrato.contactos_niveles != null) {
    return parseContactosNiveles(contrato.contactos_niveles);
  }
  return parseContactosNiveles(null, contrato);
}

export function contactosNivelesStateFromContrato(contrato) {
  const niveles = contactosNivelesFromContrato(contrato);
  const out = nivelesCorreoVacios();
  for (const nivel of NIVELES_CORREO) {
    out[nivel] = (niveles[nivel] || []).map((c) => ({
      nombre: c.nombre || '',
      correo: c.correo || '',
    }));
  }
  return out;
}

export function tieneAlgunCorreoNivel(contrato) {
  const niveles = contactosNivelesFromContrato(contrato);
  return NIVELES_CORREO.some((n) => (niveles[n] || []).length > 0);
}

export function listCorreosPorEvento(contrato, evento) {
  const map = {
    por_vencer: ['proveedor_cliente', 'notificaciones', 'autorizado_manipular'],
    vencido: ['notificaciones', 'autorizado_manipular'],
    cancelado: ['proveedor_cliente', 'notificaciones'],
    eliminado: ['notificaciones'],
    modificado: ['proveedor_cliente', 'notificaciones'],
    pendiente_aprobacion: ['autorizado_aprobar'],
    aprobacion_resuelta: ['autorizado_manipular'],
  };
  const keys = map[String(evento || '').trim()] || [];
  const niveles = contactosNivelesFromContrato(contrato);
  const correos = [];
  const seen = new Set();
  for (const nivel of keys) {
    for (const c of niveles[nivel] || []) {
      if (!isValidEmailNotificacion(c.correo)) continue;
      if (seen.has(c.correo)) continue;
      seen.add(c.correo);
      correos.push(c);
    }
  }
  return correos;
}

export function prepararPayloadContactosNiveles(niveles) {
  const src = niveles && typeof niveles === 'object' ? niveles : {};
  const sanitizado = nivelesCorreoVacios();
  for (const nivel of NIVELES_CORREO) {
    sanitizado[nivel] = dedupeLista(Array.isArray(src[nivel]) ? src[nivel] : []).slice(
      0,
      MAX_CONTACTOS_POR_NIVEL
    );
  }
  const notificaciones = sanitizado.notificaciones;
  return {
    contactos_niveles: sanitizado,
    contactos_notificacion: notificaciones,
    correo_notificacion: notificaciones[0]?.correo || null,
  };
}

export function obtenerErroresContactosNiveles(niveles, opts = {}) {
  const errors = {};
  const src = niveles && typeof niveles === 'object' ? niveles : {};
  const payload = prepararPayloadContactosNiveles(src);

  for (const nivel of NIVELES_CORREO) {
    const list = Array.isArray(src[nivel]) ? src[nivel] : [];
    const label = labelNivelCorreo(nivel, opts);
    for (let i = 0; i < list.length; i += 1) {
      const c = normalizarContactoNotificacion(list[i]);
      const tieneNombre = Boolean(c.nombre);
      const tieneCorreo = Boolean(c.correo);
      if (!tieneNombre && !tieneCorreo) continue;
      if (tieneCorreo && !isValidEmailNotificacion(c.correo)) {
        errors[nivel] = `Correo inválido en «${label}», fila ${i + 1}.`;
        break;
      }
      if (tieneNombre && !tieneCorreo) {
        errors[nivel] = `Indique el correo en «${label}», fila ${i + 1}.`;
        break;
      }
    }
    if (!errors[nivel] && !(payload.contactos_niveles[nivel] || []).length) {
      errors[nivel] = `Agregue al menos un correo en «${label}».`;
    }
  }
  return errors;
}

export function validarContactosNivelesParaGuardar(niveles, opts = {}) {
  const errores = obtenerErroresContactosNiveles(niveles, opts);
  const first = Object.values(errores)[0];
  return first || null;
}

export function resumenTodosCorreosNivel(contrato) {
  const niveles = contactosNivelesFromContrato(contrato);
  const partes = [];
  for (const nivel of NIVELES_CORREO) {
    for (const c of niveles[nivel] || []) {
      partes.push(c.nombre ? `${c.nombre} <${c.correo}>` : c.correo);
    }
  }
  return [...new Set(partes)].join(', ');
}
