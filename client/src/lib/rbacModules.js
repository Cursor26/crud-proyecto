export const RBAC_MODULES = [
  { codigo: 'usuarios', nombre: 'Usuarios' },
  { codigo: 'empleados', nombre: 'Empleados' },
  { codigo: 'contratos', nombre: 'Contratos' },
  { codigo: 'auditoria', nombre: 'Auditoría' },
  { codigo: 'configuracion', nombre: 'Configuración' },
  { codigo: 'reportes', nombre: 'Reportes' },
  { codigo: 'produccion', nombre: 'Producción' },
];

export const RBAC_ACTIONS = [
  { codigo: 'view', nombre: 'Ver' },
  { codigo: 'create', nombre: 'Crear' },
  { codigo: 'edit', nombre: 'Editar' },
  { codigo: 'delete', nombre: 'Eliminar' },
  { codigo: 'export', nombre: 'Exportar' },
  { codigo: 'approve', nombre: 'Aprobar' },
];

export function emptyPermissions() {
  const p = {};
  for (const m of RBAC_MODULES) {
    p[m.codigo] = { view: false, create: false, edit: false, delete: false, export: false, approve: false };
  }
  return p;
}

export function hasAnyPermission(permisos) {
  if (!permisos || typeof permisos !== 'object') return false;
  return Object.values(permisos).some(
    (m) => m?.view || m?.create || m?.edit || m?.delete || m?.export || m?.approve
  );
}

export function canPermission(permisos, module, action) {
  if (permisos == null) return true;
  return Boolean(permisos?.[module]?.[action]);
}
