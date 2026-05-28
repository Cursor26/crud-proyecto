/**
 * Genera MODELO_BD_COMPLETO.png — ER estilo Visual Paradigm (todas las tablas).
 * node "esta es/scripts/generar-modelo-completo.mjs"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.join(__dirname, '..', 'bd_crud_normalizada.sql');
const OUT_PNG = path.join(__dirname, '..', 'imagenes', 'MODELO_BD_COMPLETO.png');
const OUT_DOT = path.join(__dirname, '..', 'diagramas', 'MODELO_BD_COMPLETO.dot');
const OUT_SVG = path.join(__dirname, '..', 'imagenes', 'MODELO_BD_COMPLETO.svg');

function parseSchema(sql) {
  const tables = {};
  const fks = [];
  const reTable = /CREATE TABLE `?(\w+)`?\s*\(([\s\S]*?)\)\s*ENGINE/gi;
  let m;
  while ((m = reTable.exec(sql)) !== null) {
    const name = m[1];
    const body = m[2];
    const cols = [];
    const pk = new Set();
    for (const line of body.split('\n')) {
      const pkM = line.match(/PRIMARY KEY\s*\(`?([^`)]+)`?\)/i);
      if (pkM) pkM[1].split(',').map((s) => s.trim().replace(/`/g, '')).forEach((c) => pk.add(c));
      const colM = line.match(/^\s*`?(\w+)`?\s+([A-Z][A-Z0-9 (),.'"]+)/i);
      if (colM && !/^(PRIMARY|UNIQUE|KEY|CONSTRAINT|FOREIGN)/i.test(colM[1])) {
        const colName = colM[1];
        let type = colM[2].split(/\s+NOT\s+|\s+DEFAULT|\s+COMMENT|\s+AUTO_INCREMENT|,?\s*$/i)[0].trim();
        if (type.length > 28) type = type.slice(0, 26) + '…';
        cols.push({ name: colName, type, pk: false, fk: false });
      }
      const fkM = line.match(/CONSTRAINT\s+\w+\s+FOREIGN KEY\s*\(`?([^`)]+)`?\)\s*REFERENCES\s+`?(\w+)`?\s*\(`?([^`)]+)`?\)/i);
      if (fkM) {
        fks.push({ from: name, fromCol: fkM[1], to: fkM[2], toCol: fkM[3] });
      }
    }
    cols.forEach((c) => {
      if (pk.has(c.name)) c.pk = true;
    });
    fks.filter((f) => f.from === name).forEach((f) => {
      const col = cols.find((c) => c.name === f.fromCol);
      if (col) col.fk = true;
    });
    tables[name] = { cols, pk: [...pk] };
  }
  return { tables, fks };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tableNode(name, table) {
  const rows = table.cols
    .map((c) => {
      const mark = c.pk ? '<FONT COLOR="#C00000">PK</FONT>' : c.fk ? '<FONT COLOR="#0070C0">FK</FONT>' : '';
      return `<TR><TD ALIGN="LEFT"><FONT POINT-SIZE="11">${escHtml(c.name)}</FONT></TD><TD ALIGN="LEFT"><FONT POINT-SIZE="10">${escHtml(c.type)}</FONT></TD><TD>${mark}</TD></TR>`;
    })
    .join('');
  return `${name} [label=<
<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="3" BGCOLOR="#FFFFFF" COLOR="#333333">
<TR><TD COLSPAN="3" BGCOLOR="#2E5090"><FONT COLOR="#FFFFFF"><B>${escHtml(name)}</B></FONT></TD></TR>
<TR><TD><B>Atributo</B></TD><TD><B>Tipo</B></TD><TD><B>Clave</B></TD></TR>
${rows}
</TABLE>
> shape=plaintext margin="0.12,0.08"];`;
}

function assignCluster(table) {
  if (['roles', 'usuarios', 'password_reset_tokens'].includes(table)) return 'usuarios';
  if (table.startsWith('catalogo_') || table === 'contratos_generales') return 'contratos';
  if (table.startsWith('prod_') || table.startsWith('historico_produccion')) return 'produccion';
  return 'rrhh';
}

function buildDot({ tables, fks }) {
  const clusters = { usuarios: [], contratos: [], rrhh: [], produccion: [] };
  for (const t of Object.keys(tables).sort()) {
    clusters[assignCluster(t)].push(t);
  }

  const clusterBlocks = Object.entries(clusters)
    .map(([id, list]) => {
      if (!list.length) return '';
      const nodes = list.map((t) => `    ${tableNode(t, tables[t])}`).join('\n');
      const label = { usuarios: 'Usuarios y seguridad', contratos: 'Contratación', rrhh: 'Recursos Humanos', produccion: 'Producción' }[id];
      return `  subgraph cluster_${id} {
    label="${label}";
    style=filled;
    color="#E8EEF7";
    fontsize=14;
    fontname="Segoe UI";
${nodes}
  }`;
    })
    .join('\n\n');

  const edges = fks
    .map((f) => {
      const label = `${f.fromCol}`;
      return `  ${f.from}:${f.fromCol} -> ${f.to}:${f.toCol} [label="${label}", fontsize=10, color="#555555", fontcolor="#333333"];`;
    })
    .join('\n');

  return `digraph MODELO_BD_CRUD {
  graph [
    rankdir=LR
    splines=ortho
    nodesep=0.35
    ranksep=1.4
    bgcolor="#FAFAFA"
    pad=0.6
    fontsize=11
    fontname="Segoe UI"
    label="Modelo Entidad-Relación — bd_crud (normalizado 3FN)\\nTodas las tablas, atributos y relaciones"
    labelloc=t
    fontsize=16
  ];
  node [fontname="Segoe UI"];
  edge [arrowsize=0.7];

${clusterBlocks}

${edges}
}
`;
}

async function krokiRender(dot, format) {
  const res = await fetch(`https://kroki.io/graphviz/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: dot,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Kroki ${format}: ${res.status} ${err.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function renderWithKroki(dot) {
  const svgBuf = await krokiRender(dot, 'svg');
  fs.writeFileSync(OUT_SVG, svgBuf);
  const pngBuf = await krokiRender(dot, 'png');
  fs.writeFileSync(OUT_PNG, pngBuf);
  return 'kroki';
}

async function renderWithVizJs(dot) {
  const { instance } = await import('@viz-js/viz');
  const viz = await instance();
  const svg = await viz.renderSVGElement(dot);
  fs.writeFileSync(OUT_SVG, svg);
  const png = await viz.renderPNG(dot, { scale: 2 });
  fs.writeFileSync(OUT_PNG, Buffer.from(png));
  return 'viz-js';
}

async function renderPng(dot) {
  try {
    return await renderWithKroki(dot);
  } catch (e) {
    console.warn('Kroki falló:', e.message);
    try {
      return await renderWithVizJs(dot);
    } catch (e2) {
      throw new Error(`No se pudo renderizar: Kroki (${e.message}); viz-js (${e2.message})`);
    }
  }
}

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const schema = parseSchema(sql);
  const dot = buildDot(schema);
  fs.mkdirSync(path.dirname(OUT_DOT), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });
  fs.writeFileSync(OUT_DOT, dot, 'utf8');
  console.log('Tablas:', Object.keys(schema.tables).length);
  console.log('Relaciones FK:', schema.fks.length);
  console.log('DOT:', OUT_DOT);
  const mode = await renderPng(dot);
  console.log('Exportado (' + mode + '):', OUT_PNG);
  console.log('SVG (vectorial):', OUT_SVG);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
