import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

/**
 * PDF tabular estilo Contratación: una sola tabla continua (sin partir columnas arriba/abajo).
 */
export function descargarPdfTablaVerde({ titulo, metaLinea, headers, dataRows, nombreArchivo, fontSize = 6 }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 10, right: 8, bottom: 10, left: 8 };
  const usableWidth = pageWidth - margin.left - margin.right;
  const colCount = headers.length;
  const fs = fontSizeForColumns(colCount, fontSize);
  const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  const meta = metaLinea || `Generado: ${fechaTxt}  |  Registros: ${dataRows.length}`;

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
  const columnStyles = Object.fromEntries(
    headers.map((_, index) => [index, { cellWidth: colWidth }])
  );

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

  doc.save(nombreArchivo);
}
