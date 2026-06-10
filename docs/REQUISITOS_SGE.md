# Informe técnico de requisitos — Sistema de Gestión Empresarial (SGE)

**Alcance:** plataforma web integrada (cliente React + API Express + MySQL) para administración corporativa: identidad, RRHH, contratación, producción, configuración, notificaciones y reporting.  
**Convención:** RF-G = requisito funcional grande | RF-M = mediano | RF-D = derivado | RNF = no funcional.

---

## 1. Requisitos funcionales

### 1.1 RF-G01 — Identidad, acceso y gobierno de cuentas

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M01.1 | Mediano | Autenticación | Login email/contraseña; validación contra BD; emisión JWT con `email`, `nombre`, `rol`; caducidad configurable (8 h). |
| RF-D01.1.1 | Derivado | Rechazo inactivos | Cuentas con `activo=0` no completan login. |
| RF-D01.1.2 | Derivado | Persistencia sesión | Token y usuario en `localStorage`; Axios con `Authorization: Bearer`. |
| RF-D01.1.3 | Derivado | Cierre sesión | Limpieza de almacenamiento local y cabeceras; revocación JWT opcional. |
| RF-M01.2 | Mediano | Recuperación contraseña | Solicitud enlace (`forgot-password`); token un solo uso con TTL; restablecimiento (`reset-password`). |
| RF-M01.3 | Mediano | Gestión usuarios (admin) | CRUD usuarios; roles `admin`, `rrhh`, `contratacion`, `produccion`; hash bcrypt; auditoría `created_by/updated_by`. |
| RF-D01.3.1 | Derivado | Política contraseña | Validación fortaleza en servidor y confirmación en cliente. |
| RF-D01.3.2 | Derivado | Activación rápida | Toggle activo/inactivo en tabla; bloqueo auto-desactivación. |
| RF-D01.3.3 | Derivado | Visualización auditoría | Resolución de email actor a nombre legible. |
| RF-M01.4 | Mediano | Control de acceso (RBAC) | Permisos por módulo/acción (`view`, `create`, `edit`, `delete`, `approve`, `verify`, `export`); menú y API filtrados por rol. |
| RF-D01.4.1 | Derivado | Perfil de usuario | Edición nombre, teléfono, foto, contraseña propia. |
| RF-D01.4.2 | Derivado | Preferencias usuario | Apariencia sincronizada servidor/localStorage por cuenta. |

### 1.2 RF-G02 — Recursos Humanos

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M02.1 | Mediano | Fichas de empleados | Alta, edición, listado, historial laboral, baja lógica/física por carnet. |
| RF-M02.2 | Mediano | Ciclo de vida laboral | Bajas, reactivaciones, cambios de cargo con trazabilidad. |
| RF-M02.3 | Mediano | Estructura organizacional | CRUD cargos, departamentos; asignación empleado–departamento. |
| RF-M02.4 | Mediano | Planificación tiempo | Vacaciones, turnos, grupos de trabajo y miembros. |
| RF-M02.5 | Mediano | Asistencia | Asistencia grupal por grupo; asistencias individuales (validación cupo grupo). |
| RF-M02.6 | Mediano | Formación y desempeño | Certificaciones, cursos, eval. capacitación, evaluaciones, objetivos, salarios. |
| RF-M02.7 | Mediano | Salud y seguridad laboral | Certificados médicos, evaluaciones médicas; registros seguridad industrial/RRHH. |
| RF-M02.8 | Mediano | Relaciones laborales | Sanciones, reconocimientos, jubilaciones/egresos. |
| RF-M02.9 | Mediano | Informes RRHH | Reporte personal; consolidado por departamentos. |
| RF-D02.1.1 | Derivado | Visibilidad por rol | Menú RRHH para `admin`/`rrhh`; médicos también `produccion`. |
| RF-D02.1.2 | Derivado | Coherencia menú-API | Pantallas visibles deben coincidir con permisos backend (ej. asistencias). |

### 1.3 RF-G03 — Contratación y gestión contractual

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M03.1 | Mediano | CRUD contratos | Registro en `contratos_generales`; campos empresa, fechas, tipo, prioridad, PDF, correo notificación. |
| RF-M03.2 | Mediano | Operativa contractual | Resumen KPIs; listado; vencimientos; renovaciones; colas priorizadas; estados tiempo. |
| RF-M03.3 | Mediano | Catálogos contratación | Tipos contrato, empresas, columnas visibles configurables. |
| RF-M03.4 | Mediano | Flujos aprobación | Pendientes, suplementos, anexos; comentarios jurídicos; marcar realizado. |
| RF-M03.5 | Mediano | Auditoría contratos | Registro de cambios; consulta filtrada por contrato y fechas. |
| RF-M03.6 | Mediano | Exportación e informes | Excel, CSV, PDF; exportación expediente ZIP (PDFs + índice). |
| RF-M03.7 | Mediano | Notificaciones contratos | Recordatorios manuales y automáticos por vencimiento/cancelación. |
| RF-D03.1.1 | Derivado | Selección masiva | Checkboxes tabla; export ZIP por filtros o selección. |
| RF-D03.1.2 | Derivado | Filtros avanzados | Por estado, fechas, tipo, empresa, texto libre. |
| RF-D03.1.3 | Derivado | Recordatorio por hito | Envío solo en días exactos configurados. |
| RF-D03.1.4 | Derivado | Reglas por prioridad/tipo | Jerarquía Alta/Media/Baja; reglas por tipo sustituyen prioridad. |

