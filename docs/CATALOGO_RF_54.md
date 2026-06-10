# Catálogo de requisitos funcionales — Sistema de Gestión Empresarial (AEPG)

Derivado del código activo (`client/` + `server/index.js`). **54 requisitos funcionales principales** con sub-requisitos derivados.

---

## RF-001 — Iniciar sesión con credenciales y emitir JWT.

**Descripción general:** El sistema debe permitir el acceso seguro mediante correo electrónico o nombre de usuario y contraseña almacenados con hash bcrypt en base de datos, validar el estado activo de la cuenta y devolver un token JWT con identidad, rol y permisos RBAC para las operaciones posteriores.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 1.1 | Validar credenciales con bcrypt. | El sistema debe comparar la contraseña introducida con el hash almacenado en la tabla de usuarios y rechazar credenciales inválidas con mensaje genérico (POST /login). |
| 1.2 | Emitir JWT de sesión. | El sistema debe generar un token JWT con email, nombre, rol y JTI único, con caducidad configurada (8 horas), e incluir permisos RBAC resueltos del rol asignado. |
| 1.3 | Rechazar cuentas inactivas. | El sistema debe impedir el inicio de sesión cuando el campo activo de la cuenta es falso y registrar el intento en la auditoría de accesos fallidos. |
| 1.4 | Registrar sesión exitosa. | El sistema debe almacenar el inicio de sesión en la tabla de auditoría de sesiones con IP, agente de usuario, email y rol del usuario autenticado. |
| 1.5 | Exponer avatar de login. | El sistema debe ofrecer endpoint público de avatar decorativo en pantalla de login con rate-limit independiente (GET /auth/login-avatar). |

---

## RF-002 — Mantener y validar sesión en el cliente.

**Descripción general:** El sistema debe persistir el token JWT y los datos del usuario en el navegador, adjuntar automáticamente la cabecera Authorization en las peticiones HTTP y detectar tokens expirados o revocados para forzar un nuevo inicio de sesión.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 2.1 | Persistir token en localStorage. | El sistema debe almacenar el JWT y el objeto usuario en localStorage bajo claves definidas (token, permisos) al completar el login en client/src/App.js. |
| 2.2 | Adjuntar Bearer en Axios. | El sistema debe configurar el interceptor de Axios para incluir Authorization: Bearer en todas las peticiones autenticadas hacia la API. |
| 2.3 | Detectar expiración del JWT. | El sistema debe comprobar la caducidad del payload JWT en cliente mediante isTokenExpired y cerrar la sesión local si el token ha vencido. |
| 2.4 | Restaurar sesión al recargar. | El sistema debe recuperar token y usuario de localStorage al cargar la aplicación y validar su vigencia antes de mostrar el dashboard. |
| 2.5 | Sincronizar permisos en cliente. | El sistema debe cargar y cachear los permisos RBAC del usuario en PermissionsContext para filtrar menús y acciones en toda la interfaz. |

---

## RF-003 — Cerrar sesión y revocar token.

**Descripción general:** El sistema debe permitir al usuario cerrar sesión de forma controlada, revocar el JWT en servidor mediante blacklist, limpiar el almacenamiento local del navegador y registrar el evento de cierre en auditoría.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 3.1 | Invocar cierre de sesión en API. | El sistema debe llamar a POST /auth/logout con el token vigente para registrar la revocación del JTI en la blacklist del servidor. |
| 3.2 | Limpiar almacenamiento local. | El sistema debe eliminar token, usuario y permisos de localStorage y resetear la cabecera Authorization en Axios al cerrar sesión. |
| 3.3 | Revocar JTI en blacklist. | El sistema debe almacenar el identificador único del token revocado hasta su expiración natural y rechazar peticiones posteriores con ese JTI. |
| 3.4 | Marcar cierre voluntario. | El sistema debe distinguir el cierre voluntario de sesión de una expiración forzada para evitar diálogos de sesión expirada innecesarios (setVoluntaryLogoutInProgress). |
| 3.5 | Volver a pantalla de login. | El sistema debe redirigir al componente Login y ocultar el dashboard tras completar el cierre de sesión. |

---

## RF-004 — Recuperar contraseña por correo electrónico.

**Descripción general:** El sistema debe permitir a un usuario solicitar el restablecimiento de contraseña mediante correo electrónico, generando un token de un solo uso con tiempo de expiración y enviándolo a través del servicio SMTP configurado.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 4.1 | Solicitar enlace de recuperación. | El sistema debe aceptar el correo del usuario, generar un token aleatorio seguro y almacenarlo en password_reset_tokens con TTL configurable (POST /auth/forgot-password). |
| 4.2 | Enviar correo con enlace. | El sistema debe construir un enlace de restablecimiento con el token y enviarlo por correo usando las plantillas y transporte SMTP del servidor. |
| 4.3 | Aplicar rate-limit en recuperación. | El sistema debe limitar la frecuencia de solicitudes de recuperación por IP y correo mediante authRateLimiters.passwordReset para mitigar abuso. |
| 4.4 | No revelar existencia de cuenta. | El sistema debe responder con mensaje genérico de éxito independientemente de si el correo existe en la base de datos, por seguridad. |
| 4.5 | Invalidar tokens previos. | El sistema debe marcar como usados o eliminar tokens de recuperación anteriores del mismo usuario al generar uno nuevo. |

---

## RF-005 — Restablecer contraseña con token de un solo uso.

**Descripción general:** El sistema debe permitir definir una nueva contraseña mediante un token de recuperación válido, aplicar la política de fortaleza de contraseña, invalidar el token tras el uso y revocar sesiones activas previas del usuario.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 5.1 | Validar token y caducidad. | El sistema debe comprobar que el token existe en password_reset_tokens, no ha sido usado y no ha superado su tiempo de expiración (POST /auth/reset-password). |
| 5.2 | Aplicar política de contraseña. | El sistema debe exigir longitud mínima, complejidad y coincidencia de confirmación según las reglas definidas en servidor antes de persistir el nuevo hash. |
| 5.3 | Almacenar hash bcrypt. | El sistema debe guardar la nueva contraseña exclusivamente como hash bcrypt en la tabla de usuarios, nunca en texto plano. |
| 5.4 | Invalidar token tras uso. | El sistema debe marcar el token de recuperación como consumido inmediatamente después de un restablecimiento exitoso. |
| 5.5 | Revocar sesiones previas. | El sistema debe invalidar tokens JWT activos del usuario afectado forzando un nuevo inicio de sesión en todos los dispositivos. |

---

## RF-006 — Limitar intentos fallidos y bloqueo temporal.

**Descripción general:** El sistema debe proteger el endpoint de autenticación frente a ataques de fuerza bruta mediante rate-limiting, bloqueo temporal tras intentos fallidos repetidos y registro de intentos en auditoría.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 6.1 | Rate-limit en login. | El sistema debe aplicar authRateLimiters.login limitando peticiones POST /login por ventana temporal e identificador de origen. |
| 6.2 | Bloqueo tras intentos fallidos. | El sistema debe incrementar un contador de fallos por cuenta o IP y bloquear temporalmente nuevos intentos al superar el umbral configurado. |
| 6.3 | Auditar intentos fallidos. | El sistema debe registrar cada intento fallido con motivo (credencial inválida, cuenta inactiva, bloqueo) en la tabla de auditoría de accesos fallidos. |
| 6.4 | Exponer resumen de bloqueos. | El sistema debe ofrecer endpoint agregado de intentos fallidos y bloqueos para el módulo de auditoría (GET /audit/failed-summary). |
| 6.5 | Informar estado de correo en login. | El sistema debe exponer GET /auth/mail-estado para indicar en pantalla de login si el servicio SMTP está operativo o degradado. |

