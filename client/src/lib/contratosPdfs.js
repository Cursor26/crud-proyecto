/**
 * Evita duplicar PDFs cuando el mismo archivo está en servidor (serverId) y en caché local.
 */

export function normalizarNombrePdf(nombre) {
  return String(nombre || '').trim().toLowerCase();
}

/**
 * @param {Array<{ id?: string, serverId?: number|null, nombre?: string, dataUrl?: string }>} pdfs
 */
export function deduplicarPdfsContrato(pdfs) {
  if (!Array.isArray(pdfs) || !pdfs.length) return [];

  const conServer = [];
  const soloLocal = [];

  for (const p of pdfs) {
    if (!p) continue;
    const sid = p.serverId != null ? Number(p.serverId) : null;
    if (Number.isFinite(sid) && sid > 0) {
      conServer.push({ ...p, serverId: sid });
    } else if (p.dataUrl || p.nombre) {
      soloLocal.push(p);
    }
  }

  const porServerId = new Map();
  const nombresEnServidor = new Set();
  const idsEnServidor = new Set();

  for (const p of conServer) {
    if (porServerId.has(p.serverId)) continue;
    porServerId.set(p.serverId, p);
    nombresEnServidor.add(normalizarNombrePdf(p.nombre));
    if (p.id) idsEnServidor.add(String(p.id));
    idsEnServidor.add(`srv_${p.serverId}`);
  }

  const resultado = [...porServerId.values()];

  for (const p of soloLocal) {
    const nom = normalizarNombrePdf(p.nombre);
    if (nombresEnServidor.has(nom)) continue;
    const pid = String(p.id || '');
    if (pid && idsEnServidor.has(pid)) continue;
    const dupLocal = resultado.some(
      (r) => !r.serverId && normalizarNombrePdf(r.nombre) === nom
    );
    if (dupLocal) continue;
    resultado.push(p);
    nombresEnServidor.add(nom);
    if (pid) idsEnServidor.add(pid);
  }

  return resultado;
}

/**
 * Lista unificada para mostrar: prioridad documentos del servidor; caché local solo si no está duplicado.
 */
export function combinarDocumentosServidorYCache(documentosServidor, pdfsCache = []) {
  const cacheDedup = deduplicarPdfsContrato(pdfsCache);
  const lista = [];

  for (const doc of documentosServidor || []) {
    const serverId = Number(doc.id_documento);
    if (!Number.isFinite(serverId) || serverId <= 0) continue;
    const id = doc.cliente_id ? String(doc.cliente_id) : `srv_${serverId}`;
    const cacheHit = cacheDedup.find(
      (p) => Number(p.serverId) === serverId || String(p.id) === id
    );
    lista.push({
      id,
      serverId,
      nombre: doc.nombre_archivo || cacheHit?.nombre || 'Contrato.pdf',
      dataUrl: cacheHit?.dataUrl || '',
      tamano: doc.tamano_bytes,
      subido_en: doc.subido_en,
    });
  }

  const nombres = new Set(lista.map((p) => normalizarNombrePdf(p.nombre)));
  const serverIds = new Set(lista.map((p) => p.serverId));

  for (const p of cacheDedup) {
    if (p.serverId && serverIds.has(Number(p.serverId))) continue;
    const nom = normalizarNombrePdf(p.nombre);
    if (nombres.has(nom)) continue;
    if (p.id && lista.some((x) => String(x.id) === String(p.id))) continue;
    lista.push(p);
    nombres.add(nom);
  }

  return deduplicarPdfsContrato(lista);
}
