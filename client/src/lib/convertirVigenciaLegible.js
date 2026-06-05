/**
 * Convierte vigencia almacenada a texto legible (años, meses y días enteros).
 */

import { esVigenciaPartes, partesVigenciaATexto, vigenciaAPartes } from './contratosVigencia';

export function convertirVigenciaLegible(aniosDecimal) {
  if (aniosDecimal === null || aniosDecimal === undefined || aniosDecimal === '') {
    return '';
  }

  const raw = String(aniosDecimal).trim();
  if (esVigenciaPartes(raw)) {
    const partes = vigenciaAPartes(raw);
    const y = parseInt(partes.anios || '0', 10) || 0;
    const m = parseInt(partes.meses || '0', 10) || 0;
    const d = parseInt(partes.dias || '0', 10) || 0;
    return partesVigenciaATexto({ anios: y, meses: m, dias: d });
  }

  const n = Number(aniosDecimal);
  if (!Number.isFinite(n) || n < 0) return '';

  const diasTotales = Math.floor(n * 365);
  if (diasTotales <= 0) return '0 días';

  const anios = Math.floor(diasTotales / 365);
  const meses = Math.floor((diasTotales % 365) / 30);
  const dias = (diasTotales % 365) % 30;

  return partesVigenciaATexto({ anios, meses, dias }) || '0 días';
}

/** Para tablas y modales: guion si no hay vigencia. */
export function vigenciaLegibleOGuion(aniosDecimal) {
  const texto = convertirVigenciaLegible(aniosDecimal);
  return texto || '—';
}
