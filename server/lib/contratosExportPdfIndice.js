const { jsPDF } = require('jspdf');
const { autoTable } = require('jspdf-autotable');

/** Columnas alineadas a la tabla Contratos en la UI */
const INDICE_HEADERS = [
  'N° Contrato',
  'Tipo',
  'Empresa',
  'Vigencia',
  'Suplemento',
  'Fecha Inicio',
  'Fecha Fin',
  'Estado',
  'Días',
  'Documento',
];

function truncar(val, max = 120) {
  const s = val === null || val === undefined ? '' : String(val);
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

function fontSizeForColumns(colCount, requested = 6) {
  if (colCount > 12) return Math.min(requested, 4.2);
  if (colCount > 9) return Math.min(requested, 4.8);
  if (colCount > 7) return Math.min(requested, 5.2);
  return requested;
}

function drawDocumentHeader(doc, { titulo, meta, margin, usableWidth, topY }) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 83, 45);
  doc.text(truncar(titulo, 100), margin.left, topY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(66, 66, 66);
  const metaLines = doc.splitTextToSize(meta, usableWidth);
  doc.text(metaLines, margin.left, topY + 5);

  return topY + 5 + metaLines.length * 3.6 + 3;
}

function etiquetaDocumentoIndice(conteos) {
  const total = (conteos.contrato || 0) + (conteos.suplemento || 0) + (conteos.anexo || 0);
  if (!total) return '—';
  const partes = [];
  if (conteos.contrato) partes.push('Principal');
  if (conteos.suplemento) partes.push(`${conteos.suplemento} sup.`);
  if (conteos.anexo) partes.push(`${conteos.anexo} anex.`);
  return partes.join(', ');
}

/**
 * PDF tabular estilo Contratación (cabecera verde, filas alternas).
 * @returns {Buffer}
 */
function assertPdfBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 5 || buf.slice(0, 5).toString() !== '%PDF-') {
    const err = new Error('No se pudo generar el PDF del expediente.');
    err.status = 500;
    throw err;
  }
  return buf;
}

function buildIndiceContratosPdfBuffer({
  filas,
  exportadoPor,
  totalContratos,
  titulo = 'Índice de contratos exportados',
  metaLinea = null,
}) {
  const headers = INDICE_HEADERS;
  const dataRows = filas || [];
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 10, right: 8, bottom: 10, left: 8 };
  const usableWidth = pageWidth - margin.left - margin.right;
  const colCount = headers.length;
  const fs = fontSizeForColumns(colCount, 6);
  const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  const meta =
    metaLinea ||
    `Generado: ${fechaTxt}  |  Exportado por: ${exportadoPor || 'usuario'}  |  Contratos: ${totalContratos ?? dataRows.length}`;

  const headRow = headers.map((h) => truncar(h, 48));
  const bodyRows = dataRows.map((row) => {
    const cells = row.map((cell) => truncar(cell));
    while (cells.length < colCount) cells.push('');
    return cells.slice(0, colCount);
  });

  const tableStartY = drawDocumentHeader(doc, {
    titulo,
    meta,
    margin,
    usableWidth,
    topY: margin.top,
  });

  const colWidth = usableWidth / colCount;
  const columnStyles = Object.fromEntries(headers.map((_, index) => [index, { cellWidth: colWidth }]));

  autoTable(doc, {
    head: [headRow],
    body: bodyRows,
    startY: tableStartY,
    tableWidth: usableWidth,
    columnStyles,
    horizontalPageBreak: false,
    rowPageBreak: 'auto',
    styles: {
      fontSize: fs,
      cellPadding: { top: 0.6, right: 0.8, bottom: 0.6, left: 0.8 },
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'left',
      lineColor: [210, 218, 226],
      lineWidth: 0.1,
      minCellHeight: fs * 0.55,
    },
    headStyles: {
      fillColor: [20, 83, 45],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: fs + 0.2,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 0.8, right: 0.6, bottom: 0.8, left: 0.6 },
    },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    margin: { top: 14, right: margin.right, bottom: margin.bottom, left: margin.left },
    showHead: 'everyPage',
    theme: 'grid',
    didDrawPage: (hook) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Página ${hook.pageNumber}`, pageWidth - margin.right, pageHeight - 4, { align: 'right' });
    },
  });

  const arrayBuffer = doc.output('arraybuffer');
  return assertPdfBuffer(Buffer.from(arrayBuffer));
}

function buildFichaContratoPdfBuffer(fila, { numero, empresa }) {
  return buildIndiceContratosPdfBuffer({
    filas: [fila],
    exportadoPor: '',
    totalContratos: 1,
    titulo: `Contrato ${numero}`,
    metaLinea: `Empresa: ${String(empresa || '').trim() || 'Sin empresa'}`,
  });
}

module.exports = {
  INDICE_HEADERS,
  etiquetaDocumentoIndice,
  buildIndiceContratosPdfBuffer,
  buildFichaContratoPdfBuffer,
  assertPdfBuffer,
};
