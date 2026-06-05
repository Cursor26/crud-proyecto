import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ContratosMotivoCancelacionModal({
  show,
  onHide,
  numeroContrato,
  empresa,
  motivo,
  solicitadoPor,
  fechaSolicitud,
  esArchivo = false,
}) {
  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onHide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onHide]);

  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  const num = String(numeroContrato || '').trim();
  const textoMotivo = String(motivo || '').trim();

  return createPortal(
    <div className="contratos-motivo-overlay" role="presentation">
      <div className="contratos-motivo-backdrop" onClick={onHide} aria-hidden="true" />
      <div
        className="contratos-motivo-window modal-minimal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contratos-motivo-title"
      >
        <div className="modal-premium-header modal-minimal-header border-0">
          <div className="modal-premium-header-inner modal-minimal-header-inner">
            <span id="contratos-motivo-title" className="modal-premium-badge modal-minimal-badge">
              {esArchivo ? 'Motivo de cancelación y archivo' : 'Motivo de cancelación'}
            </span>
          </div>
          <button
            type="button"
            className="btn-close contratos-motivo-window__close"
            aria-label="Cerrar"
            onClick={onHide}
          />
        </div>

        <div className="contratos-motivo-window__subhead">Solicitud pendiente de aprobación</div>

        <div className="modal-premium-body modal-minimal-body contratos-motivo-window__body">
          <p className="contratos-motivo-window__meta small text-muted mb-3">
            Contrato <strong>{num || '—'}</strong>
            {empresa ? (
              <>
                {' '}
                — <span>{empresa}</span>
              </>
            ) : null}
          </p>
          {solicitadoPor || fechaSolicitud ? (
            <p className="small text-muted mb-3">
              {solicitadoPor ? (
                <>
                  Solicitado por <strong>{solicitadoPor}</strong>
                </>
              ) : null}
              {solicitadoPor && fechaSolicitud ? ' · ' : null}
              {fechaSolicitud ? fechaSolicitud : null}
            </p>
          ) : null}
          <div className="contratos-motivo-window__texto">
            {textoMotivo ? (
              <p className="mb-0">{textoMotivo}</p>
            ) : (
              <p className="mb-0 text-muted">No se indicó motivo al solicitar la cancelación.</p>
            )}
          </div>
        </div>

        <div className="modal-premium-footer modal-minimal-footer border-0">
          <span aria-hidden="true" />
          <button type="button" className="btn btn-outline-secondary modal-minimal-btn" onClick={onHide}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
