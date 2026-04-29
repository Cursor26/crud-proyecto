/**
 * Análisis de registros de leche: producción y vacas por categoría; totales y plantas.
 */

export const LECHE_CATEGORIAS = ['Zenea', 'Rosafe', 'Nazareno', 'total1', 'total2', 'total3', 'total4', 'total5', 'total'];
const LECHE_PLANTAS = ['Zenea', 'Rosafe', 'Nazareno'];

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @returns {{ kg: number, cab: number, kgH: number, cabH: number, kgM: number, cabM: number }}
 * `kgH` = producción de las 3 plantas; `kgM` = resto (totales y consolidado).
 */
export function metricasDia(reg) {
  const sumSuf = (suf) => LECHE_CATEGORIAS.reduce((s, c) => s + num(reg[`${c}_${suf}`]), 0);
  const kgT = num(reg.total_Produccion_total) || sumSuf('Produccion_total');
  const cabT = num(reg.total_Vacas_total) || sumSuf('Vacas_total');
  let kgPla = 0;
  for (const c of LECHE_PLANTAS) {
    kgPla += num(reg[`${c}_Produccion_total`]);
  }
  const kgResto = Math.max(0, kgT - kgPla);
  return {
    kg: kgT,
    cab: cabT,
    kgH: kgPla,
    cabH: cabT / 2,
    kgM: kgResto,
    cabM: cabT / 2,
  };
}

function fechaKey(f) {
  if (!f) return '';
  return String(f).split('T')[0];
}

/**
 * @param {object[]} registros
 * @param {string} [desde] YYYY-MM-DD
 * @param {string} [hasta] YYYY-MM-DD
 */
