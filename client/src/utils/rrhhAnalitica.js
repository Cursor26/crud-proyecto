/**
 * Cálculos reutilizables para el panel de 24 herramientas de RR.HH.
 * @param {object} e
 */
export function empleadoEsActivo(e) {
  return e.activo == null || e.activo === 1 || e.activo === '1';
}

/**
 * @param {unknown} v
 * @returns {number|null}
 */
export function parseSalarioNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
}

/**
 * @param {object[]} empleados
 * @param {(e: object) => string} keyFn
 * @param {number} [topN=12]
 * @returns {{ name: string, value: number }[]}
 */
export function agregadoPorCategoria(empleados, keyFn, topN = 12) {
  const map = new Map();
  for (const e of empleados) {
    const k = String(keyFn(e) || '(sin dato)').trim() || '(sin dato)';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/**
 * @param {object[]} empleados
 * @param {string} dep
 * @returns {object[]}
 */
export function empleadosPorDepartamento(empleados, dep) {
  const t = String(dep || '').trim();
  if (!t) return [];
  return empleados.filter((e) => String(e.departamento || '').trim() === t);
}

/**
 * @param {object[]} empleados
 * @returns {{ mes: string, n: number }[]}
 */
export function bajasPorMes(empleados) {
  const map = new Map();
  for (const e of empleados) {
    if (empleadoEsActivo(e)) continue;
    const raw = e.fecha_baja;
    if (raw == null) continue;
    const s = raw instanceof Date ? raw.toISOString() : String(raw);
    const ymd = s.split('T')[0].split(' ')[0];
    const mes = ymd.slice(0, 7);
    if (mes.length < 7) continue;
    map.set(mes, (map.get(mes) || 0) + 1);
  }
  return [...map.entries()]
    .map(([mes, n]) => ({ mes, n }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * @param {object[]} empleados
 * @param {string} depto1
 * @param {string} depto2
 */
export function compararDeptos(empleados, depto1, depto2) {
  const a1 = empleadosPorDepartamento(empleados.filter(empleadoEsActivo), depto1);
  const a2 = empleadosPorDepartamento(empleados.filter(empleadoEsActivo), depto2);
  const media = (arr) => {
    const nums = arr.map((e) => parseSalarioNum(e.salario_normal)).filter((n) => n != null);
    if (nums.length === 0) return null;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  };
  return {
    n1: a1.length,
    n2: a2.length,
    m1: media(a1),
    m2: media(a2),
  };
}

/**
 * @param {object[]} empleadosActivos
 * @param {number} nBuckets
 */
export function histogramaSalario(empleadosActivos, nBuckets = 8) {
  const nums = empleadosActivos.map((e) => parseSalarioNum(e.salario_normal)).filter((n) => n != null);
  if (nums.length === 0) {
    return { filas: [], min: 0, max: 0 };
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max - min < 1e-9) {
    return { filas: [{ label: `${min.toFixed(0)}`, n: nums.length }], min, max };
  }
  const step = (max - min) / nBuckets;
  const filas = [];
  for (let i = 0; i < nBuckets; i += 1) {
    const lo = min + i * step;
    const hi = min + (i + 1) * step;
    const n = nums.filter(
      (v) => (i === nBuckets - 1 ? v >= lo && v <= max : v >= lo && v < hi)
    ).length;
    filas.push({
      label: `${Math.round(lo)} – ${Math.round(i === nBuckets - 1 ? max : hi)}`,
      n,
    });
  }
  return { filas, min, max };
}

/**
 * @param {object[]} empleados
 * @param {(e: object) => string|null|undefined} fieldFn
 */
export function contarCampoTexto(empleados, fieldFn) {
  const map = new Map();
  for (const e of empleados) {
    const v = String(fieldFn(e) != null && String(fieldFn(e)).trim() ? fieldFn(e) : '(sin dato)').trim();
    map.set(v, (map.get(v) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Inactivos con fecha, orden reciente
 * @param {object[]} empleados
 * @param {number} n
 */
export function ultimasBajas(empleados, n = 10) {
  return empleados
    .filter((e) => !empleadoEsActivo(e) && e.fecha_baja)
    .map((e) => {
      const s = e.fecha_baja instanceof Date ? e.fecha_baja.toISOString() : String(e.fecha_baja);
      const d = s.split('T')[0].split(' ')[0];
      return { ...e, _sort: d };
    })
    .sort((a, b) => b._sort.localeCompare(a._sort))
    .slice(0, n);
}

/**
 * Escala de color simple para matriz
 * @param {number} t 0-1
 */
export function colorHeat(t) {
  const a = `rgba(13, 110, 253, ${0.15 + t * 0.65})`;
  return a;
}
