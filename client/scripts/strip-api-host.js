const fs = require('fs');
const path = require('path');
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory() && f.name !== 'node_modules') walk(p);
    else if (/\.(jsx|js)$/.test(f.name)) {
      let s = fs.readFileSync(p, 'utf8');
      const o = s;
      s = s.replace(/https?:\/\/localhost:3001\//g, '/');
      if (s !== o) {
        fs.writeFileSync(p, s);
        console.log(p);
      }
    }
  }
}
walk(path.join(__dirname, '..', 'src'));
