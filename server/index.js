
const express = require ("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

app.use(cors());
app.use(express.json());
/* Express 5: sin cuerpo, express.json puede dejar req.body en undefined; normalizamos para rutas que desestructuran el body. */
app.use((req, res, next) => {
  if (req.body === undefined || req.body === null) {
    req.body = {};
  }
  next();
});

app.use(cookieParser());

const db = mysql.createConnection({
host:"localhost",
user:"root",
password:"",
database:"bd_crud"

});

//Usuarios y seguridad



// Clave secreta para JWT (en producción, ponla en .env)
const JWT_SECRET = 'hgnfdignrejvmklehvmlSDJVHFDVDJMOdsjvmvjmnjsbmgiSDHUNVJDFVDNVBMJF84135165132164HDND8448340I/*/*/-*/**+';

// ==================== MIDDLEWARES ====================

// Middleware para verificar token JWT
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  if (!token) return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user; // guardamos los datos del usuario (email, nombre, rol)
    next();
  });
};

// Middleware para autorizar según roles (recibe un array de roles permitidos)
const autorizarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' });
    if (rolesPermitidos.includes(req.user.rol)) {
      next();
    } else {
      res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
    }
  };
};

// ==================== RUTAS DE AUTENTICACIÓN ====================

// LOGIN (público)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Error en BD' });
      if (results.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

      const usuario = results[0];
      const passwordValida = await bcrypt.compare(password, usuario.password);
      if (!passwordValida) return res.status(401).json({ message: 'Credenciales inválidas' });

      // Generar token (incluimos el rol)
      const token = jwt.sign(
        { email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        message: 'Login exitoso',
        token,
        usuario: {
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// ==================== RUTAS PARA GESTIÓN DE USUARIOS (SOLO ADMIN) ====================

// Obtener todos los usuarios (sin contraseñas)
app.get("/usuarios", verificarToken, autorizarRol(['admin']), (req, res) => {
  // No incluir created_at: muchas instalaciones no tienen esa columna y el SELECT falla (tabla vacía en el cliente).
  db.query('SELECT email, nombre, rol FROM usuarios ORDER BY nombre ASC', (err, results) => {
    if (err) return res.status(500).json({ message: err.message || 'Error al listar usuarios' });
    res.send(results);
  });
});

// Crear usuario (solo admin)
app.post("/create-usuario", verificarToken, autorizarRol(['admin']), async (req, res) => {
  const { email, nombre, password, rol } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO usuarios (email, nombre, password, rol) VALUES (?, ?, ?, ?)',
      [email, nombre, hashedPassword, rol],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'El email ya existe' });
          return res.status(500).send(err);
        }
        res.status(201).json({ message: 'Usuario creado' });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Error al encriptar' });
  }
});



// Actualizar usuario (solo admin). La contraseña es opcional.
app.put("/update-usuario/:email", verificarToken, autorizarRol(['admin']), async (req, res) => {
  const emailAnterior = String(req.params.email || '').trim();
  const nuevoEmail = String(req.body.email || '').trim().toLowerCase();
  const { nombre, password, rol } = req.body;

  if (!emailAnterior || !nuevoEmail || !nombre || !rol) {
    return res.status(400).json({ message: 'Email, nombre y rol son obligatorios' });
  }

  let query = 'UPDATE usuarios SET email = TRIM(?), nombre = ?, rol = ?';
  let params = [nuevoEmail, nombre, rol];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    query += ', password = ?';
    params.push(hashedPassword);
  }

  query += ' WHERE email = ? OR LOWER(TRIM(email)) = LOWER(TRIM(?))';
  params.push(emailAnterior, emailAnterior);

  db.query(query, params, (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'El email ya existe para otro usuario' });
      }
      return res.status(500).json({ message: err.message || 'Error al actualizar usuario' });
    }
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario actualizado' });
  });
});

// Eliminar usuario (solo admin)
app.delete("/delete-usuario/:email", verificarToken, autorizarRol(['admin']), (req, res) => {
  const { email } = req.params;
  db.query('DELETE FROM usuarios WHERE email = ?', [email], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Usuario eliminado' });
  });
});






























app.post("/create", (req, res)=>{
    const nombre = req.body.nombre;
    const edad = req.body.edad;
    const pais = req.body.pais;
    const cargo = req.body.cargo;
    const anios = req.body.anios;
    
    db.query('INSERT INTO tabla1 (nombre,edad,pais,cargo,anios) VALUES(?,?,?,?,?)', [nombre, edad, pais, cargo, anios],
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});





app.put("/update", (req, res)=>{
    const id = req.body.id;
    const nombre = req.body.nombre;
    const edad = req.body.edad;
    const pais = req.body.pais;
    const cargo = req.body.cargo;
    const anios = req.body.anios;
    
    db.query('UPDATE tabla1 SET nombre=?,edad=?,pais=?,cargo=?,anios=? WHERE id=?', [nombre, edad, pais, cargo, anios,id],
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});



app.delete("/delete/:id", (req, res)=>{
    const id = req.params.id;

    
    db.query('DELETE FROM tabla1  WHERE id=?', id,
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});



app.get("/tabla1", (req, res)=>{

    
    db.query('SELECT * FROM tabla1',
        (err, result)=>{
            if(err){
                console.log(err);
             }else{
            res.send(result);
            }
            }
        
    );
});














//Parte de contratos_generales y empleados:

//Contratos:

// ==================== RUTAS PARA CONTRATOS ====================
app.post("/create-contrato", verificarToken, autorizarRol(['admin', 'contratacion']), (req, res) => {
  const { numero_contrato, proveedor_cliente, empresa, suplementos, vigencia, tipo_contrato, fecha_inicio, fecha_fin, vencido } = req.body;
  db.query(
    'INSERT INTO contratos_generales (numero_contrato, proveedor_cliente, empresa, suplementos, vigencia, tipo_contrato, fecha_inicio, fecha_fin, vencido) VALUES (?,?,?,?,?,?,?,?,?)',
    [numero_contrato, proveedor_cliente, empresa, suplementos, vigencia, tipo_contrato, fecha_inicio, fecha_fin, vencido],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
      } else {
        res.send(result);
      }
    }
  );
});

app.put("/update-contrato", (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const {
    numero_contrato,
    numero_contrato_original,
    proveedor_cliente,
    empresa,
    suplementos,
    vigencia,
    tipo_contrato,
    fecha_inicio,
    fecha_fin,
    vencido,
  } = body;
  const numeroNuevo = numero_contrato == null ? '' : String(numero_contrato).trim();
  const hasNumeroOriginal = Object.prototype.hasOwnProperty.call(body, 'numero_contrato_original');
  const numeroOriginalRaw = hasNumeroOriginal ? numero_contrato_original : numero_contrato;
  let numeroContratoWhere = numeroOriginalRaw == null ? '' : String(numeroOriginalRaw).trim();
  if (!numeroContratoWhere || numeroContratoWhere === 'null' || numeroContratoWhere === 'undefined') {
    numeroContratoWhere = numeroNuevo;
  }

  if (!numeroNuevo) {
    return res.status(400).json({ message: 'El número de contrato no puede estar vacío.' });
  }

  const sql =
    'UPDATE contratos_generales SET numero_contrato=?, proveedor_cliente=?, empresa=?, suplementos=?, vigencia=?, tipo_contrato=?, fecha_inicio=?, fecha_fin=?, vencido=? WHERE numero_contrato=?';
  const params = [
    numeroNuevo,
    proveedor_cliente,
    empresa,
    suplementos,
    vigencia,
    tipo_contrato,
    fecha_inicio,
    fecha_fin,
    vencido,
    numeroContratoWhere,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: err.sqlMessage || err.message || String(err) });
    }
    const nRows = Number(result.affectedRows) || 0;
    if (nRows === 0) {
      return db.query(
        'SELECT 1 AS ok FROM contratos_generales WHERE numero_contrato = ? LIMIT 1',
        [numeroContratoWhere],
        (e2, rows) => {
          if (e2) {
            console.log(e2);
            return res.status(500).json({ message: e2.sqlMessage || e2.message || String(e2) });
          }
          if (!rows || !rows.length) {
            return res.status(404).json({
              message: `No existe un contrato con número «${numeroContratoWhere}».`,
            });
          }
          return res.json({
            ok: true,
            affectedRows: 0,
            warning: 'No hubo cambios en MySQL (datos idénticos).',
            numero_contrato: numeroNuevo,
          });
        }
      );
    }
    return res.json({
      ok: true,
      affectedRows: nRows,
      numero_contrato: numeroNuevo,
    });
  });
});

