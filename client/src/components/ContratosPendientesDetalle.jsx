import { useMemo, useState } from 'react';
import {
  lineasResumenPendiente,
  motivoCancelacionPendiente,
  tieneCambiosEdicionPendiente,
} from '../lib/contratosAprobacionResumen';
import ContratosMotivoCancelacionModal from './ContratosMotivoCancelacionModal';

export default function ContratosPendientesDetalle({
  contrato,
  fmtDisplayDate,
  tipoLegible,
  onVerCambios,
}) {
  const [showMotivo, setShowMotivo] = useState(false);
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
  const motivoCancelacion = useMemo(() => motivoCancelacionPendiente(contrato), [contrato]);
  const fechaSolicitudFmt = useMemo(() => {
    if (!contrato?.aprobacion_solicitado_en || typeof fmtDisplayDate !== 'function') return '';
    return fmtDisplayDate(contrato.aprobacion_solicitado_en);
  }, [contrato, fmtDisplayDate]);

  if (accion === 'edicion') {
    if (!tieneCambios) {
      return (
        <span className="text-muted small">
          Sin cambios detectados en el formulario.
        </span>
      );
    }
    return (
      <div>
        <button
          type="button"
          className="btn btn-sm contratos-btn-ver-cambios"
          onClick={(e) => {
            e.stopPropagation();
            onVerCambios?.(contrato);
          }}
        >
          <i className="bi bi-eye me-1" aria-hidden="true" />
          Ver cambios
        </button>
      </div>
    );
  }

  if (accion === 'cancelacion' || accion === 'cancelacion_archivo' || accion === 'archivo') {
    return (
      <>
        <button
          type="button"
          className="btn btn-sm contratos-btn-ver-motivo"
          onClick={(e) => {
            e.stopPropagation();
            setShowMotivo(true);
          }}
        >
          <i className="bi bi-chat-left-text me-1" aria-hidden="true" />
          Motivo
        </button>
        <ContratosMotivoCancelacionModal
          show={showMotivo}
          onHide={() => setShowMotivo(false)}
          numeroContrato={contrato?.numero_contrato}
          empresa={contrato?.empresa}
          motivo={motivoCancelacion}
          solicitadoPor={contrato?.aprobacion_solicitado_por}
          fechaSolicitud={fechaSolicitudFmt}
          esArchivo={accion === 'cancelacion_archivo' || accion === 'archivo'}
        />
      </>
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
