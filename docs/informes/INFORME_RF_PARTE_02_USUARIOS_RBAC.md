# Informe RF — Parte 2: Usuarios, perfil y RBAC (RF-007 a RF-017)

---

## RF-007 — Consultar listado de usuarios con auditoría

**Implementación:** `GET /usuarios` (solo rol `admin` + JWT). Devuelve filas de `usuarios` con `created_by`, `created_at`, `updated_by`, `updated_at`, `activo`, `rol`.

**UI:** `GestionUsuarios.jsx` — tabla con columnas de auditoría; resuelve nombre del actor si su email está en el listado.

**Tribunal — ¿Quién puede ver la lista?** Solo administradores. La ruta usa `autorizarRol(['admin'])`.

**Subs:** 7.1 listado API; 7.2 restricción admin; 7.3 tabla UI; 7.4 nombres legibles; 7.5 filas inactivas con estilo distinto (`App.css` / clases en fila).

---

## RF-008 — Registrar nuevos usuarios

**Implementación:** `POST /create-usuario` — valida email único, rol existente en RBAC, contraseña fuerte; `bcrypt.hash`; `created_by` = email del admin en sesión.

**UI:** Modal en `GestionUsuarios.jsx` con confirmación de contraseña.

**Tribunal — ¿Quién crea usuarios?** Solo admin. La contraseña inicial la define el administrador; el usuario puede cambiarla después en su perfil.

**Subs:** 8.1 validación; 8.2 duplicados → 409; 8.3 bcrypt; 8.4 auditoría alta; 8.5 modal SweetAlert2/FormModal.

---

## RF-009 — Actualizar datos y credenciales de usuario

**Implementación:** `PUT /update-usuario/:email` — el `:email` en URL es la clave actual; el body puede incluir nuevo email, nombre, rol, `activo`, `password` opcional.

**Tribunal — ¿Se puede cambiar el correo?** Sí, identificando la cuenta por el email antiguo en la URL y enviando el nuevo en el body, con validación de no duplicado.

**Subs:** 9.1 PUT por clave; 9.2 cambio email; 9.3 password opcional rehasheada; 9.4 `updated_by`/`updated_at`; 9.5 rol validado contra tabla `roles`.

---

## RF-010 — Eliminar usuarios del sistema

**Implementación:** `DELETE /delete-usuario/:email` — borrado físico del registro (admin).

**UI:** Confirmación SweetAlert2 si `confirmBeforeDelete` en preferencias.

**Tribunal — ¿Puede un admin borrarse a sí mismo?** La UI en `GestionUsuarios.jsx` impide auto-eliminación y auto-desactivación.

**Subs:** 10.1 DELETE; 10.2 confirmación; 10.3 no auto-borrado; 10.4 404 si no existe; 10.5 refresh tabla sin reload.

---

## RF-011 — Activar o desactivar cuentas operativamente

**Implementación:** Toggle en fila → `PUT /update-usuario/:email` con `{ activo: 0|1 }` sin abrir modal.

**Efecto:** Usuario inactivo no puede login (RF-001). Activo restaura acceso.

**Tribunal — ¿Es inmediato?** Sí en BD; el usuario con sesión abierta sigue hasta que expire el JWT o se revoque, pero no podrá volver a entrar.

**Subs:** 11.1 toggle UI; 11.2 PUT inmediato; 11.3 no auto-desactivar; 11.4 estilo fila; 11.5 login bloqueado.

---

## RF-012 — Gestionar perfil personal del usuario autenticado

| Ruta | Función |
|------|---------|
| `GET/PUT /user/profile` | Nombre, teléfono |
| `GET/PUT /user/profile-photo` | Foto base64 |
| `PUT /user/change-password` | Contraseña actual + nueva |
| `GET/PUT /user/preferences` | Preferencias UI (RF-053) |

**UI:** `GestionConfiguracion.jsx` + `UserProfileSettings.jsx`; avatar en `UserProfileAvatar.jsx` (topbar).

**Tribunal — ¿Necesita ser admin?** No. Cualquier usuario autenticado gestiona **solo su** perfil; el servidor usa `req.user.email` del JWT.

**Subs:** 12.1 consultar perfil; 12.2 editar datos; 12.3 foto; 12.4 cambio contraseña con verificación de la actual; 12.5 avatar topbar.

---

## RF-013 — Consultar módulos y acciones de permiso

**Implementación:** `GET /rbac/modules` devuelve catálogo fijo: módulos `usuarios`, `contratos`, `auditoria`, `configuracion` con acciones `view`, `create`, `edit`, `delete`, `export`, `approve`, `verify` (definido en `server/lib/rbac.js` y `client/src/lib/rbacModules.js`).

