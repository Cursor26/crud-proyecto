# Informe RF — Parte 3: Contratos, aprobaciones y jurídico (RF-018 a RF-031)

Módulo principal: `client/src/components/GestionContratos.jsx`  
Navegación: `client/src/lib/contratosNavSections.js`  
API base: `server/index.js` + librerías en `server/lib/contratos*.js`

---

## RF-018 — Administrar catálogo de tipos de contrato

**Rutas:** `GET/POST /catalogo/tipos-contrato`, `PUT /catalogo/tipos-contrato/:id`  
**Tabla:** `catalogo_tipo_contrato` (nombre, activo)  
**UI:** `CatalogoTiposContrato.jsx` embebido en formularios de contrato.

**Tribunal — ¿Se puede desactivar un tipo en uso?** Sí (`activo=0`); los contratos existentes conservan su `id_tipo_contrato`; el listado por defecto solo muestra activos (`?todos=1` para ver todos).

**Subs:** listar activos/inactivos, crear con nombre único, editar nombre/activo, selector en formulario.

---

## RF-019 — Registrar contratos con datos obligatorios

**Ruta:** `POST /create-contrato` — rol `contratacion`.

**Flujo:**
1. Valida número único (`contratosNumeroUnico.js`).
2. Valida contactos por nivel (`contratosContactosNotificacion.js`).
3. Inserta en `contratos_generales` con `aprobacion_estado='pendiente'`, `aprobacion_accion='alta'`, `revision_juridica_estado='pendiente'`.
4. **No queda activo** hasta verificación jurídica + aprobación director.
5. Cliente exige PDF en formulario antes de enviar.

**Tribunal — ¿El contrato está vigente al guardar?** No. Queda **pendiente**; mensaje API: "No se activará hasta que se verifique y autorice".

**Subs:** número único, PDF obligatorio en UI, estado pendiente, contactos JSON, notificación jurídica (`contratosNotificacionesEventos.js`).

---

## RF-020 — Actualizar contratos existentes

**Ruta:** `PUT /update-contrato` — lógica extensa en `index.js` (~2354-2548).

**Casos:**
| Situación | Comportamiento |
|-----------|----------------|
| Renovación simple (`operacion: renovacion`) | Aplica fechas directamente |
| Alta aún pendiente | Actualiza datos y mantiene pendiente |
| Contrato aprobado / edición | Guarda propuesta JSON en `aprobacion_propuesta`, acción `edicion`, **no toca datos activos** |
| Cancelado o vencido | Error 400 — debe usar renovación |

**Subs:** edición pendiente, bloqueo cancelados/vencidos, renovación directa, auditoría `contrato_edicion_solicitada`.

---

## RF-021 — Consultar listado integral de contratos

**Ruta:** `GET /contratos` — roles `ROLES_CONTRATOS_LECTURA` (contratacion, director, abogado, etc.).

**Cliente:** Un solo `useState` de contratos en `GestionContratos.jsx` alimenta resumen, listas, KPIs, reportes.

**Tribunal — ¿Una sola carga para todo el módulo?** Sí. Se carga al montar el componente y se refresca tras operaciones CRUD/aprobación.

---

## RF-022 — Filtrar y localizar contratos en interfaz

**Filtros en cliente:** estado temporal (activo/por vencer/vencido/cancelado/pendiente), fechas, tipo, empresa, texto libre.

**Columnas:** visibilidad según preferencias usuario (`appPreferences.js` → claves de columnas contratos).

**Exportación:** los mismos filtros aplican a reportes (RF-044).

---

## RF-023 — Gestionar contactos y niveles de notificación

**Campos BD:** `correo_notificacion`, `contactos_notificacion` (JSON), `contactos_niveles` (JSON por prioridad de alerta).

**UI:** `ContratosCorreosNivelesField.jsx`.

**Envío:** `contratosCorreosNiveles.js` → `listCorreosPorEvento` resuelve destinatarios para recordatorios y notificaciones de flujo.

