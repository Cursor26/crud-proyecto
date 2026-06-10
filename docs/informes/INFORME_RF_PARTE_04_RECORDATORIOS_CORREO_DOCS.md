# Informe RF — Parte 4: KPIs, recordatorios, documentos y correo (RF-032 a RF-043)

---

## RF-032 — Calcular estado temporal y mostrar KPIs ejecutivos

**Dónde:** `GestionContratos.jsx` — sección `resumen` (Resumen ejecutivo).

**Lógica en cliente (sin llamada API extra):**
- **Activo:** `fecha_fin >= hoy`, no cancelado, aprobado.
- **Por vencer:** días restantes ≤ umbral configurado en UI (alertas).
- **Vencido:** `fecha_fin < hoy`.
- **Cancelado:** flag `cancelado = 1`.
- **Pendiente:** `aprobacion_estado = 'pendiente'`.

**KPIs:** Tarjetas con totales calculados con `useMemo` sobre el array `contratos` cargado.

**Tribunal — ¿Los KPIs vienen del servidor?** No. Se **derivan en tiempo real** del listado ya cargado (`GET /contratos`), lo que garantiza coherencia con lo que ve el usuario.

**Subs:** cálculo por fechas, tarjetas KPI, excluir pendientes de activos, recálculo al filtrar, primera pestaña del módulo.

---

## RF-033 — Priorizar colas de vencimiento y renovación

**Secciones:** `vencimientos` (oculta en menú visual pero accesible internamente), `renovaciones`.

**Orden:** Primero por **días hasta vencimiento** (ascendente = más urgente); secundario por **prioridad** (alta > media > baja).

**Renovación:** `PUT /update-contrato` con `operacion: 'renovacion'` actualiza fechas; con `renovacion_con_edicion: true` genera solicitud de edición.

**Tribunal — ¿Qué es "renovar"?** Extender `fecha_fin` (y opcionalmente `fecha_inicio`) de un contrato vencido o por vencer para reactivar la vigencia.

---

## RF-034 — Configurar recordatorios automáticos por prioridad

**Rutas:** `GET/PUT /config/recordatorios-contratos`, `POST .../restablecer`  
**UI:** `RecordatoriosContratosConfig.jsx` (dentro de Correo del sistema o sección correo de contratos).

**Persistencia:** Clave `contratos_recordatorios_auto` en tabla `config_sistema` (JSON).

**Valores por defecto** (`contratosRecordatorios.js`):
| Prioridad | Días antes del vencimiento (hitos) |
|-----------|-----------------------------------|
| Alta | 60, 30, 15, 7, 1 |
| Media | 30, 15, 7 |
| Baja | 15, 7 |

**Configurable en UI:** activo sí/no, reglas por prioridad, reglas opcionales por `id_tipo_contrato`.

**Tribunal — ¿El usuario elige la hora de envío?** La **ventana horaria** (08:00–18:00) y **frecuencia** del scheduler están en `DEFAULT_CONFIG` del servidor; la UI de contratación edita hitos y activación, no la cron interna completa.

---

## RF-035 — Ejecutar envío automático programado de recordatorios

**Motor:** `createContratosRecordatoriosService` en `server/lib/contratosRecordatorios.js`.

**Scheduler:**
- Tick cada **5 minutos** (`TICK_MS`).
- Evalúa si está en ventana horaria y día hábil (si `solo_dias_habiles`).
- Para cada contrato activo calcula días hasta `fecha_fin`.
- Si coincide **exactamente** con un hito de la prioridad → envía **un** correo.
- Registra en `contratos_recordatorios_envios` para no duplicar el mismo hito el mismo día.

**Ejecución manual admin:** `POST /contratos/recordatorios/ejecutar-ahora` (forzar ciclo).

**Tribunal — ¿Cuándo se envía un recordatorio automático?** Solo cuando los días restantes **coinciden exactamente** con un hito (ej. faltan exactamente 7 días) y es la primera vez ese día para ese hito.

---

## RF-036 — Enviar recordatorio manual y consultar historial

**Manual:** `POST /send-contrato-reminder` — rol contratacion; envía a correos del contrato según `contratosCorreosNiveles.js`.

**Control duplicados:** Servidor verifica envíos del mismo día en `contratos_recordatorios_envios`.

**Historial:** `GET /config/recordatorios-contratos` devuelve últimos 30 envíos (`listEnvios(30)`).

