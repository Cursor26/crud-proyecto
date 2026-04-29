import { buildMultiAoa } from './exportProduccionEstadistica';
import {
  exportarAoaComoPDF,
  exportarAoaComoTSV,
  exportarAoaComoJSON,
  exportarAoaComoHTML,
  exportarAoaComoWordHtml,
} from './exportAepgExtendedFormats';

/**
 * Exporta el informe multi-hoja de la herramienta interactiva (gráficos / rangos) en varios formatos.
 * Incluye metadatos en JSON; el resto aplanan la malla (meta + bloques de datos) como en el CSV.
 */
export async function exportarProduccionHerramienta(kind, { nombreModulo, user, hojas, nombreBase }) {
  const aoa = buildMultiAoa(nombreModulo, user, hojas);
  const slug = (nombreModulo || 'produccion').replace(/\s+/g, '_');
  const base = `${nombreBase || `AEPG_informe_${slug}`}_${new Date().toISOString().slice(0, 10)}`;
  const titulo = `Informe estadístico — ${nombreModulo || 'Producción'}`;
  const meta = {
    titulo,
    modulo: nombreModulo,
    hojas: (hojas || []).map((h) => h.name || 'hoja'),
    descripcion:
      'Herramientas interactivas AEPG: al exportar se incluyen resumen de claves, series y tablas con los filtros y métricas activos en pantalla.',
  };
  switch (kind) {
    case 'pdf':
      exportarAoaComoPDF(aoa, base, titulo);
      return;
    case 'tsv':
      exportarAoaComoTSV(aoa, base);
      return;
    case 'json':
      exportarAoaComoJSON(aoa, base, meta);
      return;
    case 'html':
      exportarAoaComoHTML(aoa, base, titulo);
      return;
    case 'doc':
      exportarAoaComoWordHtml(aoa, base, titulo);
      return;
    default:
      break;
  }
}
