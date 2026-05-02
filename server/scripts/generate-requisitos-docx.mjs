/**
 * Genera REQUISITOS_PROYECTO_AEPG.docx a partir del comportamiento real del código
 * (cliente React + API Express en server/index.js).
 * Formato: tabla CÓDIGO | TIPO | NOMBRE | DESCRIPCIÓN con fusión vertical (columnas 1–2).
 * Ejecutar desde server: node scripts/generate-requisitos-docx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalMergeType,
  VerticalAlignTable,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');
const CRUD_ROOT = path.join(SERVER_ROOT, '..');

const OUT_REPO = path.join(CRUD_ROOT, 'docs', 'REQUISITOS_PROYECTO_AEPG.docx');
const OUT_DOCS_USER = path.join(
  process.env.USERPROFILE || '',
  'Documents',
  'requisitos',
  'REQUISITOS_PROYECTO_AEPG.docx'
);

/**
 * Subfilas: nombre y desc sin prefijo numérico; se anteponen N.M según el ordinal del código (RF-003 → 3.1…).
 */
const REQUISITOS_FUNCIONALES = [
  {
    code: 'RF-001',
    tipo: 'Funcional.',
    titulo: 'Autenticación, sesión y recuperación de contraseña.',
    descripcionGeneral:
      'El sistema permite el acceso mediante credenciales frente a la tabla de usuarios, emite un JWT de sesión, rechaza cuentas inactivas y ofrece flujo de restablecimiento de contraseña por correo (implementación en server/index.js y persistencia de sesión en client/src/App.js).',
    subs: [
      {
        nombre: 'Inicio de sesión.',
        desc: 'El usuario introduce correo electrónico y contraseña; la API valida el hash con bcrypt y devuelve token y datos básicos del usuario si las credenciales son correctas (POST /login).',
      },
      {
        nombre: 'Sesión basada en JWT.',
        desc: 'El token JWT incluye email, nombre y rol; tiene caducidad configurada (8 horas en la implementación actual) y se envía en la cabecera Authorization: Bearer en las peticiones del cliente.',
      },
      {
        nombre: 'Rechazo de usuarios inactivos.',
        desc: 'Las cuentas marcadas como inactivas no pueden completar el inicio de sesión; la API responde indicando que la cuenta está desactivada.',
      },
      {
        nombre: 'Persistencia de sesión en el navegador.',
        desc: 'El cliente almacena el JWT y el objeto usuario en localStorage y configura Axios para adjuntar automáticamente el Bearer token.',
      },
      {
        nombre: 'Cierre de sesión.',
        desc: 'El usuario puede cerrar sesión; se eliminan token y datos locales y se limpia la cabecera de autorización en Axios.',
      },
      {
        nombre: 'Solicitud de recuperación de contraseña.',
        desc: 'Permite solicitar un enlace de restablecimiento mediante correo; se genera un token de un solo uso almacenado de forma segura con tiempo de expiración (POST /auth/forgot-password, tabla password_reset_tokens).',
      },
      {
        nombre: 'Restablecimiento de contraseña con token.',
        desc: 'Con un token válido el usuario define una nueva contraseña cumpliendo las reglas del servidor; el token queda invalidado tras el uso (POST /auth/reset-password).',
      },
      {
        nombre: 'Roles reconocidos en cuentas.',
        desc: 'Los roles aplicables a usuarios de aplicación incluyen admin, rrhh, contratacion y produccion; el cliente normaliza el rol en minúsculas para menús y visibilidad.',
      },
    ],
  },
  {
    code: 'RF-002',
    tipo: 'Funcional.',
    titulo: 'Gestión de usuarios del sistema (rol administrador).',
    descripcionGeneral:
      'El administrador gestiona cuentas de acceso al sistema con auditoría de alta y modificación, políticas de contraseña en servidor y controles en interfaz (GestionUsuarios.jsx); las rutas CRUD de usuarios exigen JWT y rol admin.',
    subs: [
      {
        nombre: 'Listado de usuarios.',
        desc: 'Consulta de todos los usuarios con campos de auditoría (creado por, fechas de creación y actualización, estado activo/inactivo) mediante GET /usuarios.',
      },
      {
        nombre: 'Alta de usuario.',
        desc: 'Creación de cuenta con validación de correo, rol permitido y política de contraseña fuerte; la contraseña se almacena con hash bcrypt (POST /create-usuario).',
      },
      {
        nombre: 'Edición de usuario.',
        desc: 'Actualización de datos personales, rol, estado activo y contraseña opcional; puede cambiarse el correo identificando la cuenta anterior en la URL (PUT /update-usuario/:email).',
      },
      {
        nombre: 'Eliminación de usuario.',
        desc: 'Eliminación definitiva del registro en base de datos por correo clave (DELETE /delete-usuario/:email).',
      },
      {
        nombre: 'Formulario de alta y edición en interfaz.',
        desc: 'Modal con validación en cliente: confirmación de contraseña, campos obligatorios y selector de estado Activo/Inactivo.',
      },
      {
        nombre: 'Visualización de actores de auditoría.',
        desc: 'En la tabla, los campos de auditoría muestran el nombre de la persona cuando el correo coincide con un usuario cargado; si no hay coincidencia se muestra un texto genérico.',
      },
      {
        nombre: 'Resaltado de usuarios inactivos.',
        desc: 'Las filas correspondientes a usuarios inactivos se muestran con fondo distintivo para lectura rápida.',
      },
      {
        nombre: 'Activar o desactivar desde la tabla.',
        desc: 'Interruptor por fila para cambiar el estado sin abrir el modal de edición; se impide que el usuario en sesión se desactive a sí mismo.',
      },
    ],
  },
  {
    code: 'RF-003',
    tipo: 'Funcional.',
    titulo: 'Gestión de contratos.',
    descripcionGeneral:
      'El sistema mantiene contratos en base de datos y un módulo unificado en cliente (GestionContratos.jsx) con resumen, listados, vencimientos, renovaciones y exportaciones. La protección por JWT no es uniforme en todas las rutas del servidor según el código vigente.',
    subs: [
      {
        nombre: 'Alta de contrato autenticada.',
        desc: 'Registro de contratos en la tabla contratos_generales; la creación exige JWT y rol administrador o contratación (POST /create-contrato).',
      },
      {
        nombre: 'Consulta del listado de contratos.',
        desc: 'Obtención del conjunto de contratos mediante GET /contratos; en la implementación actual esta ruta no aplica verificarToken en el servidor.',
      },
      {
        nombre: 'Actualización y borrado de contratos.',
        desc: 'Modificación y eliminación por identificador de contrato (PUT /update-contrato, DELETE /delete-contrato/:numero_contrato); en el código revisado no figura verificarToken en estas rutas.',
      },
      {
        nombre: 'Interfaz integral de contratación.',
        desc: 'Un solo componente agrupa resumen, contratos, vista de vencimientos, renovaciones y reportes, sincronizado con el menú lateral de contratación.',
      },
      {
        nombre: 'Lógica de vencimientos y alertas en cliente.',
        desc: 'Cálculo de estados (activo, por vencer, vencido), KPIs, priorización de colas y mensajes de alerta según fechas de los contratos cargados.',
      },
      {
        nombre: 'Exportación de informes.',
        desc: 'Exportación de datos filtrados a Excel (formato con cabecera corporativa), CSV con codificación adecuada para Excel en español y PDF tabular.',
      },
      {
        nombre: 'Recordatorio por correo electrónico.',
        desc: 'Endpoint para disparar envío de recordatorio relacionado con un contrato e integración de correo (POST /send-contrato-reminder); la ruta analizada no incluye verificarToken.',
      },
      {
        nombre: 'Acceso a vencimientos desde la interfaz.',
        desc: 'La entrada de Vencimientos puede estar oculta en menú y pestañas pero la vista sigue siendo alcanzable desde acciones internas del módulo.',
      },
    ],
  },
  {
    code: 'RF-004',
    tipo: 'Funcional.',
    titulo: 'Gestión de empleados.',
    descripcionGeneral:
      'Altas, ediciones, listados, historial laboral y borrados sobre la entidad de empleados consumidos desde GestionEmpleados.jsx. Varias rutas de empleados no aplican verificarToken en el servidor, por lo que la seguridad efectiva depende del entorno de red.',
    subs: [
      {
        nombre: 'Registro de empleado.',
        desc: 'Alta de fichas de personal mediante POST /create-empleado.',
      },
      {
        nombre: 'Actualización de empleado.',
        desc: 'Modificación de datos existentes mediante PUT /update-empleado.',
      },
      {
        nombre: 'Listado y consulta.',
        desc: 'Obtención del censo de empleados (GET /empleados) y consulta de historial laboral por carnet de identidad (GET /historial-laboral/:carnet_identidad).',
      },
      {
        nombre: 'Eliminación de empleado.',
        desc: 'Borrado de la ficha por carnet de identidad (DELETE /delete-empleado/:carnet_identidad).',
      },
      {
        nombre: 'Interfaz de administración de empleados.',
        desc: 'Pantalla dedicada en Recursos Humanos para mantener los datos operativos enlazados con las rutas anteriores.',
      },
      {
        nombre: 'Visibilidad por rol en menú.',
        desc: 'El módulo de empleados se muestra a usuarios administrador o rrhh según las reglas de App.js.',
      },
    ],
  },
  {
    code: 'RF-005',
    tipo: 'Funcional.',
    titulo: 'Bajas, reactivaciones y cambios de cargo.',
    descripcionGeneral:
      'Flujos específicos de ciclo de vida del empleado protegidos por JWT y roles administrador o rrhh.',
    subs: [
      {
        nombre: 'Registro de baja.',
        desc: 'Registrar la baja de un empleado según las reglas del backend (POST /empleado-baja).',
      },
      {
        nombre: 'Reactivación.',
        desc: 'Reactivar empleados dados de baja cuando corresponda (POST /empleado-reactivar).',
      },
      {
        nombre: 'Cambio de cargo.',
        desc: 'Registrar cambios de puesto vinculados al historial laboral y auditoría prevista en servidor (POST /empleado-cambio-cargo).',
      },
    ],
  },
  {
    code: 'RF-006',
    tipo: 'Funcional.',
    titulo: 'Informes de Recursos Humanos.',
    descripcionGeneral:
      'Consultas agregadas para supervisión de plantilla y estructura; acceso con JWT para administrador o rrhh.',
    subs: [
      {
        nombre: 'Reporte de personal.',
        desc: 'Generación o consulta del informe de personal (GET /reporte-personal).',
      },
      {
        nombre: 'Reporte consolidado por departamentos.',
        desc: 'Información consolidada por departamentos para análisis de RRHH (GET /reporte-consolidado-departamentos).',
      },
    ],
  },
  {
    code: 'RF-007',
    tipo: 'Funcional.',
    titulo: 'Vacaciones, turnos de trabajo y grupos.',
    descripcionGeneral:
      'Mantenimiento de catálogos y registros de planificación de personal con patrón CRUD sobre las rutas dedicadas en servidor.',
    subs: [
      {
        nombre: 'Vacaciones.',
        desc: 'Alta, listado, actualización y borrado de registros de vacaciones (rutas /vacaciones y variantes create/update/delete).',
      },
      {
        nombre: 'Turnos de trabajo.',
        desc: 'Gestión de turnos (rutas /turnos-trabajo con operaciones CRUD).',
      },
      {
        nombre: 'Grupos de trabajo.',
        desc: 'Gestión de grupos (rutas /grupos-trabajo con operaciones CRUD).',
      },
      {
        nombre: 'Miembros de un grupo.',
        desc: 'Alta, listado y eliminación de integrantes de un grupo (GET/POST/DELETE bajo /grupo-trabajo/:id_grupo/miembros).',
      },
    ],
  },
  {
    code: 'RF-008',
    tipo: 'Funcional.',
    titulo: 'Asistencia grupal.',
    descripcionGeneral:
      'Registro de asistencia asociada a grupos de trabajo con validaciones en servidor para la coherencia de datos.',
    subs: [
      {
        nombre: 'Consulta y mantenimiento.',
        desc: 'Listado y operaciones CRUD sobre asistencia grupal (GET /asistencia-grupal y rutas create/update/delete asociadas).',
      },
      {
        nombre: 'Control de número de asistentes.',
        desc: 'El servidor valida que el número de presentes no supere el tamaño del grupo en operaciones de alta o edición.',
      },
    ],
  },
  {
    code: 'RF-009',
    tipo: 'Funcional.',
    titulo: 'Formación y desempeño laboral.',
    descripcionGeneral:
      'Conjunto de submódulos de RRHH para certificaciones, formación, evaluaciones de desempeño, objetivos y remuneraciones, cada uno con patrón de listado y CRUD en API.',
    subs: [
      {
        nombre: 'Certificaciones.',
        desc: 'Gestión de certificaciones del personal (rutas /certificaciones).',
      },
      {
        nombre: 'Cursos.',
        desc: 'Gestión de cursos y formación (/cursos).',
      },
      {
        nombre: 'Evaluación de capacitación.',
        desc: 'Registro de evaluaciones ligadas a capacitación (/evalcapacitacion).',
      },
      {
        nombre: 'Evaluaciones.',
        desc: 'Evaluaciones generales de desempeño (/evaluaciones).',
      },
      {
        nombre: 'Objetivos.',
        desc: 'Seguimiento de objetivos (/objetivos).',
      },
      {
        nombre: 'Salarios.',
        desc: 'Registro y mantenimiento de información salarial (/salarios).',
      },
    ],
  },
  {
    code: 'RF-010',
    tipo: 'Funcional.',
    titulo: 'Seguridad e higiene laboral.',
    descripcionGeneral:
      'Registros diferenciados de seguridad industrial y del ámbito de seguridad en RRHH.',
    subs: [
      {
        nombre: 'Seguridad industrial.',
        desc: 'CRUD sobre registros expuestos en /segseguridad.',
      },
      {
        nombre: 'Seguridad (RRHH).',
        desc: 'CRUD sobre registros expuestos en /seguridad.',
      },
    ],
  },
  {
    code: 'RF-011',
    tipo: 'Funcional.',
    titulo: 'Estructura organizacional.',
    descripcionGeneral:
      'Definición de cargos y departamentos y relación empleado–departamento.',
    subs: [
      {
        nombre: 'Cargos.',
        desc: 'CRUD de cargos (/cargos, create-cargo, update-cargo, delete-cargo).',
      },
      {
        nombre: 'Departamentos.',
        desc: 'CRUD de departamentos (/departamentos y rutas afines).',
      },
      {
        nombre: 'Asignación a departamento.',
        desc: 'Asignación de empleados a departamentos (POST /asignar-empleado-departamento).',
      },
    ],
  },
  {
    code: 'RF-012',
    tipo: 'Funcional.',
    titulo: 'Sanciones, reconocimientos y jubilaciones.',
    descripcionGeneral:
      'Trazabilidad de medidas disciplinarias, reconocimientos y procesos de egreso o jubilación.',
    subs: [
      {
        nombre: 'Sanciones.',
        desc: 'CRUD de sanciones a empleados (/sanciones-empleado).',
      },
      {
        nombre: 'Reconocimientos.',
        desc: 'CRUD de reconocimientos (/reconocimientos-empleado).',
      },
      {
        nombre: 'Jubilaciones y egresos.',
        desc: 'CRUD asociado a jubilaciones-empleado.',
      },
    ],
  },
  {
    code: 'RF-013',
    tipo: 'Funcional.',
    titulo: 'Certificados médicos y evaluaciones médicas.',
    descripcionGeneral:
      'Salud ocupacional ampliada accesible desde API a administrador, rrhh y produccion según autorizarRol en servidor.',
    subs: [
      {
        nombre: 'Certificados médicos.',
        desc: 'Listado y CRUD (/certificados-medicos y rutas create/update/delete certificado médico).',
      },
      {
        nombre: 'Evaluaciones médicas.',
        desc: 'Listado y CRUD (/evaluaciones-medicas y rutas create/update/delete evaluación médica).',
      },
    ],
  },
  {
    code: 'RF-014',
    tipo: 'Funcional.',
    titulo: 'Producción pecuaria y histórico.',
    descripcionGeneral:
      'Registro operativo diario de sacrificio, matadero y leche, más vista de histórico agregado; rutas protegidas por JWT para administrador o produccion.',
    subs: [
      {
        nombre: 'Sacrificio vacuno.',
        desc: 'Consulta y mantenimiento por fecha con exportación a Excel desde interfaz (/sacrificio, SacrificioVacuno.jsx).',
      },
      {
        nombre: 'Matadero en vivo.',
        desc: 'Registro diario de métricas de matadero (/matadero, MataderoVivo.jsx).',
      },
      {
        nombre: 'Producción de leche.',
        desc: 'CRUD de registros lecheros por fecha (/leche, Leche.jsx).',
      },
      {
        nombre: 'Histórico de producción.',
        desc: 'Consulta agregada de histórico solo lectura en diseño actual (GET /produccion-historico, ProduccionHistorico.jsx).',
      },
    ],
  },
  {
    code: 'RF-015',
    tipo: 'Funcional.',
    titulo: 'Asistencias individuales.',
    descripcionGeneral:
      'CRUD de asistencias en servidor con autorización para administrador y produccion; la pantalla puede aparecer en menú de RRHH según App.js, lo que puede generar errores para usuarios solo rrhh.',
    subs: [
      {
        nombre: 'Mantenimiento de asistencias.',
        desc: 'Listado y operaciones CRUD (/asistencias, create-asistencia, update-asistencia, delete-asistencia).',
      },
      {
        nombre: 'Coherencia menú frente a API.',
        desc: 'Si el menú muestra Asistencias a rol rrhh pero el backend restringe las rutas a admin y produccion, el usuario rrhh podría ver la pantalla y recibir respuestas 403.',
      },
    ],
  },
  {
    code: 'RF-016',
    tipo: 'Funcional.',
    titulo: 'Marco visual y navegación de la aplicación.',
    descripcionGeneral:
      'Interfaz tipo dashboard con barra lateral, área principal y panel informativo; la navegación entre módulos es por estado interno, sin react-router en el árbol principal.',
    subs: [
      {
        nombre: 'Distribución general.',
        desc: 'Layout con sidebar de marca, zona de contenido y columna de información con etiqueta de módulo, fecha y hora.',
      },
      {
        nombre: 'Menús por rol.',
        desc: 'Contratación, Recursos Humanos y Producción se despliegan según rol; administrador ve el conjunto de funciones habilitadas.',
      },
      {
        nombre: 'Carga inicial.',
        desc: 'Indicador de carga mientras se determina si existe sesión válida en localStorage.',
      },
      {
        nombre: 'Pantalla inicial tras login.',
        desc: 'Administrador cae en usuarios; contratación en contratos; rrhh en empleados; producción en sacrificio según la lógica de App.js.',
      },
    ],
  },
  {
    code: 'RF-017',
    tipo: 'Funcional.',
    titulo: 'Demostración CRUD sobre tabla1.',
    descripcionGeneral:
      'Superficie de ejemplo o legado sin autenticación en rutas analizadas; debe deshabilitarse o protegerse en despliegues reales.',
    subs: [
      {
        nombre: 'Operaciones sin JWT.',
        desc: 'Lectura GET /tabla1 y altas, ediciones y borrados POST /create, PUT /update, DELETE /delete/:id sobre la tabla1.',
      },
    ],
  },
];

