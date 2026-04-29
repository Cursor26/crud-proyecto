/**
 * Validación de cuerpos de producción (sincronizada con el cliente):
 * vacío/null → 0, ceros permitidos, sin negativos, fecha por defecto hoy.
 */

function fechaHoyLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const categoriasSM = [
  'terneras', 'aniojas', 'novillas', 'vacas', 'total1',
  'terneros', 'aniojos', 'novillos', 'bueyes', 'total2',
];

const sufijosSacrificio = [
  'Cbz_sal', 'Kg_sal', 'Cbz_tur', 'Kg_tur', 'Cbz_in', 'Kg_in',
  'Cbz_p', 'Kg_p', 'Cbz_t', 'Kg_t', 'Cbz_m', 'Kg_m',
  'Cab_se', 'Kg_se', 'Cbz_sc', 'Kg_sc', 'Cbz_st', 'Tm_st',
];
const CAMPOS_SACRIFICIO = [];
categoriasSM.forEach((cat) => {
  sufijosSacrificio.forEach((suf) => {
    CAMPOS_SACRIFICIO.push(`${cat}_${suf}`);
  });
});

const sufijosMatadero = [
  'Cbz_ind', 'Kg_ind', 'Cbz_4ta', 'Kg_4ta', 'Cbz_1ra', 'Kg_1ra',
  'Cab_2da', 'Kg_2da', 'Cab_3ra', 'Kg_3ra', 'Cab', 'Kg',
];
const CAMPOS_MATADERO = [];
categoriasSM.forEach((cat) => {
  sufijosMatadero.forEach((suf) => {
    CAMPOS_MATADERO.push(`${cat}_${suf}`);
  });
});

const categoriasLeche = [
  'Zenea', 'Rosafe', 'Nazareno',
  'total1', 'total2', 'total3', 'total4', 'total5', 'total',
];
const sufijosLeche = [
  'Vacas_total', 'Vacas_ordeño', 'Produccion_total', 'Total_ventas',
  'Total_contra', 'Total_indust', 'Acopio', 'Queso_ALGIBE', 'Queso_COMP',
  'Ollo', 'Poblac_CAMP', 'Vtas_Trab', 'ORGA', 'TOTAL',
  'Recria', 'Vaq', 'Cabras', 'Torll', 'Perd',
];
const CAMPOS_LECHE = [];
categoriasLeche.forEach((cat) => {
  sufijosLeche.forEach((suf) => {
    CAMPOS_LECHE.push(`${cat}_${suf}`);
  });
});

/**
 * @param {Record<string, unknown>} body
 * @param {string[]} campos
 * @returns {{ ok: true, data: object } | { ok: false, message: string, campo?: string }}
 */
function validarYNormalizarProduccion(body, campos) {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Cuerpo de solicitud no válido.' };
  }
  const rawFecha = body.fecha;
  let fecha;
  if (rawFecha == null || String(rawFecha).trim() === '') {
    fecha = fechaHoyLocalISO();
  } else {
    fecha = String(rawFecha).split('T')[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return { ok: false, message: 'La fecha debe tener formato AAAA-MM-DD o dejarse vacía para usar la de hoy.' };
    }
  }

  const data = { fecha };
  for (const c of campos) {
    const v = body[c];
    if (v === undefined || v === null) {
      data[c] = 0;
      continue;
    }
    const s = String(v).trim();
    if (s === '') {
      data[c] = 0;
      continue;
    }
    const n = parseFloat(s.replace(',', '.'));
    if (Number.isNaN(n)) {
      return { ok: false, message: `El campo ${c} debe ser un número válido.`, campo: c };
    }
    if (n < 0) {
      return { ok: false, message: `El campo ${c} no puede ser negativo.`, campo: c };
    }
    if (!Number.isFinite(n)) {
      return { ok: false, message: `El campo ${c} no es un número finito.`, campo: c };
    }
    data[c] = n;
  }
  return { ok: true, data };
}

function validarSacrificio(body) {
  return validarYNormalizarProduccion(body, CAMPOS_SACRIFICIO);
}
function validarMatadero(body) {
  return validarYNormalizarProduccion(body, CAMPOS_MATADERO);
}
function validarLeche(body) {
  return validarYNormalizarProduccion(body, CAMPOS_LECHE);
}

module.exports = {
  validarSacrificio,
  validarMatadero,
  validarLeche,
  CAMPOS_SACRIFICIO,
  CAMPOS_MATADERO,
  CAMPOS_LECHE,
};
