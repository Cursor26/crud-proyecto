import * as XLSX from 'xlsx';

/**
 * RF20 — Exporta filas (array de objetos planos) a un archivo .xlsx (sin cabecera AEPG; usar exportAepgPlantilla para informes).
 */
export function exportRowsToExcel(rows, sheetName, fileName) {
  if (!rows || rows.length === 0) return;
  const safeSheet = String(sheetName || 'Hoja1').replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Hoja1';
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheet);
  const name = fileName && String(fileName).toLowerCase().endsWith('.xlsx') ? fileName : `${fileName || 'export'}.xlsx`;
  XLSX.writeFile(wb, name);
}

export {
  exportarAepgTablaXLSX,
  exportarAepgTablaXLS,
  exportarAepgTablaCSV,
  exportarAepgDesdeJson,
  exportarAepgDesdeJsonXLS,
  exportarAepgDesdeJsonCSV,
  filasAoaDesdeJson,
  AEPG_TITULO_RRHH,
  AEPG_TITULO_PRODUCCION,
  AEPG_TITULO_CONTRATOS,
} from './exportAepgPlantilla';