---

## RF-007 — Consultar listado de usuarios con auditoría.

**Descripción general:** El sistema debe permitir al administrador consultar el censo completo de cuentas de acceso con metadatos de auditoría de creación y modificación, estado activo/inactivo y rol asignado.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 7.1 | Listar todos los usuarios. | El sistema debe devolver el conjunto de usuarios con email, nombre, rol, estado activo y campos created_by, created_at, updated_by, updated_at (GET /usuarios). |
| 7.2 | Restringir acceso a administrador. | El sistema debe exigir JWT válido y rol admin para consultar el listado de usuarios. |
| 7.3 | Mostrar tabla en interfaz. | El sistema debe presentar los usuarios en tabla paginada en GestionUsuarios.jsx con columnas de auditoría visibles. |
| 7.4 | Resolver nombres de auditores. | El sistema debe mostrar el nombre legible del usuario creador o modificador cuando su email coincide con un registro del listado cargado. |
| 7.5 | Resaltar usuarios inactivos. | El sistema debe aplicar estilo visual distintivo a las filas de cuentas inactivas para facilitar su identificación. |

---

## RF-008 — Registrar nuevos usuarios.

**Descripción general:** El sistema debe permitir al administrador crear cuentas de acceso nuevas con validación de correo único, rol permitido, contraseña fuerte y registro de auditoría del actor creador.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 8.1 | Validar datos obligatorios. | El sistema debe exigir correo electrónico válido, nombre, rol y contraseña cumpliendo la política de fortaleza antes de persistir (POST /create-usuario). |
| 8.2 | Impedir correos duplicados. | El sistema debe rechazar el alta si ya existe una cuenta con el mismo correo electrónico en la base de datos. |
| 8.3 | Almacenar contraseña con bcrypt. | El sistema debe hashear la contraseña con bcrypt antes de insertar el registro en la tabla de usuarios. |
| 8.4 | Registrar auditoría de alta. | El sistema debe guardar created_by con el email del administrador en sesión y created_at con marca temporal del servidor. |
| 8.5 | Formulario modal en interfaz. | El sistema debe ofrecer modal de alta en GestionUsuarios.jsx con confirmación de contraseña y selector de estado Activo/Inactivo. |

---

## RF-009 — Actualizar datos y credenciales de usuario.

**Descripción general:** El sistema debe permitir al administrador modificar nombre, rol, estado activo y contraseña opcional de una cuenta existente, incluyendo cambio de correo electrónico como clave primaria.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 9.1 | Actualizar por correo clave. | El sistema debe localizar la cuenta por el email en la URL y aplicar los cambios recibidos (PUT /update-usuario/:email). |
| 9.2 | Permitir cambio de email. | El sistema debe actualizar la clave primaria de correo cuando se indica un nuevo email válido y no duplicado en el sistema. |
| 9.3 | Actualizar contraseña opcional. | El sistema debe rehashear y persistir la contraseña solo cuando el administrador proporciona una nueva que cumple la política de fortaleza. |
| 9.4 | Registrar auditoría de modificación. | El sistema debe actualizar updated_by y updated_at con el actor en sesión y la marca temporal de cada edición. |
| 9.5 | Validar rol asignado. | El sistema debe comprobar que el rol indicado existe en el catálogo de roles RBAC antes de guardar la modificación. |

---

## RF-010 — Eliminar usuarios del sistema.

**Descripción general:** El sistema debe permitir al administrador eliminar definitivamente una cuenta de acceso por su correo electrónico, con autorización exclusiva de rol admin y confirmación en interfaz.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 10.1 | Eliminar por correo. | El sistema debe borrar el registro de usuario de la base de datos al recibir DELETE /delete-usuario/:email con JWT de administrador. |
| 10.2 | Confirmar operación destructiva. | El sistema debe solicitar confirmación mediante SweetAlert2 antes de ejecutar la eliminación cuando la preferencia confirmBeforeDelete está activa. |
| 10.3 | Impedir auto-eliminación. | El sistema debe evitar que el administrador en sesión elimine su propia cuenta desde la interfaz de gestión. |
| 10.4 | Responder error si no existe. | El sistema debe devolver HTTP 404 con mensaje descriptivo cuando el correo indicado no corresponde a ningún usuario. |
| 10.5 | Actualizar listado tras borrado. | El sistema debe refrescar la tabla de usuarios en cliente tras una eliminación exitosa sin recargar la página completa. |

---

## RF-011 — Activar o desactivar cuentas operativamente.

**Descripción general:** El sistema debe permitir cambiar el estado activo/inactivo de una cuenta desde la tabla de usuarios sin abrir el modal de edición, bloqueando el acceso de cuentas desactivadas en el siguiente login.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 11.1 | Interruptor por fila. | El sistema debe mostrar un toggle en cada fila de GestionUsuarios.jsx para alternar el estado activo de la cuenta. |
| 11.2 | Persistir cambio inmediato. | El sistema debe invocar PUT /update-usuario/:email con el nuevo estado activo al cambiar el interruptor. |
| 11.3 | Impedir auto-desactivación. | El sistema debe bloquear que el usuario en sesión se desactive a sí mismo mediante el interruptor de la tabla. |
| 11.4 | Reflejar estado visual. | El sistema debe actualizar el resaltado de fila inactiva inmediatamente tras confirmar el cambio de estado. |
| 11.5 | Rechazar login de inactivos. | El sistema debe impedir el inicio de sesión de cuentas marcadas como inactivas en POST /login. |

---

## RF-012 — Gestionar perfil personal del usuario autenticado.

**Descripción general:** El sistema debe permitir a cada usuario autenticado editar sus datos personales, foto de perfil y contraseña propia desde el módulo de configuración, sin requerir permisos de administrador.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 12.1 | Consultar perfil actual. | El sistema debe devolver nombre, teléfono, email y metadatos del perfil del usuario en sesión (GET /user/profile). |
| 12.2 | Actualizar datos personales. | El sistema debe permitir modificar nombre y teléfono del perfil propio mediante PUT /user/profile con validación de campos. |
| 12.3 | Gestionar foto de perfil. | El sistema debe permitir subir, consultar y actualizar la imagen de perfil en base64 o archivo (GET/PUT /user/profile-photo). |
| 12.4 | Cambiar contraseña propia. | El sistema debe exigir la contraseña actual y validar la nueva según política de fortaleza en PUT /user/change-password. |
| 12.5 | Mostrar avatar en topbar. | El sistema debe renderizar UserProfileAvatar en la barra superior del dashboard con la foto o iniciales del usuario autenticado. |

---

## RF-013 — Consultar módulos y acciones de permiso.

