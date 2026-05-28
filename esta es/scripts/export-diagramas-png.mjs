/**
 * Exporta .mmd a PNG usando Kroki (sin instalar Chromium).
 * node "esta es/scripts/export-diagramas-png.mjs"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const diagramasDir = path.join(__dirname, '..', 'diagramas');
const outDir = path.join(__dirname, '..', 'imagenes');

const KROKI = 'https://kroki.io/mermaid/png';

async function renderOne(mmdPath, pngPath) {
  const src = fs.readFileSync(mmdPath, 'utf8');
  const res = await fetch(KROKI, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: src,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${path.basename(mmdPath)}: ${res.status} ${t.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(pngPath, buf);
  console.log('OK', pngPath, `(${buf.length} bytes)`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(diagramasDir).filter((f) => f.endsWith('.mmd')).sort();
  for (const f of files) {
    await renderOne(path.join(diagramasDir, f), path.join(outDir, f.replace('.mmd', '.png')));
  }
  console.log('\nListo:', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