app.delete("/delete-contrato/:numero_contrato", (req, res) => {
  const numero = req.params.numero_contrato;
  db.query('DELETE FROM contratos_generales WHERE numero_contrato=?', [numero],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/contratos", (req, res) => {
  db.query('SELECT * FROM contratos_generales',
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        const rows = Array.isArray(result) ? result : [];
        res.json(JSON.parse(JSON.stringify(rows)));
      }
    }
  );
});

//Empleados: 

// ==================== RUTAS PARA EMPLEADOS ====================
app.post("/create-empleado", (req, res) => {
  const { carnet_identidad, nombre, apellidos, puesto, telefono, departamento, evaluaciones, salario_normal, beneficios, cursos_disponibles, certificados, licencias, resultados_auditorias, acceso, seguimiento_seguridad, nivel_escolar, superacion_en_proceso } = req.body;
  db.query(
    'INSERT INTO empleados (carnet_identidad, nombre, apellidos, puesto, telefono, departamento, evaluaciones, salario_normal, beneficios, cursos_disponibles, certificados, licencias, resultados_auditorias, acceso, seguimiento_seguridad, nivel_escolar, superacion_en_proceso) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [carnet_identidad, nombre, apellidos, puesto, telefono, departamento, evaluaciones, salario_normal, beneficios, cursos_disponibles, certificados, licencias, resultados_auditorias, acceso, seguimiento_seguridad, nivel_escolar || null, superacion_en_proceso || null],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else res.send(result);
    }
  );
});

app.put("/update-empleado", (req, res) => {
  const { carnet_identidad, nombre, apellidos, puesto, telefono, departamento, evaluaciones, salario_normal, beneficios, cursos_disponibles, certificados, licencias, resultados_auditorias, acceso, seguimiento_seguridad, nivel_escolar, superacion_en_proceso } = req.body;

  const normTxt = (v) => (v == null || v === '' ? '' : String(v).trim());
  const normSal = (v) => {
    if (v == null || v === '') return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v).trim() : String(n);
  };

  db.query(
    'SELECT puesto, departamento, salario_normal FROM empleados WHERE carnet_identidad = ?',
    [carnet_identidad],
    (selErr, rows) => {
      if (selErr) {
        console.log(selErr);
        return res.status(500).send(selErr);
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }

      const prev = rows[0];
      const cambios = [];
      if (normTxt(prev.puesto) !== normTxt(puesto)) {
        cambios.push(['puesto', normTxt(prev.puesto) || null, normTxt(puesto) || null]);
      }
      if (normTxt(prev.departamento) !== normTxt(departamento)) {
        cambios.push(['departamento', normTxt(prev.departamento) || null, normTxt(departamento) || null]);
      }
      if (normSal(prev.salario_normal) !== normSal(salario_normal)) {
        cambios.push(['salario', normSal(prev.salario_normal) || null, normSal(salario_normal) || null]);
      }

      const updateParams = [nombre, apellidos, puesto, telefono, departamento, evaluaciones, salario_normal, beneficios, cursos_disponibles, certificados, licencias, resultados_auditorias, acceso, seguimiento_seguridad, nivel_escolar || null, superacion_en_proceso || null, carnet_identidad];

      const finish = (updErr, result) => {
        if (updErr) {
          console.log(updErr);
          return res.status(500).send(updErr);
        }
        if (cambios.length === 0) return res.send(result);

        const placeholders = cambios.map(() => '(?, ?, ?, ?)').join(', ');
        const flat = cambios.flatMap(([tipo, ant, nue]) => [carnet_identidad, tipo, ant, nue]);
        db.query(
          `INSERT INTO historial_laboral (carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo) VALUES ${placeholders}`,
          flat,
          (insErr) => {
            if (insErr) {
              console.log(insErr);
              return res.status(500).send(insErr);
            }
            res.send(result);
          }
        );
      };

      db.query(
        'UPDATE empleados SET nombre=?, apellidos=?, puesto=?, telefono=?, departamento=?, evaluaciones=?, salario_normal=?, beneficios=?, cursos_disponibles=?, certificados=?, licencias=?, resultados_auditorias=?, acceso=?, seguimiento_seguridad=?, nivel_escolar=?, superacion_en_proceso=? WHERE carnet_identidad=?',
        updateParams,
        finish
      );
    }
  );
});

// Historial laboral (RF8): cambios de puesto, departamento o salario
app.get("/historial-laboral/:carnet_identidad", (req, res) => {
  const carnet = req.params.carnet_identidad;
  db.query(
    `SELECT id, tipo_cambio, valor_anterior, valor_nuevo,
            DATE_FORMAT(fecha_cambio, '%Y-%m-%d %H:%i:%s') AS fecha_cambio
     FROM historial_laboral WHERE carnet_identidad = ? ORDER BY fecha_cambio DESC, id DESC`,
    [carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-empleado/:carnet_identidad", (req, res) => {
  const carnet = req.params.carnet_identidad;
  db.query('DELETE FROM empleados WHERE carnet_identidad=?', [carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else res.send(result);
    }
  );
});

app.get("/empleados", (req, res) => {
  const solo = req.query.solo_activos;
  const soloActivos = solo === '1' || solo === 'true';
  const where = soloActivos ? ' WHERE COALESCE(activo, 1) = 1' : '';
  db.query(`SELECT * FROM empleados${where} ORDER BY apellidos, nombre`,
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else res.send(result);
    }
  );
});

// RF16 — Marcar empleados inactivos (bajas) o reactivarlos (admin / rrhh)
app.post("/empleado-baja", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, fecha_baja, motivo_baja } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  const fecha =
    fecha_baja && String(fecha_baja).trim()
      ? String(fecha_baja).trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const motivo = motivo_baja != null && String(motivo_baja).trim() ? String(motivo_baja).trim() : null;
  db.query(
    'UPDATE empleados SET activo = 0, fecha_baja = ?, motivo_baja = ? WHERE carnet_identidad = ?',
    [fecha, motivo, carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }
      res.json({ message: 'Baja registrada: empleado marcado como inactivo' });
    }
  );
});

app.post("/empleado-reactivar", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  db.query(
    'UPDATE empleados SET activo = 1, fecha_baja = NULL, motivo_baja = NULL WHERE carnet_identidad = ?',
    [carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }
      res.json({ message: 'Empleado reactivado' });
    }
  );
});

// RF17 — Reporte de personal por departamento y/o cargo
app.get("/reporte-personal", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const solo = req.query.solo_activos;
  const soloActivos = solo !== '0' && solo !== 'false';
  const dep = req.query.departamento != null ? String(req.query.departamento).trim() : '';
  const puestoF = req.query.puesto != null ? String(req.query.puesto).trim() : '';
  let sql = 'SELECT * FROM empleados WHERE 1=1';
  const params = [];
  if (soloActivos) sql += ' AND COALESCE(activo, 1) = 1';
  if (dep) {
    sql += ' AND departamento LIKE ?';
    params.push(`%${dep}%`);
  }
  if (puestoF) {
    sql += ' AND puesto LIKE ?';
    params.push(`%${puestoF}%`);
  }
  sql += ' ORDER BY apellidos, nombre';
  db.query(sql, params, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// RF18 — Cambio de cargo (puesto) con registro en historial_laboral
app.post("/empleado-cambio-cargo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, puesto_nuevo, salario_nuevo } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  if (puesto_nuevo == null || !String(puesto_nuevo).trim()) {
    return res.status(400).json({ message: 'Debe indicar el nuevo puesto o cargo' });
  }
  const carnet = String(carnet_identidad).trim();
  const nuevoPuesto = String(puesto_nuevo).trim();

  const normTxt = (v) => (v == null || v === '' ? '' : String(v).trim());
  const normSal = (v) => {
    if (v == null || v === '') return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v).trim() : String(n);
  };

  db.query('SELECT puesto, salario_normal FROM empleados WHERE carnet_identidad = ?', [carnet], (selErr, rows) => {
    if (selErr) {
      console.log(selErr);
      return res.status(500).send(selErr);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    const prev = rows[0];
    let nuevoSal = prev.salario_normal;
    if (salario_nuevo !== undefined && salario_nuevo !== null && String(salario_nuevo).trim() !== '') {
      nuevoSal = salario_nuevo;
    }

    const cambios = [];
    if (normTxt(prev.puesto) !== normTxt(nuevoPuesto)) {
      cambios.push(['puesto', normTxt(prev.puesto) || null, normTxt(nuevoPuesto) || null]);
    }
    if (normSal(prev.salario_normal) !== normSal(nuevoSal)) {
      cambios.push(['salario', normSal(prev.salario_normal) || null, normSal(nuevoSal) || null]);
    }

    if (cambios.length === 0) {
      return res.status(400).json({ message: 'No hay cambios respecto al puesto y salario actuales' });
    }

    const finish = (updErr, result) => {
      if (updErr) {
        console.log(updErr);
        return res.status(500).send(updErr);
      }
      const placeholders = cambios.map(() => '(?, ?, ?, ?)').join(', ');
      const flat = cambios.flatMap(([tipo, ant, nue]) => [carnet, tipo, ant, nue]);
      db.query(
        `INSERT INTO historial_laboral (carnet_identidad, tipo_cambio, valor_anterior, valor_nuevo) VALUES ${placeholders}`,
        flat,
        (insErr) => {
          if (insErr) {
            console.log(insErr);
            return res.status(500).send(insErr);
          }
          res.json({ message: 'Cambio de cargo registrado', affectedRows: result.affectedRows });
        }
      );
    };

    db.query(
      'UPDATE empleados SET puesto = ?, salario_normal = ? WHERE carnet_identidad = ?',
      [nuevoPuesto, nuevoSal, carnet],
      finish
    );
  });
});

