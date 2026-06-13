/**
 * Genera 3 documentos Word para la defensa de tesis (oponencia):
 * 1. GUION_DEFENSA_ORAL.docx
 * 2. GUIA_BUSCAR_ARCHIVOS_DEFENSA.docx
 * 3. FRAGMENTOS_CODIGO_OPONENCIA.docx
 *
 * Ejecutar: cd server && node scripts/generate-documentos-defensa-oponencia.mjs
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
  AlignmentType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRUD_ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(CRUD_ROOT, 'docs', 'informes');
const DOCS_USER = path.join(process.env.USERPROFILE || '', 'Documents');

const FECHA = new Date().toLocaleDateString('es-ES', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function txt(text, opts = {}) {
  return new Paragraph({
    heading: opts.heading,
    spacing: opts.spacing || { after: 160 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [
      new TextRun({
        text: String(text),
        bold: Boolean(opts.bold),
        italics: Boolean(opts.italics),
        size: opts.size || 22,
      }),
    ],
  });
}

function h1(text) {
  return txt(text, { heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 180 }, bold: true, size: 26 });
}

function h2(text) {
  return txt(text, { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 }, bold: true, size: 24 });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function codeBlock(ruta, lineas, codigo, interpretacion) {
  const parts = [
    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({ text: `Archivo: ${ruta}`, bold: true, size: 20, color: '1e40af' }),
        new TextRun({ text: lineas ? `  (${lineas})` : '', size: 20, color: '64748b' }),
      ],
    }),
  ];
  for (const line of codigo.split('\n')) {
    parts.push(
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            size: 18,
          }),
        ],
      })
    );
  }
  if (interpretacion) {
    parts.push(
      new Paragraph({
        spacing: { before: 100, after: 60 },
        children: [
          new TextRun({ text: 'Traducción línea por línea (variables, símbolos y condiciones)', bold: true, size: 20, color: '166534' }),
        ],
      })
    );
    for (const parrafo of interpretacion.split('\n\n')) {
      parts.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: parrafo.trim(), size: 21, italics: false })],
        })
      );
    }
  }
  parts.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  return parts;
}

// ─── DOCUMENTO 1: GUION ORAL ───────────────────────────────────────────────

const GUION_ORAL = [
  {
    pregunta: 'Pregunta 1 — Control de acceso RBAC y seguridad frente al frontend',
    intro:
      'Muchas gracias por la pregunta. En nuestro sistema aplicamos un principio muy claro: la pantalla que ve el usuario ayuda, pero no decide quién puede hacer qué. Toda decisión de seguridad la toma el servidor.',
    cuerpo: [
      'Cuando alguien inicia sesión, el servidor le entrega un token JWT, que es como un pase temporal de ocho horas. Ese pase solo dice quién es la persona: su correo, nombre y rol. Los permisos detallados no van dentro del pase; cada vez que el navegador pide algo al servidor, este consulta en MySQL qué puede hacer ese rol.',
      'Antes de ejecutar cualquier operación sensible —crear usuarios, aprobar contratos, ver auditoría— el servidor pasa por dos filtros. Primero verifica que el token sea válido, que no esté revocado y que el usuario siga activo. Segundo, comprueba si ese rol tiene permiso para esa acción concreta, por ejemplo contratos.approve para aprobar o usuarios.create para crear usuarios.',
      'Por eso, aunque alguien intente engañar al sistema modificando el navegador o llamando a la API con Postman sin permiso, recibirá un error 401 o 403. El menú de React solo oculta botones para que la experiencia sea cómoda; la verdadera puerta está en Node.js.',
      'También evitamos que un usuario se dé más privilegios: solo el administrador crea usuarios, nadie puede cambiar su propio rol, y los roles del sistema están protegidos en la base de datos.',
    ],
    cierre:
      'En resumen: el frontend presenta; el backend autoriza. Esa separación es la base de nuestro RBAC.',
    profundizar:
      'Si desean verlo en código, puedo abrir server/index.js en las funciones verificarToken y autorizarPermiso, alrededor de la línea 840.',
  },
  {
    pregunta: 'Pregunta 2 — Contraseñas y auditoría inmutable',
    intro:
      'Para las contraseñas usamos bcrypt, que es el estándar más extendido en aplicaciones web serias.',
    cuerpo: [
      'Nunca guardamos la contraseña en texto claro. Al crear o cambiar una contraseña, el servidor la transforma con bcrypt usando diez rondas de costo, y solo ese hash queda en la tabla usuarios. Al iniciar sesión, comparamos con bcrypt.compare; si coincide, dejamos pasar.',
      'Además exigimos contraseña fuerte —mínimo ocho caracteres con mayúscula, minúscula y número—, bloqueamos la cuenta tras cinco intentos fallidos durante quince minutos, y si el usuario cambia su contraseña invalidamos los tokens anteriores.',
      'Sobre la auditoría: cada acción importante —logins, cambios de rol, aprobaciones, rechazos de contratos— se registra en la tabla audit_events con INSERT únicamente. La aplicación no ofrece botón para borrar ese historial, ni siquiera al administrador. Él puede consultarlo en el módulo de Auditoría, pero no eliminarlo desde la interfaz.',
      'Debo ser transparente: es inmutabilidad a nivel de aplicación, no un blockchain. Un administrador de base de datos con acceso directo podría alterar filas; en producción eso se controla con permisos de MySQL y respaldos.',
    ],
    cierre:
      'La combinación bcrypt más auditoría append-only nos da confidencialidad de credenciales y trazabilidad de operaciones.',
    profundizar:
      'Puedo mostrar bcrypt.hash en server/index.js línea 1242 y el INSERT de audit_events en server/lib/auditLog.js línea 208.',
  },
  {
    pregunta: 'Pregunta 3 — Pruebas de seguridad e inyección SQL',
    intro:
      'Las pruebas de seguridad las planteamos en tres capas, usando OWASP Top 10 como marco de referencia, no como certificación oficial.',
    cuerpo: [
      'Primero hicimos revisión estática del código: buscamos fallos de autenticación, control de acceso, configuración insegura e inyección. Los hallazgos y correcciones están en docs/INFORME_SEGURIDAD_AEPG.docx.',
      'Segundo ejecutamos diez pruebas automatizadas con el script security-smoke-test.mjs. Por ejemplo: intentar entrar sin token debe dar 401; poner un token falso debe dar 403; y muy importante, probar inyección SQL en el login con el texto clásico comilla-or-uno-igual-uno debe fallar y devolver credenciales inválidas, no abrir la puerta.',
      'Tercero, la prevención de inyección SQL no depende solo de la prueba: todo el API usa consultas parametrizadas con mysql2, es decir, los datos del usuario van en placeholders ? separados del SQL.',
      'Aclaro con honestidad académica: no contratamos un pentest externo con Burp o ZAP sobre todos los endpoints. Lo que tenemos es reproducible, documentado y alineado a buenas prácticas OWASP.',
    ],
    cierre:
      'Podemos ejecutar el script en vivo si el servidor está levantado, y ver el JSON de resultados en docs/security-test-results.json.',
    profundizar:
      'Archivos clave: server/scripts/security-smoke-test.mjs y docs/security-test-results.json.',
  },
  {
    pregunta: 'Pregunta 4 — Consistencia al aprobar contratos',
    intro:
      'Antes de responder, preciso el alcance: nuestro sistema gestiona contratos y expedientes digitales; no lleva inventario pecuario ni presupuesto en base de datos.',
    cuerpo: [
      'La consistencia la garantizamos a nivel de cada contrato. Cada uno es una fila con una máquina de estados: solicitud pendiente, verificación jurídica, aprobación o rechazo.',
      'Cuando el director aprueba, el código primero pregunta: ¿sigue pendiente? Si otro usuario ya lo resolvió, responde error y no aplica dos veces el mismo cambio. Eso evita doble aprobación sobre un mismo registro.',
      'Si se aprueban varios contratos a la vez, son operaciones independientes sobre filas distintas; MySQL InnoDB asegura cada UPDATE por separado. No hay tabla compartida de stock que pueda desincronizarse.',
      'El archivado —copiar documentos, mover al histórico, borrar el activo— hoy es una secuencia de pasos. Reconocemos como mejora futura envolver eso en una transacción SQL explícita.',
    ],
    cierre:
      'Para AEPG, donde la concurrencia de aprobaciones es baja, el diseño por estados y validación optimista es adecuado al problema real.',
    profundizar:
      'Código en server/lib/contratosAprobacion.js, líneas 132-138, donde se verifica aprobacion_estado === pendiente.',
  },
  {
    pregunta: 'Pregunta 5 — Acoplamiento y replicabilidad en otras empresas del grupo',
    intro:
      'La solución tiene acoplamiento medio-bajo: la mayor parte es una plataforma de contratación reutilizable; una parte menor es identidad AEPG.',
    cuerpo: [
      'Lo reutilizable incluye login con JWT, RBAC configurable, flujo solicitar-verificar-aprobar, expediente PDF y Word, recordatorios de vencimiento, correo, auditoría y mensajes internos. Eso es más del setenta por ciento del valor técnico.',
      'Lo específico de AEPG es el branding, los nombres de roles en código —contratacion, director, abogado—, las semillas iniciales del catálogo de tipos de contrato, y el correo institucional en el archivo .env.',
      'Para otra empresa del Grupo Empresarial Ganadero con proceso similar, la adaptación sería principalmente configuración: roles en RBAC, catálogos, plantillas de correo y nombre de empresa en variables de entorno. No hay que reescribir el núcleo.',
      'Multi-empresa en una sola instalación está planificado como fase dos; hoy es single-tenant, una organización por despliegue.',
    ],
    cierre:
      'No es un ERP genético integral; es un producto vertical de contratación documental replicable por configuración.',
    profundizar:
      'Mostrar client/src/components/GestionRoles.jsx para RBAC y CatalogoTiposContrato.jsx para catálogos editables.',
  },
  {
    pregunta: 'Pregunta 6 — Inteligencia artificial predictiva',
    intro:
      'Hoy el módulo de alertas es reactivo: avisa N días antes del vencimiento según reglas. La IA sería el siguiente paso: predecir quién tiene riesgo de incumplir o no renovar.',
    cuerpo: [
      'La ventaja es que el sistema ya acumula datos útiles: historial por proveedor, fechas, rechazos jurídicos, tiempos de aprobación, motivos en auditoría y recordatorios enviados. No partimos de cero.',
      'Recomendaría modelos explicables para entorno estatal: clasificación con Random Forest o XGBoost para probabilidad de no renovación en noventa días, y análisis de supervivencia para estimar cuándo vencerá la relación contractual. Evitaría deep learning sobre PDFs por costo y poca transparencia.',
      'Económicamente, priorizar contratos de alto riesgo reduce multas, horas de abogado y contratación, y evita cortes de insumos genéticos por vencimientos no gestionados.',
      'La integración sería una capa analítica: extraer features de MySQL, entrenar en batch, exponer scores en un dashboard y priorizar recordatorios automáticos.',
    ],
    cierre:
      'El sistema actual es la base de datos gobernada; la IA sería inteligencia encima, no un reemplazo del workflow.',
    profundizar:
      'Módulo actual: server/lib/contratosRecordatorios.js y pestaña Vencimientos en GestionContratos.jsx.',
  },
];

function buildGuionOral() {
  const children = [
    txt('Guion oral — Defensa de tesis', { center: true, bold: true, size: 32 }),
    txt('Sistema de Gestión de Contratos AEPG', { center: true, size: 24 }),
    txt(`Fecha: ${FECHA}`, { center: true, italics: true, spacing: { after: 400 } }),
    txt(
      'Instrucciones: lea cada bloque con naturalidad. No memorice palabra por palabra; use las frases de cierre y la nota "Si profundizan" como ancla. Duración sugerida: 1,5 a 2 minutos por pregunta.',
      { italics: true, spacing: { after: 300 } }
    ),
  ];

  for (const q of GUION_ORAL) {
    children.push(h1(q.pregunta));
    children.push(txt(q.intro));
    for (const p of q.cuerpo) children.push(txt(p));
    children.push(txt(`Cierre: ${q.cierre}`, { bold: true }));
    children.push(txt(`Si profundizan: ${q.profundizar}`, { italics: true, spacing: { after: 280 } }));
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

// ─── DOCUMENTO 2: GUÍA BUSCAR ARCHIVOS ─────────────────────────────────────

function buildGuiaArchivos() {
  const children = [
    txt('Guía para encontrar archivos del proyecto', { center: true, bold: true, size: 32 }),
    txt('Para defensa de tesis — nivel principiante', { center: true, size: 24 }),
    txt(`Fecha: ${FECHA}`, { center: true, spacing: { after: 400 } }),

    h1('1. Estructura general de la carpeta c:\\crud'),
    txt('Piense el proyecto en tres zonas:'),
    bullet('client\\ — Lo que ve el usuario en el navegador (React). Pantallas, botones, menú.'),
    bullet('server\\ — El cerebro: API, seguridad, base de datos (Node.js).'),
    bullet('docs\\ — Documentos de la tesis: informes, pruebas de seguridad, respuestas.'),

    h2('Dentro de server\\'),
    bullet('index.js — Archivo principal del servidor. Aquí están login, middleware JWT y rutas.'),
    bullet('lib\\ — Librerías organizadas: rbac.js, auditLog.js, contratosAprobacion.js, etc.'),
    bullet('scripts\\ — Scripts que generan informes y prueban seguridad.'),
    bullet('sql\\ — Scripts que crean tablas en MySQL.'),

    h2('Dentro de client\\src\\'),
    bullet('App.js — Menú lateral, login, estructura general.'),
    bullet('components\\ — Pantallas: GestionContratos.jsx, GestionUsuarios.jsx, Auditoria.jsx.'),
    bullet('context\\ — Permisos del usuario en pantalla (PermissionsContext.jsx).'),

    h1('2. Cómo abrir un archivo rápido (Cursor o VS Code)'),
    bullet('Presione Ctrl+P (Windows) y escriba el nombre: por ejemplo index.js o rbac.js.'),
    bullet('O en el explorador izquierdo: expanda crud → server → lib → rbac.js.'),
    bullet('Para ir a una línea: Ctrl+G y escriba el número (ejemplo: 840).'),

    h1('3. Qué abrir según cada pregunta de la oponencia'),

    h2('Pregunta 1 — RBAC'),
    bullet('server\\index.js — líneas 840-911: verificarToken, autorizarRol, autorizarPermiso.'),
    bullet('server\\lib\\rbac.js — permisos desde MySQL.'),
    bullet('client\\src\\context\\PermissionsContext.jsx — permisos solo para UI.'),

    h2('Pregunta 2 — Contraseñas y auditoría'),
    bullet('server\\index.js — línea 973: bcrypt.compare en login; 1242: bcrypt.hash al crear usuario.'),
    bullet('server\\lib\\auditLog.js — INSERT en audit_events.'),
    bullet('client\\src\\components\\Auditoria.jsx — pantalla que ve el admin.'),

    h2('Pregunta 3 — Pruebas de seguridad'),
    bullet('server\\scripts\\security-smoke-test.mjs — las 10 pruebas.'),
    bullet('docs\\security-test-results.json — resultados guardados.'),
    bullet('docs\\INFORME_SEGURIDAD_AEPG.docx — informe para el tribunal.'),

    h2('Pregunta 4 — Aprobaciones y consistencia'),
    bullet('server\\lib\\contratosAprobacion.js — lógica de aprobar/rechazar.'),
    bullet('server\\lib\\contratosArchivo.js — archivado de contratos.'),

    h2('Pregunta 5 — Replicabilidad'),
    bullet('server\\lib\\rbac.js — roles y permisos configurables.'),
    bullet('client\\src\\components\\GestionRoles.jsx — pantalla de roles.'),
    bullet('client\\src\\components\\CatalogoTiposContrato.jsx — catálogo editable.'),

    h2('Pregunta 6 — Recordatorios (base para IA futura)'),
    bullet('server\\lib\\contratosRecordatorios.js — alertas de vencimiento.'),
    bullet('server\\lib\\contratosAuditoria.js — historial para features futuras.'),

    h1('4. Cómo demostrar que el backend bloquea (demo rápida)'),
    txt('Con el servidor encendido (node index.js en server\\), puede decir al tribunal:'),
    bullet('Sin token, GET http://localhost:3001/contratos → debe responder 401.'),
    bullet('Con usuario contratacion, intentar crear usuario → 403 (solo admin).'),
    txt('Eso prueba en vivo la Pregunta 1 sin depender solo de la pantalla.'),

    h1('5. Documentos de apoyo ya generados'),
    bullet('docs\\informes\\RESPUESTAS_OPONENCIA.docx — respuestas técnicas completas.'),
    bullet('docs\\informes\\GUIA_DEMO_DEFENSA_TESIS.md — guion de demostración paso a paso.'),
    bullet('docs\\informes\\CAPITULO_4_PRUEBAS_SEGURIDAD_ALINEADO.md — texto para Capítulo 4.'),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

// ─── DOCUMENTO 3: FRAGMENTOS DE CÓDIGO ─────────────────────────────────────

const FRAGMENTOS = [
  {
    pregunta: 'Pregunta 1 — RBAC: verificación en el servidor',
    items: [
      {
        ruta: 'server/index.js',
        lineas: 'líneas 840-878',
        codigo: `const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado...' });
  const user = jwt.verify(token, JWT_SECRET);
  req.user = user;
  if (Number(rows[0].activo) === 0) { return res.status(403)... }
  if (Number(user.iat) < changedTs) { return res.status(403)... }
  return next();
};`,
        interpretacion: `En palabras simples: esta función es el portero del servidor. Revisa si la persona trae un pase válido (token) antes de dejarla pasar.

LÍNEA 1 — Se define la función verificarToken. Recibe req (lo que envió el navegador), res (lo que el servidor responderá) y next (función para decir "sigue adelante").

LÍNEA 2 — Se crea authHeader y ahí se guarda lo que vino en la cabecera "authorization". Suele traer algo como "Bearer ABC123" (la palabra Bearer más el código del pase).

LÍNEA 3 — Se crea token. SI authHeader existe, ENTONCES parte el texto por espacios y toma la segunda parte [1], que es solo el código sin la palabra Bearer. SI authHeader no existe, ENTONCES token queda vacío.

LÍNEA 4 — SI no hay token (el signo ! significa "no", entonces !token = "no hay token"), ENTONCES el servidor termina aquí y responde 401 ("acceso denegado, no trajiste pase"). SI sí hay token, ENTONCES esta línea no hace nada y el código sigue.

LÍNEA 5-6 — Se crea user. El servidor comprueba con jwt.verify que el token no fue inventado, usando la clave secreta JWT_SECRET. SI el token es válido, ENTONCES user guarda correo, nombre y rol.

LÍNEA 7 — Se guarda user en req.user para que el resto del programa sepa quién está conectado.

LÍNEA (usuario activo) — rows[0] es la primera fila del usuario en MySQL. SI la columna activo es exactamente igual a 0 (=== 0), ENTONCES responde 403 ("prohibido: usuario desactivado"). SI activo es 1, ENTONCES sigue adelante.

LÍNEA (contraseña cambiada) — user.iat es cuándo se creó el token; changedTs es cuándo cambió la contraseña después. SI user.iat es menor que (<) changedTs, ENTONCES el token es viejo y responde 403 (debe volver a iniciar sesión). SI el token es más reciente, ENTONCES sigue adelante.

LÍNEA final — SI llegó hasta aquí sin error, ENTONCES llama next() ("todo bien, pasa al siguiente paso").`,
      },
      {
        ruta: 'server/index.js',
        lineas: 'líneas 901-906',
        codigo: `const autorizarPermiso = (module, action) => async (req, res, next) => {
  const perms = await rbac.getPermissionsByCodigo(req.user.rol);
  if (rbac.hasPermission(perms, module, action)) return next();
  return res.status(403).json({ message: 'No tienes permiso...' });
};`,
        interpretacion: `En palabras simples: después de saber quién es la persona, esta función pregunta "¿tu rol puede hacer esta acción en este módulo?".

LÍNEA 1 — autorizarPermiso recibe module (ejemplo: 'contratos') y action (ejemplo: 'approve' = aprobar). Devuelve una función que se ejecuta en cada petición.

LÍNEA 2 — Se crea perms: la lista de permisos del rol del usuario (req.user.rol, por ejemplo 'director' o 'abogado'). El servidor espera (await) a que MySQL responda con esa lista.

LÍNEA 3 — SI en la lista perms existe permiso para ese module y esa action, ENTONCES llama next() y deja continuar. Ejemplo: director tiene 'contratos' + 'approve' → puede aprobar.

LÍNEA 4 — SI NO tenía ese permiso, ENTONCES responde 403 ("prohibido: sé quién eres, pero no puedes hacer esto"). Ejemplo: abogado intenta aprobar → no tiene 'approve' → 403.`,
      },
      {
        ruta: 'server/lib/rbac.js',
        lineas: 'líneas 256-261',
        codigo: `const rows = await dbQuery(
  \`SELECT ... FROM roles r
   LEFT JOIN rbac_role_permissions p ON p.id_rol = r.id_rol
   WHERE LOWER(r.codigo) = ?\`,
  [key]
);`,
        interpretacion: `En palabras simples: el servidor pregunta a MySQL "¿qué permisos tiene este rol?" y guarda la respuesta en rows.

LÍNEA 1 — rows será la lista de filas que devuelve MySQL. dbQuery envía la consulta y espera la respuesta.

LÍNEAS 2-4 — La consulta busca en la tabla roles y la une con rbac_role_permissions para saber qué casillas (ver, aprobar, verificar...) tiene marcadas ese rol.

LÍNEA 5 — WHERE LOWER(r.codigo) = ? significa: "solo trae el rol cuyo código, en minúsculas, sea igual al valor del hueco ?". El ? NO se escribe directo en el SQL; va aparte por seguridad.

LÍNEA 6 — [key] es la lista de valores para los huecos ?. Aquí key es el código del rol, por ejemplo 'director'. SI alguien intentara meter texto malicioso como ' OR 1=1, ENTONCES MySQL lo trata solo como texto a buscar, no como un comando.`,
      },
    ],
  },
  {
    pregunta: 'Pregunta 2 — bcrypt y auditoría',
    items: [
      {
        ruta: 'server/index.js',
        lineas: 'línea 973',
        codigo: `const passwordValida = await bcrypt.compare(password, usuario.password);
if (!passwordValida) {
  return res.status(401).json({ message: 'Credenciales inválidas' });
}`,
        interpretacion: `En palabras simples: al iniciar sesión, el servidor compara la contraseña escrita con la guardada (que está encriptada).

LÍNEA 1 — Se crea passwordValida. bcrypt.compare compara lo que escribió el usuario (password) con lo guardado en la base (usuario.password, que es un hash ilegible). SI coinciden, ENTONCES passwordValida es true (sí). SI no coinciden, ENTONCES es false (no).

LÍNEA 2 — SI passwordValida es falso (el signo ! significa "no", entonces !passwordValida = "la contraseña NO coincide"), ENTONCES entra al if.

LÍNEA 3 — ENTONCES termina el login y responde 401 ("credenciales inválidas"). No dice si falló el usuario o la contraseña, por seguridad.`,
      },
      {
        ruta: 'server/index.js',
        lineas: 'línea 1242',
        codigo: `const hashedPassword = await bcrypt.hash(password, 10);`,
        interpretacion: `En palabras simples: cuando el admin crea un usuario, la contraseña nunca se guarda tal cual; se transforma en un código ilegible.

LÍNEA única — Se crea hashedPassword. bcrypt.hash toma la contraseña en texto plano (password) y la convierte en un hash largo. El número 10 indica cuántas veces se repite el proceso (más alto = más difícil de adivinar para un atacante). Ese hashedPassword es lo único que se guarda en MySQL; la contraseña original no queda en la base.`,
      },
      {
        ruta: 'server/lib/auditLog.js',
        lineas: 'líneas 208-224',
        codigo: `await dbQuery(
  \`INSERT INTO audit_events
    (category, action, actor_email, ..., details_json, ...)
   VALUES (?,?,?,?,?,?,?,?,?,?)\`,
  [category, action, actorEmail, ...]
);`,
        interpretacion: `En palabras simples: cada acción importante deja una fila nueva en la tabla de auditoría; no se borra desde la aplicación.

LÍNEA 1 — El servidor envía la orden a MySQL y espera (await) a que termine de guardar.

LÍNEAS 2-4 — INSERT INTO audit_events significa "agrega una fila nueva". Los nombres entre paréntesis son las columnas (category, action, actor_email...). VALUES (?,?,?,...) son huecos: cada ? se rellena con un valor aparte, no pegado en el texto SQL.

LÍNEA 5 — La lista [category, action, actorEmail, ...] trae en orden los valores. category puede ser 'role' o 'contrato'; action puede ser 'user_created' o 'contrato_aprobado'; actorEmail es el correo de quien hizo la acción.`,
      },
      {
        ruta: 'server/lib/contratosAuditoria.js',
        lineas: 'líneas 246-263',
        codigo: `async function logContrato(req, { action, numero, empresa, details }) {
  await audit.logEvent({
    category: 'contrato',
    action,
    targetType: 'contrato',
    targetId: num,
    details,
  });
}`,
        interpretacion: `En palabras simples: cuando pasa algo con un contrato (aprobación, rechazo, etc.), esta función escribe el evento en auditoría.

LÍNEA 1 — logContrato recibe req (para saber quién e IP) y un paquete de datos: action (qué pasó), numero (número de contrato), empresa y details (motivo, etc.).

LÍNEA 2 — Llama a audit.logEvent y espera a que guarde en la base.

LÍNEA 3 — category: 'contrato' fija la categoría para poder filtrar en el módulo Auditoría.

LÍNEA 4 — action es la variable con el tipo de evento, por ejemplo 'contrato_rechazado'.

LÍNEAS 5-6 — targetType: 'contrato' dice "sobre qué tipo de cosa actuó". targetId es el número del contrato afectado.

LÍNEA 7 — details guarda el motivo, quién solicitó, quién aprobó, etc.`,
      },
    ],
  },
  {
    pregunta: 'Pregunta 3 — Pruebas de seguridad e inyección SQL',
    items: [
      {
        ruta: 'server/scripts/security-smoke-test.mjs',
        lineas: 'SEC-04',
        codigo: `// Inyección SQL en login
await request('POST', '/login', {
  body: { identifier: "' OR 1=1--", password: 'x' }
});
// Resultado esperado: 401 Credenciales inválidas`,
        interpretacion: `En palabras simples: esta prueba simula un atacante que intenta entrar sin contraseña real, usando un truco de inyección SQL.

LÍNEA 1 — Comentario que explica el propósito de la prueba.

LÍNEA 2 — request hace una petición POST (como enviar un formulario) a la dirección /login.

LÍNEA 3 — body trae los datos del formulario. identifier tiene el valor "' OR 1=1--", un truco clásico que en sistemas mal hechos intenta engañar al SQL. password es 'x', cualquier cosa.

RESULTADO — SI el sistema está bien hecho, ENTONCES responde 401 (no dejó entrar) y ok: true en el JSON de resultados significa "la prueba pasó".`,
      },
      {
        ruta: 'server/index.js',
        lineas: 'línea 925',
        codigo: `const sqlLogin = \`\${SQL_USUARIO_AUTH} WHERE (...)= LOWER(TRIM(?)) ...\`;
// El valor del usuario va en [identifier, identifier] — nunca concatenado al SQL`,
        interpretacion: `En palabras simples: el login busca al usuario con un hueco seguro (?), no pegando el texto del usuario dentro del SQL.

LÍNEA 1 — sqlLogin guarda el texto de la consulta. LOWER(TRIM(?)) limpia espacios y pone en minúsculas el valor que irá en el hueco ?. El usuario nunca se concatena directo al SQL.

LÍNEA comentario — Cuando se ejecuta, MySQL reemplaza cada ? con [identifier, identifier] de forma segura. SI alguien escribe ' OR 1=1--, ENTONCES se busca literalmente ese texto como nombre de usuario, no como comando SQL.`,
      },
      {
        ruta: 'docs/security-test-results.json',
        lineas: 'SEC-04 ok: true',
        codigo: `"id": "SEC-04",
"name": "Inyección SQL en login",
"ok": true,
"actualStatus": 401`,
        interpretacion: `En palabras simples: este JSON es la evidencia impresa de que la prueba de inyección SQL se ejecutó y funcionó.

"id": "SEC-04" — código de la prueba número 4.
"name": "Inyección SQL en login" — nombre legible.
"ok": true — SI ok es true, ENTONCES la prueba pasó bien.
"actualStatus": 401 — el servidor respondió 401, es decir, no dejó entrar al atacante.`,
      },
    ],
  },
  {
    pregunta: 'Pregunta 4 — Validación antes de aprobar',
    items: [
      {
        ruta: 'server/lib/contratosAprobacion.js',
        lineas: 'líneas 132-138',
        codigo: `const estado = normalizarAprobacionEstado(c.aprobacion_estado);
if (estado !== 'pendiente') {
  throw new Error('Este contrato no tiene una solicitud pendiente de aprobación.');
}`,
        interpretacion: `En palabras simples: antes de aprobar, el servidor comprueba que el contrato tenga una solicitud pendiente.

LÍNEA 1 — Se crea estado a partir de c.aprobacion_estado (columna de MySQL del contrato c). normalizarAprobacionEstado limpia mayúsculas y valores raros; estado queda como 'pendiente', 'aprobado', etc.

LÍNEA 2 — SI estado es diferente de (!==) 'pendiente', ENTONCES entra al if. !== significa "no es igual a". Ejemplo: SI estado es 'aprobado', ENTONCES ya no se puede aprobar otra vez.

LÍNEA 3 — ENTONCES lanza un error (throw) y detiene la operación con el mensaje "Este contrato no tiene una solicitud pendiente de aprobación".`,
      },
      {
        ruta: 'server/index.js',
        lineas: 'ruta POST /contratos/:numero/aprobar',
        codigo: `app.post('/contratos/:numero_contrato/aprobar',
  verificarToken,
  autorizarPermiso('contratos', 'approve'),
  async (req, res) => { ... });`,
        interpretacion: `En palabras simples: para aprobar un contrato hay que pasar dos filtros en orden; solo si los dos pasan se ejecuta la aprobación.

LÍNEA 1 — app.post define: "cuando llegue una petición POST a /contratos/:numero_contrato/aprobar...". :numero_contrato es un hueco, por ejemplo /contratos/C-001/aprobar.

LÍNEA 2 — Primer filtro: verificarToken. SI no hay token válido, ENTONCES responde 401 y no sigue.

LÍNEA 3 — Segundo filtro: autorizarPermiso('contratos', 'approve'). SI el rol no tiene permiso de aprobar contratos, ENTONCES responde 403 y no sigue.

LÍNEA 4 — SI pasó los dos filtros, ENTONCES ejecuta el código que realmente aprueba el contrato.`,
      },
    ],
  },
  {
    pregunta: 'Pregunta 5 — RBAC configurable (replicabilidad)',
    items: [
      {
        ruta: 'server/lib/rbac.js',
        lineas: 'RBAC_MODULES',
        codigo: `const RBAC_MODULES = [
  { codigo: 'usuarios', nombre: 'Usuarios' },
  { codigo: 'contratos', nombre: 'Contratos' },
  { codigo: 'auditoria', nombre: 'Auditoría' },
  { codigo: 'configuracion', nombre: 'Configuración' },
];`,
        interpretacion: `En palabras simples: esta lista define los módulos del sistema; cada uno puede tener permisos distintos por rol.

LÍNEA 1 — RBAC_MODULES es una lista (corchetes [ ]) de módulos.

LÍNEAS 2-5 — Cada módulo tiene codigo (nombre corto en programación, ej. 'usuarios') y nombre (texto que ve el admin, ej. 'Usuarios'). Los módulos son: usuarios, contratos, auditoría y configuración.

Cada módulo puede tener permisos: ver, crear, editar, borrar, exportar, aprobar, verificar. Otra empresa puede reutilizar esta lista y solo cambiar roles y permisos en MySQL, sin reprogramar el servidor.`,
      },
      {
        ruta: 'client/src/components/GestionRoles.jsx',
        lineas: 'pantalla completa',
        codigo: `// Interfaz donde el admin asigna permisos view/create/edit/approve/verify
// por módulo sin reprogramar el servidor`,
        interpretacion: `En palabras simples: pantalla donde el administrador marca casillas de permisos por rol, sin tocar código del servidor.

view = permiso de ver el módulo.
create = crear registros.
edit = modificar.
approve = aprobar contratos (director).
verify = verificar jurídicamente (abogado).

SI el admin marca una casilla y guarda, ENTONCES se escribe en MySQL. El servidor lee esos permisos de la base cada vez que alguien intenta hacer algo; no hace falta reprogramarlo.`,
      },
    ],
  },
  {
    pregunta: 'Pregunta 6 — Recordatorios (base de datos para IA futura)',
    items: [
      {
        ruta: 'server/lib/contratosMensajes.js',
        lineas: 'líneas 7-20',
        codigo: `const ACTIONS_VIEW = ['contrato_aprobado', 'contrato_rechazado', ...];
const ACTIONS_VERIFY = ['contrato_edicion_solicitada', ...];
const ACTIONS_APPROVE = ['contrato_verificacion_juridica_aprobada'];`,
        interpretacion: `En palabras simples: estas listas definen qué tipos de mensajes ve cada permiso en el icono Mensajes del menú.

LÍNEA 1 — ACTIONS_VIEW: tipos de mensaje para quien tiene permiso de ver contratos (aprobado, rechazado...).

LÍNEA 2 — ACTIONS_VERIFY: mensajes de solicitudes (editar, cancelar, eliminar) para el abogado (permiso verify).

LÍNEA 3 — ACTIONS_APPROVE: mensaje "ya pasó jurídico, falta aprobar" para el director (permiso approve).

Los corchetes [ ] son listas de textos. El icono Mensajes cuenta cuántos eventos de estas listas el usuario aún no ha leído.`,
      },
      {
        ruta: 'client/src/lib/contratosPdfPreview.js',
        lineas: 'líneas 25-28',
        codigo: `export async function loadPdfDocument(dataUrl) {
  const task = pdfjsLib.getDocument({ data });
  return task.promise;
}`,
        interpretacion: `En palabras simples: carga un PDF en el navegador (incluso en móvil) a partir de los datos que vienen del servidor.

LÍNEA 1 — loadPdfDocument recibe dataUrl: una cadena larga con el PDF codificado (base64).

LÍNEA 2 — task es la tarea de lectura. pdfjsLib.getDocument({ data }) le dice a la librería PDF.js: "abre este PDF desde la memoria".

LÍNEA 3 — return task.promise devuelve una promesa: "cuando termine de cargar, entrega el documento". En otro archivo esperan (await) esa promesa y dibujan cada página en pantalla.`,
      },
    ],
  },
];

function buildFragmentosCodigo() {
  const children = [
    txt('Fragmentos de código — Oponencia AEPG', { center: true, bold: true, size: 32 }),
    txt('Copias literales del programa con ruta de archivo', { center: true, size: 24 }),
    txt(`Fecha: ${FECHA}`, { center: true, spacing: { after: 400 } }),
    txt(
      'Cada bloque tiene: (1) el código exacto, (2) traducción en español llano con frases del tipo "SI la variable X cumple esto, ENTONCES hace aquello". Al inicio de cada bloque hay un resumen "En palabras simples".',
      { spacing: { after: 200 } }
    ),
    h2('Símbolos que verá repetidos'),
    bullet('const / let = crear una variable (caja donde guardamos un valor).'),
    bullet('= = asignar un valor a la variable (poner algo en la caja).'),
    bullet('=== = "es exactamente igual a" (compara valor y tipo).'),
    bullet('!== = "es diferente de".'),
    bullet('< = "es menor que". > = "es mayor que".'),
    bullet('! = negación: !token significa "no hay token" o "token es falso".'),
    bullet('&& = "y además" (las dos cosas deben cumplirse).'),
    bullet('? en SQL = hueco donde va un valor seguro aparte (evita inyección).'),
    bullet('[0] y [1] = primer y segundo elemento de una lista partida por split.'),
    bullet('return = terminar la función y devolver respuesta al navegador.'),
    bullet('await = esperar a que termine algo lento (base de datos) antes de seguir.'),
    bullet('=> = "función flecha": define una función corta en una línea.'),
    txt('', { spacing: { after: 200 } }),
  ];

  for (const sec of FRAGMENTOS) {
    children.push(h1(sec.pregunta));
    for (const item of sec.items) {
      children.push(...codeBlock(item.ruta, item.lineas, item.codigo, item.interpretacion));
    }
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

function writeBufferWithFallback(primaryPath, buffer, label) {
  try {
    fs.writeFileSync(primaryPath, buffer);
    console.log('[ok]', primaryPath);
    return primaryPath;
  } catch (e) {
    if (e.code !== 'EBUSY') throw e;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const alt = primaryPath.replace(/\.docx$/, `_${stamp}.docx`);
    fs.writeFileSync(alt, buffer);
    console.log(`[ok] ${label} bloqueado; guardado como:`, alt);
    return alt;
  }
}

async function writeDoc(doc, filename) {
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeBufferWithFallback(path.join(OUT_DIR, filename), buffer, 'Archivo');
  writeBufferWithFallback(path.join(DOCS_USER, filename), buffer, 'Documents');
}

async function main() {
  await writeDoc(buildGuionOral(), 'GUION_DEFENSA_ORAL.docx');
  await writeDoc(buildGuiaArchivos(), 'GUIA_BUSCAR_ARCHIVOS_DEFENSA.docx');
  await writeDoc(buildFragmentosCodigo(), 'FRAGMENTOS_CODIGO_OPONENCIA.docx');
  console.log('\nListo. Tres documentos en docs/informes/ y copia en Documents.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