**Descripción general:** El sistema debe exponer el catálogo de módulos RBAC (usuarios, contratos, auditoría, configuración) y las acciones disponibles (view, create, edit, delete, export, approve, verify) para la configuración de roles.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 13.1 | Listar módulos RBAC. | El sistema debe devolver la definición de módulos y acciones soportadas mediante GET /rbac/modules. |
| 13.2 | Restringir a usuarios autorizados. | El sistema debe exigir permiso usuarios.view para consultar el catálogo de módulos y roles. |
| 13.3 | Mostrar matriz en interfaz. | El sistema debe presentar la matriz de permisos por módulo y acción en GestionRoles.jsx al crear o editar un rol. |
| 13.4 | Diferenciar roles de sistema. | El sistema debe identificar roles predefinidos (admin, contratacion, director, abogado) como plantillas no eliminables en la interfaz. |
| 13.5 | Consultar detalle de rol. | El sistema debe devolver la matriz de permisos completa de un rol específico (GET /rbac/roles/:id_rol). |

---

## RF-014 — Crear y editar roles personalizados.

**Descripción general:** El sistema debe permitir definir roles personalizados con nombre, descripción y matriz de permisos granular por módulo y acción, persistidos en las tablas roles y rol_permisos.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 14.1 | Crear rol nuevo. | El sistema debe insertar un rol con nombre único y conjunto de permisos seleccionados (POST /rbac/roles) exigiendo permiso usuarios.create. |
| 14.2 | Editar rol existente. | El sistema debe actualizar nombre, descripción y permisos de un rol mediante PUT /rbac/roles/:id_rol con permiso usuarios.edit. |
| 14.3 | Validar nombre único. | El sistema debe rechazar nombres de rol duplicados con respuesta HTTP 409 y mensaje descriptivo. |
| 14.4 | Listar roles disponibles. | El sistema debe devolver todos los roles con conteo de usuarios asignados mediante GET /rbac/roles. |
| 14.5 | Reflejar cambios en sesiones. | El sistema debe aplicar los nuevos permisos del rol en el siguiente inicio de sesión o recarga de permisos del usuario afectado. |

---

## RF-015 — Eliminar roles y proteger roles de sistema.

**Descripción general:** El sistema debe permitir eliminar roles personalizados que no tengan usuarios asignados, impidiendo la eliminación de roles de sistema críticos y de roles en uso.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 15.1 | Eliminar rol personalizado. | El sistema debe borrar el rol y sus permisos asociados cuando no hay usuarios vinculados (DELETE /rbac/roles/:id_rol). |
| 15.2 | Bloquear eliminación de sistema. | El sistema debe rechazar la eliminación de roles predefinidos del sistema (admin, contratacion, director, abogado) con mensaje de protección. |
| 15.3 | Bloquear rol con usuarios. | El sistema debe impedir eliminar un rol que tenga al menos un usuario asignado, indicando el número de cuentas afectadas. |
| 15.4 | Exigir permiso delete. | El sistema debe requerir permiso usuarios.delete en el token del solicitante para autorizar la eliminación de roles. |
| 15.5 | Confirmar en interfaz. | El sistema debe solicitar confirmación al administrador en GestionRoles.jsx antes de ejecutar la eliminación de un rol. |

---

## RF-016 — Resolver permisos efectivos del usuario en sesión.

**Descripción general:** El sistema debe calcular y exponer al cliente los permisos efectivos del usuario autenticado según su rol asignado, para controlar visibilidad de menús, botones y operaciones en interfaz.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 16.1 | Endpoint de permisos propios. | El sistema debe devolver la matriz de permisos del usuario en sesión mediante GET /rbac/me/permissions tras validar el JWT. |
| 16.2 | Cachear en PermissionsContext. | El sistema debe almacenar los permisos en contexto React y localStorage para consultas síncronas mediante can(modulo, accion) en toda la app. |
| 16.3 | Combinar con legacyRolAccess. | El sistema debe aplicar createLegacyCan como capa de compatibilidad para roles heredados mientras coexisten con RBAC granular. |
| 16.4 | Recargar tras cambio de rol. | El sistema debe invalidar y volver a cargar permisos cuando el administrador modifica el rol del usuario y este reinicia sesión. |
| 16.5 | Incluir permisos en JWT. | El sistema debe adjuntar resumen de permisos o rol al payload del token para validaciones rápidas en middleware de servidor. |

---

## RF-017 — Autorizar operaciones API y visibilidad de menú.

**Descripción general:** El sistema debe aplicar control de acceso en cada ruta API mediante middleware JWT global, autorizarRol, autorizarPermiso y reglas rbacPathRules, y reflejar las restricciones en el menú lateral del dashboard.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 17.1 | Middleware JWT global. | El sistema debe verificar el token Bearer en todas las rutas no públicas definidas en apiPublicPaths antes de ejecutar el handler. |
| 17.2 | Autorizar por rol fijo. | El sistema debe aplicar autorizarRol con lista de roles permitidos en rutas sensibles como usuarios (admin) o contratos (contratacion). |
| 17.3 | Autorizar por permiso RBAC. | El sistema debe aplicar autorizarPermiso(modulo, accion) en rutas de roles, correo y configuración según la matriz del usuario. |
| 17.4 | Filtrar menú por can(). | El sistema debe mostrar únicamente Contratación, Usuarios, Roles, Auditoría, Correo y Configuración cuando el usuario tiene el permiso view correspondiente. |
| 17.5 | Indicar modo solo lectura. | El sistema debe mostrar aviso de modo consulta cuando el usuario tiene view sin create, edit ni delete en el módulo activo (PuedeEscribirContext). |

---

## RF-018 — Administrar catálogo de tipos de contrato.

**Descripción general:** El sistema debe mantener el catálogo maestro de tipos de contrato en catalogo_tipo_contrato con operaciones de listado, alta, edición de nombre y activación/desactivación, impidiendo nombres duplicados.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 18.1 | Listar tipos activos. | El sistema debe devolver tipos de contrato activos con conteo de contratos asociados (GET /catalogo/tipos-contrato). |
| 18.2 | Listar incluyendo inactivos. | El sistema debe permitir consultar todos los tipos con parámetro todos=1 para administración del catálogo. |
| 18.3 | Crear tipo nuevo. | El sistema debe insertar un tipo con nombre único y estado activo por defecto (POST /catalogo/tipos-contrato). |
| 18.4 | Actualizar nombre y estado. | El sistema debe modificar nombre y bandera activo de un tipo existente validando duplicados (PUT /catalogo/tipos-contrato/:id). |
| 18.5 | Seleccionar en formulario. | El sistema debe poblar el selector de tipo de contrato en el formulario de alta y edición de GestionContratos.jsx desde este catálogo. |

---

## RF-019 — Registrar contratos con datos obligatorios.

**Descripción general:** El sistema debe permitir al perfil contratación registrar nuevos contratos en contratos_generales con número único, empresa, fechas, tipo, prioridad, vigencia, contactos de notificación y al menos un documento PDF.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 19.1 | Validar número único. | El sistema debe comprobar que numero_contrato no existe previamente y rechazar duplicados con HTTP 409 (POST /create-contrato). |
| 19.2 | Exigir PDF obligatorio. | El sistema debe rechazar el alta en cliente si no se adjunta al menos un archivo PDF válido del contrato principal. |
| 19.3 | Registrar estado pendiente. | El sistema debe insertar el contrato con aprobacion_estado pendiente, aprobacion_accion alta y revision_juridica_estado pendiente hasta su resolución. |
| 19.4 | Validar contactos por nivel. | El sistema debe validar la estructura de contactos_notificacion y contactos_niveles según reglas de proveedor/cliente antes de persistir. |
| 19.5 | Disparar notificación jurídica. | El sistema debe notificar al flujo de revisión jurídica tras registrar una solicitud de alta de contrato. |

