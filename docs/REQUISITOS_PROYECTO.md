# Requisitos funcionales y no funcionales (estado actual del proyecto)

Este documento **no** es un documento de negocio firmado por stakeholders: resume **lo que el código implementa hoy**. Rutas concretas viven principalmente en [`server/index.js`](../server/index.js) y la navegación/visibilidad en [`client/src/App.js`](../client/src/App.js).

---

## Requisitos funcionales por área

### Autenticación y sesión

- **RF-AU-01**: Inicio de sesión con email y contraseña contra la tabla `usuarios` (`POST /login`).
- **RF-AU-02**: Respuesta con JWT y datos de usuario (email, nombre, rol normalizado en minúsculas).
- **RF-AU-03**: Rechazo de login si el usuario está **inactivo** (`activo = 0`).
- **RF-AU-04**: Token JWT con caducidad **8 horas** y payload `{ email, nombre, rol }`.
- **RF-AU-05**: Cliente guarda token y usuario en `localStorage` y envía `Authorization: Bearer` por Axios (`App.js`).
- **RF-AU-06**: Cierre de sesión elimina token y usuario del almacenamiento local.
- **RF-AU-07**: Recuperación de contraseña: solicitud de enlace (`POST /auth/forgot-password`), tabla `password_reset_tokens`, caducidad configurable (`PASSWORD_RESET_TTL_MINUTES`).
- **RF-AU-08**: Restablecimiento con token (`POST /auth/reset-password`).

### Gestión de usuarios (solo rol **admin** en backend)

- **RF-US-01**: Listado de usuarios con auditoría (`created_by`, `created_at`, `updated_by`, `updated_at`, `activo`) — `GET /usuarios`.
- **RF-US-02**: Alta de usuario con validación de email, rol permitido, contraseña fuerte y hash bcrypt — `POST /create-usuario`.
- **RF-US-03**: Edición de usuario (email cambiante por clave anterior en URL), contraseña opcional — `PUT /update-usuario/:email`.
- **RF-US-04**: Baja lógica no documentada como tal; existe **eliminación** `DELETE /delete-usuario/:email`.
- **RF-US-05** (UI): Formulario con confirmación de contraseña, estado Activo/Inactivo, validaciones en cliente (`GestionUsuarios.jsx`).
- **RF-US-06** (UI): Auditoría muestra **nombre** del usuario actor resolviendo email contra la lista cargada; correos “huérfanos” muestran mensaje genérico.
- **RF-US-07** (UI): Filas de usuarios **inactivos** con estilo visual distinto (gris claro).
- **RF-US-08** (UI): Interruptor ON/OFF en tabla para activar/desactivar sin abrir modal (bloqueo para auto-desactivación).

### Contratación / contratos

- **RF-CO-01**: CRUD de contratos sobre `contratos_generales` — creación protegida por JWT + rol `admin` o `contratacion` (`POST /create-contrato`).
- **RF-CO-02**: Lectura de todos los contratos `GET /contratos` **sin** middleware JWT en el servidor (cualquier cliente que conozca la URL puede leer; el frontend sí suele ir autenticado).
- **RF-CO-03**: Actualización y borrado `PUT /update-contrato`, `DELETE /delete-contrato/:numero_contrato` **sin** `verificarToken` en backend (diferencia respecto a creación).
- **RF-CO-04** (UI): Módulo unificado `GestionContratos.jsx` con secciones: Resumen, Contratos, Vencimientos, Renovaciones, Reportes (tabs internas + sincronización con menú lateral).
- **RF-CO-05** (UI): Reglas de negocio en cliente: estados (activo, por vencer, vencido…), KPIs, renovaciones, colas priorizadas, alertas.
- **RF-CO-06** (UI): Exportaciones de reportes **Excel** (ExcelJS, cabecera verde), **CSV** (UTF-8/BOM), **PDF** (jsPDF + autoTable).
- **RF-CO-07** (UI): Posible envío de recordatorio por correo — `POST /send-contrato-reminder` (integración correo).
- **RF-CO-08** (UI): Entrada **Vencimientos** oculta en menú lateral y pestaña, pero la vista sigue alcanzable vía “Ver todos” / navegación interna (`App.js`, `GestionContratos.jsx`).

