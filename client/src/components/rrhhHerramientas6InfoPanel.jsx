/**
 * Bloque informativo fijo: qué hace el análisis y qué datos/valores utiliza.
 */
function RrhhHerramientas6InfoPanel({ queHace, datosYValores }) {
  return (
    <div className="rrhh-h6-info border rounded-2 p-3 mb-3 small bg-body-secondary bg-opacity-25">
      <div className="text-uppercase text-muted fw-semibold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
        Qué hace este análisis
      </div>
      <p className="mb-3 text-body-secondary" style={{ whiteSpace: 'pre-line', lineHeight: 1.45 }}>
        {queHace}
      </p>
      <div className="text-uppercase text-muted fw-semibold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
        Datos, campos y criterios de valores
      </div>
      <p className="mb-0 text-body-secondary" style={{ whiteSpace: 'pre-line', lineHeight: 1.45 }}>
        {datosYValores}
      </p>
    </div>
  );
}

export default RrhhHerramientas6InfoPanel;
