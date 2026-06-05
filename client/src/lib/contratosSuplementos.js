export function parseSuplementosFromContrato(contrato) {
  const raw = contrato?.suplementos;
  if (raw == null || raw === '') return { legacyText: null, items: [] };
  const s = String(raw).trim();
  if (!s) return { legacyText: null, items: [] };
  if (s.startsWith('[') || s.startsWith('{')) {
    try {
      const data = JSON.parse(s);
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const items = arr
        .map((it, idx) => ({
          id: String(it?.clienteId || it?.cliente_id || `sup_${idx}_${Date.now()}`),
          numero: Number(it?.numero) > 0 ? Number(it.numero) : idx + 1,
          nombre: String(it?.nombre || '').trim(),
          tipo: it?.tipo === 'word' ? 'word' : 'pdf',
          dataUrl: String(it?.dataUrl || ''),
          serverId: it?.serverId != null ? Number(it.serverId) : it?.server_id != null ? Number(it.server_id) : null,
        }))
        .filter((it) => it.nombre || it.dataUrl || it.serverId);
      return { legacyText: null, items: renumerarSuplementosLista(items) };
    } catch {
      return { legacyText: s, items: [] };
    }
  }
  return { legacyText: s, items: [] };
}

export function renumerarSuplementosLista(items) {
  return (Array.isArray(items) ? items : []).map((it, idx) => ({
    ...it,
    numero: idx + 1,
  }));
}

export function prepararSuplementosPayload(items) {
  const list = renumerarSuplementosLista(items);
  return {
    suplementos: list.length
      ? JSON.stringify(
          list.map((it) => ({
            numero: it.numero,
            nombre: it.nombre,
            tipo: it.tipo === 'word' ? 'word' : 'pdf',
            clienteId: it.id || null,
            serverId: it.serverId || null,
          }))
        )
      : null,
  };
}

export function resumenSuplementos(contrato) {
  const { legacyText, items } = parseSuplementosFromContrato(contrato);
  if (items.length) {
    return items.map((it) => `Suplemento ${it.numero}: ${it.nombre || 'documento'}`).join('; ');
  }
  return legacyText || '';
}

/** Cantidad de suplementos documentales del contrato (opcional: lista en caché local). */
export function cantidadSuplementosContrato(contrato, listaCache) {
  const { items } = parseSuplementosFromContrato(contrato);
  const cacheLen = Array.isArray(listaCache) ? listaCache.length : 0;
  return Math.max(items.length, cacheLen);
}

/** Texto para celda de tabla: cantidad o guion. */
export function celdaSuplementosTabla(contrato, listaCache) {
  const n = cantidadSuplementosContrato(contrato, listaCache);
  if (n <= 0) return '—';
  const { items } = parseSuplementosFromContrato(contrato);
  const nums = (listaCache?.length ? listaCache : items).map((it, i) => it.numero || i + 1);
  const title = nums.length ? `Suplementos: ${nums.join(', ')}` : `${n} suplemento(s)`;
  return { display: String(n), title };
}

export const SUPLEMENTO_ACCEPT = {
  pdf: 'application/pdf,.pdf',
  word: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function esArchivoSuplementoValido(file, tipo) {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  const max = 5 * 1024 * 1024;
  if (file.size > max) return false;
  if (tipo === 'word') {
    return (
      name.endsWith('.doc') ||
      name.endsWith('.docx') ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}

export function etiquetaTipoSuplemento(tipo) {
  return tipo === 'word' ? 'Word' : 'PDF';
}
