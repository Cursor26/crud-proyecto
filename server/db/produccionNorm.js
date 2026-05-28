/**
 * Capa de acceso a producción normalizada (prod_registro + prod_valor + prod_metrica).
 */

const {
  metricasAlmacenables,
  enriquecerRegistroProduccion,
  stripTotalesParaGuardar,
} = require('./produccionTotals');

const MODULO_ID = { sacrificio: 1, matadero: 2, leche: 3 };
const ID_MODULO = { 1: 'sacrificio', 2: 'matadero', 3: 'leche' };

let metricaCache = null;

async function ensureMetricaCache(dbQuery) {
  if (metricaCache) return metricaCache;
  const rows = await dbQuery('SELECT id_metrica, clave FROM prod_metrica');
  const byClave = new Map();
  const byId = new Map();
  for (const r of rows) {
    byClave.set(r.clave, r.id_metrica);
    byId.set(r.id_metrica, r.clave);
  }
  metricaCache = { byClave, byId };
  return metricaCache;
}

function invalidateMetricaCache() {
  metricaCache = null;
}

async function getOrCreateRegistroId(dbQuery, modulo, fecha) {
  const idMod = MODULO_ID[modulo];
  const existing = await dbQuery(
    'SELECT id_registro FROM prod_registro WHERE id_modulo = ? AND fecha = ? LIMIT 1',
    [idMod, fecha]
  );
  if (existing.length) return existing[0].id_registro;
  const ins = await dbQuery(
    'INSERT INTO prod_registro (id_modulo, fecha) VALUES (?, ?)',
    [idMod, fecha]
  );
  return ins.insertId;
}

async function wideRowFromDb(dbQuery, modulo, fecha) {
  const idMod = MODULO_ID[modulo];
  const reg = await dbQuery(
    `SELECT id_registro, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, creado_por, actualizado_por
       FROM prod_registro WHERE id_modulo = ? AND fecha = ? LIMIT 1`,
    [idMod, fecha]
  );
  if (!reg.length) return null;
  const { id_registro, creado_por, actualizado_por } = reg[0];
  const cache = await ensureMetricaCache(dbQuery);
  const vals = await dbQuery(
    'SELECT id_metrica, valor FROM prod_valor WHERE id_registro = ?',
    [id_registro]
  );
  const row = { fecha: reg[0].fecha, creado_por, actualizado_por };
  for (const v of vals) {
    const clave = cache.byId.get(v.id_metrica);
    if (clave) row[clave] = v.valor;
  }
  const almacenables = metricasAlmacenables(modulo);
  for (const k of almacenables) {
    if (row[k] === undefined || row[k] === null) row[k] = 0;
  }
  return enriquecerRegistroProduccion(modulo, row);
}

async function listWideFromDb(dbQuery, modulo) {
  const idMod = MODULO_ID[modulo];
  const regs = await dbQuery(
    `SELECT id_registro, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, creado_por, actualizado_por
       FROM prod_registro WHERE id_modulo = ? ORDER BY fecha DESC`,
    [idMod]
  );
  if (!regs.length) return [];
  const cache = await ensureMetricaCache(dbQuery);
  const ids = regs.map((r) => r.id_registro);
  const placeholders = ids.map(() => '?').join(',');
  const vals = await dbQuery(
    `SELECT id_registro, id_metrica, valor FROM prod_valor WHERE id_registro IN (${placeholders})`,
    ids
  );
  const byReg = new Map();
  for (const r of regs) {
    byReg.set(r.id_registro, {
      fecha: r.fecha,
      creado_por: r.creado_por,
      actualizado_por: r.actualizado_por,
    });
  }
  for (const v of vals) {
    const row = byReg.get(v.id_registro);
    if (!row) continue;
    const clave = cache.byId.get(v.id_metrica);
    if (clave) row[clave] = v.valor;
  }
  const almacenables = metricasAlmacenables(modulo);
  return [...byReg.values()].map((row) => {
    for (const k of almacenables) {
      if (row[k] === undefined || row[k] === null) row[k] = 0;
    }
    return enriquecerRegistroProduccion(modulo, row);
  });
}

