export const RBAC_MODULES = [
  { codigo: 'usuarios', nombre: 'Usuarios' },
  { codigo: 'contratos', nombre: 'Contratos' },
  { codigo: 'auditoria', nombre: 'Auditoría' },
  { codigo: 'configuracion', nombre: 'Configuración' },
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

/** Sin permiso Ver, ninguna otra acción del módulo aplica. */
export function normalizeModulePermissions(row = {}) {
  const normalized = {
    view: Boolean(row.view),
    create: Boolean(row.create),
    edit: Boolean(row.edit),
    delete: Boolean(row.delete),
    export: Boolean(row.export),
    approve: Boolean(row.approve),
  };
  if (!normalized.view) {
    normalized.create = false;
    normalized.edit = false;
    normalized.delete = false;
    normalized.export = false;
    normalized.approve = false;
  }
  return normalized;
}

export function normalizePermissions(permisos) {
  const base = emptyPermissions();
  for (const m of RBAC_MODULES) {
    base[m.codigo] = normalizeModulePermissions(permisos?.[m.codigo]);
  }
  return base;
}

export function hasAnyPermission(permisos) {
  if (!permisos || typeof permisos !== 'object') return false;
  return Object.values(permisos).some(
    (m) => m?.view || m?.create || m?.edit || m?.delete || m?.export || m?.approve
  );
}

export function canPermission(permisos, module, action) {
  if (permisos == null) return true;
  const mod = permisos?.[module];
  if (!mod) return false;
  if (action !== 'view' && !mod.view) return false;
  return Boolean(mod[action]);
}