---

## RF-020 — Actualizar contratos existentes.

**Descripción general:** El sistema debe permitir modificar contratos vigentes generando solicitudes de edición pendientes de aprobación, respetando estados de cancelación, vencimiento y revisiones jurídicas en curso.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 20.1 | Solicitar edición pendiente. | El sistema debe almacenar la propuesta de cambios en aprobacion_propuesta y marcar aprobacion_accion edicion sin modificar el contrato activo (PUT /update-contrato). |
| 20.2 | Bloquear edición de cancelados. | El sistema debe rechazar ediciones directas de contratos cancelados indicando que debe usarse la operación de renovación. |
| 20.3 | Bloquear edición de vencidos. | El sistema debe rechazar ediciones de contratos cuya fecha_fin es anterior a la fecha actual sin renovación previa. |
| 20.4 | Permitir renovación directa. | El sistema debe aplicar cambios de fechas de renovación inmediatamente cuando operacion es renovacion sin edición adicional. |
| 20.5 | Auditar solicitud de edición. | El sistema debe registrar la acción contrato_edicion_solicitada en el log de auditoría de contratos. |

---

## RF-021 — Consultar listado integral de contratos.

**Descripción general:** El sistema debe devolver el censo completo de contratos activos con metadatos de tipo, estado de aprobación, cancelación, revisión jurídica, prioridad y fechas para el módulo GestionContratos.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 21.1 | Endpoint de listado. | El sistema debe exponer GET /contratos con JWT y roles de lectura ROLES_CONTRATOS_LECTURA para obtener todos los contratos activos. |
| 21.2 | Incluir joins de catálogo. | El sistema debe enriquecer cada registro con nombre de tipo de contrato, estado de aprobación y banderas de cancelación y archivo. |
| 21.3 | Cargar en cliente al iniciar. | El sistema debe cargar el listado completo al montar GestionContratos.jsx y mantenerlo en estado React para todas las secciones. |
| 21.4 | Actualizar tras operaciones. | El sistema debe refrescar el listado tras altas, ediciones, aprobaciones o cancelaciones exitosas. |
| 21.5 | Exponer a roles de lectura. | El sistema debe permitir consulta a roles contratacion, director y abogado según ROLES_CONTRATOS_LECTURA definido en servidor. |

---

## RF-022 — Filtrar y localizar contratos en interfaz.

**Descripción general:** El sistema debe ofrecer filtros por estado temporal, fechas, tipo, empresa y texto libre en la tabla de contratos, con columnas visibles configurables según preferencias del usuario.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 22.1 | Filtrar por estado temporal. | El sistema debe permitir filtrar contratos activos, por vencer, vencidos, cancelados y pendientes de aprobación en la vista de listado. |
| 22.2 | Filtrar por rango de fechas. | El sistema debe ofrecer filtros de fecha_inicio y fecha_fin para acotar el conjunto visible de contratos. |
| 22.3 | Buscar por texto libre. | El sistema debe localizar contratos por número, empresa o contraparte mediante campo de búsqueda en tiempo real. |
| 22.4 | Configurar columnas visibles. | El sistema debe permitir mostrar u ocultar columnas de la tabla según preferencias de usuario almacenadas en app preferences. |
| 22.5 | Aplicar filtros en exportación. | El sistema debe respetar los filtros activos al generar reportes exportados desde la sección de reportes. |

---

## RF-023 — Gestionar contactos y niveles de notificación.

**Descripción general:** El sistema debe almacenar correo principal, contactos adicionales y niveles de notificación por contrato para dirigir recordatorios automáticos y manuales según la configuración de cada expediente.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 23.1 | Definir correo principal. | El sistema debe exigir y persistir correo_notificacion como destinatario principal de avisos del contrato. |
| 23.2 | Registrar contactos adicionales. | El sistema debe almacenar lista de contactos en contactos_notificacion como JSON validado en servidor. |
| 23.3 | Configurar niveles por prioridad. | El sistema debe guardar contactos_niveles con estructura por nivel de alerta según validarContactosNivelesParaGuardar. |
| 23.4 | Validar según proveedor/cliente. | El sistema debe aplicar reglas diferenciadas de contactos cuando el contrato es de tipo proveedor o cliente. |
| 23.5 | Usar en envío de recordatorios. | El sistema debe resolver los destinatarios efectivos desde estos campos al ejecutar recordatorios manuales y automáticos. |

---

## RF-024 — Cancelar contratos con motivo documentado.

**Descripción general:** El sistema debe permitir solicitar la cancelación de un contrato vigente con motivo obligatorio, generando una solicitud pendiente de aprobación o cancelación directa con archivo según la opción seleccionada.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 24.1 | Solicitar cancelación. | El sistema debe registrar solicitud con aprobacion_accion cancelacion y motivo obligatorio (POST /contratos/:numero/cancelar). |
| 24.2 | Cancelar con archivo. | El sistema debe ofrecer opción de cancelación que incluye paso simultáneo a archivo histórico tras aprobación. |
| 24.3 | Bloquear contratos vencidos. | El sistema debe impedir cancelar contratos ya vencidos según validación de fecha_fin en servidor. |
| 24.4 | Registrar solicitante. | El sistema debe almacenar aprobacion_solicitado_por y timestamp de la solicitud de cancelación. |
| 24.5 | Auditar cancelación. | El sistema debe registrar la acción en contratosAuditoria con detalle del motivo y actor. |

---

## RF-025 — Solicitar paso a archivo histórico.

**Descripción general:** El sistema debe permitir iniciar el trámite de archivo histórico de un contrato con solicitud pendiente de aprobación, copia de metadatos y documentos al almacén de archivo y trazabilidad en auditoría.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 25.1 | Iniciar solicitud de archivo. | El sistema debe crear solicitud con aprobacion_accion archivo pendiente de resolución (POST /contratos/:numero/solicitar-archivo). |
| 25.2 | Aprobar paso a archivo. | El sistema debe mover el contrato a contratos_archivo y marcar el registro activo como archivado tras aprobación del director. |
| 25.3 | Conservar documentos. | El sistema debe preservar los PDFs asociados en el directorio contratos-archivo del servidor al archivar. |
| 25.4 | Consultar archivo histórico. | El sistema debe listar contratos archivados con filtros mediante GET /contratos-archivo. |
| 25.5 | Detalle de registro archivado. | El sistema debe devolver metadatos completos de un expediente archivado (GET /contratos-archivo/:id_archivo). |

---

## RF-026 — Presentar cola de contratos pendientes de aprobación.

**Descripción general:** El sistema debe mostrar en la sección Aprobar contrato la cola de solicitudes con aprobacion_estado pendiente de acciones alta, edición, cancelación o archivo, con badges de conteo en el menú lateral.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 26.1 | Filtrar pendientes de aprobación. | El sistema debe listar contratos con aprobacion_estado pendiente en la sección pendientes de GestionContratos.jsx. |
| 26.2 | Mostrar acción solicitada. | El sistema debe indicar si la solicitud pendiente es alta, edición, cancelación o archivo mediante aprobacion_accion. |
| 26.3 | Badge en menú lateral. | El sistema debe mostrar contador de pendientes en ContratosNavCountsContext sobre el ítem Aprobar contrato del sidebar. |
| 26.4 | Restringir a perfil director. | El sistema debe limitar la sección de aprobación a usuarios con permiso contratos.approve o rol director. |
| 26.5 | Visualizar propuesta de cambios. | El sistema debe mostrar el diff o propuesta almacenada en aprobacion_propuesta para solicitudes de edición. |

