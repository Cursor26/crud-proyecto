/** Respaldo si RBAC aún no cargó permisos (misma lógica que el menú antes del RBAC). */
export function createLegacyCan(rol) {
  const r = String(rol || '').trim().toLowerCase();
  const esEstadistica = r === 'estadistica' || r === 'produccion';

  return (module, action) => {
    if (r === 'admin') return true;

    const needsWrite = ['create', 'edit', 'delete', 'approve'].includes(action);
    if (r === 'director' && needsWrite) return false;

    switch (module) {
      case 'usuarios':
        return false;
      case 'auditoria':
        return false;
      case 'configuracion':
        return action === 'view' || (r === 'admin' && !needsWrite);
      case 'contratos':
        return r === 'contratacion' || r === 'director' || (r === 'admin');
      case 'empleados':
        return r === 'rrhh' || r === 'director' || r === 'contratacion' || esEstadistica;
      case 'reportes':
        return r === 'rrhh' || r === 'director';
      case 'produccion':
        return esEstadistica || r === 'director';
      default:
        return false;
    }
  };
}
