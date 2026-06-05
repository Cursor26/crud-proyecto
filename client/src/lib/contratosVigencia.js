/**
 * Vigencia del contrato: años, meses y días enteros.
 * Almacenamiento: "Y|M|D" (ej. "1|6|15"). Compatible con decimales legacy (años).
 */

const PARTES_RE = /^(\d+)\|(\d+)\|(\d+)$/;

export function esVigenciaPartes(valor) {
  return PARTES_RE.test(String(valor ?? '').trim());
}

export function vigenciaAPartes(valor) {
  const raw = String(valor ?? '').trim();
  if (!raw) return { anios: '', meses: '', dias: '' };

  const match = raw.match(PARTES_RE);
  if (match) {
    return {
      anios: match[1] === '0' ? '' : match[1],
      meses: match[2] === '0' ? '' : match[2],
      dias: match[3] === '0' ? '' : match[3],
    };
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { anios: '', meses: '', dias: '' };

  const diasTotales = Math.floor(n * 365);
  if (diasTotales <= 0) return { anios: '', meses: '', dias: '' };

  const anios = Math.floor(diasTotales / 365);
  const meses = Math.floor((diasTotales % 365) / 30);
  const dias = (diasTotales % 365) % 30;

  return {
    anios: anios > 0 ? String(anios) : '',
    meses: meses > 0 ? String(meses) : '',
    dias: dias > 0 ? String(dias) : '',
  };
}

export function partesAVigenciaAlmacenada(partes) {
  const y = Math.max(0, parseInt(String(partes?.anios ?? ''), 10) || 0);
  const m = Math.max(0, parseInt(String(partes?.meses ?? ''), 10) || 0);
  const d = Math.max(0, parseInt(String(partes?.dias ?? ''), 10) || 0);
  if (y === 0 && m === 0 && d === 0) return '';
  return `${y}|${m}|${d}`;
}

export function partesVigenciaATexto(partes) {
  const y = Math.max(0, parseInt(String(partes?.anios ?? ''), 10) || 0);
  const m = Math.max(0, parseInt(String(partes?.meses ?? ''), 10) || 0);
  const d = Math.max(0, parseInt(String(partes?.dias ?? ''), 10) || 0);
  const segmentos = [];
  if (y > 0) segmentos.push(`${y} ${y === 1 ? 'año' : 'años'}`);
  if (m > 0) segmentos.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
  if (d > 0) segmentos.push(`${d} ${d === 1 ? 'día' : 'días'}`);
  return segmentos.length ? segmentos.join(', ') : '';
}

export function vigenciaAlmacenadaATexto(valor) {
  const raw = String(valor ?? '').trim();
  if (!raw) return '';
  if (esVigenciaPartes(raw)) {
    const [y, m, d] = raw.split('|').map((x) => parseInt(x, 10) || 0);
    return partesVigenciaATexto({ anios: y, meses: m, dias: d });
  }
  return null;
}

/** Suma la vigencia a una fecha ISO (YYYY-MM-DD). */
export function sumarFechaConVigencia(fechaStr, valorVigencia) {
  if (!fechaStr) return fechaStr;
  const raw = String(valorVigencia ?? '').trim();
  if (!raw) return '';

  const fecha = new Date(`${fechaStr}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return '';

  if (esVigenciaPartes(raw)) {
    const [y, m, d] = raw.split('|').map((x) => parseInt(x, 10) || 0);
    fecha.setFullYear(fecha.getFullYear() + y);
    fecha.setMonth(fecha.getMonth() + m);
    fecha.setDate(fecha.getDate() + d);
  } else {
    const vigencia = parseFloat(raw);
    if (Number.isNaN(vigencia)) return '';
    const entero = Math.trunc(vigencia);
    const decimal = vigencia - entero;
    fecha.setFullYear(fecha.getFullYear() + entero);
    fecha.setDate(fecha.getDate() + Math.trunc(decimal * 365.25));
  }

  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export function sanitizarEnteroVigencia(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}
