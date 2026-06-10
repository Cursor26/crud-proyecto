# Catálogo de requisitos funcionales — Sistema de Gestión Empresarial (AEPG)

Derivado del código actual (`client/` + `server/index.js`). Estructura alineada al documento de ejemplo RF.

---

## RF-001 — Gestionar autenticación y recuperación de credenciales.

**Descripción general:** El sistema debe permitir el acceso seguro mediante credenciales almacenadas en base de datos, emitir un token JWT de sesión, rechazar cuentas inactivas y ofrecer recuperación de contraseña por correo electrónico con tokens de un solo uso y caducidad configurable.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 1.1 | Iniciar sesión con identificador y contraseña. | El sistema debe validar email o nombre de usuario y contraseña con hash bcrypt, registrar la sesión y devolver JWT con email, nombre, rol y permisos RBAC (POST /login). |
| 1.2 | Rechazar acceso de usuarios inactivos. | El sistema debe impedir el inicio de sesión cuando la cuenta tiene estado inactivo y registrar el intento en la auditoría de accesos fallidos. |
| 1.3 | Mantener la sesión en el cliente. | El sistema debe persistir token y datos de usuario en localStorage y adjuntar automáticamente el encabezado Authorization Bearer en las peticiones Axios. |
| 1.4 | Cerrar sesión de forma controlada. | El sistema debe permitir cerrar sesión, revocar el JWT cuando corresponda, limpiar almacenamiento local y registrar el evento de cierre (POST /auth/logout). |
| 1.5 | Solicitar recuperación de contraseña. | El sistema debe generar un enlace de restablecimiento con token almacenado en password_reset_tokens, respetar TTL y enviarlo por correo (POST /auth/forgot-password). |
| 1.6 | Restablecer contraseña con token válido. | El sistema debe permitir definir una nueva contraseña cumpliendo política de fortaleza, invalidar el token tras el uso e invalidar sesiones previas (POST /auth/reset-password). |
| 1.7 | Limitar intentos fallidos de acceso. | El sistema debe aplicar bloqueo temporal tras intentos fallidos repetidos, rate-limit en login y recuperación, y exponer estado del servicio de correo en login (auth/mail-estado). |

---

## RF-002 — Gestionar usuarios del sistema.

**Descripción general:** El sistema debe permitir al administrador el mantenimiento de cuentas de acceso con auditoría de alta y modificación, políticas de contraseña en servidor y controles operativos en la interfaz de gestión de usuarios.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 2.1 | Registrar nuevos usuarios. | El sistema debe crear cuentas con validación de correo, rol permitido y contraseña fuerte almacenada con bcrypt, registrando created_by y fecha de creación (POST /create-usuario). |
| 2.2 | Actualizar datos y credenciales de usuario. | El sistema debe modificar nombre, rol, estado activo y contraseña opcional, permitiendo cambio de email identificando la cuenta anterior (PUT /update-usuario/:email). |
| 2.3 | Eliminar usuarios del sistema. | El sistema debe eliminar definitivamente el registro de usuario por correo clave con autorización exclusiva de administrador (DELETE /delete-usuario/:email). |
| 2.4 | Consultar listado con auditoría. | El sistema debe listar todos los usuarios con campos created_by, created_at, updated_by, updated_at y estado activo/inactivo (GET /usuarios). |
| 2.5 | Activar o desactivar cuentas desde la tabla. | El sistema debe permitir cambiar el estado activo mediante interruptor en fila sin abrir modal, impidiendo que el usuario en sesión se desactive a sí mismo. |
| 2.6 | Visualizar actores de auditoría legibles. | El sistema debe resolver el email del actor de auditoría al nombre del usuario cuando exista coincidencia en el listado cargado. |
| 2.7 | Gestionar perfil personal del usuario autenticado. | El sistema debe permitir editar nombre, teléfono, foto de perfil y contraseña propia mediante rutas /user/profile, /user/profile-photo y /user/change-password. |

