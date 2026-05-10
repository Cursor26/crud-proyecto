/**
 * Textos de ayuda por módulo e índice (0..5). Mantener alineado con rrhhHerramientas6Bloques.js
 */
import { HERR6_MAP_A } from './rrhhHerramientas6Metadatos.mapA';
import { HERR6_MAP_B } from './rrhhHerramientas6Metadatos.mapB';
import { HERR6_MAP_C } from './rrhhHerramientas6Metadatos.mapC';

const DEF = {
  que: 'Análisis automático sobre los datos cargados para este módulo (refresca con el botón Refrescar si hace falta).',
  datos:
    'Si el listado devuelve cero filas, el gráfico o el KPI quedarán vacíos, con “0”, “—” o sin barras, según el bloque. Los totales y medias usan 0 o NaN eludido con coerción cuando el código lo indica. Lo que se muestra refleja solo lo traido a memoria, no cálculos de servidor adicionales salvo el endpoint indicado en cada módulo.',
};

const HERR6_MAP = {
  ...HERR6_MAP_A,
  ...HERR6_MAP_B,
  ...HERR6_MAP_C,
};

/**
 * @param {string} moduleKey
 * @param {number} index 0..5
 * @returns {{ titulo: string | null, queHace: string, datosYValores: string }}
 */
export function getHerramienta6Meta(moduleKey, index) {
  const list = HERR6_MAP[moduleKey];
  const i = Number(index);
  if (!Array.isArray(list) || !Number.isFinite(i) || i < 0 || i > 5) {
    return { titulo: null, queHace: DEF.que, datosYValores: DEF.datos };
  }
  const row = list[i];
  if (!row || !row.queHace) {
    return { titulo: null, queHace: DEF.que, datosYValores: DEF.datos };
  }
  return {
    titulo: row.titulo || null,
    queHace: row.queHace,
    datosYValores: row.datosYValores || DEF.datos,
  };
}