### Recursos humanos (menú visible si rol `admin` o `rrhh`)

Patrón general: pantallas en `client/src/components/*.jsx` consumiendo APIs con JWT y `autorizarRol(['admin','rrhh'])` salvo donde se indique.

- **RF-RH-01**: Empleados — alta/edición/listado/historial laboral/borrado (`/create-empleado`, `/empleados`, etc.). **Nota**: varias rutas de empleados **no** llevan `verificarToken` en el servidor.
- **RF-RH-02**: Bajas y reactivación — `POST /empleado-baja`, `POST /empleado-reactivar`.
- **RF-RH-03**: Reporte de personal — `GET /reporte-personal`.
- **RF-RH-04**: Cambios de cargo — `POST /empleado-cambio-cargo`.
- **RF-RH-05**: Reporte consolidado por departamentos — `GET /reporte-consolidado-departamentos`.
- **RF-RH-06**: Vacaciones, turnos, grupos de trabajo + miembros — rutas `/vacaciones`, `/turnos-trabajo`, `/grupos-trabajo`, `/grupo-trabajo/.../miembros`.
- **RF-RH-07**: Asistencia grupal por grupo — `/asistencia-grupal`, CRUD asociado.
- **RF-RH-08**: Certificaciones, cursos, eval. capacitación, evaluaciones, objetivos, salarios — CRUD con prefijos `/certificaciones`, `/cursos`, `/evalcapacitacion`, `/evaluaciones`, `/objetivos`, `/salarios`.
- **RF-RH-09**: Seguridad industrial y seguridad (`/segseguridad`, `/seguridad`).
- **RF-RH-10**: Cargos y departamentos + asignación empleado–departamento (`/cargos`, `/departamentos`, `/asignar-empleado-departamento`).
- **RF-RH-11**: Sanciones, reconocimientos y jubilaciones (`/sanciones-empleado`, `/reconocimientos-empleado`, `/jubilaciones-empleado`).
- **RF-RH-12**: Certificados médicos y evaluaciones médicas — también permitidas a rol **`produccion`** en API (`/certificados-medicos`, `/evaluaciones-medicas`).
- **RF-RH-13** (posible incoherencia): El menú muestra **Asistencias** bajo RRHH (`App.js` `mostrarAsistencias = … rrhh`), pero las rutas `/asistencias` CRUD en servidor usan `autorizarRol(['admin','produccion'])` — un usuario solo **rrhh** podría ver la pantalla y fallar las llamadas al API.

### Producción (menú si rol `admin` o `produccion`)

- **RF-PR-01**: Sacrificio vacuno — CRUD por fecha, export Excel (`SacrificioVacuno.jsx`); API `/sacrificio` con JWT + `admin`/`produccion`.
- **RF-PR-02**: Matadero vivo — CRUD similar (`/matadero`).
- **RF-PR-03**: Leche — CRUD (`/leche`).
- **RF-PR-04**: Histórico producción — lectura agregada `GET /produccion-historico`; UI `ProduccionHistorico.jsx`.

### Legado / demo

- **RF-LG-01**: CRUD sobre `tabla1` sin autenticación (`GET /tabla1`, `POST /create`, `PUT /update`, `DELETE /delete/:id`) — aparentemente ejemplo o legado.

### Shell de aplicación (UI)

- **RF-SH-01**: Layout dashboard: barra lateral oscura, zona principal, panel lateral “Información” con módulo activo y reloj/fecha (`App.js`).
- **RF-SH-02**: Desplegables del menú (Contratación, RRHH, Producción) con comportamiento de apertura mutua controlada.
- **RF-SH-03**: Pantalla de carga inicial (spinner) mientras se resuelve sesión.
- **RF-SH-04**: Por defecto tras login: `admin` → `usuarios`; otros roles → primer módulo visible (`contratos`, `empleados` o `sacrificio`).

