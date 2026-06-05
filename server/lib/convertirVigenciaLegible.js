/**
 * Misma lógica que client/src/lib/convertirVigenciaLegible.js (solo presentación).
 */

function convertirVigenciaLegible(aniosDecimal) {
  if (aniosDecimal === null || aniosDecimal === undefined || aniosDecimal === '') {
    return '';
  }

  const n = Number(aniosDecimal);
  if (!Number.isFinite(n) || n < 0) return '';

  const diasTotales = Math.floor(n * 365);
  if (diasTotales <= 0) return '0 días';

  const anios = Math.floor(diasTotales / 365);
  const meses = Math.floor((diasTotales % 365) / 30);
  const dias = (diasTotales % 365) % 30;

  const partes = [];

  if (anios > 0) {
    partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  }
  if (meses > 0) {
    partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  }
  if (dias > 0) {
    partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
  }

  if (partes.length === 0) return '0 días';
  return partes.join(', ');
}

module.exports = { convertirVigenciaLegible };
