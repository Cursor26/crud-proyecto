/**
 * One-off script: actualiza arrays en autorizarRol según app.METHOD (misma línea).
 * Ejecutar desde la raíz del repo: node server/scripts/patch-roles.js
 */
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'index.js');
let s = fs.readFileSync(f, 'utf8');
const lines = s.split('\n');
const out = lines.map((line) => {
  const t = (line.match(/app\.(get|post|put|delete|patch)\s*\(/) || [])[1] || null;
  if (!t || !line.includes('autorizarRol(')) return line;
  const method = t.toLowerCase();
  const isGet = method === 'get' || method === 'head' || method === 'options';
  if (!line.includes("autorizarRol(")) return line;

  let l = line;
  // ['admin', 'rrhh'] -> get: rrhh+director, write: rrhh
  if (l.includes("autorizarRol(['admin', 'rrhh'])") || l.includes("autorizarRol([\"admin\", \"rrhh\"])")) {
    l = l.replace("autorizarRol([\"admin\", \"rrhh\"])", isGet ? "autorizarRol(['rrhh', 'director'])" : "autorizarRol(['rrhh'])");
    l = l.replace("autorizarRol(['admin', 'rrhh'])", isGet ? "autorizarRol(['rrhh', 'director'])" : "autorizarRol(['rrhh'])");
    return l;
  }
  // ['admin', 'produccion'] -> estadística (get + director, write: estadistica)
  if (l.includes("autorizarRol(['admin', 'produccion'])") || l.includes("autorizarRol([\"admin\", \"produccion\"])")) {
    l = l.replace("autorizarRol([\"admin\", \"produccion\"])", isGet ? "autorizarRol(['estadistica', 'director'])" : "autorizarRol(['estadistica'])");
    l = l.replace("autorizarRol(['admin', 'produccion'])", isGet ? "autorizarRol(['estadistica', 'director'])" : "autorizarRol(['estadistica'])");
    return l;
  }
  // cert / eval med: triple
  if (l.includes("autorizarRol(['admin', 'rrhh', 'produccion'])") || l.includes("autorizarRol([\"admin\", \"rrhh\", \"produccion\"])")) {
    l = l.replace("autorizarRol([\"admin\", \"rrhh\", \"produccion\"])", isGet ? "autorizarRol(['rrhh', 'estadistica', 'director'])" : "autorizarRol(['rrhh', 'estadistica'])");
    l = l.replace("autorizarRol(['admin', 'rrhh', 'produccion'])", isGet ? "autorizarRol(['rrhh', 'estadistica', 'director'])" : "autorizarRol(['rrhh', 'estadistica'])");
    return l;
  }
  return l;
});
fs.writeFileSync(f, out.join('\n'));
console.log('Patched', f);