// RF21 / RF22 — Producción: histórico de cambios y responsables (email del JWT)
const emailUsuario = (req) => (req.user && req.user.email ? String(req.user.email) : null);

function fechaDatoProduccion(row) {
  if (!row || row.fecha == null) return null;
  if (row.fecha instanceof Date) return row.fecha.toISOString().slice(0, 10);
  const s = String(row.fecha);
  return s.split('T')[0].split(' ')[0];
}

function archivarProduccion(fuente, accion, req, fila, callback) {
  const fd = fechaDatoProduccion(fila);
  if (!fd) return callback(new Error('Sin fecha en registro'));
  let datosJson;
  try {
    datosJson = JSON.stringify(fila, (k, v) => {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return v;
    });
  } catch (e) {
    datosJson = '{}';
  }
  db.query(
    'INSERT INTO produccion_historico (fuente, fecha_dato, accion, datos_json, usuario_email) VALUES (?, ?, ?, ?, ?)',
    [fuente, fd, accion, datosJson, emailUsuario(req)],
    callback
  );
}

// RF21 — Consulta de histórico archivado (actualización / eliminación)
app.get('/produccion-historico', verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
  let sql = `SELECT id, fuente, fecha_dato, accion, usuario_email,
    DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en,
    datos_json
    FROM produccion_historico WHERE 1=1`;
  const params = [];
  if (req.query.fuente) {
    sql += ' AND fuente = ?';
    params.push(req.query.fuente);
  }
  if (req.query.desde) {
    sql += ' AND fecha_dato >= ?';
    params.push(req.query.desde);
  }
  if (req.query.hasta) {
    sql += ' AND fecha_dato <= ?';
    params.push(req.query.hasta);
  }
  sql += ' ORDER BY creado_en DESC, id DESC LIMIT 500';
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const out = rows.map((r) => {
      let datos = null;
      try {
        datos = JSON.parse(r.datos_json);
      } catch (_) {}
      return { ...r, datos };
    });
    res.send(out);
  });
});

// RF23 — Totales de personal agrupados por departamento (vista global RRHH)
app.get('/reporte-consolidado-departamentos', verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const sql = `SELECT 
 COALESCE(NULLIF(TRIM(departamento), ''), '(Sin departamento)') AS departamento,
      SUM(CASE WHEN COALESCE(activo, 1) = 1 THEN 1 ELSE 0 END) AS empleados_activos,
      SUM(CASE WHEN COALESCE(activo, 1) = 0 THEN 1 ELSE 0 END) AS empleados_inactivos,
      COUNT(*) AS total_empleados,
      SUM(CASE WHEN COALESCE(activo, 1) = 1 THEN IFNULL(salario_normal + 0, 0) ELSE 0 END) AS masa_salarial_activos
    FROM empleados
    GROUP BY departamento
    ORDER BY departamento`;
  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});












//Sacrificio vacuno:

// ==================== RUTAS PARA SACRIFICIO VACUNO ====================
// (protegidas: solo admin y produccion)


// ==================== RUTAS PARA SACRIFICIO VACUNO ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros (ordenados por fecha) formateando la fecha como YYYY-MM-DD
app.get("/sacrificio", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    // Usamos DATE_FORMAT para que la fecha venga como string sin hora
    db.query(
        `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, 
                terneras_Cbz_sal, terneras_Kg_sal, terneras_Cbz_tur, terneras_Kg_tur,
                terneras_Cbz_in, terneras_Kg_in, terneras_Cbz_p, terneras_Kg_p,
                terneras_Cbz_t, terneras_Kg_t, terneras_Cbz_m, terneras_Kg_m,
                terneras_Cab_se, terneras_Kg_se, terneras_Cbz_sc, terneras_Kg_sc,
                terneras_Cbz_st, terneras_Tm_st,
                aniojas_Cbz_sal, aniojas_Kg_sal, aniojas_Cbz_tur, aniojas_Kg_tur,
                aniojas_Cbz_in, aniojas_Kg_in, aniojas_Cbz_p, aniojas_Kg_p,
                aniojas_Cbz_t, aniojas_Kg_t, aniojas_Cbz_m, aniojas_Kg_m,
                aniojas_Cab_se, aniojas_Kg_se, aniojas_Cbz_sc, aniojas_Kg_sc,
                aniojas_Cbz_st, aniojas_Tm_st,
                novillas_Cbz_sal, novillas_Kg_sal, novillas_Cbz_tur, novillas_Kg_tur,
                novillas_Cbz_in, novillas_Kg_in, novillas_Cbz_p, novillas_Kg_p,
                novillas_Cbz_t, novillas_Kg_t, novillas_Cbz_m, novillas_Kg_m,
                novillas_Cab_se, novillas_Kg_se, novillas_Cbz_sc, novillas_Kg_sc,
                novillas_Cbz_st, novillas_Tm_st,
                vacas_Cbz_sal, vacas_Kg_sal, vacas_Cbz_tur, vacas_Kg_tur,
                vacas_Cbz_in, vacas_Kg_in, vacas_Cbz_p, vacas_Kg_p,
                vacas_Cbz_t, vacas_Kg_t, vacas_Cbz_m, vacas_Kg_m,
                vacas_Cab_se, vacas_Kg_se, vacas_Cbz_sc, vacas_Kg_sc,
                vacas_Cbz_st, vacas_Tm_st,
                total1_Cbz_sal, total1_Kg_sal, total1_Cbz_tur, total1_Kg_tur,
                total1_Cbz_in, total1_Kg_in, total1_Cbz_p, total1_Kg_p,
                total1_Cbz_t, total1_Kg_t, total1_Cbz_m, total1_Kg_m,
                total1_Cab_se, total1_Kg_se, total1_Cbz_sc, total1_Kg_sc,
                total1_Cbz_st, total1_Tm_st,
                terneros_Cbz_sal, terneros_Kg_sal, terneros_Cbz_tur, terneros_Kg_tur,
                terneros_Cbz_in, terneros_Kg_in, terneros_Cbz_p, terneros_Kg_p,
                terneros_Cbz_t, terneros_Kg_t, terneros_Cbz_m, terneros_Kg_m,
                terneros_Cab_se, terneros_Kg_se, terneros_Cbz_sc, terneros_Kg_sc,
                terneros_Cbz_st, terneros_Tm_st,
                aniojos_Cbz_sal, aniojos_Kg_sal, aniojos_Cbz_tur, aniojos_Kg_tur,
                aniojos_Cbz_in, aniojos_Kg_in, aniojos_Cbz_p, aniojos_Kg_p,
                aniojos_Cbz_t, aniojos_Kg_t, aniojos_Cbz_m, aniojos_Kg_m,
                aniojos_Cab_se, aniojos_Kg_se, aniojos_Cbz_sc, aniojos_Kg_sc,
                aniojos_Cbz_st, aniojos_Tm_st,
                novillos_Cbz_sal, novillos_Kg_sal, novillos_Cbz_tur, novillos_Kg_tur,
                novillos_Cbz_in, novillos_Kg_in, novillos_Cbz_p, novillos_Kg_p,
                novillos_Cbz_t, novillos_Kg_t, novillos_Cbz_m, novillos_Kg_m,
                novillos_Cab_se, novillos_Kg_se, novillos_Cbz_sc, novillos_Kg_sc,
                novillos_Cbz_st, novillos_Tm_st,
                bueyes_Cbz_sal, bueyes_Kg_sal, bueyes_Cbz_tur, bueyes_Kg_tur,
                bueyes_Cbz_in, bueyes_Kg_in, bueyes_Cbz_p, bueyes_Kg_p,
                bueyes_Cbz_t, bueyes_Kg_t, bueyes_Cbz_m, bueyes_Kg_m,
                bueyes_Cab_se, bueyes_Kg_se, bueyes_Cbz_sc, bueyes_Kg_sc,
                bueyes_Cbz_st, bueyes_Tm_st,
                total2_Cbz_sal, total2_Kg_sal, total2_Cbz_tur, total2_Kg_tur,
                total2_Cbz_in, total2_Kg_in, total2_Cbz_p, total2_Kg_p,


                total2_Cbz_t, total2_Kg_t, total2_Cbz_m, total2_Kg_m,
                total2_Cab_se, total2_Kg_se, total2_Cbz_sc, total2_Kg_sc,
                total2_Cbz_st, total2_Tm_st,
                creado_por, actualizado_por
         FROM sacrificio_vacuno 
         ORDER BY fecha DESC`,
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.send(result);
        }
    );
});

