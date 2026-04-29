import { useState } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import { exportarProduccionHerramienta } from '../utils/exportProduccionFormatosExtra';
import { useAuth } from '../context/AuthContext';

const ITEMS = [
  { id: 'pdf', label: 'PDF', desc: 'Vista de informe con malla (meta + series)' },
  { id: 'doc', label: 'Word .doc (HTML)', desc: 'Abre en Microsoft Word' },
  { id: 'html', label: 'HTML', desc: 'Página con tablas' },
  { id: 'json', label: 'JSON', desc: 'Estructurado: módulo, hojas y celdas' },
  { id: 'tsv', label: 'TSV', desc: 'Texto delimitado por tabulador' },
];

/**
 * Exporta el mismo bloque de datos que CSV/XLS del panel interactivo (herramientas 16).
 * @param {string} p.nombreModulo — título (Sacrificio vacuno, etc.)
 * @param {() => any[]} p.buildHojas — de devuelve el array de hojas de `hojasDesdeInteractivo` / hojasParaExport
 * @param {boolean} p.disabled
 */
function ExportacionProduccionInteractivaMenu({ nombreModulo, buildHojas, disabled = false, className = '' }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async (kind) => {
    if (disabled) return;
    setBusy(true);
    try {
      const hojas = buildHojas();
      await exportarProduccionHerramienta(kind, {
        nombreModulo,
        user,
        hojas,
        nombreBase: `AEPG_informe_${String(nombreModulo || 'produccion').replace(/\s+/g, '_')}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dropdown className={className} align="end" drop="down">
      <Dropdown.Toggle
        variant="outline-dark"
        size="sm"
        className="btn-form-nowrap"
        disabled={disabled || busy}
        id="export-prod-interactivo"
        title="Exporta la vista de herramientas (mismo contenido informativo que el informe Excel/CSV, en más formatos)"
      >
        {busy ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-file-earmark-zip" aria-hidden="true" />}
        Más formatos
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-0 shadow" style={{ minWidth: 280 }}>
        <div className="px-2 py-1 small text-muted border-bottom">Informe de la vista actual (gráficos / rango / métrica)</div>
        {ITEMS.map((k) => (
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

export default ExportacionProduccionInteractivaMenu;