export function filtrarPorRango(registros, desde, hasta) {
  if (!registros?.length) return [];
  const d0 = desde ? String(desde).split('T')[0] : null;
  const d1 = hasta ? String(hasta).split('T')[0] : null;
  return registros
    .map((r) => ({ ...r, _fk: fechaKey(r.fecha) }))
    .filter((r) => {
      if (!r._fk) return false;
      if (d0 && r._fk < d0) return false;
      if (d1 && r._fk > d1) return false;
      return true;
    })
    .sort((a, b) => a._fk.localeCompare(b._fk));
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function stdSample(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

/**
 * @param {object[]} enRango ordenados por fecha asc
 */
export function resumenPeriodo(enRango) {
  if (!enRango.length) {
    return {
      dias: 0,
      sumKg: 0,
      sumCab: 0,
      promDiaKg: 0,
      promDiaCab: 0,
      kgPorCabeza: null,
    };
  }
  let sumKg = 0;
  let sumCab = 0;
  for (const r of enRango) {
    const m = metricasDia(r);
    sumKg += m.kg;
    sumCab += m.cab;
  }
  const d = enRango.length;
  return {
    dias: d,
    sumKg,
    sumCab,
    promDiaKg: sumKg / d,
    promDiaCab: sumCab / d,
    kgPorCabeza: sumCab > 0 ? sumKg / sumCab : null,
  };
}

/**
 * Compara enRango con el bloque inmediatamente anterior de la misma cantidad de registros
 * en la serie cronológica completa.
 */
export function compararConPeriodoAnterior(todos, enRango) {
  if (enRango.length === 0) {
    return { aplica: false, motivo: 'No hay días en el rango elegido.' };
  }
  const n = enRango.length;
  const full = listaCronologica(todos);
  const first = enRango[0]._fk;
  const last = enRango[enRango.length - 1]._fk;
  const idx = full.findIndex((r) => r._fk === first);
  if (idx < 0) {
    return { aplica: false, motivo: 'No se pudo ubicar el inicio del período en el histórico.' };
  }
  if (idx < n) {
    return {
      aplica: false,
      motivo: 'No hay suficientes registros anteriores en el historial (se comparan con los N días inmediatamente previos, N = cantidad de días en tu rango).',
    };
  }
  const bloqueAnterior = full.slice(idx - n, idx);
  const ref = resumenPeriodo(enRango);
  const prev = resumenPeriodo(bloqueAnterior);
  const pct = (a, b) => (b == null || b === 0 ? null : ((a - b) / b) * 100);
  return {
    aplica: true,
    refInicio: first,
    refFin: last,
    prevInicio: bloqueAnterior[0]._fk,
    prevFin: bloqueAnterior[bloqueAnterior.length - 1]._fk,
    varKg: pct(ref.sumKg, prev.sumKg),
    varCab: pct(ref.sumCab, prev.sumCab),
    varKgCabeza:
      ref.kgPorCabeza != null && prev.kgPorCabeza
        ? pct(ref.kgPorCabeza, prev.kgPorCabeza)
        : null,
    actual: ref,
    anterior: prev,
  };
}

/**
 * Serie diaria (orden cronológico) con media móvil de `ventana` días.
 */
export function serieConMediaMovil(enRango, ventana = 7) {
  const rows = enRango.map((r) => {
    const m = metricasDia(r);
    return { fecha: r._fk, kg: m.kg, cab: m.cab };
  });
  const out = rows.map((row, i) => {
    const from = Math.max(0, i - ventana + 1);
    const slice = rows.slice(from, i + 1);
    const maKg = mean(slice.map((s) => s.kg));
    const maCab = mean(slice.map((s) => s.cab));
    return { ...row, maKg, maCab };
  });
  return out;
}

export function topDias(enRango, limite = 10, criterio = 'kg') {
  const arr = enRango.map((r) => {
    const m = metricasDia(r);
    return { fecha: r._fk, kg: m.kg, cab: m.cab };
  });
  const key = criterio === 'cab' ? 'cab' : 'kg';
  return [...arr].sort((a, b) => b[key] - a[key]).slice(0, limite);
}

/**
 * Días cuyo kg se aleja de la media más de `z` desviaciones estándar.
 */
export function detectarDiasAtipicos(enRango, z = 1.75) {
  if (enRango.length < 3) {
    return { aplica: false, filas: [], media: 0, desv: 0 };
  }
  const kgs = enRango.map((r) => metricasDia(r).kg);
  const mu = mean(kgs);
  const sigma = stdSample(kgs);
  if (sigma === 0) {
    return { aplica: true, filas: [], media: mu, desv: 0, motivo: 'Sin variación en el período.' };
  }
  const filas = [];
  enRango.forEach((r) => {
    const kg = metricasDia(r).kg;
    const dev = (kg - mu) / sigma;
    if (Math.abs(dev) >= z) {
      filas.push({ fecha: r._fk, kg, desviaciones: dev, tipo: dev > 0 ? 'alto' : 'bajo' });
    }
  });
  return { aplica: true, filas, media: mu, desv: sigma };
}

/**
 * Misma lógica que `detectarDiasAtipicos` con métrica arbitraria.
 */
export function detectarDiasAtipicosCustom(enRango, getVal, z = 1.75) {
  if (enRango.length < 3) {
    return { aplica: false, filas: [], media: 0, desv: 0, motivo: 'Mín. 3 días' };
  }
  const kgs = enRango.map((r) => getVal(r));
  const mu = mean(kgs);
  const sigma = stdSample(kgs);
  if (sigma === 0) {
    return { aplica: true, filas: [], media: mu, desv: 0, motivo: 'Sin variación en el período.' };
  }
  const filas = [];
  enRango.forEach((r) => {
    const v0 = getVal(r);
    const dev = (v0 - mu) / sigma;
    if (Math.abs(dev) >= z) {
      filas.push({ fecha: r._fk, v: v0, desviaciones: dev, tipo: dev > 0 ? 'alto' : 'bajo' });
    }
  });
  return { aplica: true, filas, media: mu, desv: sigma };
}

/**
 * Proyección de kg totales al cierre del mes calendario que contiene `mesReferencia` (YYYY-MM-DD),
 * usando el ritmo promedio observado en `enRango`.
 */
export function proyeccionFinMes(enRango, mesReferencia) {
  if (!enRango.length) {
    return { aplica: false, motivo: 'Sin datos en el rango.' };
  }
  const ref = String(mesReferencia || enRango[0]._fk).split('T')[0];
  const [Y, M] = ref.split('-').map(Number);
  if (!Y || !M) {
    return { aplica: false, motivo: 'Fecha de referencia inválida.' };
  }
  const lastDay = new Date(Y, M, 0).getDate();
  const diasMes = lastDay;
  const suma = resumenPeriodo(enRango).sumKg;
  const diasDatos = enRango.length;
  const ritmo = suma / diasDatos;
  const proyectado = ritmo * diasMes;
  return {
    aplica: true,
    anio: Y,
    mes: M,
    diasEnMes: diasMes,
    diasConRegistro: diasDatos,
    sumaKgRango: suma,
    ritmoDiario: ritmo,
    kgProyectadosMes: proyectado,
  };
}

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Suma de kg y cab por día de la semana (0=domingo).
 */
export function agregadoPorDiaSemana(enRango) {
  const acc = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { kg: 0, cab: 0, n: 0 }]));
  for (const r of enRango) {
    const d = new Date(r._fk + 'T12:00:00');
    const w = d.getDay();
    const m = metricasDia(r);
    acc[w].kg += m.kg;
    acc[w].cab += m.cab;
    acc[w].n += 1;
  }
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dia: d,
    label: DIAS_ES[d],
    ...acc[d],
    promKg: acc[d].n ? acc[d].kg / acc[d].n : 0,
  }));
}

