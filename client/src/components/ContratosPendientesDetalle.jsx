import { useMemo } from 'react';
import { lineasResumenPendiente, tieneCambiosEdicionPendiente } from '../lib/contratosAprobacionResumen';

export default function ContratosPendientesDetalle({
  contrato,
  fmtDisplayDate,
  tipoLegible,
  onVerCambios,
}) {
  const accion = String(contrato?.aprobacion_accion || '').toLowerCase();
  const opts = useMemo(
    () => ({ fmtFecha: fmtDisplayDate, tipoLegible }),
    [fmtDisplayDate, tipoLegible]
  );
  const tieneCambios = useMemo(
    () =>
      accion === 'edicion' &&
      tieneCambiosEdicionPendiente(contrato, contrato.aprobacion_propuesta, opts),
    [accion, contrato, opts]
  );
  const lineas = useMemo(() => lineasResumenPendiente(contrato, opts), [contrato, opts]);

  if (accion === 'edicion') {
    if (!tieneCambios) {
      return (
        <span className="text-muted small">
          Sin cambios detectados en el formulario.
        </span>
      );
    }
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-primary contratos-btn-ver-cambios"
        onClick={(e) => {
          e.stopPropagation();
          onVerCambios?.(contrato);
        }}
      >
        <i className="bi bi-eye me-1" aria-hidden="true" />
        Ver cambios
      </button>
    );
  }

  if (!lineas.length) {
    return <span className="text-muted small">—</span>;
  }

  const primera = lineas[0];
  if (lineas.length === 1 && primera.tipo === 'mensaje') {
    return <span className="text-muted small">{primera.texto}</span>;
  }

  return (
    <div className="contratos-pendientes-detalle">
      <ul className="contratos-pendientes-cambios mb-0">
        {lineas.map((linea, idx) => {
          if (linea.tipo === 'mensaje') {
            return (
              <li key={idx} className="contratos-pendientes-cambios__mensaje">
                {linea.texto}
              </li>
            );
          }
          if (linea.tipo === 'dato') {
            return (
              <li key={idx}>
                <strong>{linea.label}:</strong> {linea.valor}
              </li>
            );
          }
          return null;
        })}
      </ul>
    </div>
  );
}