async function saveWideToDb(dbQuery, modulo, data, meta = {}) {
  const stripped = stripTotalesParaGuardar(modulo, data);
  const fecha = String(stripped.fecha || '').split('T')[0];
  const idReg = await getOrCreateRegistroId(dbQuery, modulo, fecha);
  const cache = await ensureMetricaCache(dbQuery);
  const almacenables = metricasAlmacenables(modulo);

  await dbQuery(
    'UPDATE prod_registro SET creado_por = COALESCE(creado_por, ?), actualizado_por = ? WHERE id_registro = ?',
    [meta.creado_por || null, meta.actualizado_por || null, idReg]
  );

  for (const clave of almacenables) {
    let idMet = cache.byClave.get(clave);
    if (!idMet) {
      const ins = await dbQuery('INSERT INTO prod_metrica (clave) VALUES (?)', [clave]);
      idMet = ins.insertId;
      cache.byClave.set(clave, idMet);
      cache.byId.set(idMet, clave);
    }
    const valor = stripped[clave] ?? 0;
    await dbQuery(
      `INSERT INTO prod_valor (id_registro, id_metrica, valor) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [idReg, idMet, valor]
    );
  }
  return { id_registro: idReg, fecha };
}

async function deleteRegistroByFecha(dbQuery, modulo, fecha) {
  const idMod = MODULO_ID[modulo];
  await dbQuery('DELETE FROM prod_registro WHERE id_modulo = ? AND fecha = ?', [idMod, fecha]);
}

async function insertHistorico(dbQuery, modulo, fechaDato, accion, wideRow, usuarioEmail) {
  const idMod = MODULO_ID[modulo];
  const ins = await dbQuery(
    `INSERT INTO historico_produccion (id_modulo, fecha_dato, accion, usuario_email) VALUES (?, ?, ?, ?)`,
    [idMod, fechaDato, accion, usuarioEmail || null]
  );
  const idHist = ins.insertId;
  const stripped = stripTotalesParaGuardar(modulo, wideRow);
  const cache = await ensureMetricaCache(dbQuery);
  const almacenables = metricasAlmacenables(modulo);
  for (const clave of almacenables) {
    const idMet = cache.byClave.get(clave);
    if (!idMet) continue;
    await dbQuery(
      'INSERT INTO historico_produccion_valor (id_historico, id_metrica, valor) VALUES (?, ?, ?)',
      [idHist, idMet, stripped[clave] ?? 0]
    );
  }
  return idHist;
}

async function listHistorico(dbQuery, filters = {}) {
  let sql = `
    SELECT h.id, m.codigo AS fuente, h.fecha_dato, h.accion, h.usuario_email,
           DATE_FORMAT(h.creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en
      FROM historico_produccion h
      INNER JOIN prod_modulo m ON m.id_modulo = h.id_modulo
     WHERE 1=1`;
  const params = [];
  if (filters.fuente) {
    sql += ' AND m.codigo = ?';
    params.push(filters.fuente);
  }
  if (filters.desde) {
    sql += ' AND h.fecha_dato >= ?';
    params.push(filters.desde);
  }
  if (filters.hasta) {
    sql += ' AND h.fecha_dato <= ?';
    params.push(filters.hasta);
  }
  sql += ' ORDER BY h.creado_en DESC, h.id DESC LIMIT 500';
  const rows = await dbQuery(sql, params);
  return rows;
}

async function historicoDatosSnapshot(dbQuery, idHistorico, fuente) {
  const cache = await ensureMetricaCache(dbQuery);
  const vals = await dbQuery(
    'SELECT id_metrica, valor FROM historico_produccion_valor WHERE id_historico = ?',
    [idHistorico]
  );
  const row = {};
  for (const v of vals) {
    const clave = cache.byId.get(v.id_metrica);
    if (clave) row[clave] = v.valor;
  }
  const modulo = fuente || 'sacrificio';
  const almacenables = metricasAlmacenables(modulo);
  for (const k of almacenables) {
    if (row[k] === undefined || row[k] === null) row[k] = 0;
  }
  return enriquecerRegistroProduccion(modulo, row);
}

module.exports = {
  MODULO_ID,
  ID_MODULO,
  invalidateMetricaCache,
  wideRowFromDb,
  listWideFromDb,
  saveWideToDb,
  deleteRegistroByFecha,
  insertHistorico,
  listHistorico,
  historicoDatosSnapshot,
  enriquecerRegistroProduccion,
  stripTotalesParaGuardar,
};