/**
 * % del total de kg (período) atribuible a hembras (total1) vs machos (total2).
 */
export function distribucionHembraMacho(enRango) {
  let hKg = 0;
  let mKg = 0;
  for (const r of enRango) {
    const t = metricasDia(r);
    hKg += t.kgH;
    mKg += t.kgM;
  }
  const t = hKg + mKg;
  if (t === 0) {
    return { aplica: false, hembrasPct: 0, machosPct: 0 };
  }
  return {
    aplica: true,
    hembrasPct: (hKg / t) * 100,
    machosPct: (mKg / t) * 100,
    kgH: hKg,
    kgM: mKg,
  };
}

/**
 * Todos los registros ordenados por fecha ascendente (una fila por fecha en API).
 */
export function listaCronologica(todos) {
  return [...(todos || [])]
    .map((r) => ({ ...r, _fk: fechaKey(r.fecha) }))
    .filter((r) => r._fk)
    .sort((a, b) => a._fk.localeCompare(b._fk));
}

export function formateaNum(n, dec = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);
}

export function formateaPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

/** Rango por defecto: últimos 30 días respecto a la fecha más reciente con dato. */
export function rangoDefaultUltimosDias(todos, dias = 30) {
  const list = listaCronologica(todos);
  if (!list.length) return { desde: '', hasta: '' };
  const last = list[list.length - 1]._fk;
  const d = new Date(`${last}T12:00:00`);
  d.setDate(d.getDate() - (dias - 1));
  const desde = d.toISOString().slice(0, 10);
  return { desde, hasta: last };
}

export function filtrarPorMesCalendario(todos, y, m) {
  if (!y || !m) return [];
  return listaCronologica(todos).filter((r) => {
    const p = r._fk.split('-');
    return Number(p[0]) === y && Number(p[1]) === m;
  });
}

/**
 * @param {number} metaKg Objetivo de kg en el mes.
 */
