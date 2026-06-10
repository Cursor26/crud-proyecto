# Informe — Mapa de código, configuración y organización del programa

Documento de referencia para localizar **dónde está implementada cada capacidad** del Sistema de Gestión Empresarial (AEPG).

---

## 1. Estructura general del repositorio

```
c:\crud\
├── client\                 # Frontend React (puerto 3000 en desarrollo)
│   ├── src\
│   │   ├── App.js          # Shell dashboard, login, menú, routing por estado
│   │   ├── axiosConfig.js  # HTTP base, interceptores, logout forzado
│   │   ├── components\     # Pantallas y piezas UI por módulo
│   │   ├── context\        # React Context (permisos, preferencias, nav)
│   │   ├── hooks\          # Lógica reutilizable (mail status, dashboard nav)
│   │   └── lib\            # Utilidades (JWT, RBAC cliente, fechas, preferencias)
│   └── .env.example        # REACT_APP_API_URL
│
├── server\                 # Backend Express (puerto 3001)
│   ├── index.js            # Punto de entrada: rutas API, middleware, arranque
│   ├── .env.example        # JWT, MySQL, SMTP, rate limits, auditoría
│   ├── lib\                # Lógica de negocio modular (contratos, rbac, mail…)
│   ├── sql\                # Scripts DDL tablas (auditoría, blacklist, outbox…)
│   └── scripts\            # Generadores DOCX, auditoría rutas, datos RF
│
└── docs\                   # Requisitos, informes, catálogos
    └── informes\           # Este conjunto de informes explicativos
```

**Organización elegida:** monorepo con separación **cliente / servidor**. El servidor concentra rutas en `index.js` pero delega reglas complejas a `server/lib/*.js`. El cliente usa **un componente por módulo de negocio** y **contextos** para estado transversal (sesión, permisos, preferencias).

---

## 2. Mapa módulo UI → componente → API