const REQUISITOS_NO_FUNCIONALES = [
  {
    code: 'RNF-001',
    tipo: 'No funcional.',
    titulo: 'Seguridad de credenciales y validación de cuentas.',
    descripcionGeneral:
      'Propiedades observables del sistema relativas a cómo se guardan y validan las credenciales de aplicación.',
    subs: [
      {
        nombre: 'Almacenamiento de contraseñas.',
        desc: 'Las contraseñas de usuarios se persisten como hash bcrypt, no en texto plano.',
      },
      {
        nombre: 'Lista cerrada de roles y validaciones.',
        desc: 'El servidor valida correo, fortaleza de contraseña y roles permitidos al crear o actualizar usuarios.',
      },
      {
        nombre: 'Secreto JWT configurable.',
        desc: 'Si no se define JWT_SECRET en entorno, el código usa un valor por defecto embebido; en producción debe configurarse un secreto propio.',
      },
    ],
  },
  {
    code: 'RNF-002',
    tipo: 'No funcional.',
    titulo: 'Autorización en API y superficie expuesta.',
    descripcionGeneral:
      'El modelo previsto combina JWT en cabecera Bearer con listas de roles por ruta; parte del código no aplica verificarToken de forma uniforme.',
    subs: [
      {
        nombre: 'Patrón estándar.',
        desc: 'Muchas rutas sensibles usan verificarToken seguido de autorizarRol con la lista de roles permitidos.',
      },
      {
        nombre: 'Contratos y recordatorios.',
        desc: 'Creación de contrato exige JWT y rol; listado, actualización, borrado y envío de recordatorio carecen de verificarToken en la revisión del código.',
      },
      {
        nombre: 'Empleados y demo tabla1.',
        desc: 'Gran parte del CRUD de empleados y todo el CRUD de tabla1 están expuestos sin JWT en servidor.',
      },
      {
        nombre: 'Implicación.',
        desc: 'La seguridad efectiva frente a amenazas externas depende del aislamiento de red, firewall o VPN si no se corrige la política de middleware.',
      },
    ],
  },
  {
    code: 'RNF-003',
    tipo: 'No funcional.',
    titulo: 'Rendimiento y volumen de datos.',
    descripcionGeneral:
      'Comportamiento ante conjuntos de datos grandes inferido del uso de consultas sin paginación explícita en la mayoría de listados.',
    subs: [
      {
        nombre: 'Consultas completas.',
        desc: 'Los listados típicos devuelven el conjunto completo de filas desde MySQL sin LIMIT orientado a interfaz.',
      },
      {
        nombre: 'Tablas anchas en cliente.',
        desc: 'Pantallas como sacrificio emplean tablas muy anchas con scroll horizontal y cabeceras fijas donde se implementó.',
      },
    ],
  },
  {
    code: 'RNF-004',
    tipo: 'No funcional.',
    titulo: 'Fiabilidad de datos y arranque.',
    descripcionGeneral:
      'El servidor ejecuta comprobaciones al iniciar para alinear esquema con el código.',
    subs: [
      {
        nombre: 'Migraciones perezosas.',
        desc: 'Creación o alteración de tablas y columnas ausentes (tokens de reset, auditoría de usuarios, correo en contratos, etc.).',
      },
      {
        nombre: 'Errores heterogéneos.',
        desc: 'La API puede responder con JSON estructurado o mensajes de error en texto según la ruta; el cliente suele mostrar SweetAlert2.',
      },
    ],
  },
  {
    code: 'RNF-005',
    tipo: 'No funcional.',
    titulo: 'Integración de correo electrónico.',
    descripcionGeneral:
      'Envío de mensajes transaccionales mediante Nodemailer con configuración por variables de entorno.',
    subs: [
      {
        nombre: 'SMTP y modo desarrollo.',
        desc: 'Soporte para servidor SMTP real o transporte alternativo en desarrollo; reintentos y variables SMTP_* y APP_BASE_URL documentadas en servidor.',
      },
      {
        nombre: 'Reset de contraseña y recordatorios.',
        desc: 'Los flujos que envían correo dependen de esta integración y de la validez del buzón configurado.',
      },
    ],
  },
  {
    code: 'RNF-006',
    tipo: 'No funcional.',
    titulo: 'Usabilidad e idioma.',
    descripcionGeneral:
      'Características de experiencia de usuario consolidadas en el cliente.',
    subs: [
      {
        nombre: 'Interfaz en español.',
        desc: 'Etiquetas y mensajes orientados a usuarios hispanohablantes con Bootstrap y hoja de estilos propia.',
      },
      {
        nombre: 'Retroalimentación.',
        desc: 'Uso de diálogos SweetAlert2 para confirmaciones y errores.',
      },
      {
        nombre: 'Diseño diferenciado por módulo.',
        desc: 'Contratos y sacrificio priorizan tarjetas y rejillas más elaboradas frente a formularios CRUD más simples en otros módulos.',
      },
    ],
  },
  {
    code: 'RNF-007',
    tipo: 'No funcional.',
    titulo: 'Operación y despliegue.',
    descripcionGeneral:
      'Acoplamientos típicos de entorno de desarrollo que deben externalizarse en producción.',
    subs: [
      {
        nombre: 'Base de datos.',
        desc: 'Conexión MySQL definida en código (host, usuario, base); conviene parametrizar por entorno.',
      },
      {
        nombre: 'URL del API en cliente.',
        desc: 'Las llamadas Axios apuntan a http://localhost:3001 salvo refactorización a variables de entorno del build.',
      },
      {
        nombre: 'Puerto del servidor API.',
        desc: 'El proceso Express escucha en el puerto 3001 en la configuración habitual del proyecto.',
      },
    ],
  },
  {
    code: 'RNF-008',
    tipo: 'No funcional.',
    titulo: 'Mantenibilidad del código.',
    descripcionGeneral:
      'Estructura del repositorio y deuda técnica observable.',
    subs: [
      {
        nombre: 'Monorepo.',
        desc: 'Carpetas client (React) y server (Express) en un mismo repositorio.',
      },
      {
        nombre: 'Convivencia de estilos.',
        desc: 'Rutas modernas con middleware de seguridad coexisten con rutas sin autenticación uniforme y demo tabla1.',
      },
    ],
  },
];

