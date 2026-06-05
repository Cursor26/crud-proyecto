function renumerarAnexos(items) {
  return (Array.isArray(items) ? items : []).map((it, idx) => ({
    ...it,
    numero: idx + 1,
  }));
}

function parseAnexosJson(raw) {
  if (raw == null || raw === '') return { activo: false, items: [] };
  const s = String(raw).trim();
  if (!s) return { activo: false, items: [] };
  try {
    const data = JSON.parse(s);
    if (Array.isArray(data)) {
      const items = renumerarAnexos(
        data
          .map((it, idx) => ({
            numero: Number(it?.numero) > 0 ? Number(it.numero) : idx + 1,
            nombre: String(it?.nombre || '').trim(),
            tipo: it?.tipo === 'word' ? 'word' : 'pdf',
            clienteId: it?.clienteId != null ? String(it.clienteId) : null,
            serverId: it?.serverId != null ? Number(it.serverId) : null,
          }))
          .filter((it) => it.nombre || it.serverId)
      );
      return { activo: items.length > 0, items };
    }
    const activo = data?.activo === true || data?.activo === 1 || data?.activo === '1';
    const arr = Array.isArray(data?.items) ? data.items : [];
    const items = renumerarAnexos(
      arr
        .map((it, idx) => ({
          numero: Number(it?.numero) > 0 ? Number(it.numero) : idx + 1,
          nombre: String(it?.nombre || '').trim(),
          tipo: it?.tipo === 'word' ? 'word' : 'pdf',
          clienteId: it?.clienteId != null ? String(it.clienteId) : null,
          serverId: it?.serverId != null ? Number(it.serverId) : null,
        }))
        .filter((it) => it.nombre || it.serverId)
    );
    return { activo, items };
  } catch {
    return { activo: false, items: [] };
  }
}

function prepareAnexosForSave(body) {
  const raw = body?.anexos;
  if (raw == null || raw === '') {
    return JSON.stringify({ activo: false, items: [] });
  }
  if (typeof raw === 'object') {
    const activo = raw.activo === true || raw.activo === 1;
    const items = renumerarAnexos(raw.items || []);
    return JSON.stringify({ activo, items: activo ? items : [] });
  }
  const s = String(raw).trim();
  if (!s) return JSON.stringify({ activo: false, items: [] });
  try {
    JSON.parse(s);
    return s;
  } catch {
    return JSON.stringify({ activo: false, items: [] });
  }
}

module.exports = {
  parseAnexosJson,
  prepareAnexosForSave,
  renumerarAnexos,
};
