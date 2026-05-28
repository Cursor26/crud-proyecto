/**
 * Genera MODELO_BD_COMPLETO.html — diagrama ER con flechas (zoom, clic en tablas).
 * node "esta es/scripts/generar-modelo-html.mjs"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.join(__dirname, '..', 'bd_crud_normalizada.sql');
const SVG_PATH = path.join(__dirname, '..', 'imagenes', 'MODELO_BD_COMPLETO.svg');
const OUT_HTML = path.join(__dirname, '..', 'imagenes', 'MODELO_BD_COMPLETO.html');

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
        cols.push({ name: colName, type, pk: false, fk: false });
      }
      const fkM = line.match(/CONSTRAINT\s+\w+\s+FOREIGN KEY\s*\(`?([^`)]+)`?\)\s*REFERENCES\s+`?(\w+)`?\s*\(`?([^`)]+)`?\)/i);
      if (fkM) fks.push({ from: name, fromCol: fkM[1], to: fkM[2], toCol: fkM[3] });
    }
    cols.forEach((c) => { if (pk.has(c.name)) c.pk = true; });
    fks.filter((f) => f.from === name).forEach((f) => {
      const col = cols.find((c) => c.name === f.fromCol);
      if (col) col.fk = true;
    });
    tables[name] = { cols, pk: [...pk] };
  }
  return { tables, fks };
}

function assignCluster(table) {
  if (['roles', 'usuarios', 'password_reset_tokens'].includes(table)) return 'usuarios';
  if (table.startsWith('catalogo_') || table === 'contratos_generales') return 'contratos';
  if (table.startsWith('prod_') || table.startsWith('historico_produccion')) return 'produccion';
  return 'rrhh';
}

const MODULE_META = {
  usuarios: { title: 'Usuarios y seguridad', color: '#1a5f8a' },
  contratos: { title: 'Contratación', color: '#0d6b4a' },
  rrhh: { title: 'Recursos Humanos', color: '#8b4513' },
  produccion: { title: 'Producción', color: '#5c3d8f' },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tableCard(name, table) {
  const rows = table.cols
    .map((c) => {
      const badges = [];
      if (c.pk) badges.push('<span class="badge pk">PK</span>');
      if (c.fk) badges.push('<span class="badge fk">FK</span>');
      return `<tr><td class="attr">${esc(c.name)}</td><td class="tipo">${esc(c.type)}</td><td class="clave">${badges.join(' ') || '—'}</td></tr>`;
    })
    .join('');
  return `
    <article class="entity" id="tbl-${esc(name)}" data-name="${esc(name.toLowerCase())}">
      <h3 class="entity-name">${esc(name)}</h3>
      <table class="attrs">
        <thead><tr><th>Atributo</th><th>Tipo</th><th>Clave</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </article>`;
}

function inlineSvg(raw) {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(/<!DOCTYPE[^>]*>\s*/i, '')
    .trim();
}

