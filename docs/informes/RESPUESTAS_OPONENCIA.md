# Respuestas para la Oponencia — Sistema de Gestión de Contratos AEPG

**Proyecto:** Plataforma transversal de gestión contractual y expedientes digitales  
**Stack:** React (cliente) · Node.js/Express (API) · MySQL  
**Organización:** Empresa Pecuaria Genética Valle del Perú (AEPG)  
**Documento:** Guía de defensa oral y escrita ante tribunal  
**Referencias de código:** `server/index.js`, `server/lib/rbac.js`, `server/lib/auditLog.js`, `docs/security-test-results.json`

---

## Pregunta 1 — RBAC en backend: verificación de roles y prevención de bypass desde React

### Respuesta

El control de acceso se implementó con **defensa en profundidad**. La interfaz React solo oculta o deshabilita acciones según permisos; **toda autorización efectiva ocurre en el servidor**. El principio aplicado es *never trust the client*: el frontend es presentación; el backend es la frontera de seguridad.

**Flujo de verificación en cada petición HTTP:**

1. **Middleware global de autenticación** (`verificarToken` en `server/index.js`): todas las rutas excepto las públicas (`/login`, recuperación de contraseña, etc., definidas en `server/lib/apiPublicPaths.js`) exigen cabecera `Authorization: Bearer <JWT>`. Se valida la firma con `JWT_SECRET` (`server/lib/securityConfig.js`), se comprueba revocación en blacklist (`server/lib/jwtBlacklist.js`), que el usuario siga activo en MySQL y que el token no sea anterior al último cambio de contraseña (`password_changed_at`).

2. **Autorización por ruta** — dos mecanismos complementarios:
   - `autorizarRol(['contratacion','director','abogado'])`: roles de negocio para módulos como contratos.
   - `autorizarPermiso('contratos', 'approve'|'verify'|'edit')`: verificación estricta contra la matriz RBAC persistida en base de datos (`server/lib/rbac.js`, tablas `roles` y `rbac_role_permissions`).

3. **Permisos no viajan en el token.** El JWT solo transporta identidad (`email`, `nombre`, `rol`, `jti`). Los permisos efectivos se **reconsultan en cada petición** desde MySQL. Modificar `localStorage.permisos` en el navegador **no concede acceso** a la API: cualquier llamada directa (Postman, curl) sin token válido o sin permiso recibe **401** o **403**.

4. **Inferencia automática ruta → permiso** (`server/lib/rbacPathRules.js`): reduce omisiones al proteger endpoints nuevos.

5. **Prevención de escalamiento de privilegios:**
   - Creación y edición de usuarios: solo rol `admin`; el rol asignado debe existir en catálogo (`rolValido`).
   - Un usuario **no puede cambiar su propio rol ni desactivarse** al editarse.
   - Un usuario **no puede eliminarse a sí mismo**.
   - Roles de sistema (`admin`, `contratacion`, `director`, `abogado`) tienen plantillas protegidas; no se eliminan ni alteran permisos desde la UI de roles.
   - La gestión RBAC (`/rbac/*`) exige permisos `usuarios.view/create/edit/delete`.

6. **Frontend como capa de UX** (`client/src/context/PermissionsContext.jsx`, `can('contratos','approve')` en `GestionContratos.jsx`): mejora usabilidad, pero no es barrera de seguridad.

**Requisitos funcionales relacionados:** RF-007 a RF-017 (usuarios y RBAC), documentados en `docs/informes/INFORME_RF_PARTE_02_USUARIOS_RBAC.md`.

### Si la oponente profundiza

- Los permisos en cliente se cachean en `localStorage` solo para UI; se refrescan con `GET /rbac/me/permissions` al iniciar sesión.
- JWT en `localStorage` implica riesgo XSS; mitigación actual: React escapa salida, Helmet, expiración 8 h; mejora futura: cookies `httpOnly` (documentado en `docs/INFORME_SEGURIDAD_AEPG.docx`, hallazgo H-07).

---