---

## RF-003 — Gestionar roles y permisos (RBAC).

**Descripción general:** El sistema debe implementar control de acceso basado en roles con permisos granulares por módulo y acción, aplicados tanto en la API como en la visibilidad del menú lateral y las operaciones de la interfaz.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 3.1 | Definir módulos y acciones de permiso. | El sistema debe gestionar permisos sobre módulos usuarios, contratos, auditoría y configuración con acciones view, create, edit, delete, export, approve y verify. |
| 3.2 | Consultar y mantener roles del sistema. | El sistema debe listar, crear, editar y eliminar roles personalizados con matriz de permisos mediante las rutas /rbac/roles y plantillas para roles de sistema. |
| 3.3 | Resolver permisos del usuario en sesión. | El sistema debe exponer los permisos efectivos del rol autenticado al cliente (GET /rbac/me/permissions) para filtrar menús y botones. |
| 3.4 | Autorizar rutas API por permiso inferido. | El sistema debe combinar middleware JWT global, autorizarRol, autorizarPermiso y resolución de ruta en rbacPathRules para denegar acceso con HTTP 403. |
| 3.5 | Restringir visibilidad del menú principal. | El sistema debe mostrar únicamente Contratación, Usuarios, Roles, Auditoría, Correo del sistema y Configuración según los permisos can() del usuario. |
| 3.6 | Indicar modo solo consulta. | El sistema debe mostrar aviso de modo lectura cuando el usuario tiene permiso view sin create, edit ni delete en el módulo activo. |

---

## RF-004 — Gestionar contratos.

**Descripción general:** El sistema debe permitir el registro, consulta, actualización y seguimiento operativo de contratos en contratos_generales, con catálogo de tipos, prioridades, vigencia, documentos PDF y contactos de notificación.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 4.1 | Registrar contratos con datos obligatorios. | El sistema debe crear contratos con número único, empresa, fechas, tipo, prioridad, vigencia, suplementos, anexos y al menos un PDF obligatorio (POST /create-contrato). |
| 4.2 | Actualizar contratos existentes. | El sistema debe modificar campos del contrato respetando estados de aprobación y reglas de negocio, generando solicitudes pendientes cuando corresponda (PUT /update-contrato). |
| 4.3 | Consultar listado integral de contratos. | El sistema debe devolver el censo de contratos con joins de tipo, estado de aprobación, cancelación y metadatos para el módulo GestionContratos (GET /contratos). |
| 4.4 | Administrar catálogo de tipos de contrato. | El sistema debe listar, crear y actualizar tipos en catalogo_tipo_contrato con control de activo e impedir nombres duplicados (rutas /catalogo/tipos-contrato). |
| 4.5 | Gestionar contactos y niveles de notificación. | El sistema debe almacenar correo principal y contactos por nivel para dirigir avisos automáticos y manuales según configuración del contrato. |
| 4.6 | Cancelar contratos con motivo documentado. | El sistema debe solicitar cancelación o cancelación con archivo mediante flujo de aprobación pendiente, motivo obligatorio y bloqueo si el contrato está vencido (POST /contratos/:numero/cancelar). |
| 4.7 | Solicitar archivo histórico de contratos. | El sistema debe iniciar solicitud de paso a archivo histórico con aprobación posterior y trazabilidad en auditoría de contratos (POST /contratos/:numero/solicitar-archivo). |
| 4.8 | Filtrar y localizar contratos en la interfaz. | El sistema debe ofrecer filtros por estado, fechas, tipo, empresa y texto, con columnas visibles configurables por preferencias de usuario. |

---

## RF-005 — Gestionar aprobaciones y revisión jurídica de contratos.