/** Marca nodos/aristas para resaltar relaciones al hacer clic */
function enhanceSvg(raw) {
  let s = inlineSvg(raw);
  const injectStyle = `<style type="text/css"><![CDATA[
    .er-node { cursor: pointer; }
    .er-node:hover polygon[fill="#ffffff"],
    .er-node.active polygon[fill="#ffffff"] { stroke: #c00000; stroke-width: 2.5px; }
    .er-node.active { filter: drop-shadow(0 2px 8px rgba(46,80,144,.45)); }
    .er-edge.active path { stroke: #c00000 !important; stroke-width: 2.5px !important; }
    .er-edge.active polygon { fill: #c00000 !important; stroke: #c00000 !important; }
    .er-edge text { font-family: "Segoe UI", sans-serif !important; font-size: 11px !important; }
    .er-node.dimmed, .er-edge.dimmed { opacity: 0.22; }
  ]]></style>`;
  s = s.replace(/<svg([^>]*)>/, `<svg$1>${injectStyle}`);

  s = s.replace(
    /<g id="(node\d+)" class="node">\s*<title>([\w]+)<\/title>/g,
    '<g id="$1" class="node er-node" data-table="$2"><title>$2</title>'
  );

  s = s.replace(
    /<g id="(edge\d+)" class="edge">\s*<title>([^<]+)<\/title>/g,
    (_, id, title) => {
      const t = title.replace(/&#45;&gt;/g, '->').replace(/-&gt;/g, '->').trim();
      const m = t.match(/^([\w]+):([\w]+)->([\w]+):([\w]+)$/);
      if (!m) return `<g id="${id}" class="edge er-edge"><title>${title}</title>`;
      const [, from, fromCol, to, toCol] = m;
      return `<g id="${id}" class="edge er-edge" data-from="${from}" data-to="${to}" data-from-col="${fromCol}" data-to-col="${toCol}"><title>${title}</title>`;
    }
  );
  return s;
}

function buildDetailTableHtml(name, table) {
  const rows = table.cols
    .map((c) => {
      const badges = [];
      if (c.pk) badges.push('<span class="badge pk">PK</span>');
      if (c.fk) badges.push('<span class="badge fk">FK</span>');
      return `<tr><td>${esc(c.name)}</td><td>${esc(c.type)}</td><td>${badges.join(' ') || '—'}</td></tr>`;
    })
    .join('');
  return `<table class="detail-attrs"><thead><tr><th>Atributo</th><th>Tipo</th><th>Clave</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildHtml(schema, svgInline) {
  const clusters = { usuarios: [], contratos: [], rrhh: [], produccion: [] };
  for (const t of Object.keys(schema.tables).sort()) {
    clusters[assignCluster(t)].push(t);
  }

  const sections = Object.entries(clusters)
    .filter(([, list]) => list.length)
    .map(([id, list]) => {
      const meta = MODULE_META[id];
      const cards = list.map((t) => tableCard(t, schema.tables[t])).join('');
      return `
        <section class="module" id="mod-${id}" style="--mod-color:${meta.color}">
          <h2>${esc(meta.title)} <span class="count">${list.length} tablas</span></h2>
          <div class="grid">${cards}</div>
        </section>`;
    })
    .join('');

  const schemaJson = JSON.stringify(schema).replace(/</g, '\\u003c');

  const diagramBlock = svgInline
    ? `<div id="panel-diagram" class="panel" role="tabpanel">
        <p class="hint-diagram">
          <strong>Flechas = relaciones FK.</strong> Use las <strong>barras de desplazamiento</strong> (abajo y a la derecha) o el dedo en el móvil.
          Clic en tabla · botones +/− para zoom ·
          <button type="button" id="btn-fit" class="linkish">Ajustar a pantalla</button>
        </p>
        <div class="scroll-legend" aria-hidden="true">
          <span class="scroll-legend-h">↔ Desplazamiento horizontal</span>
          <span class="scroll-legend-v">↕ Desplazamiento vertical</span>
        </div>
        <div class="diagram-layout">
          <div id="diagram-viewport" class="diagram-scroll" title="Desplácese con las barras o con el dedo">
            <div id="diagram-scroller">
              <div id="diagram-inner">${svgInline}</div>
            </div>
          </div>
          <aside id="detail-panel" class="detail-closed" aria-label="Detalle de tabla">
            <button type="button" id="detail-close" title="Cerrar">×</button>
            <h2 id="detail-title"></h2>
            <p class="detail-hint">Relaciones marcadas en rojo en el diagrama ←</p>
            <div id="detail-body"></div>
            <div id="detail-arrows"></div>
          </aside>
        </div>
      </div>`
    : `<div id="panel-diagram" class="panel"><p class="warn">Falta MODELO_BD_COMPLETO.svg — ejecuta <code>generar-modelo-completo.mjs</code> y vuelve a generar el HTML.</p></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Modelo ER — bd_crud (con flechas)</title>
  <style>
    :root { --table-font: 15px; --bg: #eef2f7; --card: #fff; --text: #1a2332; --muted: #5a6b7d; --accent: #2e5090; --border: #c5d3e8; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); }
    .toolbar {
      position: sticky; top: 0; z-index: 200;
      background: #fff; border-bottom: 1px solid var(--border);
      padding: 0.55rem 1rem; display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
    }
    .toolbar h1 { margin: 0; font-size: 1rem; color: var(--accent); flex: 1 1 180px; }
    .toolbar button, .toolbar select, .toolbar input {
      font: inherit; padding: 0.32rem 0.6rem; border-radius: 6px; border: 1px solid var(--border);
    }
    .toolbar button { background: #e8eef7; cursor: pointer; }
    .toolbar button:hover { background: #d8e4f4; }
    .toolbar button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    main { margin: 0 auto; padding: 0.5rem 0.75rem 1.5rem; }
    main.mode-list { max-width: 1200px; }
    .intro {
      background: #fff; border: 1px solid var(--border); border-radius: 8px;
      padding: 0.75rem 1rem; margin-bottom: 0.65rem; font-size: 0.92rem;
    }
    .panel.hidden { display: none !important; }
    .hint-diagram { margin: 0 0 0.5rem; font-size: 0.88rem; color: var(--muted); }
    .linkish { background: none; border: none; color: var(--accent); text-decoration: underline; cursor: pointer; padding: 0; font: inherit; }
    .scroll-legend {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem;
      font-size: 0.82rem; color: var(--muted); margin-bottom: 0.4rem;
    }
    .scroll-legend-h, .scroll-legend-v {
      padding: 0.2rem 0.55rem; background: #fff; border: 1px solid var(--border);
      border-radius: 4px;
    }
    .scroll-legend-h { border-left: 4px solid var(--accent); }
    .scroll-legend-v { border-left: 4px solid #0d6b4a; }
    .diagram-layout { display: flex; gap: 0.5rem; align-items: stretch; }
    #diagram-viewport.diagram-scroll {
      flex: 1; min-width: 0;
      height: calc(100vh - 155px); min-height: 360px; max-height: 85vh;
      overflow: auto;
      overflow-x: scroll;
      overflow-y: scroll;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      background: #f4f7fb;
      border: 2px solid #a8bdd4;
      border-radius: 8px;
      touch-action: pan-x pan-y;
      scrollbar-width: auto;
      scrollbar-color: #2e5090 #dce6f2;
    }
    #diagram-viewport.diagram-scroll::-webkit-scrollbar {
      width: 16px;
      height: 16px;
    }
    #diagram-viewport.diagram-scroll::-webkit-scrollbar-track {
      background: #dce6f2;
      border-radius: 4px;
    }
    #diagram-viewport.diagram-scroll::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #3d6db3, #2e5090);
      border-radius: 8px;
      border: 3px solid #dce6f2;
      min-height: 40px;
      min-width: 40px;
    }
    #diagram-viewport.diagram-scroll::-webkit-scrollbar-thumb:hover {
      background: #1a4080;
    }
    #diagram-viewport.diagram-scroll::-webkit-scrollbar-corner {
      background: #c5d3e8;
    }
    #diagram-scroller {
      position: relative;
      display: inline-block;
      min-width: min-content;
      min-height: min-content;
    }
    #diagram-inner {
      transform-origin: 0 0;
      display: block;
      line-height: 0;
    }
    #diagram-inner svg { display: block; vertical-align: top; }
    #detail-panel {
      width: 300px; flex-shrink: 0; background: #fff; border: 1px solid var(--border);
      border-radius: 8px; padding: 0.65rem 0.75rem;
      overflow: auto; overflow-x: auto; overflow-y: scroll;
      max-height: calc(100vh - 155px); font-size: var(--table-font);
      box-shadow: -2px 0 12px rgba(0,0,0,.06);
      scrollbar-width: thin;
      scrollbar-color: #2e5090 #eef2f7;
    }
    #detail-panel::-webkit-scrollbar { width: 10px; height: 10px; }
    #detail-panel::-webkit-scrollbar-thumb { background: #2e5090; border-radius: 5px; }
    #detail-panel.detail-closed { display: none; }
    #detail-close {
      float: right; border: none; background: #eee; width: 28px; height: 28px;
      border-radius: 4px; cursor: pointer; font-size: 1.2rem; line-height: 1;
    }
    #detail-title { margin: 0 0 0.5rem; font-size: 1.1rem; color: var(--accent); clear: both; }
    .detail-hint { font-size: 0.8rem; color: var(--muted); margin: 0 0 0.5rem; }
    .detail-attrs { width: 100%; border-collapse: collapse; font-size: inherit; }
    .detail-attrs th, .detail-attrs td { border: 1px solid var(--border); padding: 0.3rem 0.4rem; }
    .detail-attrs th { background: #e8eef7; font-size: 0.85em; }
    #detail-arrows { margin-top: 0.75rem; font-size: 0.9em; }
    #detail-arrows ul { margin: 0.35rem 0; padding-left: 1.1rem; }
    #detail-arrows .arr-out { color: #0d6b4a; }
    #detail-arrows .arr-in { color: #1a5f8a; }
    .badge { font-size: 0.72em; font-weight: 700; padding: 0.08rem 0.3rem; border-radius: 3px; }
    .badge.pk { background: #fde8e8; color: #a00; }
    .badge.fk { background: #e8f0fd; color: #06c; }
    .module h2 { font-size: 1.25rem; border-bottom: 3px solid var(--mod-color); color: var(--mod-color); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.85rem; }
    .entity { background: #fff; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; scroll-margin-top: 4.5rem; }
    .entity.hidden-by-search { display: none; }
    .entity-name { margin: 0; padding: 0.5rem 0.65rem; background: var(--mod-color); color: #fff; font-size: 1rem; }
    .attrs { width: 100%; border-collapse: collapse; font-size: var(--table-font); }
    .attrs th, .attrs td { border-top: 1px solid var(--border); padding: 0.3rem 0.5rem; }
    .warn { color: #b45309; }
    @media (max-width: 900px) {
      .diagram-layout { flex-direction: column; }
      #diagram-viewport.diagram-scroll {
        height: 55vh; min-height: 280px;
      }
      #detail-panel { width: 100%; max-height: 35vh; }
      #diagram-viewport.diagram-scroll::-webkit-scrollbar {
        width: 12px; height: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>Modelo ER — bd_crud</h1>
    <div class="tabs">
      <button type="button" id="btn-diagram" class="active">Diagrama con flechas</button>
      <button type="button" id="btn-list">Lista (sin flechas)</button>
    </div>
    <button type="button" id="zoom-out" title="Alejar">−</button>
    <button type="button" id="zoom-in" title="Acercar">+</button>
    <button type="button" id="btn-fit">Ajustar</button>
    <label>Texto <button type="button" id="font-dec">A−</button><button type="button" id="font-inc">A+</button></label>
    <input type="search" id="search" placeholder="Buscar tabla…" style="min-width:160px" />
    <select id="jump-table">
      <option value="">Ir a tabla…</option>
      ${Object.keys(schema.tables).sort().map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
    </select>
  </div>

  <main id="main" class="mode-diagram">
    <div class="intro">
      <strong>Doble clic</strong> abre este archivo en el navegador.
      Vista principal: <strong>mismo diagrama que la imagen</strong>, con flechas entre tablas (relaciones FK).
      Clic en una tabla para resaltar sus conexiones. ${Object.keys(schema.tables).length} tablas · ${schema.fks.length} flechas.
    </div>

    ${diagramBlock}

    <div id="panel-list" class="panel hidden">
      <p class="hint-diagram">Vista alternativa sin diagrama; las relaciones solo se ven en la pestaña <strong>Diagrama con flechas</strong>.</p>
      ${sections}
    </div>
  </main>

  <script>
    window.ER_SCHEMA = ${schemaJson};

    const root = document.documentElement;
    let fontPx = 15;
    const setFont = (px) => {
      fontPx = Math.max(12, Math.min(20, px));
      root.style.setProperty('--table-font', fontPx + 'px');
    };
    document.getElementById('font-inc').onclick = () => setFont(fontPx + 1);
    document.getElementById('font-dec').onclick = () => setFont(fontPx - 1);

    const mainEl = document.getElementById('main');
    const panels = {
      'panel-diagram': document.getElementById('panel-diagram'),
      'panel-list': document.getElementById('panel-list'),
    };
    const btnDiagram = document.getElementById('btn-diagram');
    const btnList = document.getElementById('btn-list');

    function showPanel(id) {
      Object.entries(panels).forEach(([k, p]) => p && p.classList.toggle('hidden', k !== id));
      btnDiagram.classList.toggle('active', id === 'panel-diagram');
      btnList.classList.toggle('active', id === 'panel-list');
      mainEl.classList.toggle('mode-list', id === 'panel-list');
      mainEl.classList.toggle('mode-diagram', id === 'panel-diagram');
      if (id === 'panel-diagram') setTimeout(fitDiagram, 80);
    }
    btnDiagram.onclick = () => showPanel('panel-diagram');
    btnList.onclick = () => showPanel('panel-list');

    const schema = window.ER_SCHEMA;
    const detailPanel = document.getElementById('detail-panel');
    const detailTitle = document.getElementById('detail-title');
    const detailBody = document.getElementById('detail-body');
    const detailArrows = document.getElementById('detail-arrows');
    document.getElementById('detail-close').onclick = () => {
      detailPanel.classList.add('detail-closed');
      clearHighlight();
    };

    const tablesHtml = {};
    for (const [name, t] of Object.entries(schema.tables)) {
      const rows = t.cols.map((c) => {
        const b = [];
        if (c.pk) b.push('<span class="badge pk">PK</span>');
        if (c.fk) b.push('<span class="badge fk">FK</span>');
        return '<tr><td>' + c.name + '</td><td>' + c.type + '</td><td>' + (b.join(' ') || '—') + '</td></tr>';
      }).join('');
      tablesHtml[name] = '<table class="detail-attrs"><thead><tr><th>Atributo</th><th>Tipo</th><th>Clave</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function clearHighlight() {
      document.querySelectorAll('.er-node.active, .er-edge.active, .er-node.dimmed, .er-edge.dimmed').forEach((el) => {
        el.classList.remove('active', 'dimmed');
      });
    }

    function highlightTable(name) {
      clearHighlight();
      const related = new Set([name]);
      document.querySelectorAll('.er-edge').forEach((e) => {
        const from = e.dataset.from, to = e.dataset.to;
        if (from === name || to === name) {
          e.classList.add('active');
          related.add(from);
          related.add(to);
        }
      });
      document.querySelectorAll('.er-node').forEach((n) => {
        const t = n.dataset.table;
        if (t === name) n.classList.add('active');
        else if (!related.has(t)) n.classList.add('dimmed');
      });
      document.querySelectorAll('.er-edge').forEach((e) => {
        if (!e.classList.contains('active')) e.classList.add('dimmed');
      });
    }

    function showDetail(name) {
      detailPanel.classList.remove('detail-closed');
      detailTitle.textContent = name;
      detailBody.innerHTML = tablesHtml[name] || '';
      const out = schema.fks.filter((f) => f.from === name);
      const inn = schema.fks.filter((f) => f.to === name);
      let ah = '';
      if (out.length) {
        ah += '<p class="arr-out"><strong>→ Sale hacia:</strong></p><ul>';
        out.forEach((f) => { ah += '<li><code>' + f.fromCol + '</code> → <b>' + f.to + '</b>.' + f.toCol + '</li>'; });
        ah += '</ul>';
      }
      if (inn.length) {
        ah += '<p class="arr-in"><strong>← Llega desde:</strong></p><ul>';
        inn.forEach((f) => { ah += '<li><b>' + f.from + '</b>.' + f.fromCol + ' → <code>' + f.toCol + '</code></li>'; });
        ah += '</ul>';
      }
      detailArrows.innerHTML = ah || '<p>Sin FK hacia/desde otras tablas.</p>';
    }

    const vp = document.getElementById('diagram-viewport');
    const scroller = document.getElementById('diagram-scroller');
    const inner = document.getElementById('diagram-inner');
    let scale = 0.45;
    let svgW = 1804, svgH = 6319;

    function readSvgSize() {
      const svg = inner && inner.querySelector('svg');
      if (!svg) return;
      const vb = svg.viewBox.baseVal;
      svgW = vb.width || parseFloat(svg.getAttribute('width')) || 1804;
      svgH = vb.height || parseFloat(svg.getAttribute('height')) || 6319;
      inner.style.width = svgW + 'px';
      inner.style.height = svgH + 'px';
    }

    function applyTransform() {
      if (!inner || !scroller) return;
      inner.style.transform = 'scale(' + scale + ')';
      scroller.style.width = Math.ceil(svgW * scale) + 'px';
      scroller.style.height = Math.ceil(svgH * scale) + 'px';
    }

    function fitDiagram() {
      if (!vp || !inner) return;
      readSvgSize();
      const pad = 16;
      scale = Math.min((vp.clientWidth - pad) / svgW, (vp.clientHeight - pad) / svgH, 0.9);
      scale = Math.max(0.12, scale);
      applyTransform();
      vp.scrollLeft = 0;
      vp.scrollTop = 0;
    }

    function scrollToNode(g) {
      const bb = g.getBBox();
      const cx = (bb.x + bb.width / 2) * scale;
      const cy = (bb.y + bb.height / 2) * scale;
      vp.scrollTo({
        left: Math.max(0, cx - vp.clientWidth / 2),
        top: Math.max(0, cy - vp.clientHeight / 2),
        behavior: 'smooth',
      });
    }

    function focusTable(name) {
      showPanel('panel-diagram');
      const g = inner && inner.querySelector('.er-node[data-table="' + name + '"]');
      if (!g) return;
      highlightTable(name);
      showDetail(name);
      try {
        if (scale < 0.35) { scale = 0.55; applyTransform(); }
        setTimeout(() => scrollToNode(g), 50);
      } catch (_) {}
    }

    function zoomAt(factor) {
      const cx = vp.scrollLeft + vp.clientWidth / 2;
      const cy = vp.scrollTop + vp.clientHeight / 2;
      const old = scale;
      scale = Math.max(0.1, Math.min(2.5, scale * factor));
      applyTransform();
      vp.scrollLeft = cx * (scale / old) - vp.clientWidth / 2;
      vp.scrollTop = cy * (scale / old) - vp.clientHeight / 2;
    }

    if (inner && vp) {
      readSvgSize();
      inner.querySelectorAll('.er-node').forEach((node) => {
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          const t = node.dataset.table;
          if (t) focusTable(t);
        });
      });
      vp.addEventListener('click', (e) => {
        if (e.target.closest('.er-node')) return;
        detailPanel.classList.add('detail-closed');
        clearHighlight();
      });
      vp.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        zoomAt(e.deltaY < 0 ? 1.12 : 0.89);
      }, { passive: false });
      vp.addEventListener('dblclick', (e) => {
        if (e.target.closest('.er-node')) return;
        fitDiagram();
      });
    }

    document.getElementById('btn-fit').onclick = fitDiagram;
    document.getElementById('zoom-in').onclick = () => zoomAt(1.15);
    document.getElementById('zoom-out').onclick = () => zoomAt(0.87);

    document.getElementById('jump-table').onchange = (e) => {
      const v = e.target.value;
      if (v) focusTable(v);
      e.target.value = '';
    };

    const search = document.getElementById('search');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (panels['panel-list'] && !panels['panel-list'].classList.contains('hidden')) {
        document.querySelectorAll('.entity').forEach((el) => {
          el.classList.toggle('hidden-by-search', q.length > 0 && !el.dataset.name.includes(q));
        });
      } else if (q.length >= 2) {
        const match = Object.keys(schema.tables).find((t) => t.toLowerCase().includes(q));
        if (match) focusTable(match);
      }
    });

    applyTransform();
    setTimeout(fitDiagram, 150);
  </script>
</body>
</html>`;
}

function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const schema = parseSchema(sql);
  let svgInline = '';
  if (fs.existsSync(SVG_PATH)) {
    svgInline = enhanceSvg(fs.readFileSync(SVG_PATH, 'utf8'));
    console.log('SVG con flechas embebido');
  } else {
    console.warn('Sin SVG — ejecuta generar-modelo-completo.mjs');
  }
  fs.writeFileSync(OUT_HTML, buildHtml(schema, svgInline), 'utf8');
  console.log('HTML:', OUT_HTML);
  console.log('Vista principal: diagrama con flechas entre tablas.');
}

main();