## Pregunta 2 — Hash criptográfico de contraseñas e inmutabilidad de auditoría

### Respuesta — Contraseñas

Se seleccionó **bcrypt** (biblioteca `bcrypt` v6, `server/package.json`):

| Aspecto | Implementación |
|---------|----------------|
| Algoritmo | bcrypt (Blowfish adaptativo, sal incorporada) |
| Factor de costo | **10 rounds** — `bcrypt.hash(password, 10)` |
| Ubicaciones | Alta de usuario, cambio de contraseña, reset, actualización admin (`server/index.js`) |
| Almacenamiento | Solo hash en columna `password` de `usuarios`; nunca texto plano |
| Verificación | `bcrypt.compare()` en login |
| Política | Mínimo 8 caracteres, mayúscula, minúscula y dígito (`passwordFuerte`) |
| Controles adicionales | Bloqueo tras 5 intentos fallidos (15 min), rate limiting en login, invalidación JWT al cambiar contraseña |

**Justificación de bcrypt:** estándar de industria, resistencia configurable a fuerza bruta, ampliamente auditado.

### Respuesta — Inmutabilidad de auditoría

La trazabilidad usa `server/lib/auditLog.js` y tablas en `server/sql/audit_system.sql`:

- **`audit_events`:** eventos de negocio (usuarios, contratos, eliminaciones).
- **`audit_sessions`, `audit_failed_logins`, `audit_login_lockouts`:** sesiones y seguridad de acceso.

**Garantías implementadas (lógicas, no criptográficas):**

1. La aplicación solo ejecuta **INSERT** en `audit_events`; no existen endpoints de UPDATE/DELETE sobre auditoría.
2. **Separación de privilegios:** consulta de auditoría requiere rol administrador; el registro es automático desde servicios del servidor.
3. **Contratos:** `server/lib/contratosAuditoria.js` registra aprobaciones, rechazos, solicitudes y verificación jurídica con `details_json` (motivo, actor, acción).
4. El administrador **no puede borrar el historial** desde la aplicación; sus propias acciones quedan registradas (`user_role_change`, `user_deleted`, etc.).

**Matiz ante tribunal:** la inmutabilidad es **append-only por diseño de aplicación**, no un ledger criptográfico. Un administrador de base de datos con acceso directo a MySQL podría alterar filas; en producción se mitiga con permisos de BD restringidos, backups y auditoría del servidor. Mejora futura: triggers `BEFORE UPDATE/DELETE` en `audit_events` o réplica de solo lectura.

**RF relacionados:** RF-001 a RF-006 (autenticación), RF-016 (auditoría de seguridad).

---

## Pregunta 3 — Pruebas de seguridad, OWASP e inyección SQL

### Respuesta

Las pruebas de seguridad del Capítulo 4 deben describirse con precisión según lo **efectivamente realizado**:

| Actividad | Evidencia en el repositorio |
|-----------|----------------------------|
| Revisión estática alineada a **OWASP Top 10** | `server/scripts/generate-informe-seguridad-docx.mjs` → `docs/INFORME_SEGURIDAD_AEPG.docx` |
| Pruebas dinámicas automatizadas (10 casos) | `server/scripts/security-smoke-test.mjs` → `docs/security-test-results.json` |
| Auditoría de rutas API | `server/scripts/audit-api-auth.mjs` |

**Categorías OWASP evaluadas:** Broken Access Control, Cryptographic Failures, Injection, Security Misconfiguration.

**Casos smoke test documentados (10/10 superados, jun-2026):**

- SEC-01: Ruta protegida sin token → 401.
- SEC-02: Token JWT inválido → 403.
- SEC-03: Credenciales incorrectas → 401.
- SEC-04: Inyección SQL `' OR 1=1--` en login → 401 (sin bypass).
- SEC-05: Contraseña débil en reset → 400.
- SEC-06: Crear usuario sin autenticación → 401.
- SEC-07: Listar contratos sin token → 401.
- SEC-08: Cabeceras Helmet presentes.
- SEC-09: CORS bloquea origen no autorizado.
- SEC-10: Blacklist post-logout (requiere credenciales de prueba en entorno).

