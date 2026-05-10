/**
 * Reglas unificadas para formularios de producción (Sacrificio, Matadero vivo, Leche):
 * vacíos → 0 al guardar; ceros permitidos; sin negativos; fecha opcional (hoy si falta).
 */

/** Fecha local YYYY-MM-DD (no UTC) para alinear con inputs type="date". */
export function fechaLocalHoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convierte entrada de formulario a número para persistir: vacío/null → 0.
 * @param {unknown} raw
 * @returns {number}
 */
export function valorNumericoProduccionParaGuardar(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (s === '') return 0;
  return parseFloat(s.replace(',', '.'));
}

/**
 * @param {unknown} value
 * @returns {string|null} mensaje de error inline, o null si es válido (incluye 0 y vacío → 0)
 */
export function errorMensajeCampoNumericoProduccion(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '') return null;
  const n = parseFloat(s.replace(',', '.'));
  if (Number.isNaN(n)) {
    return 'Debe ser un número válido (podés usar coma o punto decimal).';
  }
  if (n < 0) {
    return 'No se permiten valores negativos. Corregí el signo o el valor.';
  }
  if (!Number.isFinite(n)) {
    return 'El número no es válido.';
  }
  return null;
}

/**
 * @param {string} fechaInput valor del input date (puede ser '')
 * @returns {string} fecha a enviar al servidor
 */
export function normalizarFechaProduccion(fechaInput) {
  const t = fechaInput == null ? '' : String(fechaInput).trim();
  return t || fechaLocalHoyISO();
}

/**
 * @param {string[]} campos
 * @param {Record<string, string>} formData
 * @returns {boolean} true si algún campo quedará 0 o está vacío (incl. explícitamente 0)
 */
export function hayCerosOVaciosEnFormulario(campos, formData) {
  for (const c of campos) {
    const raw = formData[c];
    if (raw == null) return true;
    const s = String(raw).trim();
    if (s === '') return true;
    const n = parseFloat(s.replace(',', '.'));
    if (!Number.isNaN(n) && n === 0) return true;
  }
  return false;
}

/**
 * @param {string[]} campos
 * @param {Record<string, string>} formData
 * @param {string} fechaInput
 */
export function armaPayloadProduccion(campos, formData, fechaInput) {
  const fecha = normalizarFechaProduccion(fechaInput);
  const data = { fecha };
  for (const c of campos) {
    data[c] = valorNumericoProduccionParaGuardar(formData[c]);
  }
  return data;
}

/** Errores solo por número inválido o negativo (no por vacío/cero). */
export function resumenErroresProduccion(campos, formData) {
  const out = [];
  for (const c of campos) {
    const err = errorMensajeCampoNumericoProduccion(formData[c]);
    if (err) out.push({ campo: c, mensaje: err });
  }
  return out;
}

export const INSTRUCCIONES_BULLETS = [
  'Podés usar cero en cualquier medida. Un campo que dejes vacío se guarda como 0.',
  'Antes de guardar, si hay ceros o vacíos, el sistema pregunta si querés continuar (para no guardar por error con muchos en cero).',
  'No se permiten valores negativos en ninguna medida.',
  'La fecha es opcional: si no la elegís, al guardar se tomará la de hoy (zona horaria de tu dispositivo).',
];
