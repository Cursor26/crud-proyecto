/** Email razonable para UX (no reemplaza validación en servidor). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function isValidEmail(raw) {
  if (raw == null || typeof raw !== 'string') return false;
  const t = raw.trim();
  if (!t) return false;
  return EMAIL_RE.test(t);
}

/** Contraseña tal como se enviará al API (misma lógica que en servidor: trim de extremos). */
export function passwordTrimmedForSubmit(password) {
  return String(password == null ? '' : password).trim();
}

/**
 * @returns {{ valid: boolean, minMet: boolean, strength: 'empty'|'short'|'weak'|'medium'|'strong', message: string, score: number }}
 */
export function getPasswordFeedback(password) {
  const p = String(password == null ? '' : password).trim();
  if (p.length === 0) {
    return {
      valid: false,
      minMet: false,
      strength: 'empty',
      score: 0,
      message: 'Debe escribir una contraseña (mínimo 8 caracteres).',
    };
  }
  if (p.length < 8) {
    return {
      valid: false,
      minMet: false,
      strength: 'short',
      score: 0,
      message: 'Use al menos 8 caracteres.',
    };
  }
  let score = 0;
  if (/[a-z]/.test(p)) score += 1;
  if (/[A-Z]/.test(p)) score += 1;
  if (/[0-9]/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;

  let strength = 'weak';
  if (score >= 3) strength = 'strong';
  else if (score === 2) strength = 'medium';

  const messages = {
    weak: 'Débil: combine minúsculas, mayúsculas, números y símbolos para mayor seguridad.',
    medium: 'Aceptable. Puede reforzarse con más variedad de caracteres.',
    strong: 'Fuerte. Buena combinación de caracteres.',
  };

  return {
    valid: true,
    minMet: true,
    strength,
    score,
    message: messages[strength],
  };
}

/**
 * @param {string} password
 * @param {{ required: boolean, allowOmit: boolean }} opts allowOmit: edición, vacío = no cambiar
 */
export function passwordValidationForSubmit(password, { required, allowOmit }) {
  const p = String(password == null ? '' : password).trim();
  if (allowOmit && p.length === 0) {
    return { ok: true, mode: 'omit' };
  }
  if (required && p.length === 0) {
    return { ok: false, message: 'Ingrese una contraseña (no puede ser solo espacios en blanco).' };
  }
  const fb = getPasswordFeedback(p);
  if (!fb.valid) {
    return { ok: false, message: fb.message, feedback: fb };
  }
  return { ok: true, mode: 'set', feedback: fb };
}
