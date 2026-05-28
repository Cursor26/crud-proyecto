/**
 * Formatos AEPG adicionales: PDF, Word (.doc vía HTML), JSON, TSV, HTML.
 * Misma intención de metadatos que exportAepgPlantilla (título, usuario, descripción de tabla).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { EMPRESA_ORGANIZACION } from './exportReporteContratos';

function safeFileBase(name) {
  return String(name || 'AEPG_export').replace(/[<>:"/\\|?*]/g, '_');
}

function cellStr(v) {
  if (v == null) return '';
  return String(v);
}

function padRow(row, n) {
  const a = (row || []).slice(0, n);
  while (a.length < n) a.push('');
  return a;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} p – misma “forma lógica” que exportarAepgTablaXLSX (headers, dataRows, user, etc.)
 * @param {string} p.tituloSistema
 * @param {string} p.subtitulo
 * @param {string} p.descripcion
 * @param {string[]} p.headers
 * @param {any[][]} p.dataRows
 * @param {string} p.nombreBaseArchivo
 * @param {string} [p.empresaNombre]
 */
export function exportarAepgTablaPDF(p) {
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
  const h = (headers || []).map((x) => cellStr(x));
  const n = h.length;
  if (!n) return;

  const doc = new jsPDF({ orientation: n > 8 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const em = (user && user.email) || '—';
  const fn = (user && user.nombre) || '—';
  const org = String(empresaNombre || EMPRESA_ORGANIZACION);
  let y = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const title = cellStr(tituloSistema).slice(0, 120);
  doc.text(title, 14, y, { maxWidth: 180 });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const metaLines = [
    cellStr(subtitulo).slice(0, 200),
    cellStr(descripcion).slice(0, 280),
    `Organización: ${org.slice(0, 80)}`,
    `Exportado por: ${fn} | ${em} | ${(user && user.rol) || '—'}`,
    new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
  ];
  metaLines.forEach((line) => {
    if (!line || !String(line).trim()) return;
    if (y > 45) {
      y = 10;
    }
    doc.text(String(line), 14, y, { maxWidth: 180 });
    y += 4.5;
  });
  y += 4;
  const body = (dataRows || []).map((row) => padRow(row, n).map((c) => cellStr(c)));
  autoTable(doc, {
    startY: y,
    head: [h],
    body,
    styles: { fontSize: n > 10 ? 6 : 7, cellPadding: 0.4, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 43, 74], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [243, 245, 249] },
    margin: { left: 14, right: 14 },
  });
  doc.save(`${safeFileBase(nombreBaseArchivo)}.pdf`);
}

/**
 * .doc: HTML que Word abre (sin dependencia docx).
 */
export function exportarAepgTablaWordHtmlDoc(p) {
  const { tituloSistema, subtitulo, descripcion, headers, dataRows, nombreBaseArchivo, user, empresaNombre } = p;
  const h = headers || [];
  const fn = (user && user.nombre) || '—';
  const em = (user && user.email) || '—';
  const org = escapeHtml(empresaNombre || EMPRESA_ORGANIZACION);
  const rowsHtml = (dataRows || [])
    .map(
      (row) =>
        `<tr>${padRow(row, h.length)
          .map((c) => `<td>${escapeHtml(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const headHtml = `<tr>${h.map((x) => `<th>${escapeHtml(x)}</th>`).join('')}</tr>`;
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escapeHtml(tituloSistema)}</title>
<style>
body{font-family:Calibri,Segoe UI,sans-serif;font-size:11pt;margin:1.2cm}
h1{color:#0f2b4a;font-size:16pt} .meta{color:#333;font-size:10pt;margin-bottom:12px}
table{border-collapse:collapse;width:100%;margin-top:8px}
th,td{border:1px solid #ccc;padding:4px 6px}
th{background:#0f2b4a;color:#fff;text-align:left}
tr:nth-child(even) td{background:#f3f5f9}
</style></head>
<body>
<h1>${escapeHtml(tituloSistema)}</h1>
<div class="meta">
<p><strong>${escapeHtml(subtitulo || '')}</strong></p>
<p>${escapeHtml(descripcion || '')}</p>
<p>Organización: ${org} · Exportado: ${escapeHtml(fn)} &lt;${escapeHtml(em)}&gt; · ${escapeHtml(
    new Date().toLocaleString('es-AR'),
  )}</p>
</div>
<table>
<thead>${headHtml}</thead>
<tbody>${rowsHtml}</tbody>
</table>
</body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  saveAs(blob, `${safeFileBase(nombreBaseArchivo)}.doc`);
}

export function exportarAepgTablaHTML(p) {
  const { tituloSistema, subtitulo, descripcion, headers, dataRows, nombreBaseArchivo, user, empresaNombre } = p;
  const h = headers || [];
  const rowsHtml = (dataRows || [])
    .map(
      (row) =>
        `<tr>${padRow(row, h.length)
          .map((c) => `<td>${escapeHtml(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const headHtml = `<tr>${h.map((x) => `<th>${escapeHtml(x)}</th>`).join('')}</tr>`;
  const fn = (user && user.nombre) || '—';
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(tituloSistema)}</title>
<style>body{font-family:system-ui,sans-serif;margin:1rem} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px} th{background:#0f2b4a;color:#fff}</style>
</head><body>
<h1>${escapeHtml(tituloSistema)}</h1>
<p>${escapeHtml(subtitulo || '')}</p>
<p>${escapeHtml(descripcion || '')}</p>
<p>Org.: ${escapeHtml(empresaNombre || EMPRESA_ORGANIZACION)} — ${escapeHtml(fn)} — ${escapeHtml(
    new Date().toLocaleString('es-AR'),
  )}</p>
<table><thead>${headHtml}</thead><tbody>${rowsHtml}</tbody></table>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${safeFileBase(nombreBaseArchivo)}.html`);
}

function escapeTsv(s) {
  const t = String(s ?? '');
  if (/[\t\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function exportarAepgTablaTSV(p) {
  const { headers, dataRows, nombreBaseArchivo } = p;
  const h = headers || [];
  if (!h.length) return;
  const lines = [
    h.map(escapeTsv).join('\t'),
    ...(dataRows || []).map((row) => padRow(row, h.length).map(escapeTsv).join('\t')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/tab-separated-values;charset=utf-8' });
  saveAs(blob, `${safeFileBase(nombreBaseArchivo)}.tsv`);
}

export function exportarAepgTablaJSON(p) {
  const {
    tituloSistema,
    subtitulo,
    descripcion,
    user,
    empresaNombre,
    headers,
    dataRows,
    nombreBaseArchivo,
  } = p;
  const h = headers || [];
  const obj = {
    generado: new Date().toISOString(),
    tituloSistema,
    subtitulo,
    descripcion,
    organizacion: empresaNombre || EMPRESA_ORGANIZACION,
    exportadoPor: user
      ? { nombre: user.nombre, email: user.email, rol: user.rol }
      : null,
    columnas: h,
    filas: (dataRows || []).map((row) => {
      const o = {};
      padRow(row, h.length).forEach((v, i) => {
        o[h[i] || `col_${i}`] = v;
      });
      return o;
    }),
  };
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${safeFileBase(nombreBaseArchivo)}.json`);
}

/**
 * AOA (matriz) plana, p. ej. buildMultiAoa de producción: una tabla PDF por “bloques” o una sola hoja densa.
 */
export function exportarAoaComoPDF(aoa, nombreBase, titulo) {
  if (!aoa || !aoa.length) return;
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(9);
  doc.text(cellStr(titulo || 'AEPG — exportación').slice(0, 100), 14, 10);
  autoTable(doc, {
    startY: 16,
    body: aoa.map((r) => (r || []).map((c) => cellStr(c))),
    styles: { fontSize: 5.5, cellPadding: 0.3 },
  });
  doc.save(`${safeFileBase(nombreBase)}.pdf`);
}

export function exportarAoaComoTSV(aoa, nombreBase) {
  if (!aoa || !aoa.length) return;
  const lines = aoa.map((r) => (r || []).map(escapeTsv).join('\t'));
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${safeFileBase(nombreBase)}.tsv`);
}

export function exportarAoaComoJSON(aoa, nombreBase, meta) {
  const obj = { generado: new Date().toISOString(), ...meta, filas: aoa };
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  saveAs(blob, `${safeFileBase(nombreBase)}.json`);
}

export function exportarAoaComoHTML(aoa, nombreBase, titulo) {
  if (!aoa || !aoa.length) return;
  const body = aoa
    .map(
      (r) =>
        `<tr>${(r || [])
          .map((c) => `<td>${escapeHtml(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
<style>body{font-family:Calibri,sans-serif;margin:1rem;font-size:10pt} table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:3px} tr:nth-child(even) td{background:#f6f7f9}</style>
</head><body><h1 style="color:#0f2b4a;font-size:14pt">${escapeHtml(titulo)}</h1>
<p class="meta">${escapeHtml(new Date().toLocaleString('es-AR'))}</p>
<table><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${safeFileBase(nombreBase)}.html`);
}

export function exportarAoaComoWordHtml(aoa, nombreBase, titulo) {
  if (!aoa || !aoa.length) return;
  const body = aoa
    .map(
      (r) =>
        `<tr>${(r || [])
          .map((c) => `<td>${escapeHtml(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
    titulo,
  )}</title></head><body style="font-family:Calibri">
<h2>${escapeHtml(titulo)}</h2><p>${escapeHtml(new Date().toLocaleString('es-AR'))}</p>
<table border="1" cellpadding="3"><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  saveAs(blob, `${safeFileBase(nombreBase)}.doc`);
}
