/**
 * Totales de producción calculados en servidor (no persistidos en BD normalizada).
 * Sincronizado con client/src/utils/*Stats.js y validateProduccion.js
 */

const { CAMPOS_SACRIFICIO, CAMPOS_MATADERO, CAMPOS_LECHE } = require('../validateProduccion');

const HEMBRA_SM = ['terneras', 'aniojas', 'novillas', 'vacas'];
const MACHO_SM = ['terneros', 'aniojos', 'novillos', 'bueyes'];
const TOTAL_SM = ['total1', 'total2'];
const PLANTAS_LECHE = ['Zenea', 'Rosafe', 'Nazareno'];
const TOTALES_LECHE = ['total1', 'total2', 'total3', 'total4', 'total5', 'total'];

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function isTotalCategorySacMat(cat) {
  return TOTAL_SM.includes(cat);
}

function isTotalCategoryLeche(cat) {
  return TOTALES_LECHE.includes(cat);
}

/** Claves de métrica que se almacenan (sin categorías totalizadoras). */
function metricasAlmacenables(modulo) {
  const all =
    modulo === 'sacrificio' ? CAMPOS_SACRIFICIO
      : modulo === 'matadero' ? CAMPOS_MATADERO
        : CAMPOS_LECHE;
  const isTotal =
    modulo === 'leche'
      ? (clave) => {
          const idx = clave.indexOf('_');
          if (idx < 0) return false;
          return isTotalCategoryLeche(clave.slice(0, idx));
        }
      : (clave) => {
          const idx = clave.indexOf('_');
          if (idx < 0) return false;
          return isTotalCategorySacMat(clave.slice(0, idx));
        };
  return all.filter((k) => !isTotal(k));
}

function sufijosDesdeCampos(campos, categoriasBase) {
  const sufijos = new Set();
  for (const c of campos) {
    for (const cat of categoriasBase) {
      if (c.startsWith(`${cat}_`)) {
        sufijos.add(c.slice(cat.length + 1));
      }
    }
  }
  return [...sufijos];
}

function aplicarTotalesSacrificioMatadero(row, modulo) {
  const campos = modulo === 'sacrificio' ? CAMPOS_SACRIFICIO : CAMPOS_MATADERO;
  const out = { ...row };
  const sufijos = sufijosDesdeCampos(campos, [...HEMBRA_SM, ...MACHO_SM]);
  for (const suf of sufijos) {
    let t1 = 0;
    let t2 = 0;
    for (const c of HEMBRA_SM) t1 += num(out[`${c}_${suf}`]);
    for (const c of MACHO_SM) t2 += num(out[`${c}_${suf}`]);
    out[`total1_${suf}`] = t1;
    out[`total2_${suf}`] = t2;
  }
  return out;
}

function aplicarTotalesLeche(row) {
  const out = { ...row };
  const sufijos = sufijosDesdeCampos(CAMPOS_LECHE, PLANTAS_LECHE);
  for (const suf of sufijos) {
    let sumaPlantas = 0;
    for (const p of PLANTAS_LECHE) sumaPlantas += num(out[`${p}_${suf}`]);
    out[`total1_${suf}`] = sumaPlantas;
    out[`total2_${suf}`] = sumaPlantas;
    out[`total3_${suf}`] = sumaPlantas;
    out[`total4_${suf}`] = sumaPlantas;
    out[`total5_${suf}`] = sumaPlantas;
    out[`total_${suf}`] = sumaPlantas;
  }
  return out;
}

function enriquecerRegistroProduccion(modulo, row) {
  if (!row || typeof row !== 'object') return row;
  const base = { ...row };
  if (modulo === 'leche') return aplicarTotalesLeche(base);
  if (modulo === 'sacrificio' || modulo === 'matadero') return aplicarTotalesSacrificioMatadero(base, modulo);
  return base;
}

function stripTotalesParaGuardar(modulo, data) {
  const out = { ...data };
  const almacenables = metricasAlmacenables(modulo);
  const keys = Object.keys(out);
  for (const k of keys) {
    if (k === 'fecha' || k === 'creado_por' || k === 'actualizado_por') continue;
    if (!almacenables.includes(k)) delete out[k];
  }
  return out;
}

module.exports = {
  metricasAlmacenables,
  enriquecerRegistroProduccion,
  stripTotalesParaGuardar,
  CAMPOS_SACRIFICIO,
  CAMPOS_MATADERO,
  CAMPOS_LECHE,
};