**Descripción general:** El sistema debe soportar flujos de alta, edición, cancelación y archivo con estados pendiente/aprobado/rechazado, revisión jurídica, comentarios y adjuntos para perfiles contratación, director y abogado.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 5.1 | Presentar cola de contratos pendientes de aprobación. | El sistema debe listar contratos con aprobacion_estado pendiente y acciones alta, edición, cancelación o archivo en la sección Aprobar contrato. |
| 5.2 | Aprobar solicitudes de contrato. | El sistema debe resolver solicitudes pendientes aplicando cambios propuestos y registrando aprobador y fecha (POST /contratos/:numero/aprobar) con permiso approve. |
| 5.3 | Rechazar solicitudes de contrato. | El sistema debe rechazar solicitudes con nota de resolución, mantener trazabilidad y notificar al solicitante (POST /contratos/:numero/rechazar). |
| 5.4 | Verificar contratos en revisión jurídica. | El sistema debe permitir al perfil con permiso verify aprobar o devolver contratos en revisión jurídica (verificar-aprobar / verificar-rechazar). |
| 5.5 | Gestionar comentarios jurídicos. | El sistema debe listar, crear y marcar como realizado comentarios jurídicos asociados al contrato (rutas /juridico-comentarios). |
| 5.6 | Adjuntar documentos en devolución jurídica. | El sistema debe almacenar y descargar adjuntos jurídicos vinculados al contrato durante verificación o rechazo (rutas /juridico-adjuntos). |
| 5.7 | Retirar solicitudes devueltas. | El sistema debe permitir al contratador retirar una solicitud devuelta por jurídico, cancelando el trámite o eliminando el contrato según reglas (POST /retirar-solicitud). |

---

## RF-006 — Gestionar alertas, vencimientos y recordatorios.

**Descripción general:** El sistema debe calcular estados temporales de contratos, priorizar colas de vencimiento, enviar recordatorios manuales y automáticos por correo según reglas de prioridad y tipo configuradas en servidor.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 6.1 | Calcular estado temporal del contrato. | El sistema debe determinar en cliente estados activo, por vencer, vencido o cancelado según fecha fin, aprobación pendiente y bandera cancelado. |
| 6.2 | Mostrar resumen ejecutivo y KPIs. | El sistema debe presentar indicadores agregados de contratos activos, por vencer, vencidos y pendientes en la sección Resumen ejecutivo. |
| 6.3 | Priorizar colas de vencimiento y renovación. | El sistema debe ordenar contratos por urgencia temporal y prioridad (alta, media, baja) en vistas de vencimientos y renovaciones. |
| 6.4 | Configurar recordatorios automáticos. | El sistema debe permitir activar/desactivar recordatorios, definir hitos por prioridad y reglas opcionales por tipo de contrato (config/recordatorios-contratos). |
| 6.5 | Ejecutar envío automático programado. | El sistema debe revisar contratos en servidor según frecuencia interna, ventana horaria y días hábiles, enviando un correo por hito exacto configurado. |
| 6.6 | Enviar recordatorio manual. | El sistema debe disparar aviso inmediato a correo de notificación del contrato con control de duplicados diarios (POST /send-contrato-reminder). |
| 6.7 | Consultar historial de envíos. | El sistema debe registrar y listar últimos envíos automáticos y manuales con destino, días antes del vencimiento y resultado (tabla contratos_recordatorios_envios). |

---

## RF-007 — Gestionar documentación y archivos de contratos.

**Descripción general:** El sistema debe almacenar PDFs de contrato, suplementos y anexos en el servidor, permitir previsualización, descarga, gestión documental por contrato y consulta del archivo histórico.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 7.1 | Adjuntar PDF obligatorio al alta. | El sistema debe exigir al menos un PDF válido al registrar contrato, con límite de tamaño y sincronización posterior con almacenamiento en servidor. |
| 7.2 | Gestionar documentos por contrato. | El sistema debe registrar, listar y eliminar documentos en contratos_documentos con tipos contrato, suplemento y anexo (rutas /contratos/:numero/documentos). |
| 7.3 | Previsualizar y descargar PDFs. | El sistema debe ofrecer vista previa embebida y descarga de archivos almacenados en contratos-activos y contratos-archivo. |
| 7.4 | Migrar PDFs locales al servidor. | El sistema debe sincronizar archivos previamente guardados en localStorage hacia el backend al cargar el módulo de contratos. |
| 7.5 | Consultar archivo histórico. | El sistema debe listar contratos archivados con filtros y detalle de metadatos de archivo (GET /contratos-archivo). |
| 7.6 | Exportar expediente documental en ZIP. | El sistema debe generar paquete ZIP con PDFs, índice Excel y resumen JSON de contratos seleccionados o filtrados (POST /contratos/exportar-expediente). |

