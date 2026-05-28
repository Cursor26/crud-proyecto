/**
 * Resuelve marcadores de conflicto Git conservando la sección HEAD (Current).
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

const pattern = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [^\r\n]+\r?\n/g;
const resolved = content.replace(pattern, (_, headBlock) => headBlock + '\n');

if (/<<<<<<< HEAD/.test(resolved)) {
  console.error('Quedan conflictos sin resolver.');
  process.exit(1);
}

fs.writeFileSync(filePath, resolved, 'utf8');
console.log('Conflictos resueltos (HEAD) en', filePath);