**Tribunal — ¿Un contrato puede tener varios correos?** Sí: correo principal + contactos adicionales + niveles por prioridad (alta/media/baja).

---

## RF-024 — Cancelar contratos con motivo documentado

**Ruta:** `POST /contratos/:numero/cancelar` — body incluye `motivo` (obligatorio) y opción archivar.

**Efecto:** Crea solicitud `aprobacion_accion='cancelacion'` pendiente de aprobación director; no cancela hasta aprobar.

**Restricción:** No cancelar si `fecha_fin < hoy` (vencido).

**UI:** `ContratosMotivoCancelacionModal.jsx`.

---

## RF-025 — Solicitar paso a archivo histórico

**Ruta:** `POST /contratos/:numero/solicitar-archivo` → pendiente aprobación.

**Al aprobar:** `contratosArchivo.js` copia a `contratos_archivo`, mueve PDFs a carpeta `contratos-archivo/`.

**Consulta:** `GET /contratos-archivo`, `GET /contratos-archivo/:id_archivo`.

---

## RF-026 — Cola de contratos pendientes de aprobación

**Sección UI:** `pendientes` ("Aprobar contrato") en `contratosNavSections.js`.

**Filtro:** `aprobacion_estado === 'pendiente'`.

**Badge:** `ContratosNavCountsContext` cuenta pendientes en sidebar.

**Detalle:** `ContratosPendientesDetalle.jsx`, `ContratosCambiosPendientesModal.jsx` muestra diff de `aprobacion_propuesta`.

**Tribunal — ¿Quién aprueba?** Perfil con `contratos.approve` (típicamente **director**).

---

## RF-027 — Aprobar solicitudes de contrato

**Ruta:** `POST /contratos/:numero/aprobar` — lógica en `contratosAprobacion.js`.

**Acciones según `aprobacion_accion`:** aplica alta, edición, cancelación o archivo; registra `aprobacion_resuelto_por`, fecha, nota.

---

## RF-028 — Rechazar solicitudes de contrato

**Ruta:** `POST /contratos/:numero/rechazar` — requiere nota.

**UI sección `rechazados`:** `ContratosRechazoDetalleModal.jsx` muestra motivo.

**Notificación:** evento a contratador vía `contratosNotificacionesEventos.js`.

---

## RF-029 — Verificar contratos en revisión jurídica

**Sección UI:** `verificar` — contratos con `revision_juridica_estado` pendiente u observado.

**Rutas:** `POST .../verificar-aprobar`, `POST .../verificar-rechazar` — permiso `contratos.verify` / rol **abogado**.

**Orden del flujo:** Alta → **Jurídico verifica** → Director aprueba → Contrato activo.

**Tribunal — ¿Puede el director saltarse jurídico?** No en el flujo normal; el alta inserta `revision_juridica_estado='pendiente'`.

---

## RF-030 — Gestionar comentarios jurídicos

**Rutas:** CRUD en `/juridico-comentarios` (listar, crear, marcar realizado).

**UI:** `ContratosJuridicoComentariosModal.jsx`.

**Uso:** Abogado deja observaciones; contratador las atiende y marca "realizado".

---

## RF-031 — Gestionar adjuntos en devolución jurídica

**Almacenamiento:** `server/lib/contratosJuridicoAdjuntos.js` + disco en servidor.

**Rutas:** GET/POST `/juridico-adjuntos`.

**Retirar solicitud:** `POST /retirar-solicitud` — contratador cancela trámite devuelto o elimina contrato en estado inicial según reglas.

**Subs:** subir, listar, descargar, retirar solicitud, ver en rechazados.

---

*Anterior: [Parte 2](./INFORME_RF_PARTE_02_USUARIOS_RBAC.md) · Siguiente: [Parte 4](./INFORME_RF_PARTE_04_RECORDATORIOS_CORREO_DOCS.md)*
