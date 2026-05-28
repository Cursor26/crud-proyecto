/**
 * Inventario de diferencias entre dos proyectos (sin node_modules).
 * Uso: node scripts/project-diff-inventory.js <baseDir> <otherDir> [outJson]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  '.cursor',
  'coverage',
]);
const SKIP_FILES = new Set(['package-lock.json', '.DS_Store']);

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dir, root, map) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, root, map);
    } else if (st.isFile()) {
      if (SKIP_FILES.has(name)) continue;
      map.set(rel, { full, size: st.size, mtime: st.mtimeMs });
    }
  }
}

function main() {
  const baseDir = path.resolve(process.argv[2] || '../crud-unificado');
  const otherDir = path.resolve(process.argv[3] || '../crud-companero');
  const outPath = process.argv[4]
    ? path.resolve(process.argv[4])
    : path.join(baseDir, 'MERGE_INVENTORY.json');

  const baseMap = new Map();
  const otherMap = new Map();
  walk(baseDir, baseDir, baseMap);
  walk(otherDir, otherDir, otherMap);

  const onlyBase = [];
  const onlyOther = [];
  const different = [];
  const identical = [];

  for (const rel of baseMap.keys()) {
    if (!otherMap.has(rel)) onlyBase.push(rel);
    else {
      const a = hashFile(baseMap.get(rel).full);
      const b = hashFile(otherMap.get(rel).full);
      if (a === b) identical.push(rel);
      else different.push(rel);
    }
  }
  for (const rel of otherMap.keys()) {
    if (!baseMap.has(rel)) onlyOther.push(rel);
  }

  const priority = (rel) => {
    if (rel === 'server/index.js') return 0;
    if (rel === 'client/src/App.js') return 1;
    if (rel === 'client/src/App.css') return 2;
    if (rel.startsWith('server/') && rel.endsWith('.js')) return 3;
    if (rel.startsWith('client/src/')) return 4;
    if (rel.endsWith('.sql')) return 5;
    if (rel.includes('package.json')) return 6;
    return 10;
  };

  different.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
  onlyOther.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));

  const report = {
    generatedAt: new Date().toISOString(),
    baseDir,
    otherDir,
    counts: {
      onlyBase: onlyBase.length,
      onlyOther: onlyOther.length,
      different: different.length,
      identical: identical.length,
    },
    onlyBase,
    onlyOther,
    different,
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report.counts));
  console.log('Written:', outPath);
  if (different.length) console.log('First diffs:', different.slice(0, 20).join('\n'));
}

main();
