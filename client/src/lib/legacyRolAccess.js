/** Respaldo si RBAC aún no cargó permisos (misma lógica que el menú antes del RBAC). */
export function createLegacyCan(rol) {
  const r = String(rol || '').trim().toLowerCase();

  return (module, action) => {
    if (r === 'admin') {
      switch (module) {
        case 'usuarios':
        case 'auditoria':
        case 'configuracion':
          return true;
        case 'contratos':
          return false;
        default:
          return false;
      }
    }

    const needsWrite = ['create', 'edit', 'delete', 'approve'].includes(action);
    if (r === 'director' && needsWrite) return false;

    switch (module) {
      case 'usuarios':
        return false;
      case 'auditoria':
        return false;
      case 'configuracion':
        return action === 'view';
      case 'contratos':
        return r === 'contratacion' || r === 'director';
      default:
        return false;
    }
  };
}
