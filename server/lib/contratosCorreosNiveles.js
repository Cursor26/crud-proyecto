/**
 * Cuatro niveles de correos por contrato (JSON en contactos_niveles).
 */

const {
  isValidEmail,
  normalizarContacto,
  parseContactosJson,
  contactosFromContrato,
} = require('./contratosContactosNotificacion');

const NIVELES = ['proveedor_cliente', 'notificaciones', 'autorizado_manipular', 'autorizado_aprobar'];
const MAX_POR_NIVEL = 12;

const LABELS_NIVEL_BASE = {
  notificaciones: 'Notificaciones',
  autorizado_manipular: 'Autorizado a manipular',
  autorizado_aprobar: 'Autorizado a aprobar',
};

function labelNivel(nivel, opts = {}) {
  if (nivel === 'proveedor_cliente') {
    const esProveedor =
      opts.esProveedor === true || opts.esProveedor === 1 || String(opts.esProveedor) === '1';
    return esProveedor ? 'Proveedor' : 'Cliente';
  }
  return LABELS_NIVEL_BASE[nivel] || nivel;
}

const EVENTO_NIVELES = {
  por_vencer: ['proveedor_cliente', 'notificaciones', 'autorizado_manipular'],
  vencido: ['notificaciones', 'autorizado_manipular'],
  cancelado: ['proveedor_cliente', 'notificaciones'],
  eliminado: ['notificaciones'],
  modificado: ['proveedor_cliente', 'notificaciones'],
  pendiente_aprobacion: ['autorizado_aprobar'],
  aprobacion_resuelta: ['autorizado_manipular'],
};

function nivelesVacios() {
  return {
    proveedor_cliente: [],
    notificaciones: [],
    autorizado_manipular: [],
    autorizado_aprobar: [],
  };
}

function dedupeContactos(lista) {
  const out = [];
  const seen = new Set();
  for (const item of lista || []) {
    const c = normalizarContacto(item);
    if (!isValidEmail(c.correo)) continue;
    const key = c.correo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ nombre: c.nombre, correo: key });
  }
  return out;
}

function parseNivelesJson(raw) {
  if (raw == null || raw === '') return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const out = nivelesVacios();
    for (const nivel of NIVELES) {
      out[nivel] = dedupeContactos(Array.isArray(data[nivel]) ? data[nivel] : []);
    }
    return out;
  } catch {
    return null;
  }
}

function contactosNivelesFromContrato(contrato) {
  const parsed = parseNivelesJson(contrato?.contactos_niveles);
  if (parsed) return parsed;

  const legacy = contactosFromContrato(contrato);
  const out = nivelesVacios();
  if (legacy.length) out.notificaciones = legacy.map((c) => ({ nombre: c.nombre, correo: c.correo }));
  return out;
}

function listCorreosPorNivel(contrato, nivel) {
  const niveles = contactosNivelesFromContrato(contrato);
  const key = String(nivel || '').trim();
  if (!NIVELES.includes(key)) return [];
  return (niveles[key] || []).map((c) => c.correo);
}

function listCorreosPorEvento(contrato, evento) {
  const keys = EVENTO_NIVELES[String(evento || '').trim()] || [];
  const correos = [];
  const seen = new Set();
  for (const nivel of keys) {
    for (const correo of listCorreosPorNivel(contrato, nivel)) {
      const k = correo.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      correos.push(k);
    }
  }
  return correos;
}

function tieneDestinosEvento(contrato, evento) {
  return listCorreosPorEvento(contrato, evento).length > 0;
}

function tieneAlgunCorreoNivel(contrato) {
  const niveles = contactosNivelesFromContrato(contrato);
  return NIVELES.some((n) => (niveles[n] || []).length > 0);
}

function sanitizeNivelesInput(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = nivelesVacios();
  for (const nivel of NIVELES) {
    const lista = Array.isArray(src[nivel]) ? src[nivel] : [];
    out[nivel] = dedupeContactos(lista).slice(0, MAX_POR_NIVEL);
  }
  return out;
}

function validarContactosNivelesObligatorios(niveles, opts = {}) {
  const sanitizado = sanitizeNivelesInput(niveles);
  for (const nivel of NIVELES) {
    if (!(sanitizado[nivel] || []).length) {
      return `Debe agregar al menos un correo en «${labelNivel(nivel, opts)}».`;
    }
  }
  return null;
}

function validarFilasContactosNiveles(niveles, opts = {}) {
  const src = niveles && typeof niveles === 'object' ? niveles : {};
  for (const nivel of NIVELES) {
    const list = Array.isArray(src[nivel]) ? src[nivel] : [];
    const label = labelNivel(nivel, opts);
    for (let i = 0; i < list.length; i += 1) {
      const c = normalizarContacto(list[i]);
      const tieneNombre = Boolean(c.nombre);
      const tieneCorreo = Boolean(c.correo);
      if (!tieneNombre && !tieneCorreo) continue;
      if (tieneCorreo && !isValidEmail(c.correo)) {
        return `Correo inválido en «${label}», fila ${i + 1}.`;
      }
      if (tieneNombre && !tieneCorreo) {
        return `Indique el correo en «${label}», fila ${i + 1}.`;
      }
    }
  }
  return null;
}

function validarContactosNivelesParaGuardar(body, opts = {}) {
  const src = body?.contactos_niveles && typeof body.contactos_niveles === 'object'
    ? body.contactos_niveles
    : body;
  const errFilas = validarFilasContactosNiveles(src, opts);
  if (errFilas) return errFilas;
  const { niveles } = prepareContactosNivelesForSave(
    body?.contactos_niveles ? body : { contactos_niveles: src }
  );
  return validarContactosNivelesObligatorios(niveles, opts);
}

function prepareContactosNivelesForSave(body) {
  const src = body && typeof body === 'object' ? body : {};
  let niveles = nivelesVacios();

  if (src.contactos_niveles && typeof src.contactos_niveles === 'object') {
    niveles = sanitizeNivelesInput(src.contactos_niveles);
  } else if (Array.isArray(src.contactos_notificacion)) {
    niveles.notificaciones = dedupeContactos(src.contactos_notificacion);
  } else if (src.correo_notificacion) {
    const correo = String(src.correo_notificacion).trim().toLowerCase();
    if (isValidEmail(correo)) niveles.notificaciones = [{ nombre: '', correo }];
  }

  const notificaciones = niveles.notificaciones || [];
  const tieneAlguno = NIVELES.some((n) => (niveles[n] || []).length > 0);

  return {
    niveles,
    nivelesJson: tieneAlguno ? JSON.stringify(niveles) : null,
    contactosJson: notificaciones.length ? JSON.stringify(notificaciones) : null,
    correoPrincipal: notificaciones[0]?.correo || null,
  };
}

module.exports = {
  NIVELES,
  MAX_POR_NIVEL,
  EVENTO_NIVELES,
  nivelesVacios,
  contactosNivelesFromContrato,
  listCorreosPorNivel,
  listCorreosPorEvento,
  tieneDestinosEvento,
  tieneAlgunCorreoNivel,
  prepareContactosNivelesForSave,
  sanitizeNivelesInput,
  validarContactosNivelesParaGuardar,
  validarContactosNivelesObligatorios,
};