const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };

function ordinalFromCode(code) {
  const m = String(code).match(/(\d+)/);
  return m ? String(parseInt(m[1], 10)) : '1';
}

function headerCell(text) {
  return new TableCell({
    shading: { fill: 'D9EAD3', type: ShadingType.CLEAR },
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22 })],
      }),
    ],
    margins: CELL_MARGINS,
  });
}

function cellParagraph(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text: String(text ?? ''), size: 20, ...opts })],
  });
}

function bodyCell(text, opts = {}) {
  return new TableCell({
    verticalAlign: VerticalAlignTable.TOP,
    children: [cellParagraph(text, opts)],
    margins: CELL_MARGINS,
  });
}

function mergedCodeTipoCells(code, tipo) {
  return [
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      verticalAlign: VerticalAlignTable.TOP,
      children: [cellParagraph(code, { bold: true })],
      margins: CELL_MARGINS,
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.RESTART,
      verticalAlign: VerticalAlignTable.TOP,
      children: [cellParagraph(tipo)],
      margins: CELL_MARGINS,
    }),
  ];
}

function mergedContinuePair() {
  const emptyPara = () =>
    new Paragraph({ children: [new TextRun({ text: '', size: 20 })] });
  return [
    new TableCell({
      verticalMerge: VerticalMergeType.CONTINUE,
      verticalAlign: VerticalAlignTable.TOP,
      children: [emptyPara()],
      margins: CELL_MARGINS,
    }),
    new TableCell({
      verticalMerge: VerticalMergeType.CONTINUE,
      verticalAlign: VerticalAlignTable.TOP,
      children: [emptyPara()],
      margins: CELL_MARGINS,
    }),
  ];
}