### 1.4 RF-G04 — Correo y comunicaciones

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M04.1 | Mediano | Servicio SMTP sistema | Config `.env` o BD; host, puerto, TLS, usuario, remitente; prueba envío. |
| RF-M04.2 | Mediano | Plantillas correo contratos | Tipos: por vencer, vencido, cancelado; placeholders dinámicos. |
| RF-M04.3 | Mediano | Recordatorios automáticos | Programador servidor; activar/desactivar; ejecución manual; log envíos. |
| RF-M04.4 | Mediano | Cola y resiliencia correo | Encolado si SMTP caído; reintentos; banner indisponibilidad en login. |
| RF-D04.1.1 | Derivado | Restablecer por sección | Plantillas, recordatorios y SMTP vuelven a predeterminados con confirmación. |
| RF-D04.1.2 | Derivado | Prueba plantilla | Envío con datos ejemplo sin guardar previamente. |
| RF-D04.1.3 | Derivado | Destinatario por contrato | Campo correo notificación; remitente global SMTP. |

### 1.5 RF-G05 — Producción operativa

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M05.1 | Mediano | Sacrificio vacuno | CRUD por fecha; export Excel; tablas anchas con scroll. |
| RF-M05.2 | Mediano | Matadero en vivo | Registro diario métricas matadero. |
| RF-M05.3 | Mediano | Producción leche | CRUD registros lecheros. |
| RF-M05.4 | Mediano | Histórico producción | Consulta agregada solo lectura. |
| RF-D05.1.1 | Derivado | Acceso producción | JWT + rol `admin`/`produccion`. |

### 1.6 RF-G06 — Configuración, personalización y shell

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M06.1 | Mediano | Configuración aplicación | Tema, tipografía, escala, fecha/hora, accesibilidad, interfaz, preferencias navegación. |
| RF-M06.2 | Mediano | Shell dashboard | Sidebar, topbar, panel información, reloj; menús desplegables por módulo. |
| RF-M06.3 | Mediano | Navegación contextual | Recordar última sección; submenús fijables; pantalla inicial según rol. |
| RF-M06.4 | Mediano | Responsive móvil | Offcanvas menú; pestañas icono; sesión compacta; filtros adaptados. |
| RF-D06.1.1 | Derivado | Reset global preferencias | Restablece toda apariencia. |
| RF-D06.1.2 | Derivado | Reset por sección | Solo tema, tipografía, escala, etc. |
| RF-D06.1.3 | Derivado | Sincronización preferencias | Guardado local + `PUT /user/preferences`. |
| RF-D06.1.4 | Derivado | Vista previa en vivo | Mock tema/tipografía antes de confirmar. |

### 1.7 RF-G07 — Reporting, integración y datos transversales

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M07.1 | Mediano | Exportaciones transversales | Excel corporativo, CSV UTF-8 BOM, PDF tabular. |
| RF-M07.2 | Mediano | Configuración sistema | Parámetros en `config_sistema`; clave-valor JSON. |
| RF-M07.3 | Mediano | Migraciones esquema | Alteraciones lazy al arranque. |
| RF-D07.1.1 | Derivado | Formato fechas/horas | Preferencia usuario `dmy`/`mdy`, 12h/24h en toda UI. |

### 1.8 RF-G08 — Funciones transversales de negocio (extensión)

| Código | Nivel | Requisito | Descripción |
|--------|-------|-----------|-------------|
| RF-M08.1 | Mediano | Trazabilidad y auditoría | Quién/cuándo en entidades críticas; consulta histórica. |
| RF-M08.2 | Mediano | Confirmaciones destructivas | Diálogo antes de eliminar (preferencia configurable). |
| RF-M08.3 | Mediano | Búsqueda y filtrado | Criterios por módulo; limpiar filtros; persistencia sesión vista. |
| RF-M08.4 | Mediano | Gestión documental | Adjuntos PDF; descarga; inclusión en expedientes. |
| RF-D08.1.1 | Derivado | Multi-empresa (futuro) | Aislamiento datos por organización. |
| RF-D08.1.2 | Derivado | Workflow genérico (futuro) | Estados, aprobadores, escalado. |

---

## 2. Requisitos no funcionales

### 2.1 Calidad (RNF-CAL)

