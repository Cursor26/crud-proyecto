import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REQUISITOS_FUNCIONALES } from './rf-catalogo-data.mjs';

const CRUD_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_MD = path.join(CRUD_ROOT, 'docs', 'CATALOGO_REQUISITOS_FUNCIONALES.md');
const OUT_MD_ALT = path.join(CRUD_ROOT, 'docs', 'CATALOGO_RF_54.md');

function ordinalFromCode(code) {
  const m = String(code).match(/(\d+)/);
  return m ? String(parseInt(m[1], 10)) : '1';
}

const lines = [
  '# Catálogo de requisitos funcionales — Sistema de Gestión Empresarial (AEPG)',
  '',
  `Derivado del código activo (\`client/\` + \`server/index.js\`). **${REQUISITOS_FUNCIONALES.length} requisitos funcionales principales** con sub-requisitos derivados.`,
  '',
];

for (const req of REQUISITOS_FUNCIONALES) {
  const ord = ordinalFromCode(req.code);
  lines.push('---', '');
  lines.push(`## ${req.code} — ${req.titulo}`);
  lines.push('');
  lines.push(`**Descripción general:** ${req.descripcionGeneral}`);
  lines.push('');
  lines.push('| Sub | Nombre | Descripción |');
  lines.push('|-----|--------|-------------|');
  (req.subs || []).forEach((sub, i) => {
    lines.push(`| ${ord}.${i + 1} | ${sub.nombre} | ${sub.desc} |`);
  });
  lines.push('');
}

const content = lines.join('\n');
let written = false;
for (const target of [OUT_MD, OUT_MD_ALT]) {
  try {
    fs.writeFileSync(target, content, 'utf8');
    console.log('OK:', target);
    written = true;
    break;
  } catch (err) {
    console.warn(`No se pudo escribir ${target}:`, err.message);
  }
}
if (!written) process.exit(1);