function buildRequirementRows(req) {
  const ord = ordinalFromCode(req.code);
  const rows = [];

  const formatSubs = () =>
    req.subs.map((sub, i) => {
      const n = `${ord}.${i + 1}`;
      return {
        nombre: `${n} ${sub.nombre}`,
        desc: `${n}. ${sub.desc}`,
      };
    });

  const subs = formatSubs();

  if (!subs.length) {
    rows.push(
      new TableRow({
        children: [
          bodyCell(req.code, { bold: true }),
          bodyCell(req.tipo),
          bodyCell(req.titulo),
          bodyCell(req.descripcionGeneral),
        ],
      })
    );
    return rows;
  }

  rows.push(
    new TableRow({
      children: [
        ...mergedCodeTipoCells(req.code, req.tipo),
        bodyCell(req.titulo),
        bodyCell(req.descripcionGeneral),
      ],
    })
  );
  for (const sub of subs) {
    rows.push(
      new TableRow({
        children: [...mergedContinuePair(), bodyCell(sub.nombre), bodyCell(sub.desc)],
      })
    );
  }
  return rows;
}

function requirementTable(headers, items) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: headers.map((h) => headerCell(h)),
    }),
  ];
  for (const req of items) {
    rows.push(...buildRequirementRows(req));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1100, 1300, 3600, 5000],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
    },
    rows,
  });
}

