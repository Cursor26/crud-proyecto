/**
 * Comprueba que las rutas en index.js declaran verificarToken (defensa en profundidad; hay middleware global).
 * Ejecutar: node scripts/audit-api-auth.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PUBLIC_EXACT } = require('../lib/apiPublicPaths.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'index.js');
const src = fs.readFileSync(indexPath, 'utf8');

const routeRe = /app\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;
const issues = [];
let match;

while ((match = routeRe.exec(src)) !== null) {
  const method = match[1].toUpperCase();
  const routePath = match[2];
  if (PUBLIC_EXACT.has(routePath)) continue;
  const slice = src.slice(match.index, match.index + 800);
  if (!slice.includes('verificarToken')) {
    issues.push({ method, path: routePath });
  }
}

if (issues.length === 0) {
  console.log('OK: todas las rutas registradas incluyen verificarToken (además del middleware global).');
  process.exit(0);
}

console.warn('Rutas sin verificarToken explícito en la declaración:');
for (const i of issues) {
  console.warn(`  ${i.method} ${i.path}`);
}
console.warn(
  `\n${issues.length} ruta(s). El middleware global en index.js exige JWT salvo rutas públicas.`
);
process.exit(0);