| Código | Requisito | Criterio |
|--------|-----------|----------|
| RNF-CAL-01 | Correctitud funcional | Validaciones servidor prevalecen sobre cliente. |
| RNF-CAL-02 | Consistencia datos | Integridad referencial BD; normalización entradas. |
| RNF-CAL-03 | Mantenibilidad | Monorepo `client`/`server`; módulos por dominio. |
| RNF-CAL-04 | Portabilidad | Parametrización BD, JWT, SMTP, `API_BASE` por entorno. |
| RNF-CAL-05 | Testabilidad | Endpoints identificables; lógica en `server/lib/*`. |
| RNF-CAL-06 | Interoperabilidad | API REST JSON; export xlsx, csv, pdf. |

### 2.2 Seguridad (RNF-SEG)

| Código | Requisito | Criterio |
|--------|-----------|----------|
| RNF-SEG-01 | Confidencialidad credenciales | bcrypt; tokens reset expirados; SMTP cifrado en BD. |
| RNF-SEG-02 | Autenticación | JWT firmado; secreto fuerte en producción. |
| RNF-SEG-03 | Autorización | JWT + RBAC en rutas sensibles; mínimo privilegio. |
| RNF-SEG-04 | Protección transporte | HTTPS en producción. |
| RNF-SEG-05 | Validación entrada | SQL parametrizado; límites cuerpo; validación email/roles. |
| RNF-SEG-06 | Auditoría seguridad | Log accesos fallidos; trazabilidad cambios críticos. |
| RNF-SEG-07 | Gestión secretos | `.env` fuera de repo; sin secretos embebidos. |
| RNF-SEG-08 | Superficie ataque | Sin rutas demo públicas; CORS restringido; rate-limit login/reset. |

### 2.3 Rendimiento (RNF-PER)

| Código | Requisito | Criterio |
|--------|-----------|----------|
| RNF-PER-01 | Tiempo respuesta API | Listados < 2 s nominal; CRUD < 1 s p95. |
| RNF-PER-02 | Paginación | `limit`/`offset` en listados grandes. |
| RNF-PER-03 | Consultas BD | Índices en claves búsqueda; evitar N+1. |
| RNF-PER-04 | Cliente | Virtualización tablas; debounce filtros. |
| RNF-PER-05 | Exportaciones | Límites ZIP; streaming; feedback progreso. |
| RNF-PER-06 | Correo asíncrono | Cola outbox; no bloquear HTTP en envíos masivos. |

### 2.4 Disponibilidad (RNF-DIS)

| Código | Requisito | Criterio |
|--------|-----------|----------|
| RNF-DIS-01 | Uptime objetivo | ≥ 99 % horario laboral (SLA por despliegue). |
| RNF-DIS-02 | Recuperación fallos | Reinicio Express; reconexión MySQL; healthcheck correo. |
| RNF-DIS-03 | Resiliencia correo | Cola si SMTP cae; reintentos; sin pérdida mensajes críticos. |
| RNF-DIS-04 | Backup datos | Copias BD periódicas; RPO ≤ 24 h. |
| RNF-DIS-05 | Degradación controlada | Banner correo no disponible; lectura si escritura correo falla. |
| RNF-DIS-06 | Escalabilidad horizontal | API stateless; sesión en JWT. |

### 2.5 Usabilidad (RNF-UX)

| Código | Requisito | Criterio |
|--------|-----------|----------|
| RNF-UX-01 | Idioma | UI en español; formatos locales. |
| RNF-UX-02 | Consistencia visual | Bootstrap + tokens tema; botones homogéneos. |
| RNF-UX-03 | Feedback | SweetAlert2; spinners; badges sincronización. |
| RNF-UX-04 | Accesibilidad | Alto contraste; reducir animaciones; targets táctiles. |
| RNF-UX-05 | Responsive | Móvil LAN; offcanvas; tablas adaptadas. |
| RNF-UX-06 | Eficiencia operativa | Recordar sección; confirmar antes eliminar. |
| RNF-UX-07 | Personalización | Temas, tipografía, densidad, columnas visibles. |
| RNF-UX-08 | Prevención errores | Validación inline; jerarquía recordatorios validada. |

---

## 3. Matriz roles ↔ módulos

| Rol | Módulos principales |
|-----|---------------------|
| `admin` | Usuarios, configuración, todos los demás |
| `contratacion` | Contratos, correo contratos, auditoría |
| `rrhh` | Empleados, estructura, formación, asistencia* |
| `produccion` | Sacrificio, matadero, leche, certificados médicos |

\*Coherencia permisos asistencias: RF-D02.1.2.

---

## 4. Referencias

- Estado implementado detallado: [`REQUISITOS_PROYECTO.md`](REQUISITOS_PROYECTO.md)
- Validación stakeholders (RF-G08, RNF-DIS): [`VALIDACION_STAKEHOLDERS.md`](VALIDACION_STAKEHOLDERS.md)
- DOCX generado: [`REQUISITOS_SGE.docx`](REQUISITOS_SGE.docx) (`node server/scripts/generate-requisitos-docx.mjs`)
- Auditoría auth API: `node server/scripts/audit-api-auth.mjs`
