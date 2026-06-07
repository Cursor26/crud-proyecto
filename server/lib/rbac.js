const { resolveRouteAction } = require('./rbacPathRules');

const RBAC_MODULES = [
  { codigo: 'usuarios', nombre: 'Usuarios', orden: 1 },
  { codigo: 'contratos', nombre: 'Contratos', orden: 2 },
  { codigo: 'auditoria', nombre: 'Auditoría', orden: 3 },
  { codigo: 'configuracion', nombre: 'Configuración', orden: 4 },
];

const RBAC_ACTIONS = [
  { codigo: 'view', nombre: 'Ver', col: 'can_view' },
  { codigo: 'create', nombre: 'Crear', col: 'can_create' },
  { codigo: 'edit', nombre: 'Editar', col: 'can_edit' },
  { codigo: 'delete', nombre: 'Eliminar', col: 'can_delete' },
  { codigo: 'export', nombre: 'Exportar', col: 'can_export' },
  { codigo: 'approve', nombre: 'Aprobar', col: 'can_approve' },
];

const ACTION_TO_COL = Object.fromEntries(RBAC_ACTIONS.map((a) => [a.codigo, a.col]));

function permFlags(p = {}) {
  return {
    view: Boolean(p.view),
    create: Boolean(p.create),
    edit: Boolean(p.edit),
    delete: Boolean(p.delete),
    export: Boolean(p.export),
    approve: Boolean(p.approve),
  };
}

/** Sin permiso Ver, ninguna otra acción del módulo aplica. */
function normalizePermFlags(p = {}) {
  const flags = permFlags(p);
  if (!flags.view) {
    return permFlags({});
  }
  return flags;
}

function normalizePermissionsMap(map = {}) {
  const out = {};
  for (const mod of RBAC_MODULES) {
    out[mod.codigo] = normalizePermFlags(map[mod.codigo]);
  }
  return out;
}

function allFlags(on) {
  return permFlags({ view: on, create: on, edit: on, delete: on, export: on, approve: on });
}

function viewExportOnly() {
  return permFlags({ view: true, export: true });
}

function viewOnly() {
  return permFlags({ view: true });
}

function fullCrud() {
  return permFlags({ view: true, create: true, edit: true, delete: true, export: true });
}

/** Plantillas por rol de sistema (replica comportamiento anterior). */
const SYSTEM_ROLE_TEMPLATES = {
  admin: {
    usuarios: allFlags(true),
    contratos: permFlags({}),
    auditoria: allFlags(true),
    configuracion: allFlags(true),
  },
  contratacion: {
    usuarios: permFlags({}),
    contratos: fullCrud(),
    auditoria: permFlags({}),
    configuracion: permFlags({ view: true }),
  },
  director: {
    usuarios: permFlags({}),
    contratos: permFlags({ view: true, export: true, approve: true }),
    auditoria: permFlags({}),
    configuracion: permFlags({ view: true }),
  },
};

function slugifyCodigo(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);
}

function rowToModulePerms(rows) {
  const map = {};
  for (const mod of RBAC_MODULES) {
    map[mod.codigo] = permFlags({});
  }
  for (const r of rows || []) {
    map[r.module_codigo] = normalizePermFlags({
      view: r.can_view,
      create: r.can_create,
      edit: r.can_edit,
      delete: r.can_delete,
      export: r.can_export,
      approve: r.can_approve,
    });
  }
  return map;
}