**Fallo SMTP:** Encola en `mail_outbox` (RF-042).

---

## RF-037 — Adjuntar y validar PDF obligatorio al alta

**Cliente:** Validación antes de `POST /create-contrato`; componente preview `ContratoWordPreviewPane.jsx` / input file.

**Servidor:** `contratosDocumentosStorage.js` — guarda en `server/uploads/contratos-activos/` (ruta según despliegue).

**Límite tamaño:** Validado en cliente y servidor (multer / validación de buffer).

**Migración legacy:** Claves localStorage `contratos_pdfs`, suplementos, anexos — al cargar módulo se sincronizan al backend.

**Tribunal — ¿Puede existir contrato sin PDF?** En la operativa actual del cliente, **no** al dar de alta; el formulario bloquea el envío.

---

## RF-038 — Gestionar documentos por contrato en servidor

**Tabla:** `contratos_documentos` — tipos: `contrato`, `suplemento`, `anexo`.

**Rutas:** `GET/POST/DELETE /contratos/:numero/documentos`.

**UI:** Gestión documental en modal/detalle del contrato; suplementos/anexos también en `ContratosSuplementosField.jsx`, `ContratosAnexosField.jsx`.

**Subs:** registrar, listar, descargar/preview, eliminar, clasificar por tipo.

---

## RF-039 — Consultar archivo histórico y exportar expediente ZIP

**Archivo:** `GET /contratos-archivo` — sección `archivo` en UI.

**ZIP:** `POST /contratos/exportar-expediente` — `contratosExportExpediente.js`:
- PDFs del contrato(s) seleccionados.
- Índice Excel (`contratosExportPdfIndice.js`).
- Resumen JSON.
- Límites de cantidad y tamaño en handler.

**Tribunal — ¿Qué lleva el ZIP?** Documentos PDF + metadatos índice; útil para auditorías o entregas documentales.

---

## RF-040 — Configurar servidor SMTP del sistema

**Rutas:** `GET/PUT /config/correo`, `POST /config/correo/probar`, `GET /config/correo/estado`.

**Origen configuración:**
1. Variables `server/.env` (SMTP_HOST, SMTP_PORT, etc.) — prioridad si existen.
2. Tabla `config_sistema` clave correo — editable desde UI.

**UI:** `ConfigCorreoServicio.jsx` (menú "Correo del sistema").

**Prueba:** Envía correo de prueba al email indicado sin alterar producción.

**Subs:** consultar (credenciales enmascaradas), guardar, probar, restablecer defaults, estado salud.

---

## RF-041 — Personalizar plantillas de correo de contratos

**Rutas:** `GET/PUT /config/contratos-correo-plantillas`, `POST .../probar`, `POST .../restablecer`.

**Tipos:** `por_vencer`, `vencido`, `cancelado`.

**Placeholders:** Sustituidos en `contratosCorreoPlantillas.js` (número contrato, empresa, fecha_fin, etc.).

**UI:** `ContratosCorreoPlantillasConfig.jsx`.

---

## RF-042 — Encolar correos ante fallo SMTP y reintentar envío

**Tabla:** `mail_outbox` — estados `pendiente`, `enviado`.

**Módulo:** `server/lib/mailOutbox.js` — `enqueue`, procesador periódico en arranque de `index.js`.

**Reintentos:** Actualiza `ultimo_error`; tras éxito marca `enviado`.

**Tribunal — ¿Se pierden correos si cae SMTP?** No inmediatamente; quedan en cola y se reintentan.

---

## RF-043 — Informar indisponibilidad del servicio de correo

**Endpoints:** `GET /auth/mail-estado` (público, login), `GET /config/correo/estado` (autenticado).

**Cliente:** `useMailServiceStatus.js` + `MailServiceUnavailableBanner.jsx` en Login y dashboard.

**Mensaje cola:** `mailQueueBannerMessage` si hay pendientes en `mail_outbox`.

**Tribunal — ¿Se bloquea el sistema sin correo?** No. Solo se **informa**; contratos y usuarios siguen operativos; recordatorios se encolan.

---

*Anterior: [Parte 3](./INFORME_RF_PARTE_03_CONTRATOS.md) · Siguiente: [Parte 5](./INFORME_RF_PARTE_05_EXPORT_AUDITORIA_UX.md)*