---

## RF-027 — Aprobar solicitudes de contrato.

**Descripción general:** El sistema debe permitir al perfil autorizado resolver solicitudes pendientes aplicando los cambios propuestos, activando contratos nuevos o ejecutando cancelaciones y archivos aprobados.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 27.1 | Aprobar solicitud. | El sistema debe aplicar cambios pendientes y marcar aprobacion_estado aprobado registrando aprobador y fecha (POST /contratos/:numero/aprobar). |
| 27.2 | Activar contrato tras alta. | El sistema debe dejar operativo un contrato cuya solicitud de alta fue aprobada, actualizando revision_juridica_estado según corresponda. |
| 27.3 | Aplicar edición aprobada. | El sistema debe fusionar aprobacion_propuesta en el registro activo del contrato al aprobar una edición pendiente. |
| 27.4 | Exigir permiso approve. | El sistema debe verificar permiso contratos.approve o rol director antes de procesar la aprobación. |
| 27.5 | Auditar resolución. | El sistema debe registrar aprobacion_resuelto_por, aprobacion_resuelto_en y nota de resolución en auditoría de contratos. |

---

## RF-028 — Rechazar solicitudes de contrato.

**Descripción general:** El sistema debe permitir rechazar solicitudes pendientes con nota de resolución obligatoria, mantener trazabilidad del rechazo y presentar los contratos rechazados en sección dedicada.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 28.1 | Rechazar con nota. | El sistema debe marcar aprobacion_estado rechazado almacenando aprobacion_resolucion_nota (POST /contratos/:numero/rechazar). |
| 28.2 | Sección de rechazados. | El sistema debe listar contratos rechazados en la sección rechazados de GestionContratos.jsx con motivo visible. |
| 28.3 | Notificar al solicitante. | El sistema debe disparar notificación al contratador que originó la solicitud rechazada. |
| 28.4 | Permitir reintento. | El sistema debe permitir al contratador corregir y reenviar la solicitud tras un rechazo según reglas de negocio. |
| 28.5 | Auditar rechazo. | El sistema debe registrar el rechazo con actor, timestamp y nota en el log de auditoría de contratos. |

---

## RF-029 — Verificar contratos en revisión jurídica.

**Descripción general:** El sistema debe permitir al perfil abogado revisar contratos en revision_juridica_estado pendiente, aprobar la verificación o devolver con observaciones desde la sección Verificar contrato.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 29.1 | Listar en verificación. | El sistema debe mostrar contratos con revisión jurídica pendiente en la sección verificar de GestionContratos.jsx. |
| 29.2 | Aprobar verificación. | El sistema debe marcar revision_juridica_estado como aprobado permitiendo el paso a aprobación directiva (POST verificar-aprobar). |
| 29.3 | Devolver con observaciones. | El sistema debe marcar revisión como observado o rechazado con nota para el contratador (POST verificar-rechazar). |
| 29.4 | Exigir permiso verify. | El sistema debe requerir permiso contratos.verify o rol abogado para operar en el flujo jurídico. |
| 29.5 | Badge de pendientes jurídicos. | El sistema debe mostrar contador de contratos pendientes de verificación en el menú lateral de Contratación. |

---

## RF-030 — Gestionar comentarios jurídicos.

**Descripción general:** El sistema debe permitir al perfil jurídico registrar, consultar y marcar como realizados comentarios asociados a un contrato durante el proceso de verificación o devolución.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 30.1 | Listar comentarios. | El sistema debe devolver los comentarios jurídicos de un contrato ordenados cronológicamente (GET /juridico-comentarios). |
| 30.2 | Crear comentario. | El sistema debe permitir al abogado añadir comentario con texto y autor asociado al número de contrato (POST /juridico-comentarios). |
| 30.3 | Marcar como realizado. | El sistema debe permitir al contratador marcar un comentario jurídico como atendido tras aplicar la corrección solicitada. |
| 30.4 | Mostrar en interfaz. | El sistema debe presentar el hilo de comentarios en el panel de verificación y edición del contrato en GestionContratos.jsx. |
| 30.5 | Auditar comentarios. | El sistema debe registrar la creación y resolución de comentarios jurídicos en el log de auditoría de contratos. |

---

## RF-031 — Gestionar adjuntos en devolución jurídica.

**Descripción general:** El sistema debe permitir adjuntar, listar y descargar documentos de soporte durante la devolución jurídica de un contrato, y al contratador retirar solicitudes devueltas.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 31.1 | Subir adjunto jurídico. | El sistema debe almacenar archivos adjuntos vinculados al contrato en el flujo de verificación (POST /juridico-adjuntos). |
| 31.2 | Listar adjuntos. | El sistema debe devolver la lista de adjuntos jurídicos con metadatos de nombre, tamaño y fecha (GET /juridico-adjuntos). |
| 31.3 | Descargar adjunto. | El sistema debe permitir la descarga del archivo adjunto almacenado en servidor para el perfil autorizado. |
| 31.4 | Retirar solicitud devuelta. | El sistema debe permitir al contratador cancelar el trámite o eliminar el contrato devuelto por jurídico (POST /retirar-solicitud). |
| 31.5 | Consultar rechazados jurídicos. | El sistema debe incluir contratos devueltos por jurídico en la sección rechazados con indicador de motivo. |

---

## RF-032 — Calcular estado temporal y mostrar KPIs ejecutivos.

**Descripción general:** El sistema debe determinar en cliente el estado temporal de cada contrato (activo, por vencer, vencido, cancelado, pendiente) y presentar indicadores agregados en la sección Resumen ejecutivo.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 32.1 | Calcular estado por fechas. | El sistema debe clasificar contratos según fecha_fin, margen de alerta configurado y bandera cancelado en GestionContratos.jsx. |
| 32.2 | Mostrar KPIs agregados. | El sistema debe presentar totales de activos, por vencer, vencidos, pendientes y cancelados en tarjetas del resumen ejecutivo. |
| 32.3 | Considerar aprobación pendiente. | El sistema debe excluir o marcar aparte contratos con aprobacion_estado pendiente en los indicadores de cartera activa. |
| 32.4 | Actualizar en tiempo real. | El sistema debe recalcular KPIs al modificar filtros o tras operaciones CRUD sin recargar la página. |
| 32.5 | Sección resumen en navegación. | El sistema debe ofrecer la sección resumen como primera pestaña del módulo Contratación en contratosNavSections.js. |

---

## RF-033 — Priorizar colas de vencimiento y renovación.

**Descripción general:** El sistema debe ordenar y presentar contratos por urgencia temporal y prioridad (alta, media, baja) en las vistas de vencimientos y renovaciones para facilitar la gestión proactiva.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 33.1 | Cola de vencimientos. | El sistema debe listar contratos próximos a vencer ordenados por días restantes y prioridad en la vista vencimientos. |
| 33.2 | Cola de renovaciones. | El sistema debe presentar contratos vencidos o en renovación en la sección renovaciones con acciones de renovar o editar. |
| 33.3 | Ordenar por prioridad. | El sistema debe aplicar orden secundario por campo prioridad (alta, media, baja) dentro de cada grupo temporal. |
| 33.4 | Acceso desde alertas. | El sistema debe permitir navegar a vencimientos desde KPIs y alertas del resumen ejecutivo. |
| 33.5 | Renovación con edición. | El sistema debe soportar renovacion_con_edicion enviando solicitud de edición pendiente al renovar un contrato vencido. |