function createRbacService(dbQuery) {
  const cache = new Map();
  const CACHE_MS = 60_000;

  async function ensureRbacSchema() {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '..', 'sql', 'rbac_system.sql');
    const raw = fs.readFileSync(sqlPath, 'utf8');
    const statements = raw
      .split(';')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await dbQuery(stmt);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
          throw err;
        }
      }
    }
    await removeObsoleteSystemRoles();
    await seedSystemRolePermissions();
  }

  const OBSOLETE_SYSTEM_ROLES = ['rrhh', 'produccion', 'estadistica'];
  const FALLBACK_ROLE_CODIGO = 'contratacion';

  async function removeObsoleteSystemRoles() {
    const fallbackRows = await dbQuery(
      'SELECT id_rol FROM roles WHERE codigo = ? LIMIT 1',
      [FALLBACK_ROLE_CODIGO]
    );
    const fallbackId = fallbackRows[0]?.id_rol || null;

    for (const codigo of OBSOLETE_SYSTEM_ROLES) {
      const rows = await dbQuery('SELECT id_rol FROM roles WHERE codigo = ? LIMIT 1', [codigo]);
      const idRol = rows[0]?.id_rol;
      if (!idRol) continue;

      if (fallbackId) {
        await dbQuery('UPDATE usuarios SET id_rol = ? WHERE id_rol = ?', [fallbackId, idRol]);
      }
      await dbQuery('DELETE FROM rbac_role_permissions WHERE id_rol = ?', [idRol]);
      await dbQuery('DELETE FROM roles WHERE id_rol = ?', [idRol]);
    }
    cache.clear();
  }

  function hasAnyPermission(permissions) {
    if (!permissions || typeof permissions !== 'object') return false;
    return Object.values(permissions).some(
      (m) => m?.view || m?.create || m?.edit || m?.delete || m?.export || m?.approve
    );
  }

  async function seedSystemRolePermissions() {
    const roles = await dbQuery(
      `SELECT id_rol, codigo FROM roles WHERE codigo IN ('admin','contratacion','director')`
    );
    for (const role of roles) {
      const template = SYSTEM_ROLE_TEMPLATES[role.codigo];
      if (!template) continue;
      const existing = await dbQuery(
        'SELECT module_codigo FROM rbac_role_permissions WHERE id_rol = ? LIMIT 1',
        [role.id_rol]
      );
      if (!existing.length) {
        await savePermissionsForRole(role.id_rol, template);
        continue;
      }
      const rows = await dbQuery(
        'SELECT can_view, can_create, can_edit FROM rbac_role_permissions WHERE id_rol = ?',
        [role.id_rol]
      );
      const anyOn = rows.some(
        (row) => Number(row.can_view) || Number(row.can_create) || Number(row.can_edit)
      );
      if (!anyOn) await savePermissionsForRole(role.id_rol, template);
    }
    await enforceSystemRoleTemplates();
  }

  /** Aplica la plantilla exacta a roles de sistema (fuente de verdad; no editable en UI). */
  async function enforceSystemRoleTemplates() {
    const roles = await dbQuery(
      `SELECT id_rol, codigo FROM roles WHERE codigo IN ('admin','contratacion','director') AND COALESCE(is_system, 0) = 1`
    );
    for (const role of roles) {
      const template = SYSTEM_ROLE_TEMPLATES[role.codigo];
      if (!template) continue;
      await savePermissionsForRole(role.id_rol, template);
    }
    cache.clear();
  }

  async function savePermissionsForRole(idRol, permissionsMap) {
    const normalized = normalizePermissionsMap(permissionsMap);
    for (const mod of RBAC_MODULES) {
      const p = normalized[mod.codigo] || permFlags({});
      await dbQuery(
        `INSERT INTO rbac_role_permissions
          (id_rol, module_codigo, can_view, can_create, can_edit, can_delete, can_export, can_approve)
         VALUES (?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
          can_view=VALUES(can_view), can_create=VALUES(can_create), can_edit=VALUES(can_edit),
          can_delete=VALUES(can_delete), can_export=VALUES(can_export), can_approve=VALUES(can_approve)`,
        [
          idRol,
          mod.codigo,
          p.view ? 1 : 0,
          p.create ? 1 : 0,
          p.edit ? 1 : 0,
          p.delete ? 1 : 0,
          p.export ? 1 : 0,
          p.approve ? 1 : 0,
        ]
      );
    }
    cache.clear();
  }

  async function getPermissionsByCodigo(codigo) {
    const key = String(codigo || '').trim().toLowerCase();
    if (!key) return rowToModulePerms([]);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

    const rows = await dbQuery(
      `SELECT r.codigo, p.module_codigo, p.can_view, p.can_create, p.can_edit, p.can_delete, p.can_export, p.can_approve
         FROM roles r
         LEFT JOIN rbac_role_permissions p ON p.id_rol = r.id_rol
        WHERE LOWER(r.codigo) = ?
          AND COALESCE(r.activo, 1) = 1`,
      [key]
    );
    if (!rows.length) {
      const fallback = SYSTEM_ROLE_TEMPLATES[key] || rowToModulePerms([]);
      cache.set(key, { at: Date.now(), data: fallback });
      return fallback;
    }
    let data = rowToModulePerms(rows.filter((r) => r.module_codigo));
    if (!hasAnyPermission(data) && SYSTEM_ROLE_TEMPLATES[key]) {
      data = SYSTEM_ROLE_TEMPLATES[key];
    }
    cache.set(key, { at: Date.now(), data });
    return data;
  }

  function hasPermission(permissions, module, action) {
    const mod = permissions?.[module];
    if (!mod) return false;
    if (action !== 'view' && !mod.view) return false;
    const col = ACTION_TO_COL[action];
    if (!col) return false;
    const key = col.replace('can_', '');
    return Boolean(mod[key]);
  }

  function legacyRoleAllowed(codigo, rolesPermitidos) {
    const r0 = String(codigo || '');
    return rolesPermitidos.includes(r0);
  }

  async function listRoles() {
    const rows = await dbQuery(
      `SELECT r.id_rol, r.codigo, r.nombre, r.descripcion, COALESCE(r.is_system, 0) AS is_system,
              COALESCE(r.activo, 1) AS activo,
              (SELECT COUNT(*) FROM usuarios u WHERE u.id_rol = r.id_rol) AS usuarios_count
         FROM roles r
        ORDER BY COALESCE(r.is_system, 0) DESC, r.nombre ASC`
    );
    return rows;
  }

  async function getRoleWithPermissions(idRol) {
    const roles = await dbQuery(
      `SELECT id_rol, codigo, nombre, descripcion, COALESCE(is_system,0) AS is_system, COALESCE(activo,1) AS activo
         FROM roles WHERE id_rol = ? LIMIT 1`,
      [idRol]
    );
    if (!roles.length) return null;
    const perms = await dbQuery(
      'SELECT module_codigo, can_view, can_create, can_edit, can_delete, can_export, can_approve FROM rbac_role_permissions WHERE id_rol = ?',
      [idRol]
    );
    return {
      ...roles[0],
      permisos: rowToModulePerms(perms),
    };
  }

  async function createRole({ nombre, descripcion, codigo, permisos }) {
    const nom = String(nombre || '').trim();
    if (!nom) throw new Error('Nombre del rol obligatorio');
    let cod = String(codigo || '').trim().toLowerCase() || slugifyCodigo(nom);
    if (!cod) cod = `rol_${Date.now()}`;
    const exists = await dbQuery('SELECT id_rol FROM roles WHERE codigo = ? LIMIT 1', [cod]);
    if (exists.length) throw new Error('Ya existe un rol con ese código');
    const ins = await dbQuery(
      'INSERT INTO roles (codigo, nombre, descripcion, is_system, activo) VALUES (?,?,?,0,1)',
      [cod, nom, descripcion || null]
    );
    const idRol = ins.insertId;
    await savePermissionsForRole(idRol, permisos || {});
    cache.clear();
    return getRoleWithPermissions(idRol);
  }

  async function updateRole(idRol, { nombre, descripcion, activo, permisos }) {
    const role = await getRoleWithPermissions(idRol);
    if (!role) throw new Error('Rol no encontrado');
    if (Number(role.is_system) === 1 && permisos) {
      throw new Error('Los permisos de los roles del sistema no se pueden modificar');
    }
    const nom = nombre != null ? String(nombre).trim() : role.nombre;
    const desc = descripcion !== undefined ? descripcion : role.descripcion;
    const act = activo !== undefined ? (activo ? 1 : 0) : role.activo;
    await dbQuery('UPDATE roles SET nombre = ?, descripcion = ?, activo = ? WHERE id_rol = ?', [
      nom,
      desc,
      act,
      idRol,
    ]);
    if (permisos) await savePermissionsForRole(idRol, permisos);
    cache.clear();
    return getRoleWithPermissions(idRol);
  }

  async function deleteRole(idRol) {
    const role = await getRoleWithPermissions(idRol);
    if (!role) throw new Error('Rol no encontrado');
    if (Number(role.is_system) === 1) throw new Error('No se puede eliminar un rol del sistema');
    const users = await dbQuery('SELECT COUNT(*) AS c FROM usuarios WHERE id_rol = ?', [idRol]);
    if (Number(users[0]?.c) > 0) throw new Error('No se puede eliminar: hay usuarios con este rol');
    await dbQuery('DELETE FROM rbac_role_permissions WHERE id_rol = ?', [idRol]);
    await dbQuery('DELETE FROM roles WHERE id_rol = ?', [idRol]);
    cache.clear();
    return { ok: true };
  }

  async function roleCodigoExists(codigo) {
    const c = String(codigo || '').trim().toLowerCase();
    if (!c) return false;
    const rows = await dbQuery(
      'SELECT id_rol FROM roles WHERE LOWER(codigo) = ? AND COALESCE(activo,1) = 1 LIMIT 1',
      [c]
    );
    return rows.length > 0;
  }

  return {
    RBAC_MODULES,
    RBAC_ACTIONS,
    resolveRouteAction,
    ensureRbacSchema,
    getPermissionsByCodigo,
    hasPermission,
    hasAnyPermission,
    legacyRoleAllowed,
    listRoles,
    getRoleWithPermissions,
    createRole,
    updateRole,
    deleteRole,
    roleCodigoExists,
    rowToModulePerms,
    permFlags,
    slugifyCodigo,
  };
}

module.exports = { createRbacService, RBAC_MODULES, RBAC_ACTIONS };
