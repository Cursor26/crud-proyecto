const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailNotificacion(value) {
  const s = String(value || '').trim();
  return s.length > 0 && EMAIL_RE.test(s);
}

export function normalizarContactoNotificacion(raw) {
  return {
    nombre: String(raw?.nombre || '').trim().slice(0, 120),
    correo: String(raw?.correo || '').trim().toLowerCase().slice(0, 255),
  };
}

export function parseContactosNotificacion(raw, legacyCorreo) {
  if (raw == null || raw === '') {
    const legacy = String(legacyCorreo || '').trim();
    if (isValidEmailNotificacion(legacy)) {
      return [{ nombre: '', correo: legacy.toLowerCase() }];
    }
    return [];
  }
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    const out = [];
    const seen = new Set();
    for (const item of data) {
      const c = normalizarContactoNotificacion(item);
      if (!isValidEmailNotificacion(c.correo)) continue;
      if (seen.has(c.correo)) continue;
      seen.add(c.correo);
      out.push(c);
    }
    return out;
  } catch {
    return [];
  }
}

export function contactosFromContrato(contrato) {
  if (!contrato) return [];
  const parsed = parseContactosNotificacion(contrato.contactos_notificacion);
  if (parsed.length) return parsed;
  return parseContactosNotificacion(null, contrato.correo_notificacion);
}

export function tieneContactoNotificacion(contrato) {
  return contactosFromContrato(contrato).length > 0;
}

export function resumenCorreosNotificacion(contrato) {
  return contactosFromContrato(contrato)
    .map((c) => (c.nombre ? `${c.nombre} <${c.correo}>` : c.correo))
    .join(', ');
}

export function prepararPayloadContactos(contactos) {
  const valid = (Array.isArray(contactos) ? contactos : [])
    .map(normalizarContactoNotificacion)
    .filter((c) => isValidEmailNotificacion(c.correo));
  const deduped = [];
  const seen = new Set();
  for (const c of valid) {
    if (seen.has(c.correo)) continue;
    seen.add(c.correo);
    deduped.push(c);
  }
  return {
    contactos_notificacion: deduped,
    correo_notificacion: deduped[0]?.correo || null,
  };
}

export function validarContactosParaGuardar(contactos) {
  const list = Array.isArray(contactos) ? contactos : [];
  for (let i = 0; i < list.length; i += 1) {
    const c = normalizarContactoNotificacion(list[i]);
    const tieneNombre = Boolean(c.nombre);
    const tieneCorreo = Boolean(c.correo);
    if (!tieneNombre && !tieneCorreo) continue;
    if (tieneCorreo && !isValidEmailNotificacion(c.correo)) {
      return `Correo inválido en el contacto ${i + 1}.`;
    }
    if (tieneNombre && !tieneCorreo) {
      return `Indique el correo del contacto ${i + 1}.`;
    }
  }
  return null;
}
