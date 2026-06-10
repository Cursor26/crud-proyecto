# Informe RF — Parte 5: Exportaciones, auditoría y experiencia de usuario (RF-044 a RF-054)

---

## RF-044 — Exportar reportes de contratos a Excel, CSV y PDF

**Dónde:** Sección `reportes` en `GestionContratos.jsx`.

**Tecnologías:**
| Formato | Librería | Detalle |
|---------|----------|---------|
| Excel | ExcelJS | Cabecera verde corporativa AEPG, columnas visibles |
| CSV | Blob manual | Separador `;`, BOM UTF-8 (`\uFEFF`) |
| PDF | jsPDF + autoTable | Tabla con mismos datos filtrados |

**Tribunal — ¿Exporta todo o solo lo filtrado?** Solo el **conjunto visible** según filtros activos en la vista de reportes.

**Subs:** Excel, CSV, PDF, respetar filtros, botones en sección reportes.

---

## RF-045 — Exportar archivo histórico a Excel, CSV y PDF

**Misma lógica que RF-044** aplicada al array de contratos archivados (`GET /contratos-archivo` cargado en sección `archivo`).

**Columnas adicionales:** fecha de archivo, motivo, metadatos de expediente histórico.

---

## RF-046 — Exportar auditoría del sistema a PDF

**Dónde:** `Auditoria.jsx` — pestañas sesiones, intentos fallidos, eventos.

**Condición:** Botón export visible si `can('auditoria', 'export')`.

**Implementación:** jsPDF/autoTable sobre datos ya cargados de `GET /audit/sessions`, `/audit/failed-logins`, `/audit/events`.

**Filtros:** Rango de fechas aplicado antes de generar PDF.

---

## RF-047 — Registrar y consultar sesiones de acceso

**Registro:** En cada login exitoso → `audit.recordLoginSession` → tabla `audit_sessions`.

**Campos:** email, nombre, rol, IP (`clientIp.js`), user-agent.

**Consulta:** `GET /audit/sessions` — solo admin; UI tabla en `Auditoria.jsx`.

**Tribunal — ¿Se audita cada login?** Sí, cada autenticación **exitosa** genera una fila. Los fallos van a otra tabla (RF-048).

---

## RF-048 — Registrar intentos fallidos y bloqueos

**Tabla:** `audit_failed_logins` — cada intento con `reason`: `bad_password`, `user_not_found`, `user_inactive`, `locked`.

**Bloqueos:** `audit_login_lockouts` — ver RF-006.

**API:** `GET /audit/failed-logins`, `GET /audit/failed-summary`.

**Subs:** registro automático en POST /login, listado, resumen agregado, UI Auditoría, vínculo con bloqueo.

---

## RF-049 — Consultar eventos de auditoría del sistema

**Tabla:** `audit_events` — categorías: `role`, `delete`, `restore`, etc.

**Ejemplos de eventos:** cambio de rol, usuario creado/eliminado, activación/desactivación, archivo de contrato.

**API:** `GET /audit/events` — admin.

**Formato legible:** `formatAuditMessage()` en `auditLog.js` traduce JSON a texto humano.

---

## RF-050 — Auditar operaciones sobre contratos

**Módulo:** `server/lib/contratosAuditoria.js` — `logContrato(req, { action, numero, details })`.

**Acciones típicas:** `contrato_alta_solicitada`, `contrato_edicion_solicitada`, `contrato_renovado`, aprobaciones, verificación jurídica.

**Consulta:** `GET /contratos/auditoria` — roles lectura contratos.

**UI:** `ContratosAuditoria.jsx` — sección `auditoria` del módulo Contratación; filtros por número y fechas.

**Blacklist JWT:** `jwtBlacklist.js` — revocación documentada como medida de seguridad (sub 50.5).

---

## RF-051 — Configurar tema, tipografía y escala de interfaz

**UI:** `AppConfiguracion.jsx` (menú Configuración).

**Motor:** `client/src/lib/appPreferences.js` — temas, fuentes, `uiScale`, ancho sidebar, menú compacto, tema automático (`prefers-color-scheme`).

**Aplicación:** `applyPreferencesToDocument()` escribe variables CSS en `:root` / `data-theme`.

**Vista previa:** Cambios en vivo antes de guardar.

**Tribunal — ¿Es solo cosmético?** Afecta legibilidad y accesibilidad operativa; preferencias se sincronizan con cuenta (RF-053).

---

## RF-052 — Configurar accesibilidad y formatos fecha/hora

**Accesibilidad:** alto contraste, `reduceAnimations`, `largeUiTargets`, subrayado enlaces, modo compacto — claves en `DEFAULT_PREFERENCES` (`appPreferences.js`).

**Fechas:** `dateFormat: 'dmy' | 'mdy'` → `formatAppDate` en `lib/formatAppDate.js`.

**Horas:** `timeFormat: '12h' | '24h'` → `formatAppTime`.

**Panel informativo:** Fecha/hora actual en sidebar derecho de `App.js` usando esas funciones.

---

## RF-053 — Sincronizar y restablecer preferencias de usuario

**Flujo (`AppPreferencesContext.jsx`):**
1. Cambio en UI → `saveStoredPreferences(email, prefs)` en localStorage inmediato.
2. Tras 900 ms debounce → `PUT /user/preferences` con JSON completo.
3. Al login → `GET /user/preferences` fusiona remoto con local (`mergePreferencesFromServer`).
4. Estados UI: `synced`, `syncing`, `error`, `local`.

**Restablecer:** Botones por sección (tema, tipografía, escala, accesibilidad, navegación) y global — SweetAlert2 confirmación; endpoints de reset llaman defaults de `appPreferences.js`.

**Tribunal — ¿Las preferencias son por usuario?** Sí. Se keyed por email en localStorage y persistidas en BD columna/tabla de preferencias del usuario.

---

## RF-054 — Gestionar navegación dashboard, secciones y experiencia móvil

### Layout (`App.js`)
- **Sidebar izquierdo:** módulos permitidos por `can()`.
- **Área central:** componente activo según `navKey`.
- **Panel derecho:** módulo activo, fecha/hora, logo AEPG.

### Contratación
- Pestañas superiores + menú lateral sincronizados vía `contratosNavSections.js`.
- Secciones: resumen, contratos, rechazados, verificar, pendientes, renovaciones, correo, reportes, auditoría, archivo.
- `rememberSection` en preferencias → `useDashboardNav.js` restaura última sección.

### Móvil
- `Offcanvas` de Bootstrap para menú lateral.
- Pestañas con solo iconos en pantallas pequeñas.
- Topbar compacta con avatar y logout.

### Pantalla inicial por rol (`useDashboardNav.js`)
| Rol | Vista inicial |
|-----|---------------|
| admin | Usuarios |
| contratacion / director / abogado | Primera sección de Contratación permitida por permisos |

### Retroalimentación
- **SweetAlert2** para confirmaciones y errores.
- Spinners en operaciones async.
- `confirmBeforeDelete` en preferencias → confirmación antes de borrar.

**Tribunal — ¿Hay react-router?** No en el árbol principal. Navegación por **estado React** (`navKey`, `contratosSection`); más simple para SPA interna.

**Subs:** layout, pestañas, rememberSection, offcanvas móvil, pantalla inicial por rol.

---

*Anterior: [Parte 4](./INFORME_RF_PARTE_04_RECORDATORIOS_CORREO_DOCS.md) · [Índice](./INFORME_RF_INDICE.md) · [Mapa de código](./INFORME_MAPA_CODIGO_Y_CONFIGURACION.md)*