export function evaluarMetaMensual(todos, y, m, metaKg) {
  const en = filtrarPorMesCalendario(todos, y, m);
  if (!en.length) {
    return { aplica: false, motivo: 'No hay datos cargados en ese mes.' };
  }
  const refDia = `${y}-${String(m).padStart(2, '0')}-15`;
  const p = proyeccionFinMes(en, refDia);
  if (!p.aplica) {
    return { aplica: false, motivo: p.motivo || 'No se pudo calcular la proyección.' };
  }
  const proy = p.kgProyectadosMes;
  const target = num(metaKg);
  if (target <= 0) {
    return { aplica: false, motivo: 'Indicá una meta mayor a 0.' };
  }
  const brecha = proy - target;
  const cumplPct = (proy / target) * 100;
  return {
    aplica: true,
    metaKg: target,
    proyectadoKg: proy,
    brechaKg: brecha,
    cumplimientoProyectadoPct: cumplPct,
    ritmoDiario: p.ritmoDiario,
    diasConRegistro: p.diasConRegistro,
  };
}

export const TODAS_CATEGORIAS = [...LECHE_CATEGORIAS];

/** Suma total1_ + total2_ para un sufijo; si es 0, suma el detalle por categoría. */
export function valorDiaSufijo(reg, suffix) {
  const t = num(reg[`total1_${suffix}`]) + num(reg[`total2_${suffix}`]);
  if (t > 0) return t;
  let s = 0;
  for (const c of TODAS_CATEGORIAS) {
    s += num(reg[`${c}_${suffix}`]);
  }
  return s;
}

/**
 * Suma Kg (columna _m) solo de las categorías incluidas.
 * @param {string[]} catSet nombres de categoría, ej. ['terneras','vacas']
 */
export function metricasPorCategorias(reg, catSet) {
  let kg = 0;
  let cab = 0;
  for (const c of catSet) {
    if (!TODAS_CATEGORIAS.includes(c)) continue;
    kg += num(reg[`${c}_Produccion_total`]);
    cab += num(reg[`${c}_Vacas_total`]);
  }
  return { kg, cab };
}

/**
 * @param {function} getVal (reg) => number
 */
export function resumenConGetter(enRango, getVal) {
  if (!enRango.length) {
    return { dias: 0, sum: 0, prom: 0 };
  }
  let sum = 0;
  for (const r of enRango) {
    sum += getVal(r);
  }
  return { dias: enRango.length, sum, prom: sum / enRango.length };
}

/**
 * Compara dos rangos de fechas (métrica kg default con metricasDia).
 */
export function compararRangosLibres(
  todos,
  desdeA,
  hastaA,
  desdeB,
  hastaB,
  getVal = (r) => metricasDia(r).kg,
) {
  const A = filtrarPorRango(todos, desdeA, hastaA);
  const B = filtrarPorRango(todos, desdeB, hastaB);
  if (!A.length || !B.length) {
    return {
      aplica: false,
      motivo: 'Ambos rangos deben tener al menos un registro.',
    };
  }
  const rA = resumenConGetter(A, getVal);
  const rB = resumenConGetter(B, getVal);
  const pct = (a, b) => (b === 0 ? null : ((a - b) / b) * 100);
  return {
    aplica: true,
    nA: A.length,
    nB: B.length,
    sumA: rA.sum,
    sumB: rB.sum,
    promA: rA.prom,
    promB: rB.prom,
    varSumaPct: pct(rA.sum, rB.sum),
    varPromPct: pct(rA.prom, rB.prom),
  };
}

