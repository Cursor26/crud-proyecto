/**
 * Genera INFORME_SEGURIDAD_AEPG.docx para la defensa de tesis.
 * Ejecutar desde server: node scripts/generate-informe-seguridad-docx.mjs
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
  VerticalAlignTable,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');
const CRUD_ROOT = path.join(SERVER_ROOT, '..');
const OUT_REPO = path.join(CRUD_ROOT, 'docs', 'INFORME_SEGURIDAD_AEPG.docx');
const OUT_USER = path.join(process.env.USERPROFILE || '', 'Documents', 'INFORME_SEGURIDAD_AEPG.docx');
const TEST_RESULTS = path.join(CRUD_ROOT, 'docs', 'security-test-results.json');

const FECHA = new Date().toLocaleDateString('es-ES', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const HALLAZGOS = [
  {
    id: 'H-01',
    debilidad: 'Secreto JWT hardcodeado en el código fuente',
    riesgo: 'Crítico',
    prueba: 'Revisión de server/index.js: existía fallback en texto plano si faltaba .env',
    correccion:
      'Módulo securityConfig.js: JWT_SECRET obligatorio en producción (≥32 caracteres). En desarrollo solo clave temporal con aviso en consola.',
    estado: 'Corregido',
  },
  {
    id: 'H-02',
    debilidad: 'CORS abierto a cualquier origen',
    riesgo: 'Alto',
    prueba: 'Petición con Origin malicioso; antes cualquier sitio podía llamar a la API',
    correccion: 'Lista blanca CORS_ORIGINS / APP_BASE_URL en server/.env',
    estado: 'Corregido',
  },
  {
    id: 'H-03',
    debilidad: 'Sin límite de peticiones HTTP (rate limit)',
    riesgo: 'Medio',
    prueba: 'express-rate-limit instalado pero no aplicado en rutas',
    correccion: 'Límites en login (30/15 min), recuperación de contraseña (10/h) y API general (400/min)',
    estado: 'Corregido',
  },
  {
    id: 'H-04',
    debilidad: 'Cabeceras HTTP de endurecimiento ausentes',
    riesgo: 'Medio',
    prueba: 'Respuestas sin X-Content-Type-Options ni protecciones Helmet',
    correccion: 'Middleware helmet en Express',
    estado: 'Corregido',
  },
  {
    id: 'H-05',
    debilidad: 'Recuperación de contraseña aceptaba contraseñas débiles',
    riesgo: 'Medio',
    prueba: 'POST /auth/reset-password con "12345678" solo comprobaba longitud',
    correccion: 'Misma política passwordFuerte que en alta y cambio de contraseña (8+ chars, mayúscula, minúscula, número)',
    estado: 'Corregido',
  },
  {
    id: 'H-06',
    debilidad: 'Clave de cifrado SMTP con fallback débil',
    riesgo: 'Medio',
    prueba: 'sistemaCorreo.js usaba clave por defecto distinta del JWT',
    correccion: 'deriveKey() usa resolveJwtSecret() compartido',
    estado: 'Corregido',
  },
  {
    id: 'H-07',
    debilidad: 'Token JWT almacenado en localStorage (cliente)',
    riesgo: 'Medio-bajo',
    prueba: 'Revisión client/src/App.js — persistencia en localStorage',
    correccion: 'Documentado como mejora futura (cookies httpOnly + SameSite). Mitigación actual: validación servidor, expiración 8 h, RBAC',
    estado: 'Aceptado / mejora futura',
  },
];

const MEDIDAS_EXISTENTES = [
  'Autenticación con bcrypt (hash de contraseñas, nunca en texto plano).',
  'JWT con caducidad de 8 horas; middleware verificarToken en rutas sensibles.',
  'Control de acceso por roles (RBAC): autorizarRol y autorizarPermiso según módulo/acción.',
  'Bloqueo tras 5 intentos fallidos de login (15 min) con registro en audit_failed_logins.',
  'Consultas SQL parametrizadas (mysql2) — protección frente a inyección SQL.',
  'Auditoría de sesiones, eventos y logins fallidos (tablas audit_*).',
  'Tokens de reset de contraseña hasheados (SHA-256), un solo uso y TTL 30 min.',
  'Usuarios inactivos rechazados en login.',
];

function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlignTable.CENTER,
    shading: opts.header ? { fill: 'E8F5E9', type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: String(text), bold: Boolean(opts.header), size: 22 })],
      }),
    ],
  });
}

function hallazgosTable() {
  const header = new TableRow({
    children: [
      cell('ID', { header: true, width: 8 }),
      cell('Debilidad', { header: true, width: 22 }),
      cell('Riesgo', { header: true, width: 10 }),
      cell('Corrección aplicada', { header: true, width: 35 }),
      cell('Estado', { header: true, width: 12 }),
    ],
  });
  const rows = HALLAZGOS.map((h) =>
    new TableRow({
      children: [
        cell(h.id),
        cell(h.debilidad),
        cell(h.riesgo),
        cell(h.correccion),
        cell(h.estado),
      ],
    })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] });
}

function testResultsSection() {
  const paras = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Anexo A — Resultados de pruebas automatizadas')],
    }),
  ];

  if (!fs.existsSync(TEST_RESULTS)) {
    paras.push(
      new Paragraph({
        children: [
          new TextRun(
            'Ejecute node scripts/security-smoke-test.mjs con el servidor en marcha para generar docs/security-test-results.json.'
          ),
        ],
      })
    );
    return paras;
  }

  const data = JSON.parse(fs.readFileSync(TEST_RESULTS, 'utf8'));
  paras.push(
    new Paragraph({
      children: [
        new TextRun(
          `Fecha de ejecución: ${data.executedAt}. API: ${data.apiBase}. Resultado: ${data.passed}/${data.total} pruebas superadas.`
        ),
      ],
    })
  );

  const header = new TableRow({
    children: [
      cell('ID', { header: true }),
      cell('Prueba', { header: true }),
      cell('Resultado', { header: true }),
      cell('HTTP', { header: true }),
    ],
  });
  const rows = (data.results || []).map(
    (r) =>
      new TableRow({
        children: [
          cell(r.id),
          cell(r.name),
          cell(r.ok ? 'OK' : 'KO', { center: true }),
          cell(String(r.actualStatus), { center: true }),
        ],
      })
  );
  paras.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] }));
  return paras;
}

function buildDocument() {
  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Informe de seguridad', bold: true, size: 36 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Sistema de gestión — Pecuaria Genética (AEPG)\nAuditoría y endurecimiento de la API',
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Fecha: ${FECHA}`, italics: true })],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('1. Resumen ejecutivo')],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'Se realizó una revisión de seguridad del backend (Node.js/Express) y del cliente React, ' +
                  'identificando debilidades en la configuración del servidor y en la política de contraseñas del flujo de recuperación. ' +
                  'Se aplicaron correcciones (secreto JWT, CORS, rate limiting, Helmet y validación de contraseñas) y se ejecutaron pruebas automatizadas ' +
                  'de autenticación, autorización e inyección. El sistema ya contaba con medidas sólidas (bcrypt, RBAC, auditoría de login y consultas parametrizadas).'
              ),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('2. Alcance y metodología')],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'Alcance: API REST en server/index.js, librerías server/lib/*, configuración .env y persistencia de sesión en el cliente.'
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'Metodología: (1) revisión estática del código alineada con OWASP Top 10 (autenticación rota, control de acceso, inyección, configuración incorrecta); ' +
                  '(2) pruebas dinámicas con script security-smoke-test.mjs (peticiones HTTP sin interfaz gráfica); ' +
                  '(3) documentación de hallazgos y correcciones.'
              ),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('3. Hallazgos y correcciones')],
          }),
          hallazgosTable(),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
            children: [new TextRun('4. Medidas de seguridad ya existentes (no modificadas)')],
          }),
          ...MEDIDAS_EXISTENTES.map(
            (t) =>
              new Paragraph({
                bullet: { level: 0 },
                children: [new TextRun(t)],
              })
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
            children: [new TextRun('5. Guía para la defensa ante el tribunal')],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '¿Qué es la seguridad en esta aplicación? ', bold: true }),
              new TextRun(
                'Es garantizar que solo usuarios identificados accedan al sistema, que cada uno solo pueda hacer lo que permite su rol, ' +
                  'y que los datos (contratos, empleados, usuarios) no puedan ser alterados por ataques típicos de internet.'
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '¿Qué probé? ', bold: true }),
              new TextRun(
                'Intentos de acceso sin token, tokens falsos, login con contraseña incorrecta, inyección SQL en el login, contraseñas débiles en recuperación, ' +
                  'creación de usuarios sin permiso y comprobación de cabeceras HTTP y CORS.'
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '¿Qué corregí? ', bold: true }),
              new TextRun(
                'La configuración del servidor: ya no hay clave JWT en el código, solo orígenes autorizados pueden llamar a la API desde el navegador, ' +
                  'hay límites de intentos por minuto, cabeceras de protección del navegador y la misma regla de contraseña fuerte en todos los flujos.'
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '¿Qué queda como mejora futura? ', bold: true }),
              new TextRun(
                'Guardar el token en cookies httpOnly en lugar de localStorage (reduce riesgo si hubiera XSS) y un análisis de penetración externo antes de producción pública.'
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Frase resumen: ', bold: true }),
              new TextRun(
                '"Identifiqué debilidades de configuración, las corregí con pruebas documentadas, y el control de acceso por roles y la auditoría ya estaban implementados desde el diseño funcional."'
              ),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400 },
            children: [new TextRun('6. Configuración recomendada en producción')],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun('Definir JWT_SECRET con al menos 32 caracteres aleatorios en server/.env (nunca en el repositorio).')],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun('NODE_ENV=production para exigir JWT_SECRET válido al arrancar.')],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun('CORS_ORIGINS con la URL real del frontend (HTTPS).')],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun('Mantener MySQL accesible solo desde la red interna o localhost.')],
          }),

          ...testResultsSection(),
        ],
      },
    ],
  });
}

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT_REPO), { recursive: true });
  fs.writeFileSync(OUT_REPO, buffer);
  console.log('Informe generado:', OUT_REPO);

  try {
    fs.mkdirSync(path.dirname(OUT_USER), { recursive: true });
    fs.writeFileSync(OUT_USER, buffer);
    console.log('Copia en Documentos:', OUT_USER);
  } catch {
    console.warn('No se pudo copiar a Documentos del usuario.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