---

## RF-034 — Configurar recordatorios automáticos por prioridad.

**Descripción general:** El sistema debe permitir al perfil contratación activar o desactivar recordatorios automáticos, definir hitos en días antes del vencimiento por prioridad y reglas opcionales por tipo de contrato.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 34.1 | Consultar configuración. | El sistema debe devolver la configuración actual de recordatorios (GET /config/recordatorios-contratos). |
| 34.2 | Guardar configuración. | El sistema debe persistir hitos, activación y reglas por tipo en base de datos (PUT /config/recordatorios-contratos). |
| 34.3 | Restablecer predeterminados. | El sistema debe ofrecer botón de restablecer valores por defecto (POST /config/recordatorios-contratos/restablecer). |
| 34.4 | Definir hitos por prioridad. | El sistema debe permitir configurar días antes del vencimiento distintos para prioridad alta, media y baja. |
| 34.5 | Interfaz en sección correo. | El sistema debe editar esta configuración desde la sección correo de GestionContratos.jsx o ConfigCorreoServicio.jsx. |

---

## RF-035 — Ejecutar envío automático programado de recordatorios.

**Descripción general:** El sistema debe revisar periódicamente en servidor los contratos activos según frecuencia, ventana horaria y días hábiles configurados, enviando un correo por hito exacto sin duplicar envíos del mismo día.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 35.1 | Programador en servidor. | El sistema debe ejecutar un intervalo interno que evalúa contratos candidatos a recordatorio según fecha_fin y configuración activa. |
| 35.2 | Respetar ventana horaria. | El sistema debe enviar recordatorios automáticos solo dentro del rango horario y días hábiles definidos en configuración. |
| 35.3 | Un envío por hito exacto. | El sistema debe enviar un correo cuando los días restantes coinciden exactamente con un hito configurado para la prioridad del contrato. |
| 35.4 | Evitar duplicados diarios. | El sistema debe registrar cada envío en contratos_recordatorios_envios e impedir reenvío del mismo hito en el mismo día. |
| 35.5 | Seleccionar plantilla por estado. | El sistema debe usar plantilla por_vencer, vencido o cancelado según el estado temporal calculado del contrato. |

---

## RF-036 — Enviar recordatorio manual y consultar historial.

**Descripción general:** El sistema debe permitir al perfil contratación disparar un recordatorio inmediato a los contactos del contrato y consultar el historial de envíos automáticos y manuales.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 36.1 | Envío manual. | El sistema debe enviar correo de recordatorio inmediato al seleccionar un contrato (POST /send-contrato-reminder). |
| 36.2 | Control de duplicados. | El sistema debe impedir más de un recordatorio manual por contrato y día según reglas del servidor. |
| 36.3 | Registrar envío. | El sistema debe insertar registro en contratos_recordatorios_envios con destino, tipo, días antes y resultado. |
| 36.4 | Consultar historial. | El sistema debe listar los últimos envíos de recordatorios por contrato en la interfaz de gestión de correo. |
| 36.5 | Indicar fallo de envío. | El sistema debe mostrar error al usuario si SMTP no está disponible y encolar el mensaje para reintento. |

---

## RF-037 — Adjuntar y validar PDF obligatorio al alta.

**Descripción general:** El sistema debe exigir al menos un documento PDF válido al registrar un contrato, validar tamaño máximo en cliente y servidor, y sincronizar el archivo con el almacenamiento del backend.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 37.1 | Validar en formulario. | El sistema debe bloquear el envío del formulario de alta si no se selecciona al menos un archivo PDF del contrato principal. |
| 37.2 | Limitar tamaño de archivo. | El sistema debe rechazar PDFs que superen el tamaño máximo configurado mostrando mensaje de error al usuario. |
| 37.3 | Almacenar en servidor. | El sistema debe guardar el PDF en el directorio contratos-activos del servidor vinculado al número de contrato. |
| 37.4 | Migrar desde localStorage. | El sistema debe sincronizar PDFs previamente guardados en localStorage del navegador hacia el backend al cargar el módulo. |
| 37.5 | Previsualizar antes de guardar. | El sistema debe ofrecer vista previa embebida del PDF seleccionado en el formulario de alta y edición. |

---

## RF-038 — Gestionar documentos por contrato en servidor.

**Descripción general:** El sistema debe permitir registrar, listar, previsualizar, descargar y eliminar documentos asociados a un contrato en la tabla contratos_documentos con tipos contrato, suplemento y anexo.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 38.1 | Registrar documento. | El sistema debe insertar metadatos y archivo en contratos_documentos (POST /contratos/:numero/documentos). |
| 38.2 | Listar documentos. | El sistema debe devolver todos los documentos de un contrato con tipo y nombre de archivo (GET /contratos/:numero/documentos). |
| 38.3 | Descargar documento. | El sistema debe servir el archivo almacenado para descarga o vista previa embebida al usuario autorizado. |
| 38.4 | Eliminar documento. | El sistema debe permitir borrar un documento del expediente con permiso de edición (DELETE /contratos/:numero/documentos/:id). |
| 38.5 | Clasificar por tipo. | El sistema debe distinguir documentos de tipo contrato, suplemento y anexo en la interfaz de gestión documental. |

---

## RF-039 — Consultar archivo histórico y exportar expediente ZIP.

**Descripción general:** El sistema debe listar contratos archivados con filtros, consultar detalle de expedientes históricos y generar paquetes ZIP con PDFs, índice Excel y resumen JSON de contratos seleccionados.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 39.1 | Listar archivo histórico. | El sistema debe devolver contratos archivados con metadatos de fecha de archivo y motivo (GET /contratos-archivo). |
| 39.2 | Filtrar archivo. | El sistema debe ofrecer filtros por fechas, empresa y texto en la sección archivo de GestionContratos.jsx. |
| 39.3 | Exportar expediente ZIP. | El sistema debe generar paquete ZIP con PDFs y metadatos (POST /contratos/exportar-expediente). |
| 39.4 | Incluir índice Excel. | El sistema debe añadir al ZIP un libro Excel con índice de documentos y datos del contrato. |
| 39.5 | Limitar cantidad y tamaño. | El sistema debe aplicar límites de cantidad de contratos y tamaño total del ZIP en servidor para evitar sobrecarga. |

---

## RF-040 — Configurar servidor SMTP del sistema.

**Descripción general:** El sistema debe permitir configurar el transporte de correo mediante variables de entorno o parámetros en base de datos (host, puerto, TLS, usuario, remitente) con prueba de envío y restablecimiento a valores predeterminados.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 40.1 | Consultar configuración SMTP. | El sistema debe devolver la configuración actual enmascarando credenciales sensibles (GET /config/correo). |
| 40.2 | Guardar configuración. | El sistema debe persistir host, puerto, secure, usuario y remitente en base de datos (PUT /config/correo). |
| 40.3 | Probar envío SMTP. | El sistema debe enviar correo de prueba al destinatario indicado (POST /config/correo/probar). |
| 40.4 | Restablecer predeterminados. | El sistema debe ofrecer botón para volver a la configuración SMTP por defecto con confirmación del usuario. |
| 40.5 | Consultar estado del servicio. | El sistema debe exponer GET /config/correo/estado indicando si el transporte SMTP responde correctamente. |

