import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

import { EMPRESA_ORGANIZACION } from './exportReporteContratos';

const TAG_AEPG = 'AEPG — Producción y estadística';

const COL_DARK = { argb: 'FF0F2B4A' };
const COL_ACCENT = { argb: 'FF2A5298' };
const COL_ZEBRA = { argb: 'FFF3F5F9' };
const F_WHITE = { argb: 'FFFFFFFF' };

const PAD = 8;

function filaPad(c0) {
  const r = [c0];
  while (r.length < PAD) r.push('');
  return r;
}

function filasMeta({ titulo, subtitulo, descripcion, user, seccion = 'Herramientas' }) {
  const ahora = new Date();
  const fn = (user && user.nombre) || '—';
  const em = (user && user.email) || '—';
  const rol = (user && user.rol) || '—';
  return [
    { t: TAG_AEPG, style: 'hero' },
    { t: String(titulo), style: 'title' },
    { t: String(subtitulo || ''), style: 'sub' },
    { skip: 1 },
    { row: ['Organización / empresa:', EMPRESA_ORGANIZACION, '', '', 'Sección', seccion, '', ''] },
    { row: ['Exportado por:', fn, '', 'Email:', em, '', 'Rol:', rol] },
    { row: filaPad(`Fecha y hora: ${ahora.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}`) },
    { skip: 1 },
    { t: String(descripcion || ''), style: 'desc' },
    { skip: 1 },
  ];
}

/**
 * Aplana `rows` a AOA usando `headers` si rows son objetos.
 */
function normalizarHoja({ name, headers, rows }) {
  const h = headers && headers.length ? headers : null;
  if (!h) {
    if (!rows || !rows.length) return { title: name, aoa: [[name], ['(sin filas)']] };
    if (Array.isArray(rows[0])) {
      return { title: name, aoa: [[`— ${name} —`], ['(sin encabezados)'], ...rows] };
    }
    const keys = Object.keys(rows[0]);
    return {
      title: name,
      aoa: [[`— ${name} —`], keys, ...rows.map((o) => keys.map((k) => (o[k] == null ? '' : o[k])))],
    };
  }
  const body = (rows || []).map((r) => {
    if (Array.isArray(r)) return r;
    return h.map((k) => (r[k] == null ? '' : r[k]));
  });
  return { title: name, aoa: [[`— ${name} —`], h, ...body] };
}

/**
 * Hojas con nombre, `headers?`, `rows` (arrays o obj).
 * Exportada para informes en PDF, Word, JSON, etc.
 */
export function buildMultiAoa(nombreModulo, user, hojas) {
  const blocks = hojas.map((h) => normalizarHoja(h));
  const aoa = [];
  const meta = filasMeta({
    titulo: `Informe estadístico — ${nombreModulo}`,
    subtitulo: 'Exportación AEPG (misma línea gráfica que reportes de contratación).',
    descripcion:
      'Incluye las hojas generadas con los rangos, filtros y métricas que tenías activos al exportar. Los valores dependen de la selección (métrica, ajuste %, mín., etc.).',
    user,
  });
  meta.forEach((m) => {
    if (m.skip) {
      for (let i = 0; i < m.skip; i += 1) aoa.push([]);
    } else if (m.row) {
      const rr = (m.row || []).slice(0, PAD);
      while (rr.length < PAD) rr.push('');
      aoa.push(rr);
    } else if (m.t != null) {
      aoa.push(filaPad(m.t));
    }
  });
  blocks.forEach((b) => {
    b.aoa.forEach((r) => aoa.push(r));
    aoa.push([]);
  });
  return aoa;
}

const CSV_SEP = ';';

/**
 * Misma lógica que el XLS: bloque de meta + hojas en texto, separado por secciones.
 */
