/**
 * Catálogo de 54 requisitos funcionales — derivado del código activo (client/ + server/index.js).
 * Usado por generate-rf-catalogo-docx.mjs
 */
export const REQUISITOS_FUNCIONALES = [
  {
    code: 'RF-001',
    tipo: 'Funcional.',
    titulo: 'Iniciar sesión con credenciales y emitir JWT.',
    descripcionGeneral:
      'El sistema debe permitir el acceso seguro mediante correo electrónico o nombre de usuario y contraseña almacenados con hash bcrypt en base de datos, validar el estado activo de la cuenta y devolver un token JWT con identidad, rol y permisos RBAC para las operaciones posteriores.',
    subs: [
      { nombre: 'Validar credenciales con bcrypt.', desc: 'El sistema debe comparar la contraseña introducida con el hash almacenado en la tabla de usuarios y rechazar credenciales inválidas con mensaje genérico (POST /login).' },
      { nombre: 'Emitir JWT de sesión.', desc: 'El sistema debe generar un token JWT con email, nombre, rol y JTI único, con caducidad configurada (8 horas), e incluir permisos RBAC resueltos del rol asignado.' },
      { nombre: 'Rechazar cuentas inactivas.', desc: 'El sistema debe impedir el inicio de sesión cuando el campo activo de la cuenta es falso y registrar el intento en la auditoría de accesos fallidos.' },
      { nombre: 'Registrar sesión exitosa.', desc: 'El sistema debe almacenar el inicio de sesión en la tabla de auditoría de sesiones con IP, agente de usuario, email y rol del usuario autenticado.' },
      { nombre: 'Exponer avatar de login.', desc: 'El sistema debe ofrecer endpoint público de avatar decorativo en pantalla de login con rate-limit independiente (GET /auth/login-avatar).' },
    ],
  },
  {
    code: 'RF-002',
    tipo: 'Funcional.',
    titulo: 'Mantener y validar sesión en el cliente.',
    descripcionGeneral:
      'El sistema debe persistir el token JWT y los datos del usuario en el navegador, adjuntar automáticamente la cabecera Authorization en las peticiones HTTP y detectar tokens expirados o revocados para forzar un nuevo inicio de sesión.',
    subs: [
      { nombre: 'Persistir token en localStorage.', desc: 'El sistema debe almacenar el JWT y el objeto usuario en localStorage bajo claves definidas (token, permisos) al completar el login en client/src/App.js.' },
      { nombre: 'Adjuntar Bearer en Axios.', desc: 'El sistema debe configurar el interceptor de Axios para incluir Authorization: Bearer en todas las peticiones autenticadas hacia la API.' },
      { nombre: 'Detectar expiración del JWT.', desc: 'El sistema debe comprobar la caducidad del payload JWT en cliente mediante isTokenExpired y cerrar la sesión local si el token ha vencido.' },
      { nombre: 'Restaurar sesión al recargar.', desc: 'El sistema debe recuperar token y usuario de localStorage al cargar la aplicación y validar su vigencia antes de mostrar el dashboard.' },
      { nombre: 'Sincronizar permisos en cliente.', desc: 'El sistema debe cargar y cachear los permisos RBAC del usuario en PermissionsContext para filtrar menús y acciones en toda la interfaz.' },
    ],
  },
  {
    code: 'RF-003',
    tipo: 'Funcional.',
    titulo: 'Cerrar sesión y revocar token.',
    descripcionGeneral:
      'El sistema debe permitir al usuario cerrar sesión de forma controlada, revocar el JWT en servidor mediante blacklist, limpiar el almacenamiento local del navegador y registrar el evento de cierre en auditoría.',
    subs: [
      { nombre: 'Invocar cierre de sesión en API.', desc: 'El sistema debe llamar a POST /auth/logout con el token vigente para registrar la revocación del JTI en la blacklist del servidor.' },
      { nombre: 'Limpiar almacenamiento local.', desc: 'El sistema debe eliminar token, usuario y permisos de localStorage y resetear la cabecera Authorization en Axios al cerrar sesión.' },
      { nombre: 'Revocar JTI en blacklist.', desc: 'El sistema debe almacenar el identificador único del token revocado hasta su expiración natural y rechazar peticiones posteriores con ese JTI.' },
      { nombre: 'Marcar cierre voluntario.', desc: 'El sistema debe distinguir el cierre voluntario de sesión de una expiración forzada para evitar diálogos de sesión expirada innecesarios (setVoluntaryLogoutInProgress).' },
      { nombre: 'Volver a pantalla de login.', desc: 'El sistema debe redirigir al componente Login y ocultar el dashboard tras completar el cierre de sesión.' },
    ],
  },
  {
    code: 'RF-004',
    tipo: 'Funcional.',
    titulo: 'Recuperar contraseña por correo electrónico.',
    descripcionGeneral:
      'El sistema debe permitir a un usuario solicitar el restablecimiento de contraseña mediante correo electrónico, generando un token de un solo uso con tiempo de expiración y enviándolo a través del servicio SMTP configurado.',
    subs: [
      { nombre: 'Solicitar enlace de recuperación.', desc: 'El sistema debe aceptar el correo del usuario, generar un token aleatorio seguro y almacenarlo en password_reset_tokens con TTL configurable (POST /auth/forgot-password).' },
      { nombre: 'Enviar correo con enlace.', desc: 'El sistema debe construir un enlace de restablecimiento con el token y enviarlo por correo usando las plantillas y transporte SMTP del servidor.' },
      { nombre: 'Aplicar rate-limit en recuperación.', desc: 'El sistema debe limitar la frecuencia de solicitudes de recuperación por IP y correo mediante authRateLimiters.passwordReset para mitigar abuso.' },
      { nombre: 'No revelar existencia de cuenta.', desc: 'El sistema debe responder con mensaje genérico de éxito independientemente de si el correo existe en la base de datos, por seguridad.' },
      { nombre: 'Invalidar tokens previos.', desc: 'El sistema debe marcar como usados o eliminar tokens de recuperación anteriores del mismo usuario al generar uno nuevo.' },
    ],
  },
  {
    code: 'RF-005',
    tipo: 'Funcional.',
    titulo: 'Restablecer contraseña con token de un solo uso.',
    descripcionGeneral:
      'El sistema debe permitir definir una nueva contraseña mediante un token de recuperación válido, aplicar la política de fortaleza de contraseña, invalidar el token tras el uso y revocar sesiones activas previas del usuario.',
    subs: [
      { nombre: 'Validar token y caducidad.', desc: 'El sistema debe comprobar que el token existe en password_reset_tokens, no ha sido usado y no ha superado su tiempo de expiración (POST /auth/reset-password).' },
      { nombre: 'Aplicar política de contraseña.', desc: 'El sistema debe exigir longitud mínima, complejidad y coincidencia de confirmación según las reglas definidas en servidor antes de persistir el nuevo hash.' },
      { nombre: 'Almacenar hash bcrypt.', desc: 'El sistema debe guardar la nueva contraseña exclusivamente como hash bcrypt en la tabla de usuarios, nunca en texto plano.' },
      { nombre: 'Invalidar token tras uso.', desc: 'El sistema debe marcar el token de recuperación como consumido inmediatamente después de un restablecimiento exitoso.' },
      { nombre: 'Revocar sesiones previas.', desc: 'El sistema debe invalidar tokens JWT activos del usuario afectado forzando un nuevo inicio de sesión en todos los dispositivos.' },
    ],
  },
  {
    code: 'RF-006',
    tipo: 'Funcional.',
    titulo: 'Limitar intentos fallidos y bloqueo temporal.',
    descripcionGeneral:
      'El sistema debe proteger el endpoint de autenticación frente a ataques de fuerza bruta mediante rate-limiting, bloqueo temporal tras intentos fallidos repetidos y registro de intentos en auditoría.',
    subs: [
      { nombre: 'Rate-limit en login.', desc: 'El sistema debe aplicar authRateLimiters.login limitando peticiones POST /login por ventana temporal e identificador de origen.' },
      { nombre: 'Bloqueo tras intentos fallidos.', desc: 'El sistema debe incrementar un contador de fallos por cuenta o IP y bloquear temporalmente nuevos intentos al superar el umbral configurado.' },
      { nombre: 'Auditar intentos fallidos.', desc: 'El sistema debe registrar cada intento fallido con motivo (credencial inválida, cuenta inactiva, bloqueo) en la tabla de auditoría de accesos fallidos.' },
      { nombre: 'Exponer resumen de bloqueos.', desc: 'El sistema debe ofrecer endpoint agregado de intentos fallidos y bloqueos para el módulo de auditoría (GET /audit/failed-summary).' },
      { nombre: 'Informar estado de correo en login.', desc: 'El sistema debe exponer GET /auth/mail-estado para indicar en pantalla de login si el servicio SMTP está operativo o degradado.' },
    ],
  },
  {
    code: 'RF-007',
    tipo: 'Funcional.',
    titulo: 'Consultar listado de usuarios con auditoría.',
    descripcionGeneral:
      'El sistema debe permitir al administrador consultar el censo completo de cuentas de acceso con metadatos de auditoría de creación y modificación, estado activo/inactivo y rol asignado.',
    subs: [
      { nombre: 'Listar todos los usuarios.', desc: 'El sistema debe devolver el conjunto de usuarios con email, nombre, rol, estado activo y campos created_by, created_at, updated_by, updated_at (GET /usuarios).' },
      { nombre: 'Restringir acceso a administrador.', desc: 'El sistema debe exigir JWT válido y rol admin para consultar el listado de usuarios.' },
      { nombre: 'Mostrar tabla en interfaz.', desc: 'El sistema debe presentar los usuarios en tabla paginada en GestionUsuarios.jsx con columnas de auditoría visibles.' },
      { nombre: 'Resolver nombres de auditores.', desc: 'El sistema debe mostrar el nombre legible del usuario creador o modificador cuando su email coincide con un registro del listado cargado.' },
      { nombre: 'Resaltar usuarios inactivos.', desc: 'El sistema debe aplicar estilo visual distintivo a las filas de cuentas inactivas para facilitar su identificación.' },
    ],
  },
  {
    code: 'RF-008',
    tipo: 'Funcional.',
    titulo: 'Registrar nuevos usuarios.',
    descripcionGeneral:
      'El sistema debe permitir al administrador crear cuentas de acceso nuevas con validación de correo único, rol permitido, contraseña fuerte y registro de auditoría del actor creador.',
    subs: [
      { nombre: 'Validar datos obligatorios.', desc: 'El sistema debe exigir correo electrónico válido, nombre, rol y contraseña cumpliendo la política de fortaleza antes de persistir (POST /create-usuario).' },
      { nombre: 'Impedir correos duplicados.', desc: 'El sistema debe rechazar el alta si ya existe una cuenta con el mismo correo electrónico en la base de datos.' },
      { nombre: 'Almacenar contraseña con bcrypt.', desc: 'El sistema debe hashear la contraseña con bcrypt antes de insertar el registro en la tabla de usuarios.' },
      { nombre: 'Registrar auditoría de alta.', desc: 'El sistema debe guardar created_by con el email del administrador en sesión y created_at con marca temporal del servidor.' },
      { nombre: 'Formulario modal en interfaz.', desc: 'El sistema debe ofrecer modal de alta en GestionUsuarios.jsx con confirmación de contraseña y selector de estado Activo/Inactivo.' },
    ],
  },
  {
    code: 'RF-009',
    tipo: 'Funcional.',
    titulo: 'Actualizar datos y credenciales de usuario.',
    descripcionGeneral:
      'El sistema debe permitir al administrador modificar nombre, rol, estado activo y contraseña opcional de una cuenta existente, incluyendo cambio de correo electrónico como clave primaria.',
    subs: [
      { nombre: 'Actualizar por correo clave.', desc: 'El sistema debe localizar la cuenta por el email en la URL y aplicar los cambios recibidos (PUT /update-usuario/:email).' },
      { nombre: 'Permitir cambio de email.', desc: 'El sistema debe actualizar la clave primaria de correo cuando se indica un nuevo email válido y no duplicado en el sistema.' },
      { nombre: 'Actualizar contraseña opcional.', desc: 'El sistema debe rehashear y persistir la contraseña solo cuando el administrador proporciona una nueva que cumple la política de fortaleza.' },
      { nombre: 'Registrar auditoría de modificación.', desc: 'El sistema debe actualizar updated_by y updated_at con el actor en sesión y la marca temporal de cada edición.' },
      { nombre: 'Validar rol asignado.', desc: 'El sistema debe comprobar que el rol indicado existe en el catálogo de roles RBAC antes de guardar la modificación.' },
    ],
  },
  {
    code: 'RF-010',
    tipo: 'Funcional.',
    titulo: 'Eliminar usuarios del sistema.',
    descripcionGeneral:
      'El sistema debe permitir al administrador eliminar definitivamente una cuenta de acceso por su correo electrónico, con autorización exclusiva de rol admin y confirmación en interfaz.',
    subs: [
      { nombre: 'Eliminar por correo.', desc: 'El sistema debe borrar el registro de usuario de la base de datos al recibir DELETE /delete-usuario/:email con JWT de administrador.' },
      { nombre: 'Confirmar operación destructiva.', desc: 'El sistema debe solicitar confirmación mediante SweetAlert2 antes de ejecutar la eliminación cuando la preferencia confirmBeforeDelete está activa.' },
      { nombre: 'Impedir auto-eliminación.', desc: 'El sistema debe evitar que el administrador en sesión elimine su propia cuenta desde la interfaz de gestión.' },
      { nombre: 'Responder error si no existe.', desc: 'El sistema debe devolver HTTP 404 con mensaje descriptivo cuando el correo indicado no corresponde a ningún usuario.' },
      { nombre: 'Actualizar listado tras borrado.', desc: 'El sistema debe refrescar la tabla de usuarios en cliente tras una eliminación exitosa sin recargar la página completa.' },
    ],
  },
  {
    code: 'RF-011',
    tipo: 'Funcional.',
    titulo: 'Activar o desactivar cuentas operativamente.',
    descripcionGeneral:
      'El sistema debe permitir cambiar el estado activo/inactivo de una cuenta desde la tabla de usuarios sin abrir el modal de edición, bloqueando el acceso de cuentas desactivadas en el siguiente login.',
    subs: [
      { nombre: 'Interruptor por fila.', desc: 'El sistema debe mostrar un toggle en cada fila de GestionUsuarios.jsx para alternar el estado activo de la cuenta.' },
      { nombre: 'Persistir cambio inmediato.', desc: 'El sistema debe invocar PUT /update-usuario/:email con el nuevo estado activo al cambiar el interruptor.' },
      { nombre: 'Impedir auto-desactivación.', desc: 'El sistema debe bloquear que el usuario en sesión se desactive a sí mismo mediante el interruptor de la tabla.' },
      { nombre: 'Reflejar estado visual.', desc: 'El sistema debe actualizar el resaltado de fila inactiva inmediatamente tras confirmar el cambio de estado.' },
      { nombre: 'Rechazar login de inactivos.', desc: 'El sistema debe impedir el inicio de sesión de cuentas marcadas como inactivas en POST /login.' },
    ],
  },
  {
    code: 'RF-012',
    tipo: 'Funcional.',
    titulo: 'Gestionar perfil personal del usuario autenticado.',
    descripcionGeneral:
      'El sistema debe permitir a cada usuario autenticado editar sus datos personales, foto de perfil y contraseña propia desde el módulo de configuración, sin requerir permisos de administrador.',
    subs: [
      { nombre: 'Consultar perfil actual.', desc: 'El sistema debe devolver nombre, teléfono, email y metadatos del perfil del usuario en sesión (GET /user/profile).' },
      { nombre: 'Actualizar datos personales.', desc: 'El sistema debe permitir modificar nombre y teléfono del perfil propio mediante PUT /user/profile con validación de campos.' },
      { nombre: 'Gestionar foto de perfil.', desc: 'El sistema debe permitir subir, consultar y actualizar la imagen de perfil en base64 o archivo (GET/PUT /user/profile-photo).' },
      { nombre: 'Cambiar contraseña propia.', desc: 'El sistema debe exigir la contraseña actual y validar la nueva según política de fortaleza en PUT /user/change-password.' },
      { nombre: 'Mostrar avatar en topbar.', desc: 'El sistema debe renderizar UserProfileAvatar en la barra superior del dashboard con la foto o iniciales del usuario autenticado.' },
    ],
  },
  {
    code: 'RF-013',
    tipo: 'Funcional.',
    titulo: 'Consultar módulos y acciones de permiso.',
    descripcionGeneral:
      'El sistema debe exponer el catálogo de módulos RBAC (usuarios, contratos, auditoría, configuración) y las acciones disponibles (view, create, edit, delete, export, approve, verify) para la configuración de roles.',
    subs: [
      { nombre: 'Listar módulos RBAC.', desc: 'El sistema debe devolver la definición de módulos y acciones soportadas mediante GET /rbac/modules.' },
      { nombre: 'Restringir a usuarios autorizados.', desc: 'El sistema debe exigir permiso usuarios.view para consultar el catálogo de módulos y roles.' },
      { nombre: 'Mostrar matriz en interfaz.', desc: 'El sistema debe presentar la matriz de permisos por módulo y acción en GestionRoles.jsx al crear o editar un rol.' },
      { nombre: 'Diferenciar roles de sistema.', desc: 'El sistema debe identificar roles predefinidos (admin, contratacion, director, abogado) como plantillas no eliminables en la interfaz.' },
      { nombre: 'Consultar detalle de rol.', desc: 'El sistema debe devolver la matriz de permisos completa de un rol específico (GET /rbac/roles/:id_rol).' },
    ],
  },
  {
    code: 'RF-014',
    tipo: 'Funcional.',
    titulo: 'Crear y editar roles personalizados.',
    descripcionGeneral:
      'El sistema debe permitir definir roles personalizados con nombre, descripción y matriz de permisos granular por módulo y acción, persistidos en las tablas roles y rol_permisos.',
    subs: [
      { nombre: 'Crear rol nuevo.', desc: 'El sistema debe insertar un rol con nombre único y conjunto de permisos seleccionados (POST /rbac/roles) exigiendo permiso usuarios.create.' },
      { nombre: 'Editar rol existente.', desc: 'El sistema debe actualizar nombre, descripción y permisos de un rol mediante PUT /rbac/roles/:id_rol con permiso usuarios.edit.' },
      { nombre: 'Validar nombre único.', desc: 'El sistema debe rechazar nombres de rol duplicados con respuesta HTTP 409 y mensaje descriptivo.' },
      { nombre: 'Listar roles disponibles.', desc: 'El sistema debe devolver todos los roles con conteo de usuarios asignados mediante GET /rbac/roles.' },
      { nombre: 'Reflejar cambios en sesiones.', desc: 'El sistema debe aplicar los nuevos permisos del rol en el siguiente inicio de sesión o recarga de permisos del usuario afectado.' },
    ],
  },
  {
    code: 'RF-015',
    tipo: 'Funcional.',
    titulo: 'Eliminar roles y proteger roles de sistema.',
    descripcionGeneral:
      'El sistema debe permitir eliminar roles personalizados que no tengan usuarios asignados, impidiendo la eliminación de roles de sistema críticos y de roles en uso.',
    subs: [
      { nombre: 'Eliminar rol personalizado.', desc: 'El sistema debe borrar el rol y sus permisos asociados cuando no hay usuarios vinculados (DELETE /rbac/roles/:id_rol).' },
      { nombre: 'Bloquear eliminación de sistema.', desc: 'El sistema debe rechazar la eliminación de roles predefinidos del sistema (admin, contratacion, director, abogado) con mensaje de protección.' },
      { nombre: 'Bloquear rol con usuarios.', desc: 'El sistema debe impedir eliminar un rol que tenga al menos un usuario asignado, indicando el número de cuentas afectadas.' },
      { nombre: 'Exigir permiso delete.', desc: 'El sistema debe requerir permiso usuarios.delete en el token del solicitante para autorizar la eliminación de roles.' },
      { nombre: 'Confirmar en interfaz.', desc: 'El sistema debe solicitar confirmación al administrador en GestionRoles.jsx antes de ejecutar la eliminación de un rol.' },
    ],
  },
  {
    code: 'RF-016',
    tipo: 'Funcional.',
    titulo: 'Resolver permisos efectivos del usuario en sesión.',
    descripcionGeneral:
      'El sistema debe calcular y exponer al cliente los permisos efectivos del usuario autenticado según su rol asignado, para controlar visibilidad de menús, botones y operaciones en interfaz.',
    subs: [
      { nombre: 'Endpoint de permisos propios.', desc: 'El sistema debe devolver la matriz de permisos del usuario en sesión mediante GET /rbac/me/permissions tras validar el JWT.' },
      { nombre: 'Cachear en PermissionsContext.', desc: 'El sistema debe almacenar los permisos en contexto React y localStorage para consultas síncronas mediante can(modulo, accion) en toda la app.' },
      { nombre: 'Combinar con legacyRolAccess.', desc: 'El sistema debe aplicar createLegacyCan como capa de compatibilidad para roles heredados mientras coexisten con RBAC granular.' },
      { nombre: 'Recargar tras cambio de rol.', desc: 'El sistema debe invalidar y volver a cargar permisos cuando el administrador modifica el rol del usuario y este reinicia sesión.' },
      { nombre: 'Incluir permisos en JWT.', desc: 'El sistema debe adjuntar resumen de permisos o rol al payload del token para validaciones rápidas en middleware de servidor.' },
    ],
  },
  {
    code: 'RF-017',
    tipo: 'Funcional.',
    titulo: 'Autorizar operaciones API y visibilidad de menú.',
    descripcionGeneral:
      'El sistema debe aplicar control de acceso en cada ruta API mediante middleware JWT global, autorizarRol, autorizarPermiso y reglas rbacPathRules, y reflejar las restricciones en el menú lateral del dashboard.',
    subs: [
      { nombre: 'Middleware JWT global.', desc: 'El sistema debe verificar el token Bearer en todas las rutas no públicas definidas en apiPublicPaths antes de ejecutar el handler.' },
      { nombre: 'Autorizar por rol fijo.', desc: 'El sistema debe aplicar autorizarRol con lista de roles permitidos en rutas sensibles como usuarios (admin) o contratos (contratacion).' },
      { nombre: 'Autorizar por permiso RBAC.', desc: 'El sistema debe aplicar autorizarPermiso(modulo, accion) en rutas de roles, correo y configuración según la matriz del usuario.' },
      { nombre: 'Filtrar menú por can().', desc: 'El sistema debe mostrar únicamente Contratación, Usuarios, Roles, Auditoría, Correo y Configuración cuando el usuario tiene el permiso view correspondiente.' },
      { nombre: 'Indicar modo solo lectura.', desc: 'El sistema debe mostrar aviso de modo consulta cuando el usuario tiene view sin create, edit ni delete en el módulo activo (PuedeEscribirContext).' },
    ],
  },
  {
    code: 'RF-018',
    tipo: 'Funcional.',
    titulo: 'Administrar catálogo de tipos de contrato.',
    descripcionGeneral:
      'El sistema debe mantener el catálogo maestro de tipos de contrato en catalogo_tipo_contrato con operaciones de listado, alta, edición de nombre y activación/desactivación, impidiendo nombres duplicados.',
    subs: [
      { nombre: 'Listar tipos activos.', desc: 'El sistema debe devolver tipos de contrato activos con conteo de contratos asociados (GET /catalogo/tipos-contrato).' },
      { nombre: 'Listar incluyendo inactivos.', desc: 'El sistema debe permitir consultar todos los tipos con parámetro todos=1 para administración del catálogo.' },
      { nombre: 'Crear tipo nuevo.', desc: 'El sistema debe insertar un tipo con nombre único y estado activo por defecto (POST /catalogo/tipos-contrato).' },
      { nombre: 'Actualizar nombre y estado.', desc: 'El sistema debe modificar nombre y bandera activo de un tipo existente validando duplicados (PUT /catalogo/tipos-contrato/:id).' },
      { nombre: 'Seleccionar en formulario.', desc: 'El sistema debe poblar el selector de tipo de contrato en el formulario de alta y edición de GestionContratos.jsx desde este catálogo.' },
    ],
  },
  {
    code: 'RF-019',
    tipo: 'Funcional.',
    titulo: 'Registrar contratos con datos obligatorios.',
    descripcionGeneral:
      'El sistema debe permitir al perfil contratación registrar nuevos contratos en contratos_generales con número único, empresa, fechas, tipo, prioridad, vigencia, contactos de notificación y al menos un documento PDF.',
    subs: [
      { nombre: 'Validar número único.', desc: 'El sistema debe comprobar que numero_contrato no existe previamente y rechazar duplicados con HTTP 409 (POST /create-contrato).' },
      { nombre: 'Exigir PDF obligatorio.', desc: 'El sistema debe rechazar el alta en cliente si no se adjunta al menos un archivo PDF válido del contrato principal.' },
      { nombre: 'Registrar estado pendiente.', desc: 'El sistema debe insertar el contrato con aprobacion_estado pendiente, aprobacion_accion alta y revision_juridica_estado pendiente hasta su resolución.' },
      { nombre: 'Validar contactos por nivel.', desc: 'El sistema debe validar la estructura de contactos_notificacion y contactos_niveles según reglas de proveedor/cliente antes de persistir.' },
      { nombre: 'Disparar notificación jurídica.', desc: 'El sistema debe notificar al flujo de revisión jurídica tras registrar una solicitud de alta de contrato.' },
    ],
  },
  {
    code: 'RF-020',
    tipo: 'Funcional.',
    titulo: 'Actualizar contratos existentes.',
    descripcionGeneral:
      'El sistema debe permitir modificar contratos vigentes generando solicitudes de edición pendientes de aprobación, respetando estados de cancelación, vencimiento y revisiones jurídicas en curso.',
    subs: [
      { nombre: 'Solicitar edición pendiente.', desc: 'El sistema debe almacenar la propuesta de cambios en aprobacion_propuesta y marcar aprobacion_accion edicion sin modificar el contrato activo (PUT /update-contrato).' },
      { nombre: 'Bloquear edición de cancelados.', desc: 'El sistema debe rechazar ediciones directas de contratos cancelados indicando que debe usarse la operación de renovación.' },
      { nombre: 'Bloquear edición de vencidos.', desc: 'El sistema debe rechazar ediciones de contratos cuya fecha_fin es anterior a la fecha actual sin renovación previa.' },
      { nombre: 'Permitir renovación directa.', desc: 'El sistema debe aplicar cambios de fechas de renovación inmediatamente cuando operacion es renovacion sin edición adicional.' },
      { nombre: 'Auditar solicitud de edición.', desc: 'El sistema debe registrar la acción contrato_edicion_solicitada en el log de auditoría de contratos.' },
    ],
  },
  {
    code: 'RF-021',
    tipo: 'Funcional.',
    titulo: 'Consultar listado integral de contratos.',
    descripcionGeneral:
      'El sistema debe devolver el censo completo de contratos activos con metadatos de tipo, estado de aprobación, cancelación, revisión jurídica, prioridad y fechas para el módulo GestionContratos.',
    subs: [
      { nombre: 'Endpoint de listado.', desc: 'El sistema debe exponer GET /contratos con JWT y roles de lectura ROLES_CONTRATOS_LECTURA para obtener todos los contratos activos.' },
      { nombre: 'Incluir joins de catálogo.', desc: 'El sistema debe enriquecer cada registro con nombre de tipo de contrato, estado de aprobación y banderas de cancelación y archivo.' },
      { nombre: 'Cargar en cliente al iniciar.', desc: 'El sistema debe cargar el listado completo al montar GestionContratos.jsx y mantenerlo en estado React para todas las secciones.' },
      { nombre: 'Actualizar tras operaciones.', desc: 'El sistema debe refrescar el listado tras altas, ediciones, aprobaciones o cancelaciones exitosas.' },
      { nombre: 'Exponer a roles de lectura.', desc: 'El sistema debe permitir consulta a roles contratacion, director y abogado según ROLES_CONTRATOS_LECTURA definido en servidor.' },
    ],
  },
  {
    code: 'RF-022',
    tipo: 'Funcional.',
    titulo: 'Filtrar y localizar contratos en interfaz.',
    descripcionGeneral:
      'El sistema debe ofrecer filtros por estado temporal, fechas, tipo, empresa y texto libre en la tabla de contratos, con columnas visibles configurables según preferencias del usuario.',
    subs: [
      { nombre: 'Filtrar por estado temporal.', desc: 'El sistema debe permitir filtrar contratos activos, por vencer, vencidos, cancelados y pendientes de aprobación en la vista de listado.' },
      { nombre: 'Filtrar por rango de fechas.', desc: 'El sistema debe ofrecer filtros de fecha_inicio y fecha_fin para acotar el conjunto visible de contratos.' },
      { nombre: 'Buscar por texto libre.', desc: 'El sistema debe localizar contratos por número, empresa o contraparte mediante campo de búsqueda en tiempo real.' },
      { nombre: 'Configurar columnas visibles.', desc: 'El sistema debe permitir mostrar u ocultar columnas de la tabla según preferencias de usuario almacenadas en app preferences.' },
      { nombre: 'Aplicar filtros en exportación.', desc: 'El sistema debe respetar los filtros activos al generar reportes exportados desde la sección de reportes.' },
    ],
  },
  {
    code: 'RF-023',
    tipo: 'Funcional.',
    titulo: 'Gestionar contactos y niveles de notificación.',
    descripcionGeneral:
      'El sistema debe almacenar correo principal, contactos adicionales y niveles de notificación por contrato para dirigir recordatorios automáticos y manuales según la configuración de cada expediente.',
    subs: [
      { nombre: 'Definir correo principal.', desc: 'El sistema debe exigir y persistir correo_notificacion como destinatario principal de avisos del contrato.' },
      { nombre: 'Registrar contactos adicionales.', desc: 'El sistema debe almacenar lista de contactos en contactos_notificacion como JSON validado en servidor.' },
      { nombre: 'Configurar niveles por prioridad.', desc: 'El sistema debe guardar contactos_niveles con estructura por nivel de alerta según validarContactosNivelesParaGuardar.' },
      { nombre: 'Validar según proveedor/cliente.', desc: 'El sistema debe aplicar reglas diferenciadas de contactos cuando el contrato es de tipo proveedor o cliente.' },
      { nombre: 'Usar en envío de recordatorios.', desc: 'El sistema debe resolver los destinatarios efectivos desde estos campos al ejecutar recordatorios manuales y automáticos.' },
    ],
  },
  {
    code: 'RF-024',
    tipo: 'Funcional.',
    titulo: 'Cancelar contratos con motivo documentado.',
    descripcionGeneral:
      'El sistema debe permitir solicitar la cancelación de un contrato vigente con motivo obligatorio, generando una solicitud pendiente de aprobación o cancelación directa con archivo según la opción seleccionada.',
    subs: [
      { nombre: 'Solicitar cancelación.', desc: 'El sistema debe registrar solicitud con aprobacion_accion cancelacion y motivo obligatorio (POST /contratos/:numero/cancelar).' },
      { nombre: 'Cancelar con archivo.', desc: 'El sistema debe ofrecer opción de cancelación que incluye paso simultáneo a archivo histórico tras aprobación.' },
      { nombre: 'Bloquear contratos vencidos.', desc: 'El sistema debe impedir cancelar contratos ya vencidos según validación de fecha_fin en servidor.' },
      { nombre: 'Registrar solicitante.', desc: 'El sistema debe almacenar aprobacion_solicitado_por y timestamp de la solicitud de cancelación.' },
      { nombre: 'Auditar cancelación.', desc: 'El sistema debe registrar la acción en contratosAuditoria con detalle del motivo y actor.' },
    ],
  },
  {
    code: 'RF-025',
    tipo: 'Funcional.',
    titulo: 'Solicitar paso a archivo histórico.',
    descripcionGeneral:
      'El sistema debe permitir iniciar el trámite de archivo histórico de un contrato con solicitud pendiente de aprobación, copia de metadatos y documentos al almacén de archivo y trazabilidad en auditoría.',
    subs: [
      { nombre: 'Iniciar solicitud de archivo.', desc: 'El sistema debe crear solicitud con aprobacion_accion archivo pendiente de resolución (POST /contratos/:numero/solicitar-archivo).' },
      { nombre: 'Aprobar paso a archivo.', desc: 'El sistema debe mover el contrato a contratos_archivo y marcar el registro activo como archivado tras aprobación del director.' },
      { nombre: 'Conservar documentos.', desc: 'El sistema debe preservar los PDFs asociados en el directorio contratos-archivo del servidor al archivar.' },
      { nombre: 'Consultar archivo histórico.', desc: 'El sistema debe listar contratos archivados con filtros mediante GET /contratos-archivo.' },
      { nombre: 'Detalle de registro archivado.', desc: 'El sistema debe devolver metadatos completos de un expediente archivado (GET /contratos-archivo/:id_archivo).' },
    ],
  },
  {
    code: 'RF-026',
    tipo: 'Funcional.',
    titulo: 'Presentar cola de contratos pendientes de aprobación.',
    descripcionGeneral:
      'El sistema debe mostrar en la sección Aprobar contrato la cola de solicitudes con aprobacion_estado pendiente de acciones alta, edición, cancelación o archivo, con badges de conteo en el menú lateral.',
    subs: [
      { nombre: 'Filtrar pendientes de aprobación.', desc: 'El sistema debe listar contratos con aprobacion_estado pendiente en la sección pendientes de GestionContratos.jsx.' },
      { nombre: 'Mostrar acción solicitada.', desc: 'El sistema debe indicar si la solicitud pendiente es alta, edición, cancelación o archivo mediante aprobacion_accion.' },
      { nombre: 'Badge en menú lateral.', desc: 'El sistema debe mostrar contador de pendientes en ContratosNavCountsContext sobre el ítem Aprobar contrato del sidebar.' },
      { nombre: 'Restringir a perfil director.', desc: 'El sistema debe limitar la sección de aprobación a usuarios con permiso contratos.approve o rol director.' },
      { nombre: 'Visualizar propuesta de cambios.', desc: 'El sistema debe mostrar el diff o propuesta almacenada en aprobacion_propuesta para solicitudes de edición.' },
    ],
  },
  {
    code: 'RF-027',
    tipo: 'Funcional.',
    titulo: 'Aprobar solicitudes de contrato.',
    descripcionGeneral:
      'El sistema debe permitir al perfil autorizado resolver solicitudes pendientes aplicando los cambios propuestos, activando contratos nuevos o ejecutando cancelaciones y archivos aprobados.',
    subs: [
      { nombre: 'Aprobar solicitud.', desc: 'El sistema debe aplicar cambios pendientes y marcar aprobacion_estado aprobado registrando aprobador y fecha (POST /contratos/:numero/aprobar).' },
      { nombre: 'Activar contrato tras alta.', desc: 'El sistema debe dejar operativo un contrato cuya solicitud de alta fue aprobada, actualizando revision_juridica_estado según corresponda.' },
      { nombre: 'Aplicar edición aprobada.', desc: 'El sistema debe fusionar aprobacion_propuesta en el registro activo del contrato al aprobar una edición pendiente.' },
      { nombre: 'Exigir permiso approve.', desc: 'El sistema debe verificar permiso contratos.approve o rol director antes de procesar la aprobación.' },
      { nombre: 'Auditar resolución.', desc: 'El sistema debe registrar aprobacion_resuelto_por, aprobacion_resuelto_en y nota de resolución en auditoría de contratos.' },
    ],
  },
  {
    code: 'RF-028',
    tipo: 'Funcional.',
    titulo: 'Rechazar solicitudes de contrato.',
    descripcionGeneral:
      'El sistema debe permitir rechazar solicitudes pendientes con nota de resolución obligatoria, mantener trazabilidad del rechazo y presentar los contratos rechazados en sección dedicada.',
    subs: [
      { nombre: 'Rechazar con nota.', desc: 'El sistema debe marcar aprobacion_estado rechazado almacenando aprobacion_resolucion_nota (POST /contratos/:numero/rechazar).' },
      { nombre: 'Sección de rechazados.', desc: 'El sistema debe listar contratos rechazados en la sección rechazados de GestionContratos.jsx con motivo visible.' },
      { nombre: 'Notificar al solicitante.', desc: 'El sistema debe disparar notificación al contratador que originó la solicitud rechazada.' },
      { nombre: 'Permitir reintento.', desc: 'El sistema debe permitir al contratador corregir y reenviar la solicitud tras un rechazo según reglas de negocio.' },
      { nombre: 'Auditar rechazo.', desc: 'El sistema debe registrar el rechazo con actor, timestamp y nota en el log de auditoría de contratos.' },
    ],
  },
  {
    code: 'RF-029',
    tipo: 'Funcional.',
    titulo: 'Verificar contratos en revisión jurídica.',
    descripcionGeneral:
      'El sistema debe permitir al perfil abogado revisar contratos en revision_juridica_estado pendiente, aprobar la verificación o devolver con observaciones desde la sección Verificar contrato.',
    subs: [
      { nombre: 'Listar en verificación.', desc: 'El sistema debe mostrar contratos con revisión jurídica pendiente en la sección verificar de GestionContratos.jsx.' },
      { nombre: 'Aprobar verificación.', desc: 'El sistema debe marcar revision_juridica_estado como aprobado permitiendo el paso a aprobación directiva (POST verificar-aprobar).' },
      { nombre: 'Devolver con observaciones.', desc: 'El sistema debe marcar revisión como observado o rechazado con nota para el contratador (POST verificar-rechazar).' },
      { nombre: 'Exigir permiso verify.', desc: 'El sistema debe requerir permiso contratos.verify o rol abogado para operar en el flujo jurídico.' },
      { nombre: 'Badge de pendientes jurídicos.', desc: 'El sistema debe mostrar contador de contratos pendientes de verificación en el menú lateral de Contratación.' },
    ],
  },
  {
    code: 'RF-030',
    tipo: 'Funcional.',
    titulo: 'Gestionar comentarios jurídicos.',
    descripcionGeneral:
      'El sistema debe permitir al perfil jurídico registrar, consultar y marcar como realizados comentarios asociados a un contrato durante el proceso de verificación o devolución.',
    subs: [
      { nombre: 'Listar comentarios.', desc: 'El sistema debe devolver los comentarios jurídicos de un contrato ordenados cronológicamente (GET /juridico-comentarios).' },
      { nombre: 'Crear comentario.', desc: 'El sistema debe permitir al abogado añadir comentario con texto y autor asociado al número de contrato (POST /juridico-comentarios).' },
      { nombre: 'Marcar como realizado.', desc: 'El sistema debe permitir al contratador marcar un comentario jurídico como atendido tras aplicar la corrección solicitada.' },
      { nombre: 'Mostrar en interfaz.', desc: 'El sistema debe presentar el hilo de comentarios en el panel de verificación y edición del contrato en GestionContratos.jsx.' },
      { nombre: 'Auditar comentarios.', desc: 'El sistema debe registrar la creación y resolución de comentarios jurídicos en el log de auditoría de contratos.' },
    ],
  },
  {
    code: 'RF-031',
    tipo: 'Funcional.',
    titulo: 'Gestionar adjuntos en devolución jurídica.',
    descripcionGeneral:
      'El sistema debe permitir adjuntar, listar y descargar documentos de soporte durante la devolución jurídica de un contrato, y al contratador retirar solicitudes devueltas.',
    subs: [
      { nombre: 'Subir adjunto jurídico.', desc: 'El sistema debe almacenar archivos adjuntos vinculados al contrato en el flujo de verificación (POST /juridico-adjuntos).' },
      { nombre: 'Listar adjuntos.', desc: 'El sistema debe devolver la lista de adjuntos jurídicos con metadatos de nombre, tamaño y fecha (GET /juridico-adjuntos).' },
      { nombre: 'Descargar adjunto.', desc: 'El sistema debe permitir la descarga del archivo adjunto almacenado en servidor para el perfil autorizado.' },
      { nombre: 'Retirar solicitud devuelta.', desc: 'El sistema debe permitir al contratador cancelar el trámite o eliminar el contrato devuelto por jurídico (POST /retirar-solicitud).' },
      { nombre: 'Consultar rechazados jurídicos.', desc: 'El sistema debe incluir contratos devueltos por jurídico en la sección rechazados con indicador de motivo.' },
    ],
  },
  {
    code: 'RF-032',
    tipo: 'Funcional.',
    titulo: 'Calcular estado temporal y mostrar KPIs ejecutivos.',
    descripcionGeneral:
      'El sistema debe determinar en cliente el estado temporal de cada contrato (activo, por vencer, vencido, cancelado, pendiente) y presentar indicadores agregados en la sección Resumen ejecutivo.',
    subs: [
      { nombre: 'Calcular estado por fechas.', desc: 'El sistema debe clasificar contratos según fecha_fin, margen de alerta configurado y bandera cancelado en GestionContratos.jsx.' },
      { nombre: 'Mostrar KPIs agregados.', desc: 'El sistema debe presentar totales de activos, por vencer, vencidos, pendientes y cancelados en tarjetas del resumen ejecutivo.' },
      { nombre: 'Considerar aprobación pendiente.', desc: 'El sistema debe excluir o marcar aparte contratos con aprobacion_estado pendiente en los indicadores de cartera activa.' },
      { nombre: 'Actualizar en tiempo real.', desc: 'El sistema debe recalcular KPIs al modificar filtros o tras operaciones CRUD sin recargar la página.' },
      { nombre: 'Sección resumen en navegación.', desc: 'El sistema debe ofrecer la sección resumen como primera pestaña del módulo Contratación en contratosNavSections.js.' },
    ],
  },
  {
    code: 'RF-033',
    tipo: 'Funcional.',
    titulo: 'Priorizar colas de vencimiento y renovación.',
    descripcionGeneral:
      'El sistema debe ordenar y presentar contratos por urgencia temporal y prioridad (alta, media, baja) en las vistas de vencimientos y renovaciones para facilitar la gestión proactiva.',
    subs: [
      { nombre: 'Cola de vencimientos.', desc: 'El sistema debe listar contratos próximos a vencer ordenados por días restantes y prioridad en la vista vencimientos.' },
      { nombre: 'Cola de renovaciones.', desc: 'El sistema debe presentar contratos vencidos o en renovación en la sección renovaciones con acciones de renovar o editar.' },
      { nombre: 'Ordenar por prioridad.', desc: 'El sistema debe aplicar orden secundario por campo prioridad (alta, media, baja) dentro de cada grupo temporal.' },
      { nombre: 'Acceso desde alertas.', desc: 'El sistema debe permitir navegar a vencimientos desde KPIs y alertas del resumen ejecutivo.' },
      { nombre: 'Renovación con edición.', desc: 'El sistema debe soportar renovacion_con_edicion enviando solicitud de edición pendiente al renovar un contrato vencido.' },
    ],
  },
  {
    code: 'RF-034',
    tipo: 'Funcional.',
    titulo: 'Configurar recordatorios automáticos por prioridad.',
    descripcionGeneral:
      'El sistema debe permitir al perfil contratación activar o desactivar recordatorios automáticos, definir hitos en días antes del vencimiento por prioridad y reglas opcionales por tipo de contrato.',
    subs: [
      { nombre: 'Consultar configuración.', desc: 'El sistema debe devolver la configuración actual de recordatorios (GET /config/recordatorios-contratos).' },
      { nombre: 'Guardar configuración.', desc: 'El sistema debe persistir hitos, activación y reglas por tipo en base de datos (PUT /config/recordatorios-contratos).' },
      { nombre: 'Restablecer predeterminados.', desc: 'El sistema debe ofrecer botón de restablecer valores por defecto (POST /config/recordatorios-contratos/restablecer).' },
      { nombre: 'Definir hitos por prioridad.', desc: 'El sistema debe permitir configurar días antes del vencimiento distintos para prioridad alta, media y baja.' },
      { nombre: 'Interfaz en sección correo.', desc: 'El sistema debe editar esta configuración desde la sección correo de GestionContratos.jsx o ConfigCorreoServicio.jsx.' },
    ],
  },
  {
    code: 'RF-035',
    tipo: 'Funcional.',
    titulo: 'Ejecutar envío automático programado de recordatorios.',
    descripcionGeneral:
      'El sistema debe revisar periódicamente en servidor los contratos activos según frecuencia, ventana horaria y días hábiles configurados, enviando un correo por hito exacto sin duplicar envíos del mismo día.',
    subs: [
      { nombre: 'Programador en servidor.', desc: 'El sistema debe ejecutar un intervalo interno que evalúa contratos candidatos a recordatorio según fecha_fin y configuración activa.' },
      { nombre: 'Respetar ventana horaria.', desc: 'El sistema debe enviar recordatorios automáticos solo dentro del rango horario y días hábiles definidos en configuración.' },
      { nombre: 'Un envío por hito exacto.', desc: 'El sistema debe enviar un correo cuando los días restantes coinciden exactamente con un hito configurado para la prioridad del contrato.' },
      { nombre: 'Evitar duplicados diarios.', desc: 'El sistema debe registrar cada envío en contratos_recordatorios_envios e impedir reenvío del mismo hito en el mismo día.' },
      { nombre: 'Seleccionar plantilla por estado.', desc: 'El sistema debe usar plantilla por_vencer, vencido o cancelado según el estado temporal calculado del contrato.' },
    ],
  },
  {
    code: 'RF-036',
    tipo: 'Funcional.',
    titulo: 'Enviar recordatorio manual y consultar historial.',
    descripcionGeneral:
      'El sistema debe permitir al perfil contratación disparar un recordatorio inmediato a los contactos del contrato y consultar el historial de envíos automáticos y manuales.',
    subs: [
      { nombre: 'Envío manual.', desc: 'El sistema debe enviar correo de recordatorio inmediato al seleccionar un contrato (POST /send-contrato-reminder).' },
      { nombre: 'Control de duplicados.', desc: 'El sistema debe impedir más de un recordatorio manual por contrato y día según reglas del servidor.' },
      { nombre: 'Registrar envío.', desc: 'El sistema debe insertar registro en contratos_recordatorios_envios con destino, tipo, días antes y resultado.' },
      { nombre: 'Consultar historial.', desc: 'El sistema debe listar los últimos envíos de recordatorios por contrato en la interfaz de gestión de correo.' },
      { nombre: 'Indicar fallo de envío.', desc: 'El sistema debe mostrar error al usuario si SMTP no está disponible y encolar el mensaje para reintento.' },
    ],
  },
  {
    code: 'RF-037',
    tipo: 'Funcional.',
    titulo: 'Adjuntar y validar PDF obligatorio al alta.',
    descripcionGeneral:
      'El sistema debe exigir al menos un documento PDF válido al registrar un contrato, validar tamaño máximo en cliente y servidor, y sincronizar el archivo con el almacenamiento del backend.',
    subs: [
      { nombre: 'Validar en formulario.', desc: 'El sistema debe bloquear el envío del formulario de alta si no se selecciona al menos un archivo PDF del contrato principal.' },
      { nombre: 'Limitar tamaño de archivo.', desc: 'El sistema debe rechazar PDFs que superen el tamaño máximo configurado mostrando mensaje de error al usuario.' },
      { nombre: 'Almacenar en servidor.', desc: 'El sistema debe guardar el PDF en el directorio contratos-activos del servidor vinculado al número de contrato.' },
      { nombre: 'Migrar desde localStorage.', desc: 'El sistema debe sincronizar PDFs previamente guardados en localStorage del navegador hacia el backend al cargar el módulo.' },
      { nombre: 'Previsualizar antes de guardar.', desc: 'El sistema debe ofrecer vista previa embebida del PDF seleccionado en el formulario de alta y edición.' },
    ],
  },
  {
    code: 'RF-038',
    tipo: 'Funcional.',
    titulo: 'Gestionar documentos por contrato en servidor.',
    descripcionGeneral:
      'El sistema debe permitir registrar, listar, previsualizar, descargar y eliminar documentos asociados a un contrato en la tabla contratos_documentos con tipos contrato, suplemento y anexo.',
    subs: [
      { nombre: 'Registrar documento.', desc: 'El sistema debe insertar metadatos y archivo en contratos_documentos (POST /contratos/:numero/documentos).' },
      { nombre: 'Listar documentos.', desc: 'El sistema debe devolver todos los documentos de un contrato con tipo y nombre de archivo (GET /contratos/:numero/documentos).' },
      { nombre: 'Descargar documento.', desc: 'El sistema debe servir el archivo almacenado para descarga o vista previa embebida al usuario autorizado.' },
      { nombre: 'Eliminar documento.', desc: 'El sistema debe permitir borrar un documento del expediente con permiso de edición (DELETE /contratos/:numero/documentos/:id).' },
      { nombre: 'Clasificar por tipo.', desc: 'El sistema debe distinguir documentos de tipo contrato, suplemento y anexo en la interfaz de gestión documental.' },
    ],
  },
  {
    code: 'RF-039',
    tipo: 'Funcional.',
    titulo: 'Consultar archivo histórico y exportar expediente ZIP.',
    descripcionGeneral:
      'El sistema debe listar contratos archivados con filtros, consultar detalle de expedientes históricos y generar paquetes ZIP con PDFs, índice Excel y resumen JSON de contratos seleccionados.',
    subs: [
      { nombre: 'Listar archivo histórico.', desc: 'El sistema debe devolver contratos archivados con metadatos de fecha de archivo y motivo (GET /contratos-archivo).' },
      { nombre: 'Filtrar archivo.', desc: 'El sistema debe ofrecer filtros por fechas, empresa y texto en la sección archivo de GestionContratos.jsx.' },
      { nombre: 'Exportar expediente ZIP.', desc: 'El sistema debe generar paquete ZIP con PDFs y metadatos (POST /contratos/exportar-expediente).' },
      { nombre: 'Incluir índice Excel.', desc: 'El sistema debe añadir al ZIP un libro Excel con índice de documentos y datos del contrato.' },
      { nombre: 'Limitar cantidad y tamaño.', desc: 'El sistema debe aplicar límites de cantidad de contratos y tamaño total del ZIP en servidor para evitar sobrecarga.' },
    ],
  },
  {
    code: 'RF-040',
    tipo: 'Funcional.',
    titulo: 'Configurar servidor SMTP del sistema.',
    descripcionGeneral:
      'El sistema debe permitir configurar el transporte de correo mediante variables de entorno o parámetros en base de datos (host, puerto, TLS, usuario, remitente) con prueba de envío y restablecimiento a valores predeterminados.',
    subs: [
      { nombre: 'Consultar configuración SMTP.', desc: 'El sistema debe devolver la configuración actual enmascarando credenciales sensibles (GET /config/correo).' },
      { nombre: 'Guardar configuración.', desc: 'El sistema debe persistir host, puerto, secure, usuario y remitente en base de datos (PUT /config/correo).' },
      { nombre: 'Probar envío SMTP.', desc: 'El sistema debe enviar correo de prueba al destinatario indicado (POST /config/correo/probar).' },
      { nombre: 'Restablecer predeterminados.', desc: 'El sistema debe ofrecer botón para volver a la configuración SMTP por defecto con confirmación del usuario.' },
      { nombre: 'Consultar estado del servicio.', desc: 'El sistema debe exponer GET /config/correo/estado indicando si el transporte SMTP responde correctamente.' },
    ],
  },
  {
    code: 'RF-041',
    tipo: 'Funcional.',
    titulo: 'Personalizar plantillas de correo de contratos.',
    descripcionGeneral:
      'El sistema debe permitir editar asunto y cuerpo de las plantillas de correo para estados por_vencer, vencido y cancelado, con placeholders dinámicos sustituidos por datos del contrato al enviar.',
    subs: [
      { nombre: 'Listar plantillas.', desc: 'El sistema debe devolver las plantillas configuradas por tipo de alerta (GET /config/contratos-correo-plantillas).' },
      { nombre: 'Guardar plantillas.', desc: 'El sistema debe persistir asunto y cuerpo HTML o texto de cada plantilla (PUT /config/contratos-correo-plantillas).' },
      { nombre: 'Probar plantilla.', desc: 'El sistema debe enviar correo de prueba con datos de ejemplo sin guardar cambios previos (POST .../plantillas/probar).' },
      { nombre: 'Restablecer plantillas.', desc: 'El sistema debe restaurar textos predeterminados de plantillas (POST .../plantillas/restablecer).' },
      { nombre: 'Sustituir placeholders.', desc: 'El sistema debe reemplazar variables como número de contrato, empresa y fecha_fin al generar el cuerpo del correo.' },
    ],
  },
  {
    code: 'RF-042',
    tipo: 'Funcional.',
    titulo: 'Encolar correos ante fallo SMTP y reintentar envío.',
    descripcionGeneral:
      'El sistema debe almacenar mensajes no entregados en mail_outbox cuando el transporte SMTP no está disponible y reintentar el envío periódicamente hasta éxito o agotamiento de reintentos.',
    subs: [
      { nombre: 'Insertar en cola.', desc: 'El sistema debe guardar destinatario, asunto, cuerpo y metadatos en mail_outbox cuando falla el envío inmediato.' },
      { nombre: 'Reintentar periódicamente.', desc: 'El sistema debe procesar la cola en intervalos configurados intentando reenviar mensajes pendientes.' },
      { nombre: 'Marcar como enviado.', desc: 'El sistema debe actualizar el estado del registro en cola tras un envío exitoso eliminándolo o archivándolo.' },
      { nombre: 'Registrar fallos.', desc: 'El sistema debe almacenar el último error SMTP en el registro de cola para diagnóstico.' },
      { nombre: 'Exponer conteo pendiente.', desc: 'El sistema debe incluir el número de correos pendientes en el estado del servicio de correo para los banners de aviso.' },
    ],
  },
  {
    code: 'RF-043',
    tipo: 'Funcional.',
    titulo: 'Informar indisponibilidad del servicio de correo.',
    descripcionGeneral:
      'El sistema debe mostrar banners de advertencia en la pantalla de login y en el dashboard cuando el servicio SMTP no responde o existen correos pendientes en cola de envío.',
    subs: [
      { nombre: 'Banner en login.', desc: 'El sistema debe mostrar MailServiceUnavailableBanner en Login.jsx cuando GET /auth/mail-estado indica servicio degradado.' },
      { nombre: 'Banner en dashboard.', desc: 'El sistema debe mostrar aviso persistente en la barra superior del dashboard mientras el correo no esté operativo.' },
      { nombre: 'Mensaje de cola pendiente.', desc: 'El sistema debe indicar cuántos correos están en cola mediante mailQueueBannerMessage cuando hay pendientes.' },
      { nombre: 'Hook de estado.', desc: 'El sistema debe consultar periódicamente el estado del correo mediante useMailServiceStatus en cliente.' },
      { nombre: 'No bloquear otras funciones.', desc: 'El sistema debe permitir operar el resto de módulos aunque el correo esté degradado, informando solo de la limitación.' },
    ],
  },
  {
    code: 'RF-044',
    tipo: 'Funcional.',
    titulo: 'Exportar reportes de contratos a Excel, CSV y PDF.',
    descripcionGeneral:
      'El sistema debe generar reportes tabulares de la vista de contratos activos en formatos Excel, CSV y PDF con cabecera corporativa AEPG, columnas del listado filtrado y codificación UTF-8 para español.',
    subs: [
      { nombre: 'Exportar a Excel.', desc: 'El sistema debe generar libro .xlsx con cabecera verde corporativa y columnas visibles usando ExcelJS en GestionContratos.jsx.' },
      { nombre: 'Exportar a CSV.', desc: 'El sistema debe generar CSV con separador punto y coma y BOM UTF-8 para compatibilidad con Excel en español.' },
      { nombre: 'Exportar a PDF.', desc: 'El sistema debe generar tabla PDF con jsPDF y autoTable respetando los datos filtrados del listado.' },
      { nombre: 'Respetar filtros activos.', desc: 'El sistema debe exportar únicamente los contratos que cumplen los filtros aplicados en la sección reportes.' },
      { nombre: 'Sección reportes.', desc: 'El sistema debe ofrecer los botones de exportación en la sección reportes del módulo Contratación.' },
    ],
  },
  {
    code: 'RF-045',
    tipo: 'Funcional.',
    titulo: 'Exportar archivo histórico a Excel, CSV y PDF.',
    descripcionGeneral:
      'El sistema debe ofrecer exportación de la vista de contratos archivados en formatos Excel, CSV y PDF con los mismos estándares de formato e identidad corporativa que los reportes de contratos activos.',
    subs: [
      { nombre: 'Exportar archivo a Excel.', desc: 'El sistema debe generar libro Excel de contratos archivados con columnas de metadatos de archivo y fechas.' },
      { nombre: 'Exportar archivo a CSV.', desc: 'El sistema debe generar CSV del archivo histórico con codificación UTF-8 y separador punto y coma.' },
      { nombre: 'Exportar archivo a PDF.', desc: 'El sistema debe generar PDF tabular de contratos archivados filtrados.' },
      { nombre: 'Aplicar filtros de archivo.', desc: 'El sistema debe incluir en la exportación solo los registros que cumplen los filtros de la sección archivo.' },
      { nombre: 'Mantener identidad AEPG.', desc: 'El sistema debe incluir logotipo o cabecera corporativa verde en los formatos que lo soporten.' },
    ],
  },
  {
    code: 'RF-046',
    tipo: 'Funcional.',
    titulo: 'Exportar auditoría del sistema a PDF.',
    descripcionGeneral:
      'El sistema debe permitir exportar las tablas de sesiones, intentos fallidos y eventos de auditoría del módulo Auditoria a PDF cuando el usuario tiene permiso export.',
    subs: [
      { nombre: 'Exportar sesiones a PDF.', desc: 'El sistema debe generar PDF con el listado de sesiones de acceso filtradas en Auditoria.jsx.' },
      { nombre: 'Exportar fallos a PDF.', desc: 'El sistema debe generar PDF con intentos fallidos de login registrados en el sistema.' },
      { nombre: 'Exportar eventos a PDF.', desc: 'El sistema debe generar PDF con eventos administrativos de GET /audit/events.' },
      { nombre: 'Exigir permiso export.', desc: 'El sistema debe mostrar el botón de exportación solo cuando el usuario tiene permiso auditoria.export o equivalente.' },
      { nombre: 'Aplicar filtros de fecha.', desc: 'El sistema debe respetar el rango de fechas seleccionado en la interfaz al generar el PDF.' },
    ],
  },
  {
    code: 'RF-047',
    tipo: 'Funcional.',
    titulo: 'Registrar y consultar sesiones de acceso.',
    descripcionGeneral:
      'El sistema debe almacenar cada inicio de sesión exitoso con email, rol, dirección IP y agente de usuario, y permitir su consulta filtrada desde el módulo de auditoría.',
    subs: [
      { nombre: 'Registrar sesión en login.', desc: 'El sistema debe insertar registro de sesión exitosa en la tabla de auditoría al completar POST /login.' },
      { nombre: 'Consultar sesiones.', desc: 'El sistema debe listar sesiones con paginación y filtros (GET /audit/sessions) para rol admin.' },
      { nombre: 'Mostrar en Auditoria.jsx.', desc: 'El sistema debe presentar la tabla de sesiones en la pestaña correspondiente del módulo Auditoría.' },
      { nombre: 'Incluir IP y user-agent.', desc: 'El sistema debe almacenar y mostrar dirección IP y cadena de agente de usuario de cada sesión.' },
      { nombre: 'Filtrar por rango de fechas.', desc: 'El sistema debe permitir acotar la consulta de sesiones por fecha de inicio y fin en la interfaz.' },
    ],
  },
  {
    code: 'RF-048',
    tipo: 'Funcional.',
    titulo: 'Registrar intentos fallidos y bloqueos.',
    descripcionGeneral:
      'El sistema debe auditar credenciales inválidas, intentos sobre cuentas inactivas y bloqueos temporales, ofreciendo listado detallado y resumen agregado para administración.',
    subs: [
      { nombre: 'Registrar intento fallido.', desc: 'El sistema debe insertar registro con motivo, email intentado, IP y timestamp en cada login fallido.' },
      { nombre: 'Listar intentos fallidos.', desc: 'El sistema debe exponer GET /audit/failed-logins con los registros detallados para administrador.' },
      { nombre: 'Resumen agregado.', desc: 'El sistema debe ofrecer GET /audit/failed-summary con totales por motivo y periodo.' },
      { nombre: 'Mostrar en interfaz.', desc: 'El sistema debe presentar intentos fallidos en pestaña dedicada de Auditoria.jsx.' },
      { nombre: 'Vincular con bloqueo.', desc: 'El sistema debe indicar en el registro cuando el intento fue rechazado por bloqueo temporal activo.' },
    ],
  },
  {
    code: 'RF-049',
    tipo: 'Funcional.',
    titulo: 'Consultar eventos de auditoría del sistema.',
    descripcionGeneral:
      'El sistema debe registrar y listar eventos administrativos significativos (cambios de configuración, operaciones RBAC, etc.) con actor, acción, entidad y marca temporal.',
    subs: [
      { nombre: 'Registrar evento.', desc: 'El sistema debe insertar eventos de auditoría con actor, acción, entidad afectada y payload de detalle cuando ocurren operaciones sensibles.' },
      { nombre: 'Listar eventos.', desc: 'El sistema debe devolver eventos paginados y filtrables (GET /audit/events) para rol admin.' },
      { nombre: 'Mostrar en Auditoria.jsx.', desc: 'El sistema debe presentar la tabla de eventos en la pestaña de eventos del módulo Auditoría.' },
      { nombre: 'Filtrar por acción.', desc: 'El sistema debe permitir filtrar eventos por tipo de acción o módulo en la interfaz.' },
      { nombre: 'Restringir a administrador.', desc: 'El sistema debe exigir rol admin o permiso auditoria.view para consultar eventos del sistema.' },
    ],
  },
  {
    code: 'RF-050',
    tipo: 'Funcional.',
    titulo: 'Auditar operaciones sobre contratos.',
    descripcionGeneral:
      'El sistema debe registrar en log dedicado las acciones críticas sobre contratos (alta, edición, cancelación, aprobación, verificación jurídica) y permitir su consulta filtrada.',
    subs: [
      { nombre: 'Registrar acción de contrato.', desc: 'El sistema debe invocar contratosAuditoria.logContrato en cada operación significativa sobre un expediente.' },
      { nombre: 'Consultar log de contratos.', desc: 'El sistema debe listar entradas de auditoría contractual (GET /contratos/auditoria) para roles de lectura de contratos.' },
      { nombre: 'Sección auditoría en Contratación.', desc: 'El sistema debe mostrar el log en la sección auditoria de GestionContratos.jsx con filtros por número y fechas.' },
      { nombre: 'Incluir actor y detalle.', desc: 'El sistema debe almacenar email del actor, acción, número de contrato y objeto details con contexto JSON.' },
      { nombre: 'Revocar tokens comprometidos.', desc: 'El sistema debe mantener blacklist JWT y rechazar tokens con JTI revocado como medida de seguridad auditada.' },
    ],
  },
  {
    code: 'RF-051',
    tipo: 'Funcional.',
    titulo: 'Configurar tema, tipografía y escala de interfaz.',
    descripcionGeneral:
      'El sistema debe permitir al usuario personalizar apariencia visual mediante temas predefinidos, fuentes, tamaños, bordes, colores, escala de interfaz y ancho del menú lateral con vista previa en vivo.',
    subs: [
      { nombre: 'Seleccionar tema predefinido.', desc: 'El sistema debe ofrecer paletas de tema claro, oscuro y personalizado en AppConfiguracion con aplicación inmediata.' },
      { nombre: 'Configurar tipografía.', desc: 'El sistema debe permitir elegir familia tipográfica, tamaño base e interlineado aplicados mediante variables CSS.' },
      { nombre: 'Ajustar escala de interfaz.', desc: 'El sistema debe permitir escalar globalmente el tamaño de la interfaz mediante preferencia uiScale.' },
      { nombre: 'Configurar menú lateral.', desc: 'El sistema debe permitir ancho del sidebar, modo compacto solo iconos y fijar submenús abiertos.' },
      { nombre: 'Vista previa en vivo.', desc: 'El sistema debe aplicar cambios de apariencia en tiempo real antes de guardar en AppConfiguracion.jsx.' },
    ],
  },
  {
    code: 'RF-052',
    tipo: 'Funcional.',
    titulo: 'Configurar accesibilidad y formatos fecha/hora.',
    descripcionGeneral:
      'El sistema debe ofrecer opciones de accesibilidad (alto contraste, reducción de animaciones, targets táctiles) y formatos de fecha y hora aplicados globalmente en la interfaz.',
    subs: [
      { nombre: 'Alto contraste.', desc: 'El sistema debe activar modo de alto contraste mediante clase CSS en document.documentElement según preferencia del usuario.' },
      { nombre: 'Reducir animaciones.', desc: 'El sistema debe respetar prefers-reduced-motion y la preferencia reduceAnimations del usuario.' },
      { nombre: 'Formato de fecha.', desc: 'El sistema debe aplicar preferencia dmy o mdy en toda la interfaz mediante formatAppDate.' },
      { nombre: 'Formato de hora.', desc: 'El sistema debe aplicar formato 12h o 24h mediante formatAppTime en panel informativo y tablas.' },
      { nombre: 'Targets táctiles amplios.', desc: 'El sistema debe aumentar área clickable de botones y enlaces cuando largeUiTargets está activo.' },
    ],
  },
  {
    code: 'RF-053',
    tipo: 'Funcional.',
    titulo: 'Sincronizar y restablecer preferencias de usuario.',
    descripcionGeneral:
      'El sistema debe guardar las preferencias de apariencia y navegación en localStorage y servidor, mostrar estado de sincronización y permitir restablecer valores globales o por sección.',
    subs: [
      { nombre: 'Guardar en localStorage.', desc: 'El sistema debe persistir preferencias en localStorage inmediatamente al cambiar cualquier opción en AppPreferencesContext.' },
      { nombre: 'Sincronizar con servidor.', desc: 'El sistema debe enviar preferencias al servidor (PUT /user/preferences) y recuperarlas al iniciar sesión (GET /user/preferences).' },
      { nombre: 'Indicador de sincronización.', desc: 'El sistema debe mostrar estado guardado local, sincronizado o error de sincronización en la interfaz de configuración.' },
      { nombre: 'Restablecer globalmente.', desc: 'El sistema debe ofrecer botón de restablecer todas las preferencias con confirmación SweetAlert2.' },
      { nombre: 'Restablecer por sección.', desc: 'El sistema debe permitir restablecer independientemente tema, tipografía, escala, accesibilidad y navegación.' },
    ],
  },
  {
    code: 'RF-054',
    tipo: 'Funcional.',
    titulo: 'Gestionar navegación dashboard, secciones y experiencia móvil.',
    descripcionGeneral:
      'El sistema debe ofrecer shell tipo dashboard con menú lateral, pestañas de Contratación, panel informativo, navegación condicionada por permisos, recordatorio de sección visitada y adaptación a dispositivos móviles.',
    subs: [
      { nombre: 'Layout dashboard.', desc: 'El sistema debe mostrar sidebar, área principal y panel informativo con módulo activo, fecha, hora y logotipo AEPG.' },
      { nombre: 'Pestañas de Contratación.', desc: 'El sistema debe ofrecer navegación por secciones definidas en contratosNavSections.js filtradas por permisos can().' },
      { nombre: 'Recordar sección visitada.', desc: 'El sistema debe restaurar la última sección activa al recargar cuando rememberSection está habilitado (useDashboardNav).' },
      { nombre: 'Adaptación móvil.', desc: 'El sistema debe ofrecer menú offcanvas, pestañas con iconos y sesión compacta en topbar para pantallas pequeñas.' },
      { nombre: 'Pantalla inicial por rol.', desc: 'El sistema debe abrir Usuarios para admin o la primera sección de Contratación permitida para contratación, director y abogado tras el login.' },
    ],
  },
];