**UI:** Matriz de checkboxes en `GestionRoles.jsx`.

**Tribunal — ¿Los permisos son dinámicos?** Los **módulos y acciones** son catálogo fijo en código; los **roles** y qué permisos tiene cada uno sí son configurables en BD (`roles`, `rol_permisos`).

**Subs:** 13.1 GET modules; 13.2 requiere `usuarios.view`; 13.3 matriz UI; 13.4 roles sistema protegidos; 13.5 GET rol por id.

---

## RF-014 — Crear y editar roles personalizados

**Rutas:** `POST /rbac/roles`, `PUT /rbac/roles/:id_rol` — requieren `usuarios.create` / `usuarios.edit`.

**Persistencia:** Tabla `roles` + `rol_permisos` (módulo, acción, permitido).

**Tribunal — ¿Cuándo aplican los cambios?** Al **siguiente login** o si el cliente recarga permisos vía `GET /rbac/me/permissions` (tras login ya vienen en respuesta de `/login`).

**Subs:** 14.1 POST crear; 14.2 PUT editar; 14.3 nombre único; 14.4 listado con conteo usuarios; 14.5 efecto en sesiones nuevas.

---

## RF-015 — Eliminar roles y proteger roles de sistema

**Ruta:** `DELETE /rbac/roles/:id_rol` — requiere `usuarios.delete`.

**Protecciones en `rbac.js`:** No eliminar roles de sistema (`admin`, `contratacion`, `director`, `abogado`); no eliminar si hay usuarios asignados.

**Subs:** 15.1 DELETE; 15.2 bloqueo sistema; 15.3 bloqueo con usuarios; 15.4 permiso delete; 15.5 confirmación UI.

---

## RF-016 — Resolver permisos efectivos del usuario en sesión

**Flujo:**
1. Login → `rbac.getPermissionsByCodigo(rol)` → objeto `{ usuarios: { view: true, ... }, contratos: { ... } }`.
2. Cliente guarda en `localStorage` y `PermissionsContext`.
3. `can(modulo, accion)` consulta esa matriz.
4. `GET /rbac/me/permissions` permite refrescar sin reloguear.

**Capa legacy:** `createLegacyCan` en `legacyRolAccess.js` — compatibilidad si permisos vacíos (fallback por rol antiguo).

**Tribunal — ¿Dónde se decide si un botón se ve?** En React con `can()`; en servidor con `autorizarPermiso` — **doble capa**: la UI oculta, la API rechaza con 403 si manipulan la petición.

**Subs:** 16.1 endpoint me/permissions; 16.2 PermissionsContext; 16.3 legacyCan; 16.4 recarga tras cambio rol; 16.5 rol en JWT.

---

## RF-017 — Autorizar operaciones API y visibilidad de menú

### Middleware en servidor (`server/index.js`)

1. **Global:** `app.use` → si ruta no está en `apiPublicPaths.js`, exige `verificarToken`.
2. **Por ruta:** `autorizarRol(['admin'])` o `autorizarPermiso('contratos', 'edit')`.
3. **Reglas extra:** `rbacPathRules.js` infiere módulo/acción por path para algunas rutas.

### Menú en cliente (`App.js`)

| Ítem menú | Condición `can()` |
|-----------|-------------------|
| Contratación | `contratos.view` |
| Usuarios | `usuarios.view` |
| Roles | `usuarios.edit` o `usuarios.create` |
| Auditoría | `auditoria.view` |
| Correo sistema | permiso configuración / rol |
| Configuración app | usuario autenticado |

**Modo solo lectura:** `PuedeEscribirContext` — si solo hay `view`, banner "modo consulta" y botones de escritura deshabilitados.

### Preguntas tribunal

**¿Qué pasa si llamo la API sin token?** HTTP **401** "No autenticado".

**¿Con token pero sin permiso?** HTTP **403** "No tienes permiso...".

**¿Las rutas públicas?** Solo login, forgot/reset password, mail-estado, login-avatar (lista en `apiPublicPaths.js`).

**Subs:** 17.1 JWT global; 17.2 autorizarRol; 17.3 autorizarPermiso; 17.4 menú can(); 17.5 PuedeEscribirContext.

---

*Anterior: [Parte 1](./INFORME_RF_PARTE_01_AUTENTICACION.md) · Siguiente: [Parte 3 — Contratos](./INFORME_RF_PARTE_03_CONTRATOS.md)*