---

## RF-041 — Personalizar plantillas de correo de contratos.

**Descripción general:** El sistema debe permitir editar asunto y cuerpo de las plantillas de correo para estados por_vencer, vencido y cancelado, con placeholders dinámicos sustituidos por datos del contrato al enviar.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 41.1 | Listar plantillas. | El sistema debe devolver las plantillas configuradas por tipo de alerta (GET /config/contratos-correo-plantillas). |
| 41.2 | Guardar plantillas. | El sistema debe persistir asunto y cuerpo HTML o texto de cada plantilla (PUT /config/contratos-correo-plantillas). |
| 41.3 | Probar plantilla. | El sistema debe enviar correo de prueba con datos de ejemplo sin guardar cambios previos (POST .../plantillas/probar). |
| 41.4 | Restablecer plantillas. | El sistema debe restaurar textos predeterminados de plantillas (POST .../plantillas/restablecer). |
| 41.5 | Sustituir placeholders. | El sistema debe reemplazar variables como número de contrato, empresa y fecha_fin al generar el cuerpo del correo. |

---

## RF-042 — Encolar correos ante fallo SMTP y reintentar envío.

**Descripción general:** El sistema debe almacenar mensajes no entregados en mail_outbox cuando el transporte SMTP no está disponible y reintentar el envío periódicamente hasta éxito o agotamiento de reintentos.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 42.1 | Insertar en cola. | El sistema debe guardar destinatario, asunto, cuerpo y metadatos en mail_outbox cuando falla el envío inmediato. |
| 42.2 | Reintentar periódicamente. | El sistema debe procesar la cola en intervalos configurados intentando reenviar mensajes pendientes. |
| 42.3 | Marcar como enviado. | El sistema debe actualizar el estado del registro en cola tras un envío exitoso eliminándolo o archivándolo. |
| 42.4 | Registrar fallos. | El sistema debe almacenar el último error SMTP en el registro de cola para diagnóstico. |
| 42.5 | Exponer conteo pendiente. | El sistema debe incluir el número de correos pendientes en el estado del servicio de correo para los banners de aviso. |

---

## RF-043 — Informar indisponibilidad del servicio de correo.

**Descripción general:** El sistema debe mostrar banners de advertencia en la pantalla de login y en el dashboard cuando el servicio SMTP no responde o existen correos pendientes en cola de envío.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 43.1 | Banner en login. | El sistema debe mostrar MailServiceUnavailableBanner en Login.jsx cuando GET /auth/mail-estado indica servicio degradado. |
| 43.2 | Banner en dashboard. | El sistema debe mostrar aviso persistente en la barra superior del dashboard mientras el correo no esté operativo. |
| 43.3 | Mensaje de cola pendiente. | El sistema debe indicar cuántos correos están en cola mediante mailQueueBannerMessage cuando hay pendientes. |
| 43.4 | Hook de estado. | El sistema debe consultar periódicamente el estado del correo mediante useMailServiceStatus en cliente. |
| 43.5 | No bloquear otras funciones. | El sistema debe permitir operar el resto de módulos aunque el correo esté degradado, informando solo de la limitación. |

---

## RF-044 — Exportar reportes de contratos a Excel, CSV y PDF.

**Descripción general:** El sistema debe generar reportes tabulares de la vista de contratos activos en formatos Excel, CSV y PDF con cabecera corporativa AEPG, columnas del listado filtrado y codificación UTF-8 para español.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 44.1 | Exportar a Excel. | El sistema debe generar libro .xlsx con cabecera verde corporativa y columnas visibles usando ExcelJS en GestionContratos.jsx. |
| 44.2 | Exportar a CSV. | El sistema debe generar CSV con separador punto y coma y BOM UTF-8 para compatibilidad con Excel en español. |
| 44.3 | Exportar a PDF. | El sistema debe generar tabla PDF con jsPDF y autoTable respetando los datos filtrados del listado. |
| 44.4 | Respetar filtros activos. | El sistema debe exportar únicamente los contratos que cumplen los filtros aplicados en la sección reportes. |
| 44.5 | Sección reportes. | El sistema debe ofrecer los botones de exportación en la sección reportes del módulo Contratación. |

---

## RF-045 — Exportar archivo histórico a Excel, CSV y PDF.

**Descripción general:** El sistema debe ofrecer exportación de la vista de contratos archivados en formatos Excel, CSV y PDF con los mismos estándares de formato e identidad corporativa que los reportes de contratos activos.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 45.1 | Exportar archivo a Excel. | El sistema debe generar libro Excel de contratos archivados con columnas de metadatos de archivo y fechas. |
| 45.2 | Exportar archivo a CSV. | El sistema debe generar CSV del archivo histórico con codificación UTF-8 y separador punto y coma. |
| 45.3 | Exportar archivo a PDF. | El sistema debe generar PDF tabular de contratos archivados filtrados. |
| 45.4 | Aplicar filtros de archivo. | El sistema debe incluir en la exportación solo los registros que cumplen los filtros de la sección archivo. |
| 45.5 | Mantener identidad AEPG. | El sistema debe incluir logotipo o cabecera corporativa verde en los formatos que lo soporten. |

---

## RF-046 — Exportar auditoría del sistema a PDF.

**Descripción general:** El sistema debe permitir exportar las tablas de sesiones, intentos fallidos y eventos de auditoría del módulo Auditoria a PDF cuando el usuario tiene permiso export.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 46.1 | Exportar sesiones a PDF. | El sistema debe generar PDF con el listado de sesiones de acceso filtradas en Auditoria.jsx. |
| 46.2 | Exportar fallos a PDF. | El sistema debe generar PDF con intentos fallidos de login registrados en el sistema. |
| 46.3 | Exportar eventos a PDF. | El sistema debe generar PDF con eventos administrativos de GET /audit/events. |
| 46.4 | Exigir permiso export. | El sistema debe mostrar el botón de exportación solo cuando el usuario tiene permiso auditoria.export o equivalente. |
| 46.5 | Aplicar filtros de fecha. | El sistema debe respetar el rango de fechas seleccionado en la interfaz al generar el PDF. |

---

## RF-047 — Registrar y consultar sesiones de acceso.

**Descripción general:** El sistema debe almacenar cada inicio de sesión exitoso con email, rol, dirección IP y agente de usuario, y permitir su consulta filtrada desde el módulo de auditoría.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 47.1 | Registrar sesión en login. | El sistema debe insertar registro de sesión exitosa en la tabla de auditoría al completar POST /login. |
| 47.2 | Consultar sesiones. | El sistema debe listar sesiones con paginación y filtros (GET /audit/sessions) para rol admin. |
| 47.3 | Mostrar en Auditoria.jsx. | El sistema debe presentar la tabla de sesiones en la pestaña correspondiente del módulo Auditoría. |
| 47.4 | Incluir IP y user-agent. | El sistema debe almacenar y mostrar dirección IP y cadena de agente de usuario de cada sesión. |
| 47.5 | Filtrar por rango de fechas. | El sistema debe permitir acotar la consulta de sesiones por fecha de inicio y fin en la interfaz. |

