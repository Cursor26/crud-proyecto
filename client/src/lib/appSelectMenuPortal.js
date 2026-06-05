/**
 * Portal del menú react-select (solo fuera de modales; en modales se usa <select> nativo).
 * - Filtros en .dashboard-main (zoom): mismo contenedor + absolute.
 * - Resto: body + fixed.
 */

export function resolveAppSelectMenuPortal(wrapperEl, menuPortalTarget, menuPosition) {
  const placement = 'bottom';

  if (menuPortalTarget !== undefined) {
    return {
      portal: menuPortalTarget || undefined,
      position: menuPosition || (menuPortalTarget ? 'fixed' : 'absolute'),
      placement,
    };
  }

  if (typeof document === 'undefined' || !wrapperEl) {
    return { portal: undefined, position: 'absolute', placement };
  }

  const zoomHost =
    wrapperEl.closest('.dashboard-main-scroll') || wrapperEl.closest('.dashboard-main');
  if (zoomHost) {
    return { portal: zoomHost, position: 'absolute', placement };
  }

  return { portal: document.body, position: 'fixed', placement };
}