**Prevención de inyección SQL:** driver **mysql2** con consultas **parametrizadas** (`?`) en todo el API activo; los valores de usuario nunca se concatenan en SQL.

**Controles complementarios:** Helmet, CORS whitelist, rate limiting en autenticación, JWT blacklist.

### Matiz honesto

- **No se ejecutó pentest externo** con Burp Suite u OWASP ZAP; el informe lo plantea como trabajo futuro.
- No existe suite Jest/Mocha de tests unitarios en el servidor.
- El test de inyección SQL documentado cubre principalmente el endpoint de **login**; no fuzzing exhaustivo de todos los parámetros.

**Frase defendible:** *“Se aplicó metodología OWASP Top 10 como marco de revisión estática y validación dinámica focalizada; no sustituye un pentest profesional de caja negra.”*

**Texto alineado para Capítulo 4:** ver `docs/informes/CAPITULO_4_PRUEBAS_SEGURIDAD_ALINEADO.md`.

---

## Pregunta 4 — Consistencia transaccional en aprobaciones simultáneas

### Aclaración de alcance

El sistema **no modela inventario pecuario ni presupuesto institucional** como módulos transaccionales. Gestiona el **ciclo de vida contractual** y el **expediente digital**. La consistencia se garantiza a nivel de **registro contractual y workflow de aprobación**.

### Respuesta

**Modelo de datos:**

- Tabla central `contratos_generales` con campos de workflow: `aprobacion_estado`, `aprobacion_accion`, `revision_juridica_estado`, fechas.
- Documentos en `contratos_documentos` + almacenamiento en filesystem.
- Archivo histórico en `contratos_archivo` tras eliminación/archivado (5 años).

**Mecanismos de consistencia:**

1. **Un contrato = una fila = máquina de estados:** solicitud → verificación jurídica → aprobación/rechazo.

2. **Validación optimista en aprobación** (`server/lib/contratosAprobacion.js`): verifica `aprobacion_estado === 'pendiente'` antes de aplicar cambios; si otro director ya resolvió, retorna error *“no tiene solicitud pendiente”*, evitando doble aplicación.

3. **Aprobaciones paralelas de contratos distintos:** UPDATEs sobre filas independientes (`WHERE numero_contrato = ?`); InnoDB garantiza atomicidad por sentencia. No hay contención de inventario compartido porque **no existe tabla de inventario** en el sistema.

4. **Archivado multi-paso** (`server/lib/contratosArchivo.js`): copia documentos → INSERT archivo → DELETE contrato activo.

### Matiz honesto

- **No hay `BEGIN TRANSACTION` / `COMMIT` explícitos** en el código actual; mejora futura: transacciones SQL en archivado.
- **No hay bloqueo pesimista** (`SELECT FOR UPDATE`); la concurrencia esperada en AEPG es baja.
- Presupuesto e inventario pecuario son **procesos externos** o ámbito de fase futura.

**RF relacionados:** RF-018 a RF-031 (contratos y aprobaciones).

---

## Pregunta 5 — Acoplamiento al negocio AEPG y replicabilidad

### Respuesta

El sistema presenta **acoplamiento medio-bajo**: núcleo transversal reutilizable + capa de reglas específicas parcialmente parametrizable.

**Componentes transversales (alta replicabilidad):**

| Componente | Ubicación | Reutilizable |
|------------|-----------|--------------|
| Auth JWT + bcrypt + lockout | `server/index.js`, `auditLog.js` | Sí |
| RBAC (4 módulos × 7 acciones) | `rbac.js`, `GestionRoles.jsx` | Sí |
| Workflow contratos | `contratosAprobacion.js`, `contratosRevisionJuridica.js` | Sí |
| Expediente digital (PDF/Word, archivo) | `GestionContratos.jsx`, `contratosArchivo.js` | Sí |
| Recordatorios y correo | `contratosRecordatorios.js` | Sí |
| Auditoría y mensajes | `auditLog.js`, `contratosMensajes.js` | Sí |

