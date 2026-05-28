const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * true si, tras recortar extremos, no queda nada: null/undefined, vacío, o solo espacios,
 * tabulaciones, NBSP u otros separadores que ignore `.trim()`.
 * "  a b  " o " a " → false. "  ", "\t  ", "" → true.
 * No afecta espacios entre letras: eso es contenido válido.
 */
export function esSoloBlancosOVacio(s) {
  if (s == null) return true;
  return String(s).trim() === '';
}

/** Mensaje unificado para campos obligatorios que el usuario rellenó “de mentira” con blancos. */
export const MSJ_OBLIGATORIO_NO_SOLO_BLANCOS =
  'No puede quedar vacío ni contener solo espacios, tabulaciones u otros caracteres invisibles. Si el campo admite varias palabras, los espacios entre letras o números sí son válidos.';

export function isValidEmail(s) {
  if (s == null || String(s).trim() === '') return false;
  return EMAIL_RE.test(String(s).trim());
}

/**
 * Asegura que un valor numérico de entrada no sea negativo (saca vacío como '').
 * Para excepciones, no usar este helper o pasar allowNegative: true a nivel de componente.
 */
export function clampNonNegativeString(raw) {
  if (raw === '' || raw == null) return '';
  const n = parseFloat(String(raw).replace(',', '.'));
  if (Number.isNaN(n)) return '';
  if (n < 0) return '0';
  return String(raw);
}

export function parseNonNegativeNumber(value, { allowEmpty = true } = {}) {
  if (value === '' || value == null) return allowEmpty ? null : 0;
  const n = parseFloat(String(value).replace(',', '.'));
  if (Number.isNaN(n)) return allowEmpty ? null : 0;
  return n < 0 ? 0 : n;
}

const LOCALE_TITULO = 'es';

/* Letras, dígitos, espacio, punto y guiones. Resto (incl. #) se filtra. */
const RE_SACAR_NO_PERMITIDOS = /[^\p{L}\s.0-9\u002D\u2013\u2014\u2010]/gu;

/**
 * Mientras se escribe (empresa / suplementos de contrato): letras, cifras, un espacio entre
 * tramos, sin espacios iniciales; admite . y guiones (-, –, —, ‐).
 */
export function normalizarMientrasEscribeSoloLetras(raw) {
  if (raw == null) return '';
  let t = String(raw).replace(RE_SACAR_NO_PERMITIDOS, '');
  t = t.replace(/\s+/g, ' ');
  t = t.replace(/^\s+/, '');
  return t;
}

function tituloSoloSobreLetras(s) {
  return s.replace(/\p{L}+/gu, (m) => m.charAt(0).toLocaleUpperCase(LOCALE_TITULO) + m.slice(1).toLocaleLowerCase(LOCALE_TITULO));
}

/**
 * Texto (no vacío) sin ninguna letra: solo cifras y/u símbolos permitidos. Sirve para avisar al guardar.
 */
export function esTextoIrregularSinLetras(s) {
  if (s == null) return false;
  const t = String(s).trim();
  if (t === '') return false;
  return !/\p{L}/u.test(t);
}

/** Caracteres aceptables en un “nombre puro” (incl. cifra para poder detectar aparte poco habitual). */
const RE_SALVO_LETRAS_SEP_Y_DIGITO = /^[\p{L}\p{M}0-9\s'’'.\-–—·\u00B7\u2010]+$/u;

/**
 * Devuelve motivos (ES) para pedir repaso al guardar empresa/suplemento.
 * Avisa si: no hay letras; hay cifras; carácter ajeno a letras+separadores; o
 * al menos un punto (aunque sea uno solo) en el texto.
 * @param {string|null|undefined} s
 * @returns {string[]}
 */
export function razonesSugerirRevisarTextoEmpresaOsuplemento(s) {
  if (s == null) return [];
  const t = String(s).trim();
  if (t === '') return [];
  const r = [];
  if (esTextoIrregularSinLetras(t)) {
    r.push('no contiene letras (solo cifras y signos permitidos)');
  }
  if (/\d/.test(t)) {
    r.push('incluye cifras; muchos nombres de empresa o suplemento no deberían llevar números');
  }
  if (!RE_SALVO_LETRAS_SEP_Y_DIGITO.test(t)) {
    r.push('incluye signos o símbolos poco habituales para un nombre (revisar si es correcto)');
  }
  if (/\./.test(t)) {
    r.push('incluye al menos un punto; conviene revisar (abreviaturas, extensiones, iniciales, etc.)');
  }
  return r;
}

/**
 * Trimea, un solo espacio, mayúscula en cada tramo de letras (respetando puntos y demás en el tramo). Blur y guardar.
 */
export function normalizarTextoEmpresaOSuplemento(raw) {
  if (raw == null) return '';
  const t = normalizarMientrasEscribeSoloLetras(raw).trim();
  if (t === '') return '';
  return tituloSoloSobreLetras(t);
}

/** Carnet de identidad (empleados): exactamente 11 dígitos, sin signo. */
export function esCarnetEmpleado11(s) {
  return /^\d{11}$/.test(String(s ?? '').trim());
}

/** Teléfono laboral (empleados): exactamente 8 dígitos. */
export function esTelefonoEmpleado8(s) {
  return /^\d{8}$/.test(String(s ?? '').trim());
}

/**
 * Solo dígitos, tope de longitud (para inputs de carnet / teléfono).
 * @param {unknown} raw
 * @param {number} maxLen
 */
export function filtrarSoloDigitos(raw, maxLen) {
  if (raw == null) return '';
  return String(raw).replace(/\D/g, '').slice(0, maxLen);
}

/**
 * Textos largos (beneficios, superación, auditorías): avisar repaso si el contenido es muy irregular.
 * @param {string|null|undefined} s
 * @returns {string[]}
 */
export function razonesRevisarTextoAreaExpediente(s) {
  if (s == null) return [];
  const t = String(s).trim();
  if (t === '') return [];
  const r = [];
  if (esTextoIrregularSinLetras(t)) {
    r.push('no contiene letras (solo cifras o signos)');
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(t)) {
    r.push('incluye caracteres de control poco habituales');
  }
  return r;
}