---

## RF-008 — Gestionar correo electrónico y plantillas de notificación.

**Descripción general:** El sistema debe configurar SMTP del servicio, personalizar plantillas de correo de contratos, encolar mensajes si el servidor de correo no está disponible y notificar al usuario el estado del servicio.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 8.1 | Configurar servidor SMTP del sistema. | El sistema debe permitir usar variables de entorno o configuración en base de datos con host, puerto, TLS, usuario, remitente y prueba de envío (config/correo). |
| 8.2 | Personalizar plantillas de correo. | El sistema debe editar asunto y cuerpo para tipos por_vencer, vencido y cancelado con placeholders dinámicos del contrato (config/contratos-correo-plantillas). |
| 8.3 | Probar plantillas con datos de ejemplo. | El sistema debe enviar correo de prueba de una plantilla sin guardarla previamente al destinatario indicado (POST .../plantillas/probar). |
| 8.4 | Restablecer configuración de correo. | El sistema debe permitir volver a valores predeterminados de plantillas, recordatorios y SMTP con confirmación del usuario. |
| 8.5 | Encolar correos ante fallo SMTP. | El sistema debe almacenar mensajes en mail_outbox y reintentar envío periódico cuando el transporte no está disponible. |
| 8.6 | Informar indisponibilidad del servicio de correo. | El sistema debe mostrar banner en login y panel cuando SMTP no responde o existen correos pendientes en cola. |

---

## RF-009 — Gestionar exportaciones e informes.

**Descripción general:** El sistema debe generar reportes tabulares de contratos y archivo histórico en formatos Excel, CSV y PDF con identidad corporativa AEPG y codificación adecuada para español.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 9.1 | Exportar reporte de contratos a Excel. | El sistema debe generar libro Excel con cabecera corporativa verde, columnas del listado filtrado y descarga automática (ExcelJS). |
| 9.2 | Exportar reporte de contratos a CSV. | El sistema debe generar CSV con separador punto y coma, BOM UTF-8 y columnas equivalentes al Excel para apertura en hojas de cálculo. |
| 9.3 | Exportar reporte de contratos a PDF. | El sistema debe generar tabla PDF con los mismos datos visibles del reporte mediante jsPDF y autoTable. |
| 9.4 | Exportar archivo histórico. | El sistema debe ofrecer exportación Excel, CSV y PDF de la vista de contratos archivados con los filtros aplicados. |
| 9.5 | Exportar expediente ZIP de contratos. | El sistema debe empaquetar PDFs y metadatos de contratos marcados o visibles según filtros, con límites de cantidad y tamaño en servidor. |
| 9.6 | Exportar auditoría a PDF. | El sistema debe permitir exportar tablas de sesiones, intentos fallidos y eventos de auditoría del sistema a PDF cuando el usuario tiene permiso export. |

---

## RF-010 — Gestionar auditoría y trazabilidad.

