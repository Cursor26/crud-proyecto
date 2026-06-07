/**
 * Portal del menú react-select (solo fuera de modales; en modales se usa <select> nativo).
 * Con zoom CSS en .dashboard-main, absolute dentro del contenedor desalinea el menú → body + fixed.
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

  if (wrapperEl.closest('.dashboard-main')) {
    return { portal: document.body, position: 'fixed', placement };
  }

  return { portal: document.body, position: 'fixed', placement };
}