| Módulo en menú | Componente React | Rutas API principales |
|----------------|------------------|------------------------|
| Login | `Login.jsx` | `POST /login`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/mail-estado` |
| Contratación | `GestionContratos.jsx` | `/contratos`, `/create-contrato`, `/update-contrato`, `/contratos/*` |
| Usuarios | `GestionUsuarios.jsx` | `/usuarios`, `/create-usuario`, `/update-usuario/:email`, `/delete-usuario/:email` |
| Roles y permisos | `GestionRoles.jsx` | `/rbac/modules`, `/rbac/roles`, `/rbac/me/permissions` |
| Auditoría | `Auditoria.jsx` | `/audit/sessions`, `/audit/failed-logins`, `/audit/events` |
| Correo del sistema | `ConfigCorreoServicio.jsx` | `/config/correo`, `/config/recordatorios-contratos`, `/config/contratos-correo-plantillas` |
| Configuración app | `GestionConfiguracion.jsx` → `AppConfiguracion.jsx` | `/user/profile`, `/user/preferences`, `/user/change-password` |

### Subcomponentes de Contratación (dentro de `GestionContratos.jsx`)

| Sección (`contratosNavSections.js`) | Componentes / archivos |
|---------------------------------------|-------------------------|
| resumen | KPIs calculados en `GestionContratos.jsx` |
| contratos | Tabla principal + formularios |
| rechazados | `ContratosRechazoDetalleModal.jsx` |
| verificar | Flujo jurídico + `ContratosJuridicoComentariosModal.jsx` |
| pendientes | `ContratosPendientesDetalle.jsx`, `ContratosCambiosPendientesModal.jsx` |
| renovaciones | Lógica renovación en formulario |
| correo | `ContratosCorreoConfig.jsx`, `RecordatoriosContratosConfig.jsx` |
| reportes | Export Excel/CSV/PDF en `GestionContratos.jsx` |
| auditoría | `ContratosAuditoria.jsx` |
| archivo | Listado `GET /contratos-archivo` |

---

## 3. Mapa servidor: librerías `server/lib/`

| Archivo | Responsabilidad |
|---------|-----------------|
| `apiPublicPaths.js` | Rutas sin JWT (login, reset password, mail-estado) |
| `securityConfig.js` | JWT secret, CORS, rate limiters |
| `jwtBlacklist.js` | Revocación de tokens por `jti` |
| `auditLog.js` | Sesiones, fallos login, bloqueos, eventos admin |
| `rbac.js` | Roles, permisos, consultas `rol_permisos` |
| `rbacPathRules.js` | Inferencia permiso por path URL |
| `sistemaCorreo.js` | Transporte nodemailer, envío |
| `mailOutbox.js` | Cola `mail_outbox` y reintentos |
| `mailHealth.js` | Estado salud SMTP |
| `contratosAprobacion.js` | Aprobar/rechazar solicitudes |
| `contratosRevisionJuridica.js` | Estados y transiciones jurídicas |
| `contratosAuditoria.js` | Log operaciones contrato |
| `contratosRecordatorios.js` | Scheduler y envío automático |
| `contratosCorreoPlantillas.js` | Plantillas y placeholders |
| `contratosCorreosNiveles.js` | Destinatarios por evento/prioridad |
| `contratosDocumentosStorage.js` | Almacenamiento PDF en disco |
| `contratosExportExpediente.js` | Generación ZIP expediente |
| `contratosArchivo.js` | Paso a archivo histórico |
| `contratosJuridicoAdjuntos.js` | Adjuntos devolución jurídica |
| `contratosNumeroUnico.js` | Validación unicidad número |
| `contratosContactosNotificacion.js` | Validación contactos JSON |
| `clientIp.js` | IP real detrás de proxy |

---

## 4. Tablas de base de datos por dominio

| Dominio | Tablas principales |
|---------|-------------------|
| Usuarios | `usuarios`, `password_reset_tokens` |
| RBAC | `roles`, `rol_permisos` |
| Contratos | `contratos_generales`, `catalogo_tipo_contrato`, `contratos_documentos`, `contratos_archivo`, `contratos_recordatorios_envios` |
| Configuración | `config_sistema` (claves JSON: recordatorios, SMTP UI) |
| Correo | `mail_outbox` |
| Auditoría | `audit_sessions`, `audit_failed_logins`, `audit_login_lockouts`, `audit_events` |
| Seguridad | `jwt_blacklist` |

Scripts de creación: `server/sql/*.sql` (ejecutados al arranque o lazy migrate en `index.js`).

---

## 5. Variables de entorno (`server/.env`)

| Variable | Ubicación efecto | Valor por defecto / notas |
|----------|------------------|---------------------------|
| `JWT_SECRET` | Firma JWT | Obligatorio ≥32 chars en producción (`securityConfig.js`) |
| `PASSWORD_RESET_TTL_MINUTES` | `index.js` forgot-password | **30** minutos |
| `AUDIT_MAX_FAILED_LOGINS` | `auditLog.js` | **5** intentos |
| `AUDIT_LOCKOUT_MINUTES` | `auditLog.js` | **15** minutos |
| `RATE_LIMIT_LOGIN_MAX` | `securityConfig.js` | **30** / 15 min por IP |
| `RATE_LIMIT_RESET_MAX` | `securityConfig.js` | **10** / hora |
| `APP_BASE_URL` | Enlaces reset password | `http://localhost:3000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | `sistemaCorreo.js` | Correo saliente |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL | `index.js` |
| `CORS_ORIGINS` | `securityConfig.js` | Orígenes permitidos React |

Cliente: `REACT_APP_API_URL` → base URL API en `axiosConfig.js`.

---

## 6. Configuración editable desde la UI (no solo .env)

| Qué se configura | Pantalla | Clave / tabla | API |
|------------------|----------|---------------|-----|
| SMTP (alternativa a .env) | Correo del sistema | `config_sistema` | `PUT /config/correo` |
| Plantillas correo contratos | Correo del sistema | JSON plantillas | `PUT /config/contratos-correo-plantillas` |
| Recordatorios automáticos | Correo del sistema | `contratos_recordatorios_auto` | `PUT /config/recordatorios-contratos` |
| Roles y permisos | Roles y permisos | `roles`, `rol_permisos` | `/rbac/roles` |
| Tipos de contrato | Formulario contratos | `catalogo_tipo_contrato` | `/catalogo/tipos-contrato` |
| Apariencia y UX | Configuración app | preferencias usuario (BD + localStorage) | `PUT /user/preferences` |
| Perfil usuario | Configuración app | columnas en `usuarios` | `PUT /user/profile` |

**Restablecer predeterminados:** botones en UI de correo (`.../restablecer`) y en `AppConfiguracion.jsx` por sección de preferencias.

---

## 7. Contextos React (estado global cliente)

| Contexto | Archivo | Contenido |
|----------|---------|-----------|
| Permisos | `PermissionsContext.jsx` | Matriz `can(modulo, accion)` |
| Preferencias | `AppPreferencesContext.jsx` | Tema, fuentes, fechas, sync servidor |
| Escritura | `PuedeEscribirContext.jsx` | Modo solo lectura |
| Contadores nav contratos | `ContratosNavCountsContext.jsx` | Badges pendientes/jurídico |
| Auth | Estado en `App.js` | `authToken`, `user`, `permisos` |

---

## 8. Flujo de seguridad (resumen visual)

```
Login.jsx
   → POST /login
       → bcrypt + audit + JWT (8h) + permisos
   → localStorage (token, user, permisos)
   → Axios Authorization Bearer

Cada petición API
   → apiPublicPaths? skip : verificarToken
       → jwt.verify + blacklist jti + usuario activo
   → autorizarRol / autorizarPermiso (ruta específica)
   → handler

App.js menú
   → can('modulo','view') oculta módulos
```

---

## 9. Mapa RF → documento informe

| RF | Parte informe |
|----|---------------|
| RF-001 – RF-006 | `INFORME_RF_PARTE_01_AUTENTICACION.md` |
| RF-007 – RF-017 | `INFORME_RF_PARTE_02_USUARIOS_RBAC.md` |
| RF-018 – RF-031 | `INFORME_RF_PARTE_03_CONTRATOS.md` |
| RF-032 – RF-043 | `INFORME_RF_PARTE_04_RECORDATORIOS_CORREO_DOCS.md` |
| RF-044 – RF-054 | `INFORME_RF_PARTE_05_EXPORT_AUDITORIA_UX.md` |

Catálogo formal (tabla Word): `docs/CATALOGO_REQUISITOS_FUNCIONALES.docx`  
Datos fuente generación: `server/scripts/rf-catalogo-data.mjs`

---

## 10. Scripts útiles de mantenimiento

| Script | Función |
|--------|---------|
| `node scripts/generate-rf-catalogo-docx.mjs` | Regenera catálogo Word 54 RF |
| `node scripts/export-rf-catalogo-md.mjs` | Regenera Markdown catálogo |
| `node scripts/audit-api-auth.mjs` | Verifica rutas con JWT |
| `node scripts/generate-requisitos-docx.mjs` | Informe requisitos proyecto AEPG / SGE |

---

## 11. Respuesta tipo tribunal: "¿Cómo está organizado el proyecto?"

**Respuesta sugerida:**

> El proyecto es una aplicación web en dos capas: un frontend React en `client/` y una API REST Express en `server/`, ambos en el mismo repositorio. La interfaz se organiza en un dashboard con menú lateral; cada módulo de negocio (Contratación, Usuarios, Roles, Auditoría, Correo y Configuración) tiene su componente principal en `client/src/components/`. La seguridad es JWT con expiración de 8 horas, blacklist al cerrar sesión, y RBAC con permisos por módulo y acción almacenados en MySQL. La lógica compleja de contratos, correo y auditoría no está toda en un solo archivo: está modularizada en `server/lib/` con nombres explícitos (`contratosRecordatorios.js`, `rbac.js`, etc.). La configuración sensible (JWT, BD, SMTP) va en `server/.env`; la configuración operativa (plantillas, recordatorios, preferencias de UI) es editable desde pantallas de administración y se persiste en base de datos o localStorage del navegador según el caso.

---

*Volver al [Índice de informes](./INFORME_RF_INDICE.md)*
