/**
 * Ensambla server/index.js en crud-unificado según política acordada.
 */
const fs = require('fs');
const path = require('path');

const USER = path.resolve('c:/crud/server/index.js');
const COMP = path.resolve('c:/crud-companero/server/index.js');
const OUT = path.resolve('c:/crud-unificado/server/index.js');

function lines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/);
}

function slice(file, start, endInclusive) {
  const L = lines(file);
  return L.slice(start - 1, endInclusive).join('\n');
}

function joinParts(parts) {
  return `${parts.filter(Boolean).join('\n')}\n`;
}

const u = USER;
const c = COMP;

let body = joinParts([
  '// --- Ensamblado: login/contratos/usuarios (tuyo) + RRHH/producción (compañero) + frontend (tuyo) ---\n',
  slice(u, 1, 235),
  "const ROLES_PERMITIDOS_USUARIO = ['admin', 'rrhh', 'contratacion', 'produccion', 'estadistica', 'director'];",
  slice(u, 238, 268),
  slice(c, 136, 146),
  slice(u, 280, 697),
  slice(u, 698, 931),
  slice(c, 996, 1514),
  slice(c, 1515, 2102),
  slice(c, 2103, 3749),
  slice(u, 3438, 3462),
]);

fs.writeFileSync(OUT, body, 'utf8');
console.log('Written', OUT, 'lines:', body.split('\n').length);
