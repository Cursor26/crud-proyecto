/**
 * Contactos de notificación por contrato (nombre/cargo + correo).
 * Se guardan en contactos_notificacion (JSON); correo_notificacion conserva el primero (compatibilidad).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  const s = String(value || '').trim();
  return s.length > 0 && s.length <= 255 && EMAIL_RE.test(s);
}

function normalizarContacto(raw) {
  return {
    nombre: String(raw?.nombre || '').trim().slice(0, 120),
    correo: String(raw?.correo || '').trim().toLowerCase().slice(0, 255),
  };
}

function parseContactosJson(raw) {
  if (raw == null || raw === '') return [];
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    const out = [];
    const seen = new Set();
    for (const item of data) {
      const c = normalizarContacto(item);
      if (!isValidEmail(c.correo)) continue;
      const key = c.correo.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  } catch {
    return [];
  }
}

function contactosFromContrato(contrato) {
  if (!contrato || typeof contrato !== 'object') return [];
  const parsed = parseContactosJson(contrato.contactos_notificacion);
  if (parsed.length) return parsed;
  const legacy = String(contrato.correo_notificacion || '').trim();
  if (isValidEmail(legacy)) return [{ nombre: '', correo: legacy.toLowerCase() }];
  return [];
}

function tieneContactoNotificacion(contrato) {
  return contactosFromContrato(contrato).length > 0;
}

function listCorreosDestino(contrato) {
  return contactosFromContrato(contrato).map((c) => c.correo);
}

function prepareContactosForSave(body) {
  const src = body && typeof body === 'object' ? body : {};
  let contactos = [];

  if (Array.isArray(src.contactos_notificacion)) {
    contactos = src.contactos_notificacion.map(normalizarContacto).filter((c) => isValidEmail(c.correo));
  } else if (src.correo_notificacion) {
    const correo = String(src.correo_notificacion).trim().toLowerCase();
    if (isValidEmail(correo)) contactos = [{ nombre: '', correo }];
  }

  const deduped = [];
  const seen = new Set();
  for (const c of contactos) {
    const key = c.correo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ nombre: c.nombre, correo: key });
  }

  return {
    contactosJson: deduped.length ? JSON.stringify(deduped) : null,
    correoPrincipal: deduped[0]?.correo || null,
    contactos: deduped,
  };
}

module.exports = {
  isValidEmail,
  normalizarContacto,
  parseContactosJson,
  contactosFromContrato,
  tieneContactoNotificacion,
  listCorreosDestino,
  prepareContactosForSave,
};
