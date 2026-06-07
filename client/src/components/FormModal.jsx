import { Modal } from 'react-bootstrap';
import ModalCloseButton from './ModalCloseButton';
import { BTN_CANCELAR_MD, BTN_GUARDAR_MD } from '../lib/actionButtonClasses';

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
  primaryTitle,
  cancelTitle = 'Cerrar sin guardar los cambios',
  size,
  scrollable = false,
  autoCompleteOff = false,
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
      <Modal.Header closeButton={false} className="modal-premium-header modal-minimal-header border-0">
        <div className="modal-premium-header-inner modal-minimal-header-inner">
          <span className="modal-premium-badge modal-minimal-badge">{title}</span>
          {subtitle ? <p className="modal-premium-subtitle mb-0">{subtitle}</p> : null}
        </div>
        <ModalCloseButton onClick={onHide} title="Cerrar esta ventana sin guardar" />
      </Modal.Header>
      <Modal.Body
        className="modal-premium-body modal-minimal-body modal-form-body-scroll"
        {...(autoCompleteOff ? { autoComplete: 'off' } : {})}
      >
        {children}
      </Modal.Body>
      <Modal.Footer className="modal-premium-footer modal-minimal-footer border-0">
        <button
          type="button"
          className={`${BTN_GUARDAR_MD} modal-premium-btn-save`}
          onClick={onPrimary}
          disabled={primaryDisabled}
          title={primaryTitle || `${primaryLabel}: confirmar y aplicar los datos del formulario`}
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          className={`${BTN_CANCELAR_MD} modal-premium-btn-cancel`}
          onClick={onHide}
          title={cancelTitle}
        >
          Cancelar
        </button>
      </Modal.Footer>
    </Modal>
  );
}
