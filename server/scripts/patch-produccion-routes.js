const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.js');
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('//Sacrificio vacuno:');
const end = s.indexOf('// ==================== RUTAS PARA ASISTENCIAS');
if (start < 0 || end < 0) throw new Error('markers not found');
const ins = `// Produccion normalizada (sacrificio, matadero, leche)
require('./db/registerProduccionRoutes')(app, {
  verificarToken,
  autorizarRol,
  validarSacrificio,
  validarMatadero,
  validarLeche,
  dbQuery,
  emailUsuario,
  archivarProduccion,
});

`;
fs.writeFileSync(p, s.slice(0, start) + ins + s.slice(end));
console.log('Patched produccion routes', start, end);
