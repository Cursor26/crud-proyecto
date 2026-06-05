/**
 * Metadatos de suplementos (documentos numerados) en columna suplementos (JSON).
 */

function parseSuplementosJson(raw) {
  if (raw == null || raw === '') return { legacyText: null, items: [] };
  const s = String(raw).trim();
  if (!s) return { legacyText: null, items: [] };
  if (s.startsWith('[') || s.startsWith('{')) {
    try {
      const data = JSON.parse(s);
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const items = arr
        .map((it, idx) => ({
          numero: Number(it?.numero) > 0 ? Number(it.numero) : idx + 1,
          nombre: String(it?.nombre || '').trim(),
          tipo: it?.tipo === 'word' ? 'word' : 'pdf',
          clienteId: it?.clienteId != null ? String(it.clienteId) : it?.cliente_id != null ? String(it.cliente_id) : null,
          serverId: it?.serverId != null ? Number(it.serverId) : it?.server_id != null ? Number(it.server_id) : null,
        }))
        .filter((it) => it.nombre || it.serverId);
      items.sort((a, b) => a.numero - b.numero);
      return { legacyText: null, items: renumerarSuplementos(items) };
    } catch {
      return { legacyText: s, items: [] };
    }
  }
  return { legacyText: s, items: [] };
}

function renumerarSuplementos(items) {
  return (Array.isArray(items) ? items : []).map((it, idx) => ({
    ...it,
    numero: idx + 1,
  }));
}

function serializeSuplementosJson(items) {
  const list = renumerarSuplementos(items);
  if (!list.length) return null;
  return JSON.stringify(
    list.map((it) => ({
      numero: it.numero,
      nombre: it.nombre,
      tipo: it.tipo === 'word' ? 'word' : 'pdf',
      clienteId: it.clienteId || null,
      serverId: it.serverId || null,
    }))
  );
}

function resumenSuplementosTexto(raw) {
  const { legacyText, items } = parseSuplementosJson(raw);
  if (items.length) {
    return items.map((it) => `Suplemento ${it.numero}: ${it.nombre || 'documento'}`).join('; ');
  }
  return legacyText || '';
}

module.exports = {
  parseSuplementosJson,
  renumerarSuplementos,
  serializeSuplementosJson,
  resumenSuplementosTexto,
};