---

## RF-048 — Registrar intentos fallidos y bloqueos.

**Descripción general:** El sistema debe auditar credenciales inválidas, intentos sobre cuentas inactivas y bloqueos temporales, ofreciendo listado detallado y resumen agregado para administración.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 48.1 | Registrar intento fallido. | El sistema debe insertar registro con motivo, email intentado, IP y timestamp en cada login fallido. |
| 48.2 | Listar intentos fallidos. | El sistema debe exponer GET /audit/failed-logins con los registros detallados para administrador. |
| 48.3 | Resumen agregado. | El sistema debe ofrecer GET /audit/failed-summary con totales por motivo y periodo. |
| 48.4 | Mostrar en interfaz. | El sistema debe presentar intentos fallidos en pestaña dedicada de Auditoria.jsx. |
| 48.5 | Vincular con bloqueo. | El sistema debe indicar en el registro cuando el intento fue rechazado por bloqueo temporal activo. |

---

## RF-049 — Consultar eventos de auditoría del sistema.

**Descripción general:** El sistema debe registrar y listar eventos administrativos significativos (cambios de configuración, operaciones RBAC, etc.) con actor, acción, entidad y marca temporal.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 49.1 | Registrar evento. | El sistema debe insertar eventos de auditoría con actor, acción, entidad afectada y payload de detalle cuando ocurren operaciones sensibles. |
| 49.2 | Listar eventos. | El sistema debe devolver eventos paginados y filtrables (GET /audit/events) para rol admin. |
| 49.3 | Mostrar en Auditoria.jsx. | El sistema debe presentar la tabla de eventos en la pestaña de eventos del módulo Auditoría. |
| 49.4 | Filtrar por acción. | El sistema debe permitir filtrar eventos por tipo de acción o módulo en la interfaz. |
| 49.5 | Restringir a administrador. | El sistema debe exigir rol admin o permiso auditoria.view para consultar eventos del sistema. |

---

## RF-050 — Auditar operaciones sobre contratos.

**Descripción general:** El sistema debe registrar en log dedicado las acciones críticas sobre contratos (alta, edición, cancelación, aprobación, verificación jurídica) y permitir su consulta filtrada.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 50.1 | Registrar acción de contrato. | El sistema debe invocar contratosAuditoria.logContrato en cada operación significativa sobre un expediente. |
| 50.2 | Consultar log de contratos. | El sistema debe listar entradas de auditoría contractual (GET /contratos/auditoria) para roles de lectura de contratos. |
| 50.3 | Sección auditoría en Contratación. | El sistema debe mostrar el log en la sección auditoria de GestionContratos.jsx con filtros por número y fechas. |
| 50.4 | Incluir actor y detalle. | El sistema debe almacenar email del actor, acción, número de contrato y objeto details con contexto JSON. |
| 50.5 | Revocar tokens comprometidos. | El sistema debe mantener blacklist JWT y rechazar tokens con JTI revocado como medida de seguridad auditada. |

---

## RF-051 — Configurar tema, tipografía y escala de interfaz.

**Descripción general:** El sistema debe permitir al usuario personalizar apariencia visual mediante temas predefinidos, fuentes, tamaños, bordes, colores, escala de interfaz y ancho del menú lateral con vista previa en vivo.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 51.1 | Seleccionar tema predefinido. | El sistema debe ofrecer paletas de tema claro, oscuro y personalizado en AppConfiguracion con aplicación inmediata. |
| 51.2 | Configurar tipografía. | El sistema debe permitir elegir familia tipográfica, tamaño base e interlineado aplicados mediante variables CSS. |
| 51.3 | Ajustar escala de interfaz. | El sistema debe permitir escalar globalmente el tamaño de la interfaz mediante preferencia uiScale. |
| 51.4 | Configurar menú lateral. | El sistema debe permitir ancho del sidebar, modo compacto solo iconos y fijar submenús abiertos. |
| 51.5 | Vista previa en vivo. | El sistema debe aplicar cambios de apariencia en tiempo real antes de guardar en AppConfiguracion.jsx. |

---

## RF-052 — Configurar accesibilidad y formatos fecha/hora.

**Descripción general:** El sistema debe ofrecer opciones de accesibilidad (alto contraste, reducción de animaciones, targets táctiles) y formatos de fecha y hora aplicados globalmente en la interfaz.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 52.1 | Alto contraste. | El sistema debe activar modo de alto contraste mediante clase CSS en document.documentElement según preferencia del usuario. |
| 52.2 | Reducir animaciones. | El sistema debe respetar prefers-reduced-motion y la preferencia reduceAnimations del usuario. |
| 52.3 | Formato de fecha. | El sistema debe aplicar preferencia dmy o mdy en toda la interfaz mediante formatAppDate. |
| 52.4 | Formato de hora. | El sistema debe aplicar formato 12h o 24h mediante formatAppTime en panel informativo y tablas. |
| 52.5 | Targets táctiles amplios. | El sistema debe aumentar área clickable de botones y enlaces cuando largeUiTargets está activo. |

---

## RF-053 — Sincronizar y restablecer preferencias de usuario.

**Descripción general:** El sistema debe guardar las preferencias de apariencia y navegación en localStorage y servidor, mostrar estado de sincronización y permitir restablecer valores globales o por sección.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 53.1 | Guardar en localStorage. | El sistema debe persistir preferencias en localStorage inmediatamente al cambiar cualquier opción en AppPreferencesContext. |
| 53.2 | Sincronizar con servidor. | El sistema debe enviar preferencias al servidor (PUT /user/preferences) y recuperarlas al iniciar sesión (GET /user/preferences). |
| 53.3 | Indicador de sincronización. | El sistema debe mostrar estado guardado local, sincronizado o error de sincronización en la interfaz de configuración. |
| 53.4 | Restablecer globalmente. | El sistema debe ofrecer botón de restablecer todas las preferencias con confirmación SweetAlert2. |
| 53.5 | Restablecer por sección. | El sistema debe permitir restablecer independientemente tema, tipografía, escala, accesibilidad y navegación. |

---

## RF-054 — Gestionar navegación dashboard, secciones y experiencia móvil.

**Descripción general:** El sistema debe ofrecer shell tipo dashboard con menú lateral, pestañas de Contratación, panel informativo, navegación condicionada por permisos, recordatorio de sección visitada y adaptación a dispositivos móviles.

| Sub | Nombre | Descripción |
|-----|--------|-------------|
| 54.1 | Layout dashboard. | El sistema debe mostrar sidebar, área principal y panel informativo con módulo activo, fecha, hora y logotipo AEPG. |
| 54.2 | Pestañas de Contratación. | El sistema debe ofrecer navegación por secciones definidas en contratosNavSections.js filtradas por permisos can(). |
| 54.3 | Recordar sección visitada. | El sistema debe restaurar la última sección activa al recargar cuando rememberSection está habilitado (useDashboardNav). |
| 54.4 | Adaptación móvil. | El sistema debe ofrecer menú offcanvas, pestañas con iconos y sesión compacta en topbar para pantallas pequeñas. |
| 54.5 | Pantalla inicial por rol. | El sistema debe abrir Usuarios para admin o la primera sección de Contratación permitida para contratación, director y abogado tras el login. |
