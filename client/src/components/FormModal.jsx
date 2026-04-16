import { Modal } from 'react-bootstrap';

/**
 * Ventana emergente estándar para altas/edición de formularios (patrón unificado).
 * Estilos: `modal-premium-dialog` en App.css
 */
export function FormModal({
  show,
  onHide,
  title,
  subtitle,
  children,
  onPrimary,
  primaryLabel = 'Guardar',
  primaryDisabled = false,
  size,
  scrollable = true,
}) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size={size}
      centered
      backdrop="static"
      scrollable={scrollable}
      dialogClassName="modal-premium-dialog modal-minimal-dialog"
      contentClassName="modal-premium-content modal-minimal-content"
    >
      <Modal.Header closeButton className="modal-premium-header modal-minimal-header border-0">
        <div className="modal-premium-header-inner modal-minimal-header-inner">
          <span className="modal-premium-badge modal-minimal-badge">{title}</span>
          {subtitle ? <p className="modal-premium-subtitle mb-0">{subtitle}</p> : null}
        </div>
      </Modal.Header>
      <Modal.Body className="modal-premium-body modal-minimal-body">{children}</Modal.Body>
      <Modal.Footer className="modal-premium-footer modal-minimal-footer border-0">
        <button
          type="button"
          className="btn btn-primary modal-premium-btn-save modal-minimal-btn"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
        <button type="button" className="btn btn-outline-secondary modal-premium-btn-cancel modal-minimal-btn" onClick={onHide}>
          Cancelar
        </button>
      </Modal.Footer>
    </Modal>
  );
}