**Descripción general:** El sistema debe registrar sesiones, intentos fallidos, eventos de seguridad y cambios críticos en contratos, permitiendo consulta filtrada para administración y contratación.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 10.1 | Registrar sesiones de acceso. | El sistema debe almacenar inicios de sesión exitosos con email, rol, IP y agente de usuario (GET /audit/sessions). |
| 10.2 | Registrar intentos fallidos y bloqueos. | El sistema debe auditar credenciales inválidas, usuarios inactivos y bloqueos temporales con resumen agregado (audit/failed-logins, failed-summary). |
| 10.3 | Consultar eventos de auditoría del sistema. | El sistema debe listar eventos administrativos con actor, acción, entidad y marca temporal (GET /audit/events). |
| 10.4 | Auditar operaciones sobre contratos. | El sistema debe registrar acciones como alta, edición, cancelación, aprobación y verificación jurídica en log dedicado (GET /contratos/auditoria). |
| 10.5 | Filtrar auditoría de contratos. | El sistema debe permitir filtrar por número de contrato y rango de fechas en la sección Auditoría del módulo Contratación. |
| 10.6 | Revocar tokens JWT comprometidos. | El sistema debe mantener blacklist de tokens revocados y rechazar peticiones con JTI invalidado hasta su expiración. |

---

## RF-011 — Gestionar configuración y personalización de la aplicación.

**Descripción general:** El sistema debe permitir al usuario autenticado personalizar apariencia, formatos de fecha y hora, preferencias de navegación y sincronizarlas entre navegador y servidor.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 11.1 | Configurar tema y tipografía. | El sistema debe ofrecer temas predefinidos, fuentes, tamaños, bordes y colores personalizables con vista previa en vivo (AppConfiguracion). |
| 11.2 | Configurar escala y menú lateral. | El sistema debe permitir escala de interfaz, ancho del sidebar, menú compacto solo iconos y tema automático según sistema operativo. |
| 11.3 | Configurar accesibilidad e interfaz. | El sistema debe ofrecer interlineado, subrayado de enlaces, targets táctiles, modo compacto, reducción de animaciones y alto contraste. |
| 11.4 | Definir formatos de fecha y hora. | El sistema debe aplicar preferencias dmy/mdy y formato 12h/24h en toda la interfaz mediante formatAppDate y formatAppTime. |
| 11.5 | Sincronizar preferencias con la cuenta. | El sistema debe guardar preferencias en localStorage y servidor (GET/PUT /user/preferences) con indicador de estado de sincronización. |
| 11.6 | Restablecer preferencias. | El sistema debe permitir restablecer toda la apariencia o secciones individuales (tema, tipografía, escala, etc.) con confirmación SweetAlert2. |

---

## RF-012 — Gestionar interfaz, navegación y experiencia de usuario.

**Descripción general:** El sistema debe ofrecer un shell tipo dashboard con menú lateral, pestañas de contratación, panel informativo, soporte móvil y navegación condicionada por permisos y preferencias del usuario.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 12.1 | Presentar layout dashboard unificado. | El sistema debe mostrar barra lateral, área principal, panel de información con módulo activo, fecha, hora y logotipo institucional. |
| 12.2 | Navegar por secciones de Contratación. | El sistema debe ofrecer pestañas y menú para Resumen, Contratos, Rechazados, Verificar, Aprobar, Renovaciones, Correo, Reportes, Auditoría y Archivo. |
| 12.3 | Recordar última sección visitada. | El sistema debe restaurar la sección activa al recargar cuando la preferencia rememberSection está habilitada. |
| 12.4 | Adaptar interfaz a dispositivos móviles. | El sistema debe ofrecer menú offcanvas, pestañas con iconos, sesión compacta en topbar y filtros en rejilla 2×2 en pantallas pequeñas. |
| 12.5 | Mostrar retroalimentación de operaciones. | El sistema debe usar SweetAlert2 para confirmaciones, errores y estados de carga con spinners en operaciones asíncronas. |
| 12.6 | Confirmar operaciones destructivas. | El sistema debe solicitar confirmación antes de eliminar registros cuando la preferencia confirmBeforeDelete está activa. |
| 12.7 | Dirigir pantalla inicial según rol. | El sistema debe abrir Usuarios para admin o la primera sección de Contratación permitida para roles contratación, director y abogado tras el login. |
