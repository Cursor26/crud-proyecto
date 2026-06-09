/**
 * Helpers para exportación de expedientes ZIP (datos + documentos).
 */

export function resolverNumerosExportacion(seleccionados, contratosFiltrados) {
  const listaSel = (Array.isArray(seleccionados) ? seleccionados : [])
    .map((n) => String(n || '').trim())
    .filter(Boolean);
  if (listaSel.length) return [...new Set(listaSel)];
  return (contratosFiltrados || [])
    .map((c) => String(c?.numero_contrato || '').trim())
    .filter(Boolean);
}

export function nombreArchivoZipExportacion() {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  return `export_contratos_${ts}.zip`;
}

export function resumenDocumentosContrato(contrato, getCategoriasDocumentos) {
  const numero = String(contrato?.numero_contrato || '').trim();
  const cats = typeof getCategoriasDocumentos === 'function'
    ? getCategoriasDocumentos(numero, contrato)
    : [];
  const principal = cats.find((c) => c.id === 'contrato')?.items?.length || 0;
  const suplementos = cats.find((c) => c.id === 'suplemento')?.items?.length || 0;
  const anexos = cats.find((c) => c.id === 'anexo')?.items?.length || 0;
  return { principal, suplementos, anexos, total: principal + suplementos + anexos };
}

export function buildResumenExportacionExpediente(contratos, getCategoriasDocumentos) {
  let conPrincipal = 0;
  let totalSuplementos = 0;
  let totalAnexos = 0;
  let sinDocumentos = 0;

  (contratos || []).forEach((c) => {
    const r = resumenDocumentosContrato(c, getCategoriasDocumentos);
    if (r.principal) conPrincipal += 1;
    totalSuplementos += r.suplementos;
    totalAnexos += r.anexos;
    if (!r.total) sinDocumentos += 1;
  });

  return {
    total: contratos?.length || 0,
    conPrincipal,
    totalSuplementos,
    totalAnexos,
    sinDocumentos,
  };
}

async function mensajeErrorDesdeBlob(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      if (json?.message) return json.message;
    } catch {
      /* ignore */
    }
  }
  return error?.response?.data?.message || error?.message || 'No se pudo exportar el expediente.';
}

export async function descargarExpedienteContratos(Axios, API_BASE, numeros) {
  if (!numeros?.length) {
    throw new Error('No hay contratos para exportar.');
  }
  try {
    const res = await Axios.post(
      `${API_BASE}/contratos/exportar-expediente`,
      { numeros },
      { responseType: 'blob' }
    );
    const contentType = String(res.headers?.['content-type'] || '');
    if (contentType.includes('application/json')) {
      const text = await res.data.text();
      const json = JSON.parse(text);
      throw new Error(json?.message || 'No se pudo exportar el expediente.');
    }
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivoZipExportacion();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch (error) {
    const msg = await mensajeErrorDesdeBlob(error);
    throw new Error(msg);
  }
}