---

## Requisitos no funcionales (inferidos)

### Seguridad

- **RNF-SE-01**: Contraseñas de aplicación almacenadas con **bcrypt** (usuarios).
- **RNF-SE-02**: Autorización basada en **rol** en JWT (`verificarToken` + `autorizarRol`).
- **RNF-SE-03**: Validación de usuarios: email, fortaleza de contraseña, roles en lista blanca `admin`, `rrhh`, `contratacion`, `produccion` (`server/index.js`).
- **RNF-SE-04**: **Deuda / riesgo**: Varias rutas sensibles (contratos list/update/delete, empleados CRUD, `tabla1`) **no** exigen JWT en el servidor según el código actual — el modelo de amenazas real depende del despliegue (red, firewall, VPN).
- **RNF-SE-05**: `JWT_SECRET` tiene valor por defecto en código si falta `.env` — **no recomendable en producción**.

### Rendimiento y escalabilidad

- **RNF-PE-01**: APIs síncronas tipo consulta MySQL sin paginación explícita en la mayoría de listados (riesgo con tablas grandes).
- **RNF-PE-02**: Tablas muy anchas en UI (p. ej. sacrificio) con scroll horizontal y cabeceras fijas donde se diseñó.

### Fiabilidad y datos

- **RNF-FI-01**: Migraciones “lazy” en arranque (añadir columnas si no existen), p. ej. auditoría de `usuarios`, correo en contratos, tabla `password_reset_tokens`.
- **RNF-FI-02**: Tratamiento de errores con mensajes JSON/Swal en cliente; servidor mezcla `send(err)` y JSON según rutas.

### Integración / correo

- **RNF-IN-01**: Nodemailer con modo SMTP configurable o modo desarrollo (`jsonTransport`); reintentos y transportes alternativos; variables `SMTP_*`, `APP_BASE_URL`, `MAIL_FALLBACK_MODE`, etc. (inicio de `server/index.js`).

### Usabilidad e interfaz

- **RNF-UX-01**: Interfaz en **español**; Bootstrap + estilos propios en `client/src/App.css`.
- **RNF-UX-02**: Feedback con **SweetAlert2**.
- **RNF-UX-03**: Módulos de contratos y sacrificio con diseño más “premium” (tarjetas, rejillas, sombras suaves) respecto a formularios CRUD más simples en otros módulos.

### Operación y configuración

- **RNF-OP-01**: Backend usa MySQL en **localhost** con usuario/clave/base definidos en código (`server/index.js`); convención típica: sobrescribir por entorno en despliegue real.
- **RNF-OP-02**: Cliente asume API en **`http://localhost:3001`** en llamadas Axios (acoplamiento de entorno).

### Mantenibilidad

- **RNF-MA-01**: Monorepo simple: carpeta `client` (React) y `server` (Express).
- **RNF-MA-02**: Dependencias modernas (Express 5, ExcelJS, jsPDF, etc.) mezcladas con rutas legadas sin auth uniforme.

---

## Roles funcionales (resumen)

| Rol            | Visibilidad principal en UI (según `App.js`)                                              |
| -------------- | ----------------------------------------------------------------------------------------- |
| `admin`        | Usuarios + todos los módulos habilitados para otros roles                                 |
| `contratacion` | Contratación                                                                              |
| `rrhh`         | Rec. Humanos (incl. Asistencias en menú; ver incoherencia API **RF-RH-13**)               |
| `produccion`   | Producción + certificados/eval. médicas en menú                                           |

---

Si más adelante quieres convertir esto en un **documento formal de especificación**, el siguiente paso sería validar reglas de negocio exactas (qué rol puede ver/editar cada cosa, paginación, auditoría en otros módulos) y alinear **todas** las rutas del servidor con el mismo modelo `verificarToken` + `autorizarRol`.
