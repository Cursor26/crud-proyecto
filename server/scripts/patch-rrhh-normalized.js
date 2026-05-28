const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.js');
let s = fs.readFileSync(p, 'utf8');

const tables = [
  'asistencias', 'certificaciones', 'cursos', 'evalcapacitacion', 'evaluaciones',
  'objetivos', 'salarios', 'seguridad', 'vacaciones',
];

for (const t of tables) {
  s = s.replace(
    new RegExp(`SELECT \\* FROM ${t} ORDER BY id_tabla`, 'g'),
    `SELECT t.*, t.carnet_identidad AS id_tabla FROM ${t} t ORDER BY t.carnet_identidad`
  );
  s = s.replace(
    new RegExp(`INSERT INTO ${t} \\(id_tabla,`, 'g'),
    `INSERT INTO ${t} (carnet_identidad,`
  );
  s = s.replace(
    new RegExp(`UPDATE ${t} SET ([^W]+) WHERE id_tabla = \\?`, 'g'),
    `UPDATE ${t} SET $1 WHERE carnet_identidad = ?`
  );
  s = s.replace(
    new RegExp(`DELETE FROM ${t} WHERE id_tabla = \\?`, 'g'),
    `DELETE FROM ${t} WHERE carnet_identidad = ?`
  );
}

s = s.replace(
  /SELECT \*, DATE_FORMAT\(fech_fin_curso, "%Y-%m-%d"\) as fech_fin_curso FROM cursos ORDER BY id_tabla/g,
  'SELECT t.*, DATE_FORMAT(t.fech_fin_curso, "%Y-%m-%d") as fech_fin_curso, t.carnet_identidad AS id_tabla FROM cursos t ORDER BY t.carnet_identidad'
);
s = s.replace(
  /SELECT \*, DATE_FORMAT\(fecha_logrado, "%Y-%m-%d"\) as fecha_logrado FROM objetivos ORDER BY id_tabla/g,
  'SELECT t.*, DATE_FORMAT(t.fecha_logrado, "%Y-%m-%d") as fecha_logrado, t.carnet_identidad AS id_tabla FROM objetivos t ORDER BY t.carnet_identidad'
);
s = s.replace(
  /SELECT \*, DATE_FORMAT\(fecha_inicio, "%Y-%m-%d"\) as fecha_inicio, DATE_FORMAT\(fecha_fin, "%Y-%m-%d"\) as fecha_fin FROM vacaciones ORDER BY id_tabla/g,
  'SELECT t.*, DATE_FORMAT(t.fecha_inicio, "%Y-%m-%d") as fecha_inicio, DATE_FORMAT(t.fecha_fin, "%Y-%m-%d") as fecha_fin, t.carnet_identidad AS id_tabla FROM vacaciones t ORDER BY t.carnet_identidad'
);

s = s.replace(/const id_tabla = req\.params\.id_tabla;/g,
  'const id_tabla = normalizarCarnetApi(req.params.id_tabla) || req.params.id_tabla;');

s = s.replace(/, \[id_tabla,/g, ', [normalizarCarnetApi(id_tabla) || id_tabla,');
s = s.replace(/, \[id_tabla\]/g, ', [normalizarCarnetApi(id_tabla) || id_tabla]');

s = s.replace(
  /LEFT JOIN salarios s ON s\.id_tabla = e\.carnet_identidad/g,
  'LEFT JOIN salarios s ON s.carnet_identidad = e.carnet_identidad'
);

// segseguridad
const segBlock = `// ==================== RUTAS PARA SEGSEGURIDAD ====================
// (protegidas: solo admin y rrhh)

app.get("/segseguridad", verificarToken, autorizarRol(['rrhh', 'director']), (req, res) => {
    db.query(\`${'${SQL_SEGSEG_LIST}'}\`, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

app.post("/create-segseguridad", verificarToken, autorizarRol(['rrhh']), async (req, res) => {
    const { id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres } = req.body;
    try {
        await guardarSegseguridad(dbQuery, id_tabla, { cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres });
        res.json({ message: 'Registro guardado' });
    } catch (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
        res.status(500).send(err);
    }
});

app.put("/update-segseguridad/:id_tabla", verificarToken, autorizarRol(['rrhh']), async (req, res) => {
    const id_tabla = normalizarCarnetApi(req.params.id_tabla) || req.params.id_tabla;
    const { cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres } = req.body;
    try {
        await guardarSegseguridad(dbQuery, id_tabla, { cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres });
        res.json({ message: 'Registro actualizado' });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.delete("/delete-segseguridad/:id_tabla", verificarToken, autorizarRol(['rrhh']), async (req, res) => {
    const carnet = normalizarCarnetApi(req.params.id_tabla) || req.params.id_tabla;
    try {
        await dbQuery('DELETE FROM segseguridad WHERE carnet_identidad = ?', [carnet]);
        res.json({ message: 'Registro eliminado' });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});
`;

const segStart = s.indexOf('// ==================== RUTAS PARA SEGSEGURIDAD ====================');
const segEnd = s.indexOf('// ==================== RUTAS PARA SEGURIDAD ====================');
if (segStart >= 0 && segEnd > segStart) {
  s = s.slice(0, segStart) + segBlock + '\n\n' + s.slice(segEnd);
}

// cargos
s = s.replace(
  "db.query('SELECT * FROM cargos ORDER BY id_cargo'",
  "db.query('SELECT c.*, d.nombre AS departamento FROM cargos c LEFT JOIN departamentos d ON d.id_departamento = c.id_departamento ORDER BY c.id_cargo'"
);
s = s.replace(
  `'INSERT INTO cargos (nombre, descripcion, salario_base, departamento) VALUES (?, ?, ?, ?)'`,
  `'INSERT INTO cargos (nombre, descripcion, salario_base, id_departamento) VALUES (?, ?, ?, (SELECT id_departamento FROM departamentos WHERE nombre = ? LIMIT 1))'`
);
s = s.replace(
  `'UPDATE cargos SET nombre = ?, descripcion = ?, salario_base = ?, departamento = ?, activo = ? WHERE id_cargo = ?'`,
  `'UPDATE cargos SET nombre = ?, descripcion = ?, salario_base = ?, id_departamento = (SELECT id_departamento FROM departamentos WHERE nombre = ? LIMIT 1), activo = ? WHERE id_cargo = ?'`
);

fs.writeFileSync(p, s);
console.log('RRHH patch applied');
