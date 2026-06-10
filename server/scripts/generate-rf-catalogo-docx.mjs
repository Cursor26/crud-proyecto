/**
 * Genera CATALOGO_REQUISITOS_FUNCIONALES.docx y .md
 * Tabla: CÓDIGO | TIPO | NOMBRE | DESCRIPCIÓN (sub-requisitos N.1, N.2…)
 * Ejecutar desde server: node scripts/generate-rf-catalogo-docx.mjs
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
import { REQUISITOS_FUNCIONALES } from './rf-catalogo-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRUD_ROOT = path.join(__dirname, '..', '..');
const OUT_DOCX = path.join(CRUD_ROOT, 'docs', 'CATALOGO_REQUISITOS_FUNCIONALES.docx');
const OUT_MD = path.join(CRUD_ROOT, 'docs', 'CATALOGO_REQUISITOS_FUNCIONALES.md');
const OUT_USER = path.join(
  process.env.USERPROFILE || '',
  'Documents',
  'requisitos',
  'CATALOGO_REQUISITOS_FUNCIONALES.docx'
);

const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };

function ordinalFromCode(code) {
  const m = String(code).match(/(\d+)/);
  return m ? String(parseInt(m[1], 10)) : '1';
}

function headerCell(text) {
  return new TableCell({
    shading: { fill: 'D9EAD3', type: ShadingType.CLEAR },
    verticalAlign: VerticalAlignTable.TOP,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 22 })] })],
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
  const emptyPara = () => new Paragraph({ children: [new TextRun({ text: '', size: 20 })] });
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
  const subs = (req.subs || []).map((sub, i) => ({
    nombre: `${ord}.${i + 1} ${sub.nombre}`,
    desc: `${ord}.${i + 1}. ${sub.desc}`,
  }));

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

function exportMarkdown(items) {
  const lines = [
    '# Catálogo de requisitos funcionales — Sistema de Gestión Empresarial (AEPG)',
    '',
    `Derivado del código activo (\`client/\` + \`server/index.js\`). **${items.length} requisitos funcionales principales** con sub-requisitos derivados.`,
    '',
  ];
  for (const req of items) {
    const ord = ordinalFromCode(req.code);
    lines.push(`---`, '');
    lines.push(`## ${req.code} — ${req.titulo}`);
    lines.push('');
    lines.push(`**Descripción general:** ${req.descripcionGeneral}`);
    lines.push('');
    lines.push('| Sub | Nombre | Descripción |');
    lines.push('|-----|--------|-------------|');
    (req.subs || []).forEach((sub, i) => {
      const n = `${ord}.${i + 1}`;
      lines.push(`| ${n} | ${sub.nombre} | ${sub.desc} |`);
    });
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const headers = [
    'CÓDIGO',
    'TIPO REQUISITO',
    'NOMBRE DEL REQUISITO FUNCIONAL',
    'DESCRIPCIÓN DEL REQUISITO FUNCIONAL',
  ];

  const intro =
    `Catálogo de ${REQUISITOS_FUNCIONALES.length} requisitos funcionales del Sistema de Gestión Empresarial (AEPG), derivado del comportamiento implementado en la aplicación React (client/) y la API Express (server/index.js). Solo incluye módulos presentes en la interfaz actual: Contratación, Usuarios, Roles RBAC, Auditoría, Correo del sistema y Configuración.`;

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
              new TextRun({ text: 'Catálogo de requisitos funcionales', bold: true, size: 36 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'Sistema de Gestión Empresarial — Proyecto AEPG', size: 26 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Generado: ${new Date().toLocaleString('es-ES')} — ${REQUISITOS_FUNCIONALES.length} RF principales`,
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
          requirementTable(headers, REQUISITOS_FUNCIONALES),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT_DOCX), { recursive: true });
  fs.writeFileSync(OUT_DOCX, buffer);
  console.log('Generado DOCX:', OUT_DOCX);

  const mdContent = exportMarkdown(REQUISITOS_FUNCIONALES);
  const mdTmp = `${OUT_MD}.tmp`;
  fs.writeFileSync(mdTmp, mdContent, 'utf8');
  try {
    if (fs.existsSync(OUT_MD)) fs.unlinkSync(OUT_MD);
    fs.renameSync(mdTmp, OUT_MD);
  } catch {
    fs.writeFileSync(OUT_MD, mdContent, 'utf8');
    try {
      fs.unlinkSync(mdTmp);
    } catch {
      /* ignore */
    }
  }
  console.log('Generado MD:', OUT_MD);

  try {
    fs.mkdirSync(path.dirname(OUT_USER), { recursive: true });
    fs.writeFileSync(OUT_USER, buffer);
    console.log('Copia DOCX:', OUT_USER);
  } catch {
    console.warn('No se pudo copiar a Documentos/requisitos');
  }

  console.log(`Total: ${REQUISITOS_FUNCIONALES.length} RF principales`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
