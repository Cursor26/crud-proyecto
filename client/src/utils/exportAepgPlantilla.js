import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

import { EMPRESA_ORGANIZACION } from './exportReporteContratos';

export { EMPRESA_ORGANIZACION };

export const AEPG_TITULO_RRHH = 'AEPG — Sistema de gestión de recursos humanos';
export const AEPG_TITULO_PRODUCCION = 'AEPG — Sistema de gestión y estadística de producción';
export const AEPG_TITULO_CONTRATOS = 'AEPG — Sistema de gestión de contratos y vencimientos';

const COL_DARK = { argb: 'FF0F2B4A' };
const COL_HEAD = { argb: 'FF1E3A5F' };
const COL_ACCENT = { argb: 'FF2A5298' };
const COL_ZEBRA = { argb: 'FFF3F5F9' };
const F_WHITE = { argb: 'FFFFFFFF' };
const COL_SEP = { argb: 'FFE2E8F0' };

const CSV_SEP = ';';

function colL(n) {
  if (n <= 0) return 'A';
  if (n <= 26) return String.fromCharCode(64 + n);
  let s = '';
  let c = n;
  while (c > 0) {
    const m = (c - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s || 'A';
}

function padFila(cells, n) {
  const a = (cells || []).slice(0, n);
  while (a.length < n) a.push('');
  return a;
}

function formatDelimitedField(value, separator) {
  const s = value === null || value === undefined ? '' : String(value);
  if (s === '') return s;
  const mustQuote = s.includes(separator) || s.includes('"') || /[\n\r]/.test(s);
  if (!mustQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Misma estructura que el reporte de contratos, ancho mínimo 10 columnas.
 */
function buildMetaAoa(nTablaCols, user, empresaNombre, tituloSistema, subtitulo, descripcionTabla) {
  const metaCols = Math.max(10, nTablaCols);
  const fn = (user && user.nombre) || '—';
  const em = (user && user.email) || '—';
  const rol = (user && user.rol) || '—';
  const ahora = new Date();
  const aoa = [
    [tituloSistema, ...Array(metaCols - 1).fill('')],
    [subtitulo, ...Array(metaCols - 1).fill('')],
    ...Array(1)
      .fill(0)
      .map(() => Array(metaCols).fill('')),
    ['Organización / empresa:', String(empresaNombre || EMPRESA_ORGANIZACION), ...Array(metaCols - 2).fill('')],
    ['Exportado por:', fn, '', 'Email:', em, '', '', 'Rol:', rol, ...Array(Math.max(0, metaCols - 10)).fill('')],
    [
      'Fecha y hora:',
      ahora.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }),
      ...Array(metaCols - 2).fill(''),
    ],
    ...Array(1)
      .fill(0)
      .map(() => Array(metaCols).fill('')),
    [descripcionTabla, ...Array(metaCols - 1).fill('')],
    ...Array(1)
      .fill(0)
      .map(() => Array(metaCols).fill('')),
    ['— Tabla de datos —', ...Array(metaCols - 1).fill('')],
  ];
  return { aoa, metaCols };
}

function mergeHoja(ws, row, c1, c2) {
  if (c2 < c1) return;
  ws.mergeCells(`${colL(c1)}${row}:${colL(c2)}${row}`);
}

/**
 * Aplana filas (objetos) a columnas según claves, con cabecera.
 */
export function filasAoaDesdeJson(rows, columnas) {
  if (!rows || !rows.length) {
    return { headers: columnas.map((c) => c.label), data: [] };
  }
  const headers = columnas.map((c) => c.label);
  const data = rows.map((row) => columnas.map((c) => (c.get ? c.get(row) : row[c.key])));
  return { headers, data };
}

/**
 * @param {object} p
 * @param {object|null} p.user
 * @param {string} [p.empresaNombre]
 * @param {string} p.tituloSistema
 * @param {string} p.subtitulo
 * @param {string} p.descripcion
 * @param {string[]} p.headers
 * @param {any[][]} p.dataRows — cada fila con length === headers.length
 * @param {string} p.sheetName
 * @param {string} p.nombreBaseArchivo — sin extensión; p.ej. AEPG_reporte_empleados_2026-04-26
 */
export async function exportarAepgTablaXLSX(p) {
  const {
    user,
    empresaNombre,
    tituloSistema,
    subtitulo,
    descripcion,
    headers,
    dataRows,
    sheetName,
    nombreBaseArchivo,
  } = p;
  const nTabla = headers.length;
  const { aoa, metaCols } = buildMetaAoa(nTabla, user, empresaNombre, tituloSistema, subtitulo, descripcion);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AEPG';
  wb.lastModifiedBy = (user && user.nombre) || 'usuario';
  const ws = wb.addWorksheet(String(sheetName || 'AEPG').replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'AEPG', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  let r = 1;
  mergeHoja(ws, r, 1, metaCols);
  const t1 = ws.getCell(r, 1);
  t1.value = aoa[0][0];
  t1.font = { bold: true, size: 16, color: F_WHITE, name: 'Calibri' };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_DARK };
  t1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  t1.border = { bottom: { style: 'thin', color: COL_ACCENT } };
  ws.getRow(r).height = 28;
  r += 1;

  mergeHoja(ws, r, 1, metaCols);
  const t2 = ws.getCell(r, 1);
  t2.value = aoa[1][0];
  t2.font = { size: 11, italic: true, color: { argb: 'FF2A5298' }, name: 'Calibri' };
  t2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F8' } };
  r += 1;
  r += 1;

  ws.getCell(r, 1).value = aoa[3][0];
  ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 2, Math.min(7, metaCols));
  ws.getCell(r, 2).value = aoa[3][1];
  ws.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
  r += 1;

  const ex = aoa[4];
  ws.getCell(r, 1).value = ex[0];
  ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
  ws.getCell(r, 2).value = ex[1];
  ws.getCell(r, 4).value = ex[3];
  ws.getCell(r, 4).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 5, 6);
  ws.getCell(r, 5).value = ex[4];
  ws.getCell(r, 8).value = ex[7];
  ws.getCell(r, 8).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 9, Math.min(10, metaCols));
  ws.getCell(r, 9).value = ex[8];
  r += 1;

  const fh = aoa[5];
  ws.getCell(r, 1).value = fh[0];
  ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 2, metaCols);
  ws.getCell(r, 2).value = fh[1];
  r += 1;
  r += 1;

  mergeHoja(ws, r, 1, metaCols);
  const desc = ws.getCell(r, 1);
  desc.value = aoa[7][0];
  desc.font = { size: 10, name: 'Calibri' };
  desc.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(r).height = 36;
  r += 1;
  r += 1;

  mergeHoja(ws, r, 1, metaCols);
  const sep = ws.getCell(r, 1);
  sep.value = aoa[9][0];
  sep.font = { bold: true, name: 'Calibri', size: 11, color: { argb: 'FF2A5298' } };
  sep.alignment = { horizontal: 'center' };
  sep.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_SEP };
  r += 1;

  headers.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { bold: true, color: F_WHITE, name: 'Calibri' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_HEAD };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = {
      top: { style: 'thin', color: COL_DARK },
      left: { style: 'thin', color: COL_DARK },
      bottom: { style: 'medium', color: COL_DARK },
      right: { style: 'thin', color: COL_DARK },
    };
  });
  for (let j = nTabla; j < metaCols; j += 1) {
    const c = ws.getCell(r, j + 1);
    c.value = '';
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_HEAD };
  }
  r += 1;
  const filaInicioTabla = r;

  dataRows.forEach((row, idx) => {
    (row || []).forEach((val, j) => {
      if (j >= nTabla) return;
      const c = ws.getCell(r, j + 1);
      c.value = val === '' || val == null ? val : val;
      c.font = { name: 'Calibri' };
      c.alignment = { vertical: 'top', wrapText: true };
      c.border = {
        top: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        left: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        right: { style: 'hair', color: { argb: 'FFCCCCCC' } },
      };
      if (idx % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_ZEBRA };
      }
    });
    for (let j = nTabla; j < metaCols; j += 1) {
      const c = ws.getCell(r, j + 1);
      c.value = '';
    }
    r += 1;
  });

  for (let i = 0; i < metaCols; i += 1) {
    ws.getColumn(i + 1).width = [18, 12, 14, 12, 16, 12, 12, 12, 12, 28][i] || 16;
  }
  ws.views = [
    { state: 'frozen', ySplit: filaInicioTabla, activeCell: `A${filaInicioTabla + 1}`, showGridLines: true },
  ];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (nombreBaseArchivo || 'AEPG_export').replace(/[<>:"/\\|?*]/g, '_');
  a.download = `${safeName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  return;
}

/**
 * XLS 97-2003 (misma malla, sin colores; fusiones aproximadas)
 */
export function exportarAepgTablaXLS(p) {
  const {
    user,
    empresaNombre,
    tituloSistema,
    subtitulo,
    descripcion,
    headers,
    dataRows,
    sheetName,
    nombreBaseArchivo,
  } = p;
  const nTabla = headers.length;
  const { aoa, metaCols } = buildMetaAoa(nTabla, user, empresaNombre, tituloSistema, subtitulo, descripcion);
  const headPad = headers.map((h, i) => (i < nTabla ? h : ''));
  while (headPad.length < metaCols) headPad.push('');
  const aoa2 = [
    ...aoa,
    headPad,
    ...dataRows.map((r) => {
      const row = padFila((r || []).map((c) => (c == null ? '' : c)), metaCols);
      return row;
    }),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa2);
  const lastC = Math.max(0, metaCols - 1);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastC } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastC } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: Math.min(6, lastC) } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: Math.min(5, lastC) } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: lastC } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: lastC } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: lastC } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: lastC } },
  ];
  ws['!rows'] = aoa2.map((_, i) => {
    if (i === 0) return { hpt: 22 };
    if (i === 1) return { hpt: 32 };
    if (i === 7) return { hpt: 40 };
    return { hpt: 18 };
  });
  const cols = Array(metaCols)
    .fill(0)
    .map((_, i) => ({ wch: [18, 12, 14, 12, 16, 12, 12, 12, 12, 28][i] || 16 }));
  ws['!cols'] = cols;
  const sn = String(sheetName || 'AEPG')
    .replace(/[:\\/?*[\]]/g, '')
    .slice(0, 31) || 'AEPG';
  XLSX.utils.book_append_sheet(wb, ws, sn);

  const base = (nombreBaseArchivo || 'AEPG_export').replace(/[<>:"/\\|?*]/g, '_');
  const nombre = `${base}.xls`;
  try {
    XLSX.writeFile(wb, nombre, { bookType: 'xls' });
  } catch (e) {
    XLSX.writeFile(wb, nombre.replace(/\.xls$/, '_(compat).xlsx'));
  }
}

/**
 * CSV con BOM y metadatos (separador ;)
 */
export function exportarAepgTablaCSV(p) {
  const {
    user,
    empresaNombre,
    tituloSistema,
    subtitulo,
    descripcion,
    headers,
    dataRows,
    nombreBaseArchivo,
  } = p;
  const nTabla = headers.length;
  const { aoa, metaCols } = buildMetaAoa(nTabla, user, empresaNombre, tituloSistema, subtitulo, descripcion);
  const pre = aoa;
  const headPad = headers.map((h, i) => (i < nTabla ? h : ''));
  while (headPad.length < metaCols) headPad.push('');
  const filas = [
    ...pre,
    headPad,
    ...dataRows.map((r) => {
      const row = (r || []).slice(0, nTabla);
      return padFila(row, metaCols);
    }),
  ];
  const lines = filas.map((row) => row.map((cell) => formatDelimitedField(cell, CSV_SEP)).join(CSV_SEP));
  const bom = '\uFEFF';
  const csv = bom + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const base = (nombreBaseArchivo || 'AEPG_export').replace(/[<>:"/\\|?*]/g, '_');
  a.download = `${base}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * @param {object} p
 * @param {object[]} p.rows
 * @param {Array<{key?: string, label: string, get?: function}>} p.columnas
 * Misma firma lógica que `filasAoaDesdeJson` + export
 */
export async function exportarAepgDesdeJson(p) {
  const { user, rows, columnas, ...rest } = p;
  const { headers, data } = filasAoaDesdeJson(rows, columnas);
  await exportarAepgTablaXLSX({ ...rest, user, headers, dataRows: data });
}

export function exportarAepgDesdeJsonXLS(p) {
  const { user, rows, columnas, ...rest } = p;
  const { headers, data } = filasAoaDesdeJson(rows, columnas);
  exportarAepgTablaXLS({ ...rest, user, headers, dataRows: data });
}

export function exportarAepgDesdeJsonCSV(p) {
  const { user, rows, columnas, ...rest } = p;
  const { headers, data } = filasAoaDesdeJson(rows, columnas);
  exportarAepgTablaCSV({ ...rest, user, headers, dataRows: data });
}
