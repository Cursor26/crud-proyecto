/**
 * Encabezado de módulo: título en recuadro rojo con position fixed (capa sobre la ola negra, sin recorte
 * del scroll del main). El espaciador reserva altura en el documento; acciones en segunda fila.
 */
function ModuleTitleBar({ title, actions = null }) {
  return (
    <div className="module-title-bar mb-3">
      <div className="dashboard-module-red-title-flow-spacer" aria-hidden="true" />
      <div className="dashboard-module-red-title-anchor dashboard-module-red-title-anchor--overlay">
        <h4 className="mb-1">{title}</h4>
      </div>
      {actions ? (
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end mt-1">{actions}</div>
      ) : null}
    </div>
  );
}

export default ModuleTitleBar;