async function main() {
  const intro =
    'Este documento describe los requisitos funcionales y no funcionales inferidos del comportamiento actual del código del proyecto (aplicación React en client/ y API Express en server/index.js). No sustituye acuerdos formales con stakeholders: refleja lo implementado y advertencias donde la seguridad u homogeneidad del API no son uniformes.';

  const headersRf = [
    'CÓDIGO',
    'TIPO REQUISITO',
    'NOMBRE DEL REQUISITO FUNCIONAL',
    'DESCRIPCIÓN DEL REQUISITO FUNCIONAL',
  ];
  const headersRnf = [
    'CÓDIGO',
    'TIPO REQUISITO',
    'NOMBRE DEL REQUISITO NO FUNCIONAL',
    'DESCRIPCIÓN DEL REQUISITO NO FUNCIONAL',
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'Requisitos funcionales y no funcionales',
                bold: true,
                size: 36,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Proyecto AEPG — Especificación derivada del código',
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Generado: ${new Date().toLocaleString('es-ES')}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: intro, size: 22 })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 160 },
            children: [new TextRun({ text: 'Requisitos funcionales', bold: true })],
          }),
          requirementTable(headersRf, REQUISITOS_FUNCIONALES),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 160 },
            children: [new TextRun({ text: 'Requisitos no funcionales', bold: true })],
          }),
          requirementTable(headersRnf, REQUISITOS_NO_FUNCIONALES),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  function writeDocx(targetPath) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  function writeDocxOrFallback(primaryPath) {
    try {
      return writeDocx(primaryPath);
    } catch (e) {
      if (e && (e.code === 'EBUSY' || e.code === 'EPERM')) {
        const alt = primaryPath.replace(/\.docx$/i, '_generado.docx');
        console.warn(
          `No se pudo sobrescribir (archivo en uso o bloqueado): ${primaryPath}\n` +
            `Se guardó una copia como: ${alt}`
        );
        return writeDocx(alt);
      }
      throw e;
    }
  }

  const writtenRepo = writeDocxOrFallback(OUT_REPO);
  console.log('Generado:', writtenRepo);

  try {
    const writtenUser = writeDocxOrFallback(OUT_DOCS_USER);
    if (writtenUser !== OUT_DOCS_USER) {
      console.log('Copia (alternativa por bloqueo):', writtenUser);
    } else {
      console.log('Copia:', writtenUser);
    }
  } catch {
    console.warn(
      'No se pudo escribir en Documentos/requisitos (permiso o ruta). Solo se guardó en docs/ del repo.'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
