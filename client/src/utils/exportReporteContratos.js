import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

const NCOLS = 10;

const HEADERS = [
  'N° contrato',
  'Parte',
  'Empresa',
  'Tipo de contrato',
  'Vigencia (años)',
  'Fecha inicio',
  'Fecha fin',
  'Estado',
  'Días restantes',
  'Documento',
];

export const EMPRESA_ORGANIZACION =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_EMPRESA_NOMBRE) || 'Organización (configure REACT_APP_EMPRESA_NOMBRE)';

const AEPG_TAGLINE = 'AEPG — Sistema de gestión de contratos y vencimientos';

/** Mismo pie de cabecera que en la exportación XLSX. */
const SUBTITULO_REPORTE =
  'Reporte: contratos (estado, vigencia, fechas y documentos). Generado con la vista Reportes de AEPG.';

const DESCRIPCION_REPORTE =
  'Listado consolidado: número de contrato, parte, empresa, tipo, vigencia en años, fechas, estado operativo, días hasta vencimiento y referencia al documento PDF (si existe en este equipo).';

/** Misma leyenda que la franja "— Tabla de datos —" del XLSX. */
const SEP_TABLA_DATOS = '— Tabla de datos —';

function padFila(cells) {
  const a = cells.slice(0, NCOLS);
  while (a.length < NCOLS) a.push('');
  return a;
}

