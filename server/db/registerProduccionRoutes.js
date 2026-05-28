/**
 * Rutas CRUD de producción sobre esquema normalizado (prod_registro / prod_valor).
 */
const {
  listWideFromDb,
  wideRowFromDb,
  saveWideToDb,
  deleteRegistroByFecha,
} = require('./produccionNorm');

function registerProduccionRoutes(app, deps) {
  const {
    verificarToken,
    autorizarRol,
    validarSacrificio,
    validarMatadero,
    validarLeche,
    dbQuery,
    emailUsuario,
    archivarProduccion,
  } = deps;

  function registrar(modulo, validar, paths) {
    const { list, create, update, del } = paths;

    app.get(list, verificarToken, autorizarRol(['estadistica', 'director']), async (req, res) => {
      try {
        const rows = await listWideFromDb(dbQuery, modulo);
        res.send(rows);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.post(create, verificarToken, autorizarRol(['estadistica']), async (req, res) => {
      const v = validar(req.body);
      if (!v.ok) return res.status(400).json({ message: v.message, campo: v.campo });
      const fecha = String(v.data.fecha).split('T')[0];
      try {
        const existe = await wideRowFromDb(dbQuery, modulo, fecha);
        if (existe) {
          return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
        }
        const email = emailUsuario(req);
        await saveWideToDb(dbQuery, modulo, v.data, {
          creado_por: email,
          actualizado_por: email,
        });
        res.json({ message: 'Registro creado', fecha });
      } catch (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Ya existe un registro con esa fecha' });
        }
        res.status(500).send(err);
      }
    });

    app.put(update, verificarToken, autorizarRol(['estadistica']), async (req, res) => {
      const fecha = req.params.fecha;
      const v = validar(req.body);
      if (!v.ok) return res.status(400).json({ message: v.message, campo: v.campo });
      try {
        const anterior = await wideRowFromDb(dbQuery, modulo, fecha);
        if (!anterior) return res.status(404).json({ message: 'Registro no encontrado' });
        await new Promise((resolve, reject) => {
          archivarProduccion(modulo, 'actualizacion', req, anterior, (e) => (e ? reject(e) : resolve()));
        });
        const email = emailUsuario(req);
        const payload = { ...v.data, fecha };
        await saveWideToDb(dbQuery, modulo, payload, {
          creado_por: anterior.creado_por || email,
          actualizado_por: email,
        });
        res.json({ message: 'Registro actualizado' });
      } catch (err) {
        console.log(err);
        res.status(500).send(err);
      }
    });

    app.delete(del, verificarToken, autorizarRol(['estadistica']), async (req, res) => {
      const fecha = req.params.fecha;
      try {
        const anterior = await wideRowFromDb(dbQuery, modulo, fecha);
        if (!anterior) return res.status(404).json({ message: 'Registro no encontrado' });
        await new Promise((resolve, reject) => {
          archivarProduccion(modulo, 'eliminacion', req, anterior, (e) => (e ? reject(e) : resolve()));
        });
        await deleteRegistroByFecha(dbQuery, modulo, fecha);
        res.json({ message: 'Registro eliminado' });
      } catch (err) {
        console.log(err);
        res.status(500).send(err);
      }
    });
  }

  registrar('sacrificio', validarSacrificio, {
    list: '/sacrificio',
    create: '/create-sacrificio',
    update: '/update-sacrificio/:fecha',
    del: '/delete-sacrificio/:fecha',
  });
  registrar('matadero', validarMatadero, {
    list: '/matadero',
    create: '/create-matadero',
    update: '/update-matadero/:fecha',
    del: '/delete-matadero/:fecha',
  });
  registrar('leche', validarLeche, {
    list: '/leche',
    create: '/create-leche',
    update: '/update-leche/:fecha',
    del: '/delete-leche/:fecha',
  });
}

module.exports = { registerProduccionRoutes };
