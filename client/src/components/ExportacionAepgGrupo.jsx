import { useState } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import {
  exportarAepgTablaXLSX,
  exportarAepgTablaXLS,
  exportarAepgTablaCSV,
  AEPG_TITULO_RRHH,
} from '../utils/exportAepgPlantilla';
import {
  exportarAepgTablaPDF,
  exportarAepgTablaWordHtmlDoc,
  exportarAepgTablaHTML,
  exportarAepgTablaTSV,
  exportarAepgTablaJSON,
} from '../utils/exportAepgExtendedFormats';
import { useAuth } from '../context/AuthContext';

const EXCEL_FIRST = [
  { id: 'xlsx', label: 'Excel .xlsx', desc: 'Libro con estilos y cabecera AEPG' },
  { id: 'xls', label: 'Excel .xls', desc: 'Excel 97–2003' },
  { id: 'csv', label: 'CSV', desc: 'Texto con separador ; y metadatos' },
];

const DOCS = [
  { id: 'pdf', label: 'PDF', desc: 'Listo para imprimir o archivar' },
  { id: 'doc', label: 'Word .doc (HTML)', desc: 'Compatible con Microsoft Word' },
  { id: 'html', label: 'HTML', desc: 'Página con tabla; abre en el navegador' },
];

const DATA = [
  { id: 'json', label: 'JSON', desc: 'Datos estructurados (API / scripts)' },
  { id: 'tsv', label: 'TSV', desc: 'Pegar en hojas de cálculo (tabulador)' },
];

/**
 * Menú de exportación AEPG: xlsx, xls, csv, pdf, doc, html, json, tsv.
 */
function ExportacionAepgGrupo({
  subtitulo,
  descripcion,
  nombreBaseArchivo,
  sheetName,
  headers,
  dataRows,
  disabled = false,
  tituloSistema = AEPG_TITULO_RRHH,
  className = '',
  empresaNombre,
  dropDirection = 'down',
  align = 'end',
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const base = {
    user,
    empresaNombre,
    headers,
    dataRows,
    sheetName,
    nombreBaseArchivo,
    tituloSistema,
    subtitulo,
    descripcion,
  };

  const run = async (kind) => {
    if (disabled || !headers?.length) return;
    setBusy(true);
    try {
      if (kind === 'xlsx') await exportarAepgTablaXLSX(base);
      else if (kind === 'xls') exportarAepgTablaXLS(base);
      else if (kind === 'csv') exportarAepgTablaCSV({ ...base });
      else if (kind === 'pdf') exportarAepgTablaPDF(base);
      else if (kind === 'doc') exportarAepgTablaWordHtmlDoc(base);
      else if (kind === 'html') exportarAepgTablaHTML(base);
      else if (kind === 'tsv') exportarAepgTablaTSV(base);
      else if (kind === 'json') exportarAepgTablaJSON(base);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dropdown
      className={className}
      align={align}
      drop={dropDirection}
    >
      <Dropdown.Toggle
        variant="outline-primary"
        size="sm"
        id="export-aepg-dropdown"
        className="btn-form-nowrap d-inline-flex align-items-center gap-1"
        disabled={disabled || busy}
        title="Exportar tabla en varios formatos (metadatos AEPG, sin incluir acciones de fila)"
      >
        {busy ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-download" aria-hidden="true" />}
        Exportar…
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-0 shadow" style={{ minWidth: 280 }}>
        <div className="px-2 py-1 small text-muted border-bottom">Hojas de cálculo</div>
        {EXCEL_FIRST.map((k) => (
          <Dropdown.Item
            key={k.id}
            as="button"
            type="button"
            className="small"
            onClick={() => { void run(k.id); }}
          >
            <span className="fw-medium">{k.label}</span>
            <span className="d-block text-muted" style={{ fontSize: 10 }}>{k.desc}</span>
          </Dropdown.Item>
        ))}
        <Dropdown.Divider className="my-0" />
        <div className="px-2 py-1 small text-muted border-bottom">Documento / web</div>
        {DOCS.map((k) => (
          <Dropdown.Item
            key={k.id}
            as="button"
            type="button"
            className="small"
            onClick={() => { void run(k.id); }}
          >
            <span className="fw-medium">{k.label}</span>
            <span className="d-block text-muted" style={{ fontSize: 10 }}>{k.desc}</span>
          </Dropdown.Item>
        ))}
        <Dropdown.Divider className="my-0" />
        <div className="px-2 py-1 small text-muted border-bottom">Datos / interoperabilidad</div>
        {DATA.map((k) => (
          <Dropdown.Item
            key={k.id}
            as="button"
            type="button"
            className="small"
            onClick={() => { void run(k.id); }}
          >
            <span className="fw-medium">{k.label}</span>
            <span className="d-block text-muted" style={{ fontSize: 10 }}>{k.desc}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default ExportacionAepgGrupo;