/** Comillas solo si hace falta (separador, saltos, comillas). Más legible en Excel y editores. */
function formatDelimitedField(value, separator) {
  const s = value === null || value === undefined ? '' : String(value);
  if (s === '') return s;
  const mustQuote = s.includes(separator) || s.includes('"') || /[\n\r]/.test(s);
  if (!mustQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function buildRows(contratosEnriquecidos, getPdfContrato, toISODate) {
  return contratosEnriquecidos.map((c) => {
    const p = getPdfContrato(c.numero_contrato);
    return [
      c.numero_contrato,
      c.proveedor_cliente ? 'Proveedor' : 'Cliente',
      c.empresa || '',
      c.tipo_contrato || '',
      c.vigencia ?? '',
      toISODate(c.fecha_inicio),
      toISODate(c.fecha_fin),
      c.estado || '',
      c.diasRestantes ?? '',
      p?.nombre || (p?.dataUrl ? 'PDF' : '—'),
    ];
  });
}

/**
 * Misma información que la cabecera del XLSX (títulos, descripción, franja "Tabla de datos"),
 * 10 columnas. Fila "Exportado por" alineada a celdas A,B,D,E (email),H,I (rol) como en la hoja.
 */
function buildMetaBloqueFilas(user, empresaNombre) {
  const ahora = new Date();
  const fn = (user && user.nombre) || '—';
  const em = (user && user.email) || '—';
  const rol = (user && user.rol) || '—';
  return [
    [AEPG_TAGLINE, '', '', '', '', '', '', '', '', ''],
    [SUBTITULO_REPORTE, '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Organización / empresa:', String(empresaNombre || EMPRESA_ORGANIZACION), '', '', '', '', '', '', '', ''],
    ['Exportado por:', fn, '', 'Email:', em, '', '', 'Rol:', rol, ''],
    [
      'Fecha y hora:',
      ahora.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    ['', '', '', '', '', '', '', '', '', ''],
    [DESCRIPCION_REPORTE, '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    [SEP_TABLA_DATOS, '', '', '', '', '', '', '', '', ''],
  ];
}

/**
 * @param {object} param0
 * @param {object|null} param0.user - { nombre, email, rol }
 * @param {string} [param0.empresaNombre]
 * @param {Array} param0.contratosEnriquecidos
 * @param {function} param0.getPdfContrato
 * @param {function} param0.toISODate
 */
const CSV_SEP = ';';

export function exportarReporteContratosCSV({ user, empresaNombre, contratosEnriquecidos, getPdfContrato, toISODate }) {
  const dataRows = buildRows(contratosEnriquecidos, getPdfContrato, toISODate);
  const pre = buildMetaBloqueFilas(user, empresaNombre);
  const filas = [...pre, HEADERS, ...dataRows].map((row) =>
    padFila(row).map((cell) => formatDelimitedField(cell, CSV_SEP)).join(CSV_SEP)
  );
  const bom = '\uFEFF';
  const csv = bom + filas.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AEPG_reporte_contratos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const COL_DARK = { argb: 'FF0F2B4A' };
const COL_HEAD = { argb: 'FF1E3A5F' };
const COL_ACCENT = { argb: 'FF2A5298' };
const COL_ZEBRA = { argb: 'FFF3F5F9' };
const F_WHITE = { argb: 'FFFFFFFF' };

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

function mergeHoja(ws, row, c1, c2) {
  ws.mergeCells(`${colL(c1)}${row}:${colL(c2)}${row}`);
}

/**
 * @param {object} p - mismo shape que exportarReporteContratosCSV
 * @returns {Promise<void>}
 */
export async function exportarReporteContratosXLSX(p) {
  const { user, empresaNombre, contratosEnriquecidos, getPdfContrato, toISODate } = p;
  const dataRows = buildRows(contratosEnriquecidos, getPdfContrato, toISODate);
  const m = buildMetaBloqueFilas(user, empresaNombre);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AEPG';
  wb.lastModifiedBy = (user && user.nombre) || 'usuario';
  wb.created = new Date();
  wb.title = 'Reporte de contratos';
  const ws = wb.addWorksheet('Contratos', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  let r = 1;
  mergeHoja(ws, r, 1, 10);
  const t1 = ws.getCell(r, 1);
  t1.value = m[0][0];
  t1.font = { bold: true, size: 16, color: F_WHITE, name: 'Calibri' };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_DARK };
  t1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  t1.border = { bottom: { style: 'thin', color: COL_ACCENT } };
  ws.getRow(r).height = 28;
  r += 1;

  mergeHoja(ws, r, 1, 10);
  const t2 = ws.getCell(r, 1);
  t2.value = m[1][0];
  t2.font = { size: 11, italic: true, color: { argb: 'FF2A5298' }, name: 'Calibri' };
  t2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F8' } };
  r += 1;
  r += 1;

  ws.getCell(r, 1).value = m[3][0];
  ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 2, 7);
  ws.getCell(r, 2).value = m[3][1];
  ws.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
  r += 1;

  const ex = m[4];
  ws.getCell(r, 1).value = ex[0];
  ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
  ws.getCell(r, 2).value = ex[1];
  ws.getCell(r, 4).value = ex[3];
  ws.getCell(r, 4).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 5, 6);
  ws.getCell(r, 5).value = ex[4];
  ws.getCell(r, 8).value = ex[7];
  ws.getCell(r, 8).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 9, 10);
  ws.getCell(r, 9).value = ex[8];
  r += 1;

  const fh = m[5];
  ws.getCell(r, 1).value = fh[0];
  ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
  mergeHoja(ws, r, 2, 10);
  ws.getCell(r, 2).value = fh[1];
  r += 1;
  r += 1;

  mergeHoja(ws, r, 1, 10);
  const desc = ws.getCell(r, 1);
  desc.value = m[7][0];
  desc.font = { size: 10, name: 'Calibri' };
  desc.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(r).height = 36;
  r += 1;
  r += 1;

  mergeHoja(ws, r, 1, 10);
  const sep = ws.getCell(r, 1);
  sep.value = m[9][0];
  sep.font = { bold: true, name: 'Calibri', size: 11, color: { argb: 'FF2A5298' } };
  sep.alignment = { horizontal: 'center' };
  sep.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  r += 1;

  HEADERS.forEach((h, i) => {
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
  r += 1;
  const filaInicioTabla = r;

  dataRows.forEach((row, idx) => {
    row.forEach((val, j) => {
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
    r += 1;
  });

  [18, 12, 22, 14, 12, 12, 12, 14, 12, 28].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [
    { state: 'frozen', ySplit: filaInicioTabla, activeCell: `A${filaInicioTabla + 1}`, showGridLines: true },
  ];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AEPG_reporte_contratos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * XLS (Excel 97-2003) — misma cabecera y tabla que el XLSX; fusiones básicas (SheetJS).
 * Los estilos de color del XLSX no aplican a BIFF5; se conservan ancho y unión de celdas.
 */
export function exportarReporteContratosXLS(p) {
  const { user, empresaNombre, contratosEnriquecidos, getPdfContrato, toISODate } = p;
  const dataRows = buildRows(contratosEnriquecidos, getPdfContrato, toISODate);
  const aoa = [...buildMetaBloqueFilas(user, empresaNombre), HEADERS, ...dataRows];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  /** Fusiones espejo del layout XLSX (índices de fila 0-based). */
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: 9 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 9 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 9 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 9 } },
  ];
  ws['!rows'] = aoa.map((_, i) => {
    if (i === 0) return { hpt: 22 };
    if (i === 1) return { hpt: 32 };
    if (i === 7) return { hpt: 40 };
    return { hpt: 18 };
  });
  ws['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Contratos AEPG');

  const nombre = `AEPG_reporte_contratos_${new Date().toISOString().slice(0, 10)}.xls`;
  try {
    XLSX.writeFile(wb, nombre, { bookType: 'xls' });
  } catch (e) {
    XLSX.writeFile(
      wb,
      nombre.replace(/\.xls$/, '_(compat).xlsx')
    );
  }
}

/**
 * Misma grilla que CSV/XLSX, para el menú de exportación extendida (PDF, Word .doc, etc.).
 * @param {{ user?: object, empresaNombre?: string, contratosEnriquecidos: any[], getPdfContrato: function, toISODate: function }} p
 */
export function getParametrosAepgTablaContratos(p) {
  const { user, empresaNombre, contratosEnriquecidos, getPdfContrato, toISODate } = p;
  return {
    user,
    tituloSistema: AEPG_TAGLINE,
    subtitulo: SUBTITULO_REPORTE,
    descripcion: DESCRIPCION_REPORTE,
    empresaNombre: empresaNombre || EMPRESA_ORGANIZACION,
    headers: [...HEADERS],
    dataRows: buildRows(contratosEnriquecidos, getPdfContrato, toISODate),
    nombreBaseArchivo: `AEPG_contratos_${new Date().toISOString().slice(0, 10)}`,
    sheetName: 'Contratos',
  };
}
