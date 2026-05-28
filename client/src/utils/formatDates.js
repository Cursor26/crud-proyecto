/**
 * Fecha corta YYYY-MM-DD para celdas de tabla (ISO con T u otras cadenas).
 */
export function fmtFechaTabla(v) {
  if (v == null || v === '') return '—';
  const s = String(v).trim();
  if (s.includes('T')) return s.slice(0, 10);
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/**
 * Fecha y hora compactas para timestamps ISO (p. ej. archivado).
 */
export function fmtFechaHoraTabla(v) {
  if (v == null || v === '') return '—';
  const s = String(v).trim();
  if (s.includes('T')) {
    const date = s.slice(0, 10);
    const afterT = s.split('T')[1] || '';
    const hm = afterT.replace(/Z$/i, '').split('.')[0].slice(0, 5);
    return hm ? `${date} ${hm}` : date;
  }
  return s.length > 16 ? s.slice(0, 16) : s;
}