function lunesDeSemana(ymd) {
  const d = new Date(`${ymd}T12:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const nd = new Date(d.setDate(diff));
  return nd.toISOString().slice(0, 10);
}

/** Suma de getVal(r) por semana (lunes como clave). */
export function agregarPorSemana(enRango, getVal) {
  const m = new Map();
  for (const r of enRango) {
    const wk = lunesDeSemana(r._fk);
    m.set(wk, (m.get(wk) || 0) + getVal(r));
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([semana, suma]) => ({ semana, suma, label: `Sem. ${semana}` }));
}

export function serieAcumuladaValores(enRango, getVal) {
  let acc = 0;
  return enRango.map((r) => {
    const v = getVal(r);
    acc += v;
    return { fecha: r._fk, v, acc };
  });
}

export function filtrarMinValor(enRango, min, getVal) {
  return enRango.filter((r) => getVal(r) >= min);
}

export function filtrarLunesAViernes(enRango) {
  return enRango.filter((r) => {
    const w = new Date(`${r._fk}T12:00:00`).getDay();
    return w >= 1 && w <= 5;
  });
}

function ultimoDiaMes(a, m) {
  return new Date(a, m, 0).getDate();
}

/**
 * Compara el mismo mes calendario en dos años.
 * @param {function} [getVal] (reg) => número; default kg clásico.
 */
export function compararMesDosAnios(todos, mes, anioA, anioB, getVal) {
  if (!mes || !anioA || !anioB) {
    return { aplica: false, motivo: 'Completar mes y ambos años.' };
  }
  const pad = (m0) => String(m0).padStart(2, '0');
  const finA = `${anioA}-${pad(mes)}-${String(ultimoDiaMes(anioA, mes)).padStart(2, '0')}`;
  const finB = `${anioB}-${pad(mes)}-${String(ultimoDiaMes(anioB, mes)).padStart(2, '0')}`;
  const desdeA = `${anioA}-${pad(mes)}-01`;
  const desdeB = `${anioB}-${pad(mes)}-01`;
  const g = getVal && typeof getVal === 'function' ? getVal : (r) => metricasDia(r).kg;
  return compararRangosLibres(todos, desdeA, finA, desdeB, finB, g);
}

export function whatIfAjusteProyeccion(ritmo, diasEnMes, pctAjuste) {
  return ritmo * (1 + num(pctAjuste) / 100) * diasEnMes;
}

/**
 * Cuantiles empíricos; vals numérico.
 */
export function percentilesDeValores(vals, ps = [0.1, 0.25, 0.5, 0.75, 0.9]) {
  if (!vals.length) return { aplica: false, motivo: 'Sin datos.' };
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  const q = (p) => {
    if (n === 1) return s[0];
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  const out = {};
  for (const p of ps) {
    out[`p${String(Math.round(p * 100))}`] = q(p);
  }
  return { aplica: true, n, out, min: s[0], max: s[n - 1] };
}

/**
 * y = a + b*x, x = 0,1,...,n-1
 */
export function regresionLinealSerie(serieY) {
  if (!serieY || serieY.length < 2) {
    return { aplica: false, motivo: 'Se necesitan al menos 2 puntos.' };
  }
  const n = serieY.length;
  const xs = [...Array(n).keys()];
  const mx = mean(xs);
  const my = mean(serieY);
  let numE = 0;
  let denE = 0;
  for (let i = 0; i < n; i += 1) {
    numE += (xs[i] - mx) * (serieY[i] - my);
    denE += (xs[i] - mx) ** 2;
  }
  if (denE === 0) {
    return { aplica: true, a: my, b: 0, n, pendientePorDia: 0 };
  }
  const b = numE / denE;
  const a = my - b * mx;
  return { aplica: true, a, b, n, pendientePorDia: b };
}

/**
 * Celdas para un mes (domingo=primera col). `getVal(yyyy-mm-dd)`.
 */
export function grillaCalendarioMes(anio, mes, getVal) {
  const y = anio;
  const m0 = mes;
  const first = new Date(y, m0 - 1, 1);
  const last = new Date(y, m0, 0).getDate();
  const startPad = first.getDay();
  const out = [];
  for (let i = 0; i < startPad; i += 1) {
    out.push({ tipo: 'empty' });
  }
  for (let d = 1; d <= last; d += 1) {
    const fk = `${y}-${String(m0).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push({ tipo: 'day', fecha: fk, v: getVal(fk) });
  }
  return out;
}

/** Media móvil sobre cualquier getVal. */
export function serieConMediaMovilCustom(enRango, getVal, ventana = 7) {
  const rows = enRango.map((r) => ({ fecha: r._fk, v: getVal(r) }));
  return rows.map((row, i) => {
    const from = Math.max(0, i - ventana + 1);
    const slice = rows.slice(from, i + 1);
    const ma = mean(slice.map((s) => s.v));
    return { ...row, ma };
  });
}
