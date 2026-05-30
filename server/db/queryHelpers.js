/**
 * Consultas y resolución de catálogos para BD normalizada.
 */

const SQL_USUARIO_AUTH = `SELECT u.email, u.nombre, u.password, r.codigo AS rol, u.activo
  FROM usuarios u
  INNER JOIN roles r ON r.id_rol = u.id_rol`;

const SQL_USUARIO_LIST = `SELECT u.email, u.nombre, r.codigo AS rol, u.activo,
  u.created_by, u.created_at, u.updated_by, u.updated_at
  FROM usuarios u
  INNER JOIN roles r ON r.id_rol = u.id_rol`;

const SQL_CONTRATO_SELECT = `SELECT c.numero_contrato,
  cp.codigo AS proveedor_cliente,
  c.empresa,
  c.correo_notificacion,
  c.suplementos,
  c.vigencia,
  COALESCE(tc.nombre, '') AS tipo_contrato,
  c.fecha_inicio,
  c.fecha_fin,
  COALESCE(c.cancelado, 0) AS cancelado,
  c.cancelado_en,
  c.cancelado_por,
  CASE WHEN c.fecha_fin IS NOT NULL AND c.fecha_fin < CURDATE() THEN 1 ELSE 0 END AS vencido
  FROM contratos_generales c
  LEFT JOIN catalogo_tipo_contraparte cp ON cp.id_contraparte = c.id_contraparte
  LEFT JOIN catalogo_tipo_contrato tc ON tc.id_tipo_contrato = c.id_tipo_contrato`;

const SQL_SEGSEG_LIST = `SELECT s.carnet_identidad AS id_tabla,
  MAX(CASE WHEN i.orden = 1 THEN i.cantidad END) AS cant_accuno,
  MAX(CASE WHEN i.orden = 1 THEN i.descripcion END) AS desc_uno,
  MAX(CASE WHEN i.orden = 2 THEN i.cantidad END) AS cant_accdos,
  MAX(CASE WHEN i.orden = 2 THEN i.descripcion END) AS desc_dos,
  MAX(CASE WHEN i.orden = 3 THEN i.cantidad END) AS cant_acctres,
  MAX(CASE WHEN i.orden = 3 THEN i.descripcion END) AS desc_tres
  FROM segseguridad s
  LEFT JOIN segseguridad_incidencia i ON i.id_seg = s.id_seg
  GROUP BY s.id_seg, s.carnet_identidad`;

const ROL_ID = {
  admin: 1,
  rrhh: 2,
  contratacion: 3,
  produccion: 4,
  estadistica: 5,
  director: 6,
};

function normalizarCarnetApi(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d || d.length > 11) return null;
  return d.padStart(11, '0');
}

async function idRolDesdeCodigo(dbQuery, codigo) {
  const c = String(codigo || '').trim().toLowerCase();
  if (ROL_ID[c]) return ROL_ID[c];
  const rows = await dbQuery('SELECT id_rol FROM roles WHERE codigo = ? LIMIT 1', [c]);
  return rows[0]?.id_rol || null;
}

async function idsContratoDesdeBody(dbQuery, body) {
  const idContraparte = Number(body.proveedor_cliente) === 1 ? 2 : 1;
  let idTipo = null;
  const nombre = String(body.tipo_contrato || '').trim();
  if (nombre) {
    await dbQuery('INSERT IGNORE INTO catalogo_tipo_contrato (nombre) VALUES (?)', [nombre]);
    const rows = await dbQuery(
      'SELECT id_tipo_contrato FROM catalogo_tipo_contrato WHERE nombre = ? LIMIT 1',
      [nombre]
    );
    idTipo = rows[0]?.id_tipo_contrato ?? null;
  }
  return { idContraparte, idTipo };
}

async function guardarSegseguridad(dbQuery, carnet, fields) {
  const c = normalizarCarnetApi(carnet);
  if (!c) throw new Error('Carnet inválido');
  const existing = await dbQuery('SELECT id_seg FROM segseguridad WHERE carnet_identidad = ? LIMIT 1', [c]);
  let idSeg = existing[0]?.id_seg;
  if (!idSeg) {
    const ins = await dbQuery('INSERT INTO segseguridad (carnet_identidad) VALUES (?)', [c]);
    idSeg = ins.insertId;
  }
  await dbQuery('DELETE FROM segseguridad_incidencia WHERE id_seg = ?', [idSeg]);
  const incs = [
    [1, fields.cant_accuno, fields.desc_uno],
    [2, fields.cant_accdos, fields.desc_dos],
    [3, fields.cant_acctres, fields.desc_tres],
  ];
  for (const [orden, cant, desc] of incs) {
    await dbQuery(
      'INSERT INTO segseguridad_incidencia (id_seg, orden, cantidad, descripcion) VALUES (?, ?, ?, ?)',
      [idSeg, orden, cant ?? null, desc ?? null]
    );
  }
  return c;
}

/** SELECT * con alias id_tabla para tablas RRHH 1:1 por carnet. */
function sqlRrhhList(table, extraCols = '*') {
  const cols =
    extraCols === '*'
      ? 't.*, t.carnet_identidad AS id_tabla'
      : `${extraCols}, t.carnet_identidad AS id_tabla`;
  return `SELECT ${cols} FROM ${table} t ORDER BY t.carnet_identidad`;
}

module.exports = {
  SQL_USUARIO_AUTH,
  SQL_USUARIO_LIST,
  SQL_CONTRATO_SELECT,
  SQL_SEGSEG_LIST,
  normalizarCarnetApi,
  idRolDesdeCodigo,
  idsContratoDesdeBody,
  guardarSegseguridad,
  sqlRrhhList,
};