**Acoplamientos específicos AEPG:**

- Branding (logo AEPG, textos institucionales en `client/src/App.js`).
- Roles hardcodeados en guards: `contratacion`, `director`, `abogado`.
- Semillas de catálogo: tipos Alimento, Servicio, Compra, Otro.
- SMTP institucional en `.env`.
- Single-tenant (multi-empresa documentado como fase 2 en `docs/VALIDACION_STAKEHOLDERS.md`).

**Nivel estimado:** ~30% reglas locales / ~70% plataforma genérica de contratación documental.

**Viabilidad en otras empresas del Grupo Empresarial Ganadero:** **alta** para entidades con proceso similar (contratación → revisión jurídica → aprobación directiva → archivo). Esfuerzo de adaptación: configurar RBAC, catálogos, plantillas de correo, branding (`REACT_APP_EMPRESA_NOMBRE`) y despliegue.

**Frase de cierre:** *“La solución es un producto vertical de contratación configurable, no un ERP genético integral; su replicabilidad está en el workflow y la gobernanza documental.”*

---

## Pregunta 6 — Inteligencia artificial predictiva para riesgo de incumplimiento

### Respuesta (proyección fundamentada en datos existentes)

El módulo actual de **alertas y recordatorios** (`server/lib/contratosRecordatorios.js`, pestaña Vencimientos) es **reactivo basado en reglas**: avisos N días antes del vencimiento, registro en `contratos_recordatorios_envios`. La IA aportaría una capa **predictiva y prescriptiva**.

**Datos ya disponibles en el sistema:**

- Historial contractual por contraparte (`empresa`).
- Fechas inicio/fin, renovaciones, estado `vencido`.
- Rechazos y devoluciones jurídicas (`audit_events`).
- Tiempos entre solicitud → verificación → aprobación.
- Motivos de cancelación/rechazo en `details_json`.
- Recordatorios enviados.

**Modelos recomendados:**

| Enfoque | Uso | Justificación |
|---------|-----|---------------|
| Clasificación supervisada (Random Forest, XGBoost) | Probabilidad de no renovación en 90 días | Interpretable; funciona con cientos de contratos |
| Análisis de supervivencia (Cox) | Tiempo hasta ruptura contractual | Alineado a fechas de contrato |
| Detección de anomalías (Isolation Forest) | Proveedores con patrón atípico | Complemento sin etiquetas |

**No recomendar primero:** deep learning sobre texto de PDFs (costo alto, poca explicabilidad regulatoria).

**Beneficios económicos:** reducción de multas por vencimiento no gestionado; menor tiempo-hombre de contratación/abogado; renovaciones anticipadas; continuidad de insumos genéticos y servicios.

**Métricas:** precision/recall, reducción de contratos vencidos sin acción, ROI = (costo evitado − costo ML) / costo ML.

**Frase de cierre:** *“El sistema actual provee la gobernanza de datos necesaria; la IA sería una capa analítica sobre auditoría y vencimientos, con modelos explicables acordes a entorno estatal.”*

---

## Recomendaciones para la defensa oral

1. Citar archivos concretos (`rbac.js`, `security-smoke-test.mjs`, `contratosAprobacion.js`).
2. Anticipar matices: inmutabilidad lógica, sin pentest formal, sin transacciones SQL explícitas, sin módulo presupuestario.
3. No sobreprometer certificación OWASP; es marco de revisión.
4. Pregunta 4: reconducir con respeto al alcance contractual-documental.
5. Pregunta 6: vincular IA a datos que el sistema ya audita.

**Documentos complementarios:**

- `docs/informes/CAPITULO_4_PRUEBAS_SEGURIDAD_ALINEADO.md`
- `docs/informes/GUIA_DEMO_DEFENSA_TESIS.md`
- `docs/INFORME_SEGURIDAD_AEPG.docx`
- `docs/informes/INFORME_RF_INDICE.md`

---

*Generado a partir del código fuente del repositorio AEPG — Sistema de Gestión de Contratos.*
