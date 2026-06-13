/**
 * Genera RESPUESTAS_OPONENCIA.docx para la defensa de tesis.
 * Ejecutar desde server: node scripts/generate-respuestas-oponencia-docx.mjs
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
const OUT_REPO = path.join(CRUD_ROOT, 'docs', 'informes', 'RESPUESTAS_OPONENCIA.docx');
const OUT_USER = path.join(
  process.env.USERPROFILE || '',
  'Documents',
  'RESPUESTAS_OPONENCIA.docx'
);

const FECHA = new Date().toLocaleDateString('es-ES', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function p(text, opts = {}) {
  return new Paragraph({
    heading: opts.heading,
    spacing: opts.spacing,
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

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 22 })],
  });
}

const SECCIONES = [
  {
    titulo: 'Pregunta 1 — RBAC en backend y prevención de bypass desde React',
    parrafos: [
      'El control de acceso se implementó con defensa en profundidad: React solo oculta acciones; toda autorización efectiva ocurre en el servidor (never trust the client).',
      'Capas: (1) verificarToken — JWT, blacklist, usuario activo; (2) autorizarRol / autorizarPermiso contra rbac_role_permissions en MySQL; (3) permisos NO van en el token, se reconsultan por petición; (4) rbacPathRules.js infiere módulo/acción por ruta.',
      'Prevención de escalamiento: solo admin crea usuarios; no auto-cambio de rol; roles de sistema protegidos; RBAC exige permisos usuarios.*.',
      'Evidencia: server/index.js, server/lib/rbac.js, client/src/context/PermissionsContext.jsx.',
    ],
  },
  {
    titulo: 'Pregunta 2 — Hash de contraseñas e inmutabilidad de auditoría',
    parrafos: [
      'Contraseñas: bcrypt, factor 10 rounds, solo hash en BD, bcrypt.compare en login, política passwordFuerte (8+ chars, mayúscula, minúscula, número). Bloqueo tras 5 intentos, rate limiting, invalidación JWT al cambiar contraseña.',
      'Auditoría: audit_events append-only (solo INSERT desde app), auditLog.js, contratosAuditoria.js. Admin consulta pero no borra historial desde la UI.',
      'Matiz: inmutabilidad lógica de aplicación, no ledger criptográfico. Mejora futura: triggers en BD o réplica solo lectura.',
    ],
  },
  {
    titulo: 'Pregunta 3 — Pruebas de seguridad, OWASP e inyección SQL',
    parrafos: [
      'Metodología: (1) revisión estática OWASP Top 10 → INFORME_SEGURIDAD_AEPG.docx; (2) 10 smoke tests → security-smoke-test.mjs, security-test-results.json (10/10 OK); (3) audit-api-auth.mjs.',
      'SEC-04: inyección SQL en login → 401. Consultas parametrizadas mysql2 en todo el API.',
      'Matiz honesto: no pentest externo (Burp/ZAP); no fuzzing exhaustivo; no suite Jest. OWASP es marco de revisión, no certificación.',
    ],
  },
  {
    titulo: 'Pregunta 4 — Consistencia transaccional en aprobaciones',
    parrafos: [
      'Aclaración: el sistema NO modela inventario ni presupuesto; gestiona ciclo de vida contractual y expediente digital.',
      'Consistencia: máquina de estados por contrato; validación optimista (aprobacion_estado === pendiente) en contratosAprobacion.js; aprobaciones paralelas son UPDATEs independientes por numero_contrato.',
      'Matiz: no hay BEGIN/COMMIT explícitos; archivado multi-paso en contratosArchivo.js. Mejora futura: transacciones SQL.',
    ],
  },
  {
    titulo: 'Pregunta 5 — Acoplamiento AEPG y replicabilidad',
    parrafos: [
      'Acoplamiento medio-bajo: ~70% plataforma transversal (auth, RBAC, workflow, expediente, recordatorios, auditoría) / ~30% reglas locales (branding AEPG, roles hardcodeados, semillas catálogo).',
      'Replicable en empresas del grupo con proceso similar (contratación → jurídico → director → archivo). Adaptación: RBAC, catálogos, plantillas correo, REACT_APP_EMPRESA_NOMBRE. Multi-empresa: fase 2.',
    ],
  },
  {
    titulo: 'Pregunta 6 — Inteligencia artificial predictiva',
    parrafos: [
      'Hoy: recordatorios reactivos (contratosRecordatorios.js). Futuro: capa predictiva sobre audit_events, vencimientos, rechazos, tiempos de aprobación.',
      'Modelos recomendados: clasificación supervisada (Random Forest/XGBoost), análisis de supervivencia, detección de anomalías. Evitar deep learning en PDFs (baja explicabilidad).',
      'Beneficios: menos vencimientos no gestionados, priorización de contratos de riesgo, ROI medible.',
    ],
  },
];

function buildDocument() {
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Respuestas para la Oponencia',
          bold: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'Sistema de Gestión de Contratos — AEPG\nEmpresa Pecuaria Genética Valle del Perú',
          size: 24,
        }),
      ],
    }),
    p(`Fecha: ${FECHA}`, { italics: true, spacing: { after: 400 } }),
    p(
      'Documento de apoyo para la defensa de tesis. Las respuestas están fundamentadas en el código fuente del repositorio (Node.js/Express, React, MySQL). Complementos: CAPITULO_4_PRUEBAS_SEGURIDAD_ALINEADO.md, GUIA_DEMO_DEFENSA_TESIS.md.',
      { spacing: { after: 300 } }
    ),
  ];

  for (const sec of SECCIONES) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300 },
        children: [new TextRun({ text: sec.titulo, bold: true, size: 26 })],
      })
    );
    for (const texto of sec.parrafos) {
      children.push(p(texto, { spacing: { after: 120 } }));
    }
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400 },
      children: [new TextRun({ text: 'Recomendaciones para la defensa oral', bold: true, size: 26 })],
    }),
    bullet('Citar archivos concretos: rbac.js, security-smoke-test.mjs, contratosAprobacion.js.'),
    bullet('Anticipar matices: inmutabilidad lógica, sin pentest formal, sin transacciones SQL explícitas.'),
    bullet('Pregunta 4: reconducir al alcance contractual-documental.'),
    bullet('Demostración en vivo: ver GUIA_DEMO_DEFENSA_TESIS.md.')
  );

  return new Document({ sections: [{ properties: {}, children }] });
}

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT_REPO), { recursive: true });
  fs.writeFileSync(OUT_REPO, buffer);
  console.log('[ok] Generado:', OUT_REPO);
  try {
    fs.writeFileSync(OUT_USER, buffer);
    console.log('[ok] Copia:', OUT_USER);
  } catch (err) {
    console.warn('[warn] No se pudo copiar a Documents:', err.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
