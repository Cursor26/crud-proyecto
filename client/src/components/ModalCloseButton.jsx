/**
 * Botón cerrar (×) estable: recuadro rojo al hover, sin parpadeo.
 */
export function ModalCloseButton({ onClick, className = '', ariaLabel = 'Cerrar' }) {
  return (
    <button
      type="button"
      className={`app-btn-close${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

export default ModalCloseButton;
