import {
  SUPLEMENTO_ACCEPT,
  esArchivoSuplementoValido,
  etiquetaTipoSuplemento,
} from './contratosSuplementos';

export { SUPLEMENTO_ACCEPT, esArchivoSuplementoValido, etiquetaTipoSuplemento };

export function renumerarAnexosLista(items) {
  return (Array.isArray(items) ? items : []).map((it, idx) => ({
    ...it,
    numero: idx + 1,
  }));
}

export function parseAnexosFromContrato(contrato) {
  const raw = contrato?.anexos;
  if (raw == null || raw === '') return { activo: false, items: [] };
  const s = String(raw).trim();
  if (!s) return { activo: false, items: [] };
  try {
    const data = JSON.parse(s);
    if (Array.isArray(data)) {
      const items = data.map((it, idx) => normalizarItemAnexo(it, idx));
      return { activo: items.length > 0, items: renumerarAnexosLista(items) };
    }
    const activo = data?.activo === true || data?.activo === 1 || data?.activo === '1';
    const arr = Array.isArray(data?.items) ? data.items : [];
    const items = arr.map((it, idx) => normalizarItemAnexo(it, idx));
    return { activo, items: renumerarAnexosLista(items) };
  } catch {
    return { activo: false, items: [] };
  }
}

function normalizarItemAnexo(it, idx) {
  return {
    id: String(it?.clienteId || it?.cliente_id || `anx_${idx}`),
    numero: Number(it?.numero) > 0 ? Number(it.numero) : idx + 1,
    nombre: String(it?.nombre || '').trim(),
    tipo: it?.tipo === 'word' ? 'word' : 'pdf',
    dataUrl: String(it?.dataUrl || ''),
    serverId: it?.serverId != null ? Number(it.serverId) : it?.server_id != null ? Number(it.server_id) : null,
  };
}

export function prepararAnexosPayload(estado) {
  const activo = Boolean(estado?.activo);
  const items = renumerarAnexosLista(estado?.items || []);
  if (!activo) {
    return { anexos: JSON.stringify({ activo: false, items: [] }) };
  }
  return {
    anexos: JSON.stringify({
      activo: true,
      items: items.map((it) => ({
        numero: it.numero,
        nombre: it.nombre,
        tipo: it.tipo === 'word' ? 'word' : 'pdf',
        clienteId: it.id || null,
        serverId: it.serverId || null,
      })),
    }),
  };
}

export function resumenAnexos(contrato) {
  const { activo, items } = parseAnexosFromContrato(contrato);
  if (!activo || !items.length) return '';
  return items.map((it) => `Anexo ${it.numero}: ${it.nombre || 'documento'}`).join('; ');
}
