import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BTN_CANCELAR_MD } from '../lib/actionButtonClasses';
import {
  etiquetaRevisionJuridica,
  claseBadgeRevisionJuridica,
} from '../lib/contratosRevisionJuridica';

export default function ContratosRechazoDetalleModal({
  show,
  onHide,
  contrato,
  accionLabel,
  adjuntos = [],
  onDescargarAdjunto,
  fmtFecha,
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

  if (!show || !contrato) return null;

  const numero = String(contrato.numero_contrato || '').trim();
  const empresa = String(contrato.empresa || '').trim() || 'Sin empresa';

  return createPortal(
    <div className="contratos-motivo-overlay" role="presentation">
      <div className="contratos-motivo-backdrop" onClick={onHide} aria-hidden="true" />
      <div
        className="contratos-motivo-window modal-minimal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contratos-rechazo-title"
      >
        <div className="modal-premium-header modal-minimal-header border-0">
          <div className="modal-premium-header-inner modal-minimal-header-inner">
            <span id="contratos-rechazo-title" className="modal-premium-badge modal-minimal-badge">
              Detalle de devolución
            </span>
            <button type="button" className="btn-close" onClick={onHide} aria-label="Cerrar" />
          </div>
        </div>
        <div className="modal-minimal-body">
          <p className="mb-2">
            <strong>{numero}</strong> — {empresa}
          </p>
          <p className="mb-2 small text-muted">
            Acción solicitada: <strong>{accionLabel || '—'}</strong>
          </p>
          <p className="mb-2">
            <span className={`badge ${claseBadgeRevisionJuridica(contrato.revision_juridica_estado)}`}>
              {etiquetaRevisionJuridica(contrato.revision_juridica_estado)}
            </span>
          </p>
          <div className="mb-3">
            <div className="small text-muted mb-1">Motivo u observación</div>
            <div className="p-2 border rounded bg-light small">
              {contrato.revision_juridica_nota || '—'}
            </div>
          </div>
          <div className="mb-2 small text-muted">
            Devuelto por {contrato.revision_juridica_resuelto_por || '—'}
            {contrato.revision_juridica_resuelto_en && typeof fmtFecha === 'function'
              ? ` · ${fmtFecha(contrato.revision_juridica_resuelto_en)}`
              : ''}
          </div>
          <div>
            <div className="small text-muted mb-1">Documentos adjuntos</div>
            {adjuntos.length === 0 ? (
              <p className="small text-muted mb-0">Sin documentos adjuntos.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {adjuntos.map((adj) => (
                  <li key={adj.id} className="mb-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => onDescargarAdjunto?.(numero, adj.id, adj.nombre_archivo)}
                    >
                      <i className="bi bi-paperclip me-1" aria-hidden="true" />
                      {adj.nombre_archivo}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="modal-minimal-footer border-0 pt-0">
          <button type="button" className={BTN_CANCELAR_MD} onClick={onHide}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