// Crear un nuevo registro (fecha única) — RF22 responsables
app.post("/create-sacrificio", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const email = emailUsuario(req);
    const fields = { ...req.body };
    delete fields.creado_por;
    delete fields.actualizado_por;
    if (email) {
        fields.creado_por = email;
        fields.actualizado_por = email;
    }
    const columns = Object.keys(fields).join(', ');
    const values = Object.values(fields);
    const placeholders = values.map(() => '?').join(', ');

    db.query(
        `INSERT INTO sacrificio_vacuno (${columns}) VALUES (${placeholders})`,
        values,
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar — RF21 archiva versión anterior; RF22 actualiza responsable
app.put("/update-sacrificio/:fecha", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const fecha = req.params.fecha;
    const email = emailUsuario(req);

    db.query('SELECT * FROM sacrificio_vacuno WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('sacrificio', 'actualizacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            const fields = { ...req.body };
            delete fields.fecha;
            delete fields.creado_por;
            if (anterior.creado_por != null && anterior.creado_por !== '') {
                fields.creado_por = anterior.creado_por;
            } else if (email) {
                fields.creado_por = email;
            }
            if (email) fields.actualizado_por = email;

            const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
            const values = [...Object.values(fields), fecha];

            db.query(
                `UPDATE sacrificio_vacuno SET ${updates} WHERE fecha = ?`,
                values,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

// Eliminar — RF21 archiva antes de borrar
app.delete("/delete-sacrificio/:fecha", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const fecha = req.params.fecha;
    db.query('SELECT * FROM sacrificio_vacuno WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('sacrificio', 'eliminacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            db.query(
                `DELETE FROM sacrificio_vacuno WHERE fecha = ?`,
                [fecha],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

















// ==================== RUTAS PARA MATADERO VIVO ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros (ordenados por fecha)
app.get("/matadero", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha FROM matadero_vivo ORDER BY fecha DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro — RF22
app.post("/create-matadero", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const email = emailUsuario(req);
    const fields = { ...req.body };
    delete fields.creado_por;
    delete fields.actualizado_por;
    if (email) {
        fields.creado_por = email;
        fields.actualizado_por = email;
    }
    const columns = Object.keys(fields).join(', ');
    const values = Object.values(fields);
    const placeholders = values.map(() => '?').join(', ');

    db.query(
        `INSERT INTO matadero_vivo (${columns}) VALUES (${placeholders})`,
        values,
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar — RF21 + RF22
app.put("/update-matadero/:fecha", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const fecha = req.params.fecha;
    const email = emailUsuario(req);

    db.query('SELECT * FROM matadero_vivo WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('matadero', 'actualizacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            const fields = { ...req.body };
            delete fields.fecha;
            delete fields.creado_por;
            if (anterior.creado_por != null && anterior.creado_por !== '') {
                fields.creado_por = anterior.creado_por;
            } else if (email) {
                fields.creado_por = email;
            }
            if (email) fields.actualizado_por = email;

            const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
            const values = [...Object.values(fields), fecha];

            db.query(
                `UPDATE matadero_vivo SET ${updates} WHERE fecha = ?`,
                values,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

// Eliminar — RF21
app.delete("/delete-matadero/:fecha", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const fecha = req.params.fecha;
    db.query('SELECT * FROM matadero_vivo WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('matadero', 'eliminacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            db.query(
                `DELETE FROM matadero_vivo WHERE fecha = ?`,
                [fecha],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});














// ==================== RUTAS PARA LECHE ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros (ordenados por fecha)
app.get("/leche", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha, "%Y-%m-%d") as fecha FROM leche ORDER BY fecha DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro — RF22
app.post("/create-leche", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const email = emailUsuario(req);
    const fields = { ...req.body };
    delete fields.creado_por;
    delete fields.actualizado_por;
    if (email) {
        fields.creado_por = email;
        fields.actualizado_por = email;
    }
    const columns = Object.keys(fields).join(', ');
    const values = Object.values(fields);
    const placeholders = values.map(() => '?').join(', ');

    db.query(
        `INSERT INTO leche (${columns}) VALUES (${placeholders})`,
        values,
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar — RF21 + RF22
app.put("/update-leche/:fecha", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const fecha = req.params.fecha;
    const email = emailUsuario(req);

    db.query('SELECT * FROM leche WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('leche', 'actualizacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            const fields = { ...req.body };
            delete fields.fecha;
            delete fields.creado_por;
            if (anterior.creado_por != null && anterior.creado_por !== '') {
                fields.creado_por = anterior.creado_por;
            } else if (email) {
                fields.creado_por = email;
            }
            if (email) fields.actualizado_por = email;

            const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
            const values = [...Object.values(fields), fecha];

            db.query(
                `UPDATE leche SET ${updates} WHERE fecha = ?`,
                values,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});

// Eliminar — RF21
app.delete("/delete-leche/:fecha", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const fecha = req.params.fecha;
    db.query('SELECT * FROM leche WHERE fecha = ?', [fecha], (selErr, rows) => {
        if (selErr) {
            console.log(selErr);
            return res.status(500).send(selErr);
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        const anterior = rows[0];
        archivarProduccion('leche', 'eliminacion', req, anterior, (archErr) => {
            if (archErr) {
                console.log(archErr);
                return res.status(500).send(archErr);
            }
            db.query(
                `DELETE FROM leche WHERE fecha = ?`,
                [fecha],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send(err);
                    }
                    res.send(result);
                }
            );
        });
    });
});













// ==================== RUTAS PARA ASISTENCIAS ====================
// (protegidas: solo admin y produccion)

// Obtener todos los registros
app.get("/asistencias", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    db.query('SELECT * FROM asistencias ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-asistencia", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const { id_tabla, codigo_asistencia, desc_causas, horas_trabajadas } = req.body;
    db.query(
        'INSERT INTO asistencias (id_tabla, codigo_asistencia, desc_causas, horas_trabajadas) VALUES (?, ?, ?, ?)',
        [id_tabla, codigo_asistencia, desc_causas, horas_trabajadas],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-asistencia/:id_tabla", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { codigo_asistencia, desc_causas, horas_trabajadas } = req.body;
    db.query(
        'UPDATE asistencias SET codigo_asistencia = ?, desc_causas = ?, horas_trabajadas = ? WHERE id_tabla = ?',
        [codigo_asistencia, desc_causas, horas_trabajadas, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-asistencia/:id_tabla", verificarToken, autorizarRol(['admin', 'produccion']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM asistencias WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});













// ==================== RUTAS PARA CERTIFICACIONES ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/certificaciones", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM certificaciones ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-certificacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, certificacion } = req.body;
    db.query(
        'INSERT INTO certificaciones (id_tabla, certificacion) VALUES (?, ?)',
        [id_tabla, certificacion],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-certificacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { certificacion } = req.body;
    db.query(
        'UPDATE certificaciones SET certificacion = ? WHERE id_tabla = ?',
        [certificacion, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-certificacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM certificaciones WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});






// ==================== RUTAS PARA CURSOS ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/cursos", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fech_fin_curso, "%Y-%m-%d") as fech_fin_curso FROM cursos ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-curso", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, curso, descr, logrado, fech_fin_curso } = req.body;
    db.query(
        'INSERT INTO cursos (id_tabla, curso, descr, logrado, fech_fin_curso) VALUES (?, ?, ?, ?, ?)',
        [id_tabla, curso, descr, logrado ? 1 : 0, fech_fin_curso],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-curso/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { curso, descr, logrado, fech_fin_curso } = req.body;
    db.query(
        'UPDATE cursos SET curso = ?, descr = ?, logrado = ?, fech_fin_curso = ? WHERE id_tabla = ?',
        [curso, descr, logrado ? 1 : 0, fech_fin_curso, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-curso/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM cursos WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});



// ==================== RUTAS PARA EVALCAPACITACION ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/evalcapacitacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM evalcapacitacion ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-evalcapacitacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, evaluacion, descr } = req.body;
    db.query(
        'INSERT INTO evalcapacitacion (id_tabla, evaluacion, descr) VALUES (?, ?, ?)',
        [id_tabla, evaluacion, descr],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-evalcapacitacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { evaluacion, descr } = req.body;
    db.query(
        'UPDATE evalcapacitacion SET evaluacion = ?, descr = ? WHERE id_tabla = ?',
        [evaluacion, descr, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-evalcapacitacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM evalcapacitacion WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});






// ==================== RUTAS PARA EVALUACIONES ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/evaluaciones", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM evaluaciones ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-evaluacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, evaluacion, descr } = req.body;
    db.query(
        'INSERT INTO evaluaciones (id_tabla, evaluacion, descr) VALUES (?, ?, ?)',
        [id_tabla, evaluacion, descr],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-evaluacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { evaluacion, descr } = req.body;
    db.query(
        'UPDATE evaluaciones SET evaluacion = ?, descr = ? WHERE id_tabla = ?',
        [evaluacion, descr, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-evaluacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM evaluaciones WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});






// ==================== RUTAS PARA OBJETIVOS ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/objetivos", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha_logrado, "%Y-%m-%d") as fecha_logrado FROM objetivos ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-objetivo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, objetivo, descr, logrado, fecha_logrado } = req.body;
    db.query(
        'INSERT INTO objetivos (id_tabla, objetivo, descr, logrado, fecha_logrado) VALUES (?, ?, ?, ?, ?)',
        [id_tabla, objetivo, descr, logrado ? 1 : 0, fecha_logrado || null],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-objetivo/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { objetivo, descr, logrado, fecha_logrado } = req.body;
    db.query(
        'UPDATE objetivos SET objetivo = ?, descr = ?, logrado = ?, fecha_logrado = ? WHERE id_tabla = ?',
        [objetivo, descr, logrado ? 1 : 0, fecha_logrado || null, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-objetivo/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM objetivos WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});













// ==================== RUTAS PARA SALARIOS ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/salarios", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM salarios ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-salario", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, salario_neto } = req.body;
    db.query(
        'INSERT INTO salarios (id_tabla, salario_neto) VALUES (?, ?)',
        [id_tabla, salario_neto],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-salario/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { salario_neto } = req.body;
    db.query(
        'UPDATE salarios SET salario_neto = ? WHERE id_tabla = ?',
        [salario_neto, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-salario/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM salarios WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});















// ==================== RUTAS PARA SEGSEGURIDAD ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/segseguridad", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM segseguridad ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-segseguridad", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres } = req.body;
    db.query(
        'INSERT INTO segseguridad (id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_tabla, cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-segseguridad/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres } = req.body;
    db.query(
        'UPDATE segseguridad SET cant_accuno = ?, desc_uno = ?, cant_accdos = ?, desc_dos = ?, cant_acctres = ?, desc_tres = ? WHERE id_tabla = ?',
        [cant_accuno, desc_uno, cant_accdos, desc_dos, cant_acctres, desc_tres, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-segseguridad/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM segseguridad WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});











// ==================== RUTAS PARA SEGURIDAD ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/seguridad", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM seguridad ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-seguridad", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, acceso } = req.body;
    db.query(
        'INSERT INTO seguridad (id_tabla, acceso) VALUES (?, ?)',
        [id_tabla, acceso],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-seguridad/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { acceso } = req.body;
    db.query(
        'UPDATE seguridad SET acceso = ? WHERE id_tabla = ?',
        [acceso, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-seguridad/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM seguridad WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});


// ==================== RUTAS PARA CARGOS ====================
  // (protegidas: solo admin y rrhh)

  // Obtener todos los cargos (ordenados por id_cargo)
  app.get("/cargos", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT * FROM cargos ORDER BY id_cargo', (err, result) => {
      if (err) return res.status(500).send(err);
      res.send(result);
    });
  });

  // Crear un nuevo cargo
  app.post("/create-cargo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { nombre, descripcion, salario_base, departamento } = req.body;
    db.query(
      'INSERT INTO cargos (nombre, descripcion, salario_base, departamento) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, salario_base, departamento],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

  // Actualizar cargo por id_cargo
  app.put("/update-cargo/:id_cargo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_cargo = req.params.id_cargo;
    const { nombre, descripcion, salario_base, departamento, activo } = req.body;
    db.query(
      'UPDATE cargos SET nombre = ?, descripcion = ?, salario_base = ?, departamento = ?, activo = ? WHERE id_cargo = ?',
      [nombre, descripcion, salario_base, departamento, activo ? 1 : 0, id_cargo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

  // Eliminar cargo por id_cargo
app.delete("/delete-cargo/:id_cargo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_cargo = req.params.id_cargo;
    db.query(
      'DELETE FROM cargos WHERE id_cargo = ?',
      [id_cargo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

// ==================== RUTAS PARA DEPARTAMENTOS Y ASIGNACIÓN DE EMPLEADOS (RF15) ====================
// (protegidas: admin y rrhh)

app.get("/departamentos", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT d.id_departamento, d.nombre, d.descripcion, d.id_padre, d.activo,
            p.nombre AS nombre_padre,
            (SELECT COUNT(*) FROM empleados e WHERE e.id_departamento = d.id_departamento) AS num_empleados
     FROM departamentos d
     LEFT JOIN departamentos p ON p.id_departamento = d.id_padre
     ORDER BY d.nombre`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-departamento", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { nombre, descripcion, id_padre, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del departamento es obligatorio' });
  }
  const padre =
    id_padre === '' || id_padre === undefined || id_padre === null ? null : Number(id_padre);
  const padreFinal = padre != null && !Number.isNaN(padre) ? padre : null;
  db.query(
    'INSERT INTO departamentos (nombre, descripcion, id_padre, activo) VALUES (?, ?, ?, ?)',
    [String(nombre).trim(), descripcion || null, padreFinal, activo ? 1 : 0],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Ya existe un departamento con ese nombre' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-departamento/:id_departamento", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_departamento = req.params.id_departamento;
  const { nombre, descripcion, id_padre, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del departamento es obligatorio' });
  }
  const padre =
    id_padre === '' || id_padre === undefined || id_padre === null ? null : Number(id_padre);
  const padreFinal = padre != null && !Number.isNaN(padre) ? padre : null;
  if (padreFinal != null && String(padreFinal) === String(id_departamento)) {
    return res.status(400).json({ message: 'Un departamento no puede ser su propio superior' });
  }
  const nombreTrim = String(nombre).trim();
  db.query(
    'UPDATE departamentos SET nombre = ?, descripcion = ?, id_padre = ?, activo = ? WHERE id_departamento = ?',
    [nombreTrim, descripcion || null, padreFinal, activo ? 1 : 0, id_departamento],
    (err) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Ya existe un departamento con ese nombre' });
        }
        return res.status(500).send(err);
      }
      db.query(
        'UPDATE empleados SET departamento = ? WHERE id_departamento = ?',
        [nombreTrim, id_departamento],
        (err2) => {
          if (err2) {
            console.log(err2);
            return res.status(500).send(err2);
          }
          res.json({ message: 'Departamento actualizado' });
        }
      );
    }
  );
});

app.delete("/delete-departamento/:id_departamento", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_departamento = req.params.id_departamento;
  db.query('UPDATE departamentos SET id_padre = NULL WHERE id_padre = ?', [id_departamento], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    db.query(
      'UPDATE empleados SET id_departamento = NULL, departamento = ? WHERE id_departamento = ?',
      ['', id_departamento],
      (err2) => {
        if (err2) {
          console.log(err2);
          return res.status(500).send(err2);
        }
        db.query('DELETE FROM departamentos WHERE id_departamento = ?', [id_departamento], (err3, result) => {
          if (err3) {
            console.log(err3);
            return res.status(500).send(err3);
          }
          res.send(result);
        });
      }
    );
  });
});

app.post("/asignar-empleado-departamento", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, id_departamento } = req.body;
  if (!carnet_identidad || !String(carnet_identidad).trim()) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  const carnet = String(carnet_identidad).trim();
  const sinDepto =
    id_departamento === '' || id_departamento === undefined || id_departamento === null;
  if (sinDepto) {
    db.query(
      'UPDATE empleados SET id_departamento = NULL, departamento = ? WHERE carnet_identidad = ?',
      ['', carnet],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }
        res.json({ message: 'Empleado sin departamento asignado', result });
      }
    );
    return;
  }
  const idDepto = Number(id_departamento);
  if (Number.isNaN(idDepto)) {
    return res.status(400).json({ message: 'Identificador de departamento no válido' });
  }
  db.query(
    `UPDATE empleados e
     INNER JOIN departamentos d ON d.id_departamento = ?
     SET e.id_departamento = d.id_departamento, e.departamento = d.nombre
     WHERE e.carnet_identidad = ?`,
    [idDepto, carnet],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El departamento no existe' });
        }
        return res.status(500).send(err);
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: 'No se encontró el empleado o el departamento' });
      }
      res.json({ message: 'Empleado asignado al departamento' });
    }
  );
});

// ==================== RUTAS PARA CERTIFICADOS MEDICOS ====================
// (protegidas: admin, rrhh, produccion)
app.get("/certificados-medicos", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  db.query('SELECT * FROM cert_medicos ORDER BY id_cert_medico', (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
});

app.post("/create-cert-medico", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  const { carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion } = req.body;
  db.query(
    'INSERT INTO cert_medicos (carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
    [carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.put("/update-cert-medico/:id_cert_medico", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  const id_cert_medico = req.params.id_cert_medico;
  const { carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion, activo } = req.body;
  db.query(
    'UPDATE cert_medicos SET carnet_identidad = ?, fecha_emision = ?, fecha_vencimiento = ?, dias_licencia = ?, medico_nombre = ?, descripcion = ?, activo = ? WHERE id_cert_medico = ?',
    [carnet_identidad, fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion, activo ? 1 : 0, id_cert_medico],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-cert-medico/:id_cert_medico", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  const id_cert_medico = req.params.id_cert_medico;
  db.query(
    'DELETE FROM cert_medicos WHERE id_cert_medico = ?',
    [id_cert_medico],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

// ==================== RUTAS PARA VACACIONES ====================
// (protegidas: solo admin y rrhh)

// Obtener todos los registros
app.get("/vacaciones", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha_inicio, "%Y-%m-%d") as fecha_inicio, DATE_FORMAT(fecha_fin, "%Y-%m-%d") as fecha_fin FROM vacaciones ORDER BY id_tabla', (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Crear un nuevo registro
app.post("/create-vacacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const { id_tabla, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones } = req.body;
    db.query(
        'INSERT INTO vacaciones (id_tabla, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_tabla, fecha_inicio, fecha_fin, dias_totales, motivo, aprobado ? 1 : 0, observaciones],
        (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Ya existe un registro con ese ID' });
                }
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Actualizar un registro por id_tabla
app.put("/update-vacacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    const { fecha_inicio, fecha_fin, dias_totales, motivo, aprobado, observaciones } = req.body;
    db.query(
        'UPDATE vacaciones SET fecha_inicio = ?, fecha_fin = ?, dias_totales = ?, motivo = ?, aprobado = ?, observaciones = ? WHERE id_tabla = ?',
        [fecha_inicio, fecha_fin, dias_totales, motivo, aprobado ? 1 : 0, observaciones, id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// Eliminar un registro por id_tabla
app.delete("/delete-vacacion/:id_tabla", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
    const id_tabla = req.params.id_tabla;
    db.query(
        'DELETE FROM vacaciones WHERE id_tabla = ?',
        [id_tabla],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            res.send(result);
        }
    );
});

// ==================== RUTAS PARA TURNOS DE TRABAJO ====================
// (protegidas: admin y rrhh)

app.get("/turnos-trabajo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT t.id_turno, t.carnet_identidad, t.nombre_turno,
            DATE_FORMAT(t.hora_entrada, '%H:%i') AS hora_entrada,
            DATE_FORMAT(t.hora_salida, '%H:%i') AS hora_salida,
            t.dias_aplicacion, t.horas_diarias, t.observaciones, t.activo,
            e.nombre, e.apellidos
     FROM turnos_trabajo t
     INNER JOIN empleados e ON e.carnet_identidad = t.carnet_identidad
     ORDER BY t.id_turno DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-turno", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, nombre_turno, hora_entrada, hora_salida, dias_aplicacion, horas_diarias, observaciones, activo } = req.body;
  if (!carnet_identidad || !nombre_turno || !hora_entrada || !hora_salida) {
    return res.status(400).json({ message: 'Carnet, nombre del turno, hora de entrada y hora de salida son obligatorios' });
  }
  const dias = dias_aplicacion && String(dias_aplicacion).trim() ? String(dias_aplicacion).trim() : 'Lunes a viernes';
  const horasD = horas_diarias === '' || horas_diarias == null ? null : Number(horas_diarias);
  db.query(
    'INSERT INTO turnos_trabajo (carnet_identidad, nombre_turno, hora_entrada, hora_salida, dias_aplicacion, horas_diarias, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [carnet_identidad, nombre_turno.trim(), hora_entrada, hora_salida, dias, Number.isNaN(horasD) ? null : horasD, observaciones || null, activo ? 1 : 0],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-turno/:id_turno", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_turno = req.params.id_turno;
  const { carnet_identidad, nombre_turno, hora_entrada, hora_salida, dias_aplicacion, horas_diarias, observaciones, activo } = req.body;
  if (!carnet_identidad || !nombre_turno || !hora_entrada || !hora_salida) {
    return res.status(400).json({ message: 'Carnet, nombre del turno, hora de entrada y hora de salida son obligatorios' });
  }
  const dias = dias_aplicacion && String(dias_aplicacion).trim() ? String(dias_aplicacion).trim() : 'Lunes a viernes';
  const horasD = horas_diarias === '' || horas_diarias == null ? null : Number(horas_diarias);
  db.query(
    'UPDATE turnos_trabajo SET carnet_identidad = ?, nombre_turno = ?, hora_entrada = ?, hora_salida = ?, dias_aplicacion = ?, horas_diarias = ?, observaciones = ?, activo = ? WHERE id_turno = ?',
    [carnet_identidad, nombre_turno.trim(), hora_entrada, hora_salida, dias, Number.isNaN(horasD) ? null : horasD, observaciones || null, activo ? 1 : 0, id_turno],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-turno/:id_turno", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_turno = req.params.id_turno;
  db.query('DELETE FROM turnos_trabajo WHERE id_turno = ?', [id_turno], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA GRUPOS DE TRABAJO Y ASISTENCIA GRUPAL ====================
// (protegidas: admin y rrhh)

app.get("/grupos-trabajo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT g.id_grupo, g.nombre, g.descripcion, g.activo,
            (SELECT COUNT(*) FROM grupo_miembros m WHERE m.id_grupo = g.id_grupo) AS num_miembros
     FROM grupos_trabajo g
     ORDER BY g.id_grupo DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-grupo-trabajo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { nombre, descripcion, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del grupo es obligatorio' });
  }
  db.query(
    'INSERT INTO grupos_trabajo (nombre, descripcion, activo) VALUES (?, ?, ?)',
    [String(nombre).trim(), descripcion || null, activo ? 1 : 0],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-grupo-trabajo/:id_grupo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  const { nombre, descripcion, activo } = req.body;
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: 'El nombre del grupo es obligatorio' });
  }
  db.query(
    'UPDATE grupos_trabajo SET nombre = ?, descripcion = ?, activo = ? WHERE id_grupo = ?',
    [String(nombre).trim(), descripcion || null, activo ? 1 : 0, id_grupo],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-grupo-trabajo/:id_grupo", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  db.query('DELETE FROM grupos_trabajo WHERE id_grupo = ?', [id_grupo], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

app.get("/grupo-trabajo/:id_grupo/miembros", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  db.query(
    `SELECT m.carnet_identidad, e.nombre, e.apellidos
     FROM grupo_miembros m
     INNER JOIN empleados e ON e.carnet_identidad = m.carnet_identidad
     WHERE m.id_grupo = ?
     ORDER BY e.apellidos, e.nombre`,
    [id_grupo],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/grupo-trabajo/:id_grupo/miembros", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_grupo = req.params.id_grupo;
  const { carnet_identidad } = req.body;
  if (!carnet_identidad) {
    return res.status(400).json({ message: 'Debe indicar el carnet del empleado' });
  }
  db.query(
    'INSERT INTO grupo_miembros (id_grupo, carnet_identidad) VALUES (?, ?)',
    [id_grupo, String(carnet_identidad).trim()],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'El empleado ya pertenece a este grupo' });
        }
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'Carnet o grupo no válido' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.delete("/grupo-trabajo/:id_grupo/miembros/:carnet_identidad", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { id_grupo, carnet_identidad } = req.params;
  db.query(
    'DELETE FROM grupo_miembros WHERE id_grupo = ? AND carnet_identidad = ?',
    [id_grupo, carnet_identidad],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.get("/asistencia-grupal", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT a.id_asistencia, a.id_grupo, DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
            a.miembros_presentes, a.miembros_total, a.observaciones, g.nombre AS nombre_grupo
     FROM asistencia_grupal a
     INNER JOIN grupos_trabajo g ON g.id_grupo = a.id_grupo
     ORDER BY a.fecha DESC, a.id_asistencia DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-asistencia-grupal", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { id_grupo, fecha, miembros_presentes, observaciones } = req.body;
  if (!id_grupo || !fecha) {
    return res.status(400).json({ message: 'Grupo y fecha son obligatorios' });
  }
  db.query('SELECT COUNT(*) AS c FROM grupo_miembros WHERE id_grupo = ?', [id_grupo], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const total = rows[0].c;
    if (total === 0) {
      return res.status(400).json({ message: 'El grupo no tiene miembros; agregue integrantes antes de registrar asistencia' });
    }
    let presentes = miembros_presentes;
    if (presentes === '' || presentes == null) presentes = total;
    presentes = parseInt(presentes, 10);
    if (Number.isNaN(presentes) || presentes < 0 || presentes > total) {
      return res.status(400).json({ message: `Los presentes deben estar entre 0 y ${total} (miembros del grupo)` });
    }
    db.query(
      'INSERT INTO asistencia_grupal (id_grupo, fecha, miembros_presentes, miembros_total, observaciones) VALUES (?, ?, ?, ?, ?)',
      [id_grupo, fecha, presentes, total, observaciones || null],
      (insErr, insRes) => {
        if (insErr) {
          console.log(insErr);
          if (insErr.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un registro de asistencia para ese grupo en esa fecha' });
          }
          return res.status(500).send(insErr);
        }
        res.status(201).send(insRes);
      }
    );
  });
});

app.put("/update-asistencia-grupal/:id_asistencia", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_asistencia = req.params.id_asistencia;
  const { id_grupo, fecha, miembros_presentes, observaciones } = req.body;
  if (!id_grupo || !fecha) {
    return res.status(400).json({ message: 'Grupo y fecha son obligatorios' });
  }
  db.query('SELECT COUNT(*) AS c FROM grupo_miembros WHERE id_grupo = ?', [id_grupo], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const total = rows[0].c;
    if (total === 0) {
      return res.status(400).json({ message: 'El grupo no tiene miembros' });
    }
    let presentes = miembros_presentes;
    if (presentes === '' || presentes == null) presentes = total;
    presentes = parseInt(presentes, 10);
    if (Number.isNaN(presentes) || presentes < 0 || presentes > total) {
      return res.status(400).json({ message: `Los presentes deben estar entre 0 y ${total}` });
    }
    db.query(
      'UPDATE asistencia_grupal SET id_grupo = ?, fecha = ?, miembros_presentes = ?, miembros_total = ?, observaciones = ? WHERE id_asistencia = ?',
      [id_grupo, fecha, presentes, total, observaciones || null, id_asistencia],
      (upErr, upRes) => {
        if (upErr) {
          console.log(upErr);
          if (upErr.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe asistencia para ese grupo en esa fecha' });
          }
          return res.status(500).send(upErr);
        }
        res.send(upRes);
      }
    );
  });
});

app.delete("/delete-asistencia-grupal/:id_asistencia", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_asistencia = req.params.id_asistencia;
  db.query('DELETE FROM asistencia_grupal WHERE id_asistencia = ?', [id_asistencia], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA SANCIONES A EMPLEADOS ====================
// (protegidas: admin y rrhh)

app.get("/sanciones-empleado", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT s.id_sancion, s.carnet_identidad, s.tipo_sancion, s.motivo,
            DATE_FORMAT(s.fecha_aplicacion, '%Y-%m-%d') AS fecha_aplicacion,
            s.dias_suspension, s.observaciones, s.activo,
            e.nombre, e.apellidos
     FROM sanciones_empleado s
     INNER JOIN empleados e ON e.carnet_identidad = s.carnet_identidad
     ORDER BY s.fecha_aplicacion DESC, s.id_sancion DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-sancion-empleado", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, tipo_sancion, motivo, fecha_aplicacion, dias_suspension, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_sancion || !String(tipo_sancion).trim() || !motivo || !String(motivo).trim() || !fecha_aplicacion) {
    return res.status(400).json({ message: 'Carnet, tipo de sanción, motivo y fecha de aplicación son obligatorios' });
  }
  const dias = dias_suspension === '' || dias_suspension == null ? null : parseInt(dias_suspension, 10);
  const diasVal = Number.isNaN(dias) ? null : dias;
  db.query(
    'INSERT INTO sanciones_empleado (carnet_identidad, tipo_sancion, motivo, fecha_aplicacion, dias_suspension, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(tipo_sancion).trim(),
      String(motivo).trim(),
      fecha_aplicacion,
      diasVal,
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-sancion-empleado/:id_sancion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_sancion = req.params.id_sancion;
  const { carnet_identidad, tipo_sancion, motivo, fecha_aplicacion, dias_suspension, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_sancion || !String(tipo_sancion).trim() || !motivo || !String(motivo).trim() || !fecha_aplicacion) {
    return res.status(400).json({ message: 'Carnet, tipo de sanción, motivo y fecha de aplicación son obligatorios' });
  }
  const dias = dias_suspension === '' || dias_suspension == null ? null : parseInt(dias_suspension, 10);
  const diasVal = Number.isNaN(dias) ? null : dias;
  db.query(
    'UPDATE sanciones_empleado SET carnet_identidad = ?, tipo_sancion = ?, motivo = ?, fecha_aplicacion = ?, dias_suspension = ?, observaciones = ?, activo = ? WHERE id_sancion = ?',
    [
      String(carnet_identidad).trim(),
      String(tipo_sancion).trim(),
      String(motivo).trim(),
      fecha_aplicacion,
      diasVal,
      observaciones || null,
      activo ? 1 : 0,
      id_sancion,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-sancion-empleado/:id_sancion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_sancion = req.params.id_sancion;
  db.query('DELETE FROM sanciones_empleado WHERE id_sancion = ?', [id_sancion], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA RECONOCIMIENTOS A EMPLEADOS ====================
// (protegidas: admin y rrhh)

app.get("/reconocimientos-empleado", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT r.id_reconocimiento, r.carnet_identidad, r.tipo_reconocimiento, r.descripcion,
            DATE_FORMAT(r.fecha_otorgamiento, '%Y-%m-%d') AS fecha_otorgamiento,
            r.valor_estimulo, r.observaciones, r.activo,
            e.nombre, e.apellidos
     FROM reconocimientos_empleado r
     INNER JOIN empleados e ON e.carnet_identidad = r.carnet_identidad
     ORDER BY r.fecha_otorgamiento DESC, r.id_reconocimiento DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-reconocimiento-empleado", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, tipo_reconocimiento, descripcion, fecha_otorgamiento, valor_estimulo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_reconocimiento || !String(tipo_reconocimiento).trim() || !descripcion || !String(descripcion).trim() || !fecha_otorgamiento) {
    return res.status(400).json({ message: 'Carnet, tipo de reconocimiento, descripción y fecha de otorgamiento son obligatorios' });
  }
  const val = valor_estimulo === '' || valor_estimulo == null ? null : Number(valor_estimulo);
  const valorFinal = val != null && !Number.isNaN(val) ? val : null;
  db.query(
    'INSERT INTO reconocimientos_empleado (carnet_identidad, tipo_reconocimiento, descripcion, fecha_otorgamiento, valor_estimulo, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(tipo_reconocimiento).trim(),
      String(descripcion).trim(),
      fecha_otorgamiento,
      valorFinal,
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-reconocimiento-empleado/:id_reconocimiento", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_reconocimiento = req.params.id_reconocimiento;
  const { carnet_identidad, tipo_reconocimiento, descripcion, fecha_otorgamiento, valor_estimulo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_reconocimiento || !String(tipo_reconocimiento).trim() || !descripcion || !String(descripcion).trim() || !fecha_otorgamiento) {
    return res.status(400).json({ message: 'Carnet, tipo de reconocimiento, descripción y fecha de otorgamiento son obligatorios' });
  }
  const val = valor_estimulo === '' || valor_estimulo == null ? null : Number(valor_estimulo);
  const valorFinal = val != null && !Number.isNaN(val) ? val : null;
  db.query(
    'UPDATE reconocimientos_empleado SET carnet_identidad = ?, tipo_reconocimiento = ?, descripcion = ?, fecha_otorgamiento = ?, valor_estimulo = ?, observaciones = ?, activo = ? WHERE id_reconocimiento = ?',
    [
      String(carnet_identidad).trim(),
      String(tipo_reconocimiento).trim(),
      String(descripcion).trim(),
      fecha_otorgamiento,
      valorFinal,
      observaciones || null,
      activo ? 1 : 0,
      id_reconocimiento,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-reconocimiento-empleado/:id_reconocimiento", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_reconocimiento = req.params.id_reconocimiento;
  db.query('DELETE FROM reconocimientos_empleado WHERE id_reconocimiento = ?', [id_reconocimiento], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA JUBILACIONES Y RETIROS (RF14) ====================
// (protegidas: admin y rrhh)

app.get("/jubilaciones-empleado", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  db.query(
    `SELECT j.id_jubilacion, j.carnet_identidad, j.tipo_salida,
            DATE_FORMAT(j.fecha_efectiva, '%Y-%m-%d') AS fecha_efectiva,
            j.motivo, j.observaciones, j.activo,
            e.nombre, e.apellidos
     FROM jubilaciones_empleado j
     INNER JOIN empleados e ON e.carnet_identidad = j.carnet_identidad
     ORDER BY j.fecha_efectiva DESC, j.id_jubilacion DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-jubilacion-empleado", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const { carnet_identidad, tipo_salida, fecha_efectiva, motivo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_salida || !String(tipo_salida).trim() || !fecha_efectiva || !motivo || !String(motivo).trim()) {
    return res.status(400).json({ message: 'Carnet, tipo de salida, fecha efectiva y motivo son obligatorios' });
  }
  db.query(
    'INSERT INTO jubilaciones_empleado (carnet_identidad, tipo_salida, fecha_efectiva, motivo, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      String(tipo_salida).trim(),
      fecha_efectiva,
      String(motivo).trim(),
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-jubilacion-empleado/:id_jubilacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_jubilacion = req.params.id_jubilacion;
  const { carnet_identidad, tipo_salida, fecha_efectiva, motivo, observaciones, activo } = req.body;
  if (!carnet_identidad || !tipo_salida || !String(tipo_salida).trim() || !fecha_efectiva || !motivo || !String(motivo).trim()) {
    return res.status(400).json({ message: 'Carnet, tipo de salida, fecha efectiva y motivo son obligatorios' });
  }
  db.query(
    'UPDATE jubilaciones_empleado SET carnet_identidad = ?, tipo_salida = ?, fecha_efectiva = ?, motivo = ?, observaciones = ?, activo = ? WHERE id_jubilacion = ?',
    [
      String(carnet_identidad).trim(),
      String(tipo_salida).trim(),
      fecha_efectiva,
      String(motivo).trim(),
      observaciones || null,
      activo ? 1 : 0,
      id_jubilacion,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-jubilacion-empleado/:id_jubilacion", verificarToken, autorizarRol(['admin', 'rrhh']), (req, res) => {
  const id_jubilacion = req.params.id_jubilacion;
  db.query('DELETE FROM jubilaciones_empleado WHERE id_jubilacion = ?', [id_jubilacion], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

// ==================== RUTAS PARA EVALUACIONES MÉDICAS (CHEQUEOS PERIÓDICOS) ====================
// (protegidas: admin, rrhh y producción — mismo criterio que cert. médicos)

app.get("/evaluaciones-medicas", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  db.query(
    `SELECT e.id_eval_medica, e.carnet_identidad,
            DATE_FORMAT(e.fecha_evaluacion, '%Y-%m-%d') AS fecha_evaluacion,
            e.tipo_chequeo, e.resultado, e.medico_nombre,
            DATE_FORMAT(e.proximo_chequeo, '%Y-%m-%d') AS proximo_chequeo,
            e.observaciones, e.activo,
            emp.nombre, emp.apellidos
     FROM eval_medicas e
     INNER JOIN empleados emp ON emp.carnet_identidad = e.carnet_identidad
     ORDER BY e.fecha_evaluacion DESC, e.id_eval_medica DESC`,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.post("/create-evaluacion-medica", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  const { carnet_identidad, fecha_evaluacion, tipo_chequeo, resultado, medico_nombre, proximo_chequeo, observaciones, activo } = req.body;
  if (!carnet_identidad || !fecha_evaluacion || !resultado || !String(resultado).trim() || !medico_nombre || !String(medico_nombre).trim()) {
    return res.status(400).json({ message: 'Carnet, fecha de evaluación, resultado y nombre del médico son obligatorios' });
  }
  const tipo = tipo_chequeo && String(tipo_chequeo).trim() ? String(tipo_chequeo).trim() : 'Periódico';
  const prox = proximo_chequeo && String(proximo_chequeo).trim() ? proximo_chequeo : null;
  db.query(
    'INSERT INTO eval_medicas (carnet_identidad, fecha_evaluacion, tipo_chequeo, resultado, medico_nombre, proximo_chequeo, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      String(carnet_identidad).trim(),
      fecha_evaluacion,
      tipo,
      String(resultado).trim(),
      String(medico_nombre).trim(),
      prox,
      observaciones || null,
      activo ? 1 : 0,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    }
  );
});

app.put("/update-evaluacion-medica/:id_eval_medica", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  const id_eval_medica = req.params.id_eval_medica;
  const { carnet_identidad, fecha_evaluacion, tipo_chequeo, resultado, medico_nombre, proximo_chequeo, observaciones, activo } = req.body;
  if (!carnet_identidad || !fecha_evaluacion || !resultado || !String(resultado).trim() || !medico_nombre || !String(medico_nombre).trim()) {
    return res.status(400).json({ message: 'Carnet, fecha de evaluación, resultado y nombre del médico son obligatorios' });
  }
  const tipo = tipo_chequeo && String(tipo_chequeo).trim() ? String(tipo_chequeo).trim() : 'Periódico';
  const prox = proximo_chequeo && String(proximo_chequeo).trim() ? proximo_chequeo : null;
  db.query(
    'UPDATE eval_medicas SET carnet_identidad = ?, fecha_evaluacion = ?, tipo_chequeo = ?, resultado = ?, medico_nombre = ?, proximo_chequeo = ?, observaciones = ?, activo = ? WHERE id_eval_medica = ?',
    [
      String(carnet_identidad).trim(),
      fecha_evaluacion,
      tipo,
      String(resultado).trim(),
      String(medico_nombre).trim(),
      prox,
      observaciones || null,
      activo ? 1 : 0,
      id_eval_medica,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
          return res.status(400).json({ message: 'El carnet no corresponde a un empleado registrado' });
        }
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.delete("/delete-evaluacion-medica/:id_eval_medica", verificarToken, autorizarRol(['admin', 'rrhh', 'produccion']), (req, res) => {
  const id_eval_medica = req.params.id_eval_medica;
  db.query('DELETE FROM eval_medicas WHERE id_eval_medica = ?', [id_eval_medica], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});



app.listen(3001, () => {
  console.log('Corriendo en el puerto 3001');
});