export function exportarProduccionEstadisticaCSV({ nombreModulo, user, hojas, nombreBase }) {
  const aoa = buildMultiAoa(nombreModulo, user, hojas);
  const lines = aoa
    .map((row) =>
      row
        .slice(0, 12)
        .map((c) => {
          const s = c === null || c === undefined ? '' : String(c);
          if (s.includes(CSV_SEP) || s.includes('"') || /[\n\r]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(CSV_SEP)
    );
  const bom = '\uFEFF';
  const name = (nombreBase || `AEPG_${(nombreModulo || 'produccion').replace(/\s+/g, '_')}`)
    + `_${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * XLSX con estilo: meta en primera hoja "Informe", hojas de datos con encabezado coloreado.
 */
export async function exportarProduccionEstadisticaXLSX({ nombreModulo, user, hojas }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AEPG';
  wb.lastModifiedBy = (user && user.nombre) || 'usuario';
  wb.created = new Date();

  const ws0 = wb.addWorksheet('Informe', { pageSetup: { orientation: 'landscape' } });
  const meta = filasMeta({
    titulo: `Informe estadístico — ${nombreModulo || 'Producción'}`,
    subtitulo: 'Serie, resúmenes y tablas (formato AEPG).',
    descripcion:
      'Cada pestaña adicional contiene un bloque de análisis. Bordes y colores replican el criterio de reportes de contratación (cabecera oscura, filas alternas).',
    user,
  });
  let r0 = 1;
  for (const m of meta) {
    if (m.skip) {
      r0 += m.skip;
      continue;
    }
    if (m.row) {
      const line = r0;
      m.row.forEach((v, j) => {
        const c = ws0.getCell(line, j + 1);
        c.value = v;
        c.font = { name: 'Calibri' };
      });
      r0 += 1;
    } else if (m.t != null && m.style) {
      ws0.mergeCells(`A${r0}:H${r0}`);
      const c1 = ws0.getCell(r0, 1);
      c1.value = m.t;
      if (m.style === 'hero') {
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_DARK };
        c1.font = { bold: true, size: 16, color: F_WHITE, name: 'Calibri' };
        c1.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
        ws0.getRow(r0).height = 26;
      } else if (m.style === 'title') {
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F8' } };
        c1.font = { size: 13, bold: true, color: COL_ACCENT, name: 'Calibri' };
        c1.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
        ws0.getRow(r0).height = 22;
      } else if (m.style === 'sub') {
        c1.font = { italic: true, name: 'Calibri', size: 11 };
        c1.alignment = { wrapText: true, vertical: 'middle' };
        ws0.getRow(r0).height = 18;
      } else {
        c1.font = { name: 'Calibri', size: 10 };
        c1.alignment = { wrapText: true, vertical: 'top' };
        ws0.getRow(r0).height = 32;
      }
      c1.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
      r0 += 1;
    } else if (m.t != null) {
      ws0.mergeCells(`A${r0}:H${r0}`);
      const c1 = ws0.getCell(r0, 1);
      c1.value = m.t;
      c1.font = { name: 'Calibri' };
      r0 += 1;
    }
  }
  [18, 14, 8, 8, 10, 16, 8, 12].forEach((w, i) => {
    ws0.getColumn(i + 1).width = w;
  });

  hojas.forEach((H, si) => {
    const n = (H.name || `hoja_${si + 1}`).replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Datos';
    const { aoa } = normalizarHoja({ name: n, headers: H.headers, rows: H.rows });
    const ws = wb.addWorksheet(n, { pageSetup: { orientation: 'landscape' } });
    aoa.forEach((row, ri) => {
      const isTitle = ri === 0;
      const isColHead = H.headers && ri === 1;
      const isData = H.headers && ri >= 2;
      row.forEach((v, j) => {
        const c = ws.getCell(ri + 1, j + 1);
        c.value = v === null || v === undefined ? '' : v;
        c.font = { name: 'Calibri' };
        c.alignment = { wrapText: true, vertical: 'top' };
        c.border = {
          top: { style: 'hair', color: { argb: 'FFCCCCCC' } },
          left: { style: 'hair', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
          right: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        };
        if (isColHead) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_DARK };
          c.font = { name: 'Calibri', color: F_WHITE, bold: true, size: 10 };
        } else if (isData) {
          if ((ri - 2) % 2 === 1) {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: COL_ZEBRA };
          }
        } else if (isTitle) {
          c.font = { name: 'Calibri', bold: true, size: 11, color: COL_ACCENT };
        }
      });
    });
    if (H.headers) {
      ws.getRow(2).height = 18;
    }
    const maxC = Math.max(8, ...aoa.map((x) => x.length), H.headers ? H.headers.length : 0);
    for (let c = 1; c <= maxC; c += 1) {
      ws.getColumn(c).width = 14;
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `AEPG_informe_${(nombreModulo || 'produccion').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Excel 97-2003: una hoja "Informe" con bloques (meta + hojas apiladas); fusiones básicas.
 */
export function exportarProduccionEstadisticaXLS({ nombreModulo, user, hojas }) {
  const aoa = buildMultiAoa(nombreModulo, user, hojas);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const merges = [];
  for (let r = 0; r < Math.min(12, aoa.length); r += 1) {
    if (String(aoa[r][0] || '').includes('AEPG —')) {
      merges.push({ s: { r, c: 0 }, e: { r, c: 7 } });
    } else if (r > 0 && aoa[r][0] && aoa[r][0] !== '' && !aoa[r][1] && !aoa[r][2] && aoa[r].length < 2) {
      if (r === 1 || (aoa[r][0] && String(aoa[r][0]).length > 20)) {
        merges.push({ s: { r, c: 0 }, e: { r, c: 7 } });
      }
    }
  }
  ws['!merges'] = merges;
  ws['!cols'] = Array(8)
    .fill(0)
    .map((_, i) => ({ wch: i < 2 ? 22 : 14 }));
  XLSX.utils.book_append_sheet(wb, ws, 'AEPG Informe');
  const nombre = `AEPG_informe_${(nombreModulo || 'produccion').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`;
  try {
    XLSX.writeFile(wb, nombre, { bookType: 'biff2' });
  } catch (e) {
    XLSX.writeFile(wb, nombre.replace(/\.xls$/, '_(compat).xlsx'));
  }
}

/**
 * Hoja "tabla" para exportación desde la grilla de la serie interactiva.
 * @param {Array<{ fecha: string, v: number, ma?: number }>} lineaSerie
 * @param {object} [extraKvs] clave -> valor
 */
export function hojasDesdeInteractivo({ nombreModulo, lineaSerie, ivDesde, ivHasta, ajusteFino, maVentana, extraKvs }) {
  const hojas = [];
  const kvs = [
    ['Módulo', nombreModulo],
    ['Rango interactivo desde', ivDesde || ''],
    ['Hasta', ivHasta || ''],
    ['Ajuste %', String(ajusteFino != null ? ajusteFino : 100)],
    ['Ventana media móvil', String(maVentana != null ? maVentana : 7)],
    ...(Array.isArray(extraKvs) ? extraKvs : Object.entries(extraKvs || {})),
  ];
  hojas.push({ name: 'Resumen claves', headers: ['Clave', 'Valor'], rows: kvs });
  hojas.push({
    name: 'Serie',
    headers: ['fecha', 'valor', 'media_movil'],
    rows: (lineaSerie || []).map((r) => [r.fecha, r.v, r.ma != null ? r.ma : '']),
  });
  return hojas;
}
