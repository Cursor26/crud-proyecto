const {
  guardarAdjuntosRechazo,
  eliminarAdjuntosContrato,
  eliminarDocumentosActivosContrato,
} = require('./contratosJuridicoAdjuntos');

const TIPOS_RECHAZO_JURIDICO = new Set(['observado', 'rechazado', 'correcciones_requeridas']);
const ESTADOS_DEVUELTOS = new Set(['observado', 'rechazado', 'correcciones_requeridas']);

function normalizarRevisionJuridicaEstado(val) {
  return String(val || 'na').trim().toLowerCase();
}

function sqlMarcarRevisionPendiente() {
  return `revision_juridica_estado = 'pendiente',
          revision_juridica_resuelto_por = NULL,
          revision_juridica_resuelto_en = NULL,
          revision_juridica_nota = NULL`;
}

async function fetchContratoRevision(dbQuery, numero) {
  const rows = await dbQuery(
    `SELECT numero_contrato, empresa, aprobacion_estado, aprobacion_accion,
            revision_juridica_estado, revision_juridica_nota
       FROM contratos_generales
      WHERE numero_contrato = ?
      LIMIT 1`,
    [numero]
  );
  return rows[0] || null;
}

function assertRevisionPendiente(c) {
  const estadoAprob = String(c.aprobacion_estado || '').toLowerCase();
  const revision = normalizarRevisionJuridicaEstado(c.revision_juridica_estado);
  if (estadoAprob !== 'pendiente') {
    const err = new Error('Este contrato no tiene una solicitud pendiente.');
    err.status = 400;
    throw err;
  }
  if (revision !== 'pendiente') {
    const err = new Error('Este contrato no está pendiente de revisión jurídica.');
    err.status = 400;
    throw err;
  }
}

function assertPuedeAprobarOperativamente(revisionEstado) {
  const rev = normalizarRevisionJuridicaEstado(revisionEstado);
  if (rev !== 'aprobado_juridico' && rev !== 'na') {
    const err = new Error('Pendiente de revisión jurídica. El abogado debe verificar antes de aprobar.');
    err.status = 400;
    throw err;
  }
}

async function verificarAprobar(dbQuery, numero, resueltoPor) {
  const c = await fetchContratoRevision(dbQuery, numero);
  if (!c) {
    const err = new Error('Contrato no encontrado.');
    err.status = 404;
    throw err;
  }
  assertRevisionPendiente(c);

  await dbQuery(
    `UPDATE contratos_generales
        SET revision_juridica_estado = 'aprobado_juridico',
            revision_juridica_resuelto_por = ?,
            revision_juridica_resuelto_en = NOW(),
            revision_juridica_nota = NULL
      WHERE numero_contrato = ?`,
    [resueltoPor, numero]
  );

  return {
    ok: true,
    numero_contrato: numero,
    revision_juridica_estado: 'aprobado_juridico',
    empresa: c.empresa,
    accion: c.aprobacion_accion,
  };
}

function esDevueltoPorAbogadoEstado(revisionEstado) {
  return ESTADOS_DEVUELTOS.has(normalizarRevisionJuridicaEstado(revisionEstado));
}

async function verificarRechazar(dbQuery, numero, resueltoPor, tipo, motivo, documentos = []) {
  const tipoNorm = String(tipo || '').trim().toLowerCase();
  if (!TIPOS_RECHAZO_JURIDICO.has(tipoNorm)) {
    const err = new Error('Tipo de devolución jurídica no válido.');
    err.status = 400;
    throw err;
  }
  const nota = String(motivo || '').trim().slice(0, 500);
  if (!nota) {
    const err = new Error('Debe indicar el motivo u observación jurídica.');
    err.status = 400;
    throw err;
  }

  const c = await fetchContratoRevision(dbQuery, numero);
  if (!c) {
    const err = new Error('Contrato no encontrado.');
    err.status = 404;
    throw err;
  }
  assertRevisionPendiente(c);

  await dbQuery(
    `UPDATE contratos_generales
        SET revision_juridica_estado = ?,
            revision_juridica_resuelto_por = ?,
            revision_juridica_resuelto_en = NOW(),
            revision_juridica_nota = ?
      WHERE numero_contrato = ?`,
    [tipoNorm, resueltoPor, nota, numero]
  );

  const adjuntos = await guardarAdjuntosRechazo(dbQuery, numero, tipoNorm, resueltoPor, documentos);

  return {
    ok: true,
    numero_contrato: numero,
    revision_juridica_estado: tipoNorm,
    motivo: nota,
    empresa: c.empresa,
    accion: c.aprobacion_accion,
    adjuntos,
  };
}

async function retirarSolicitudDevuelta(dbQuery, numero, solicitadoPor) {
  const rows = await dbQuery(
    `SELECT numero_contrato, empresa, aprobacion_estado, aprobacion_accion, revision_juridica_estado
       FROM contratos_generales
      WHERE numero_contrato = ?
      LIMIT 1`,
    [numero]
  );
  if (!rows.length) {
    const err = new Error('Contrato no encontrado.');
    err.status = 404;
    throw err;
  }

  const c = rows[0];
  const estadoAprob = String(c.aprobacion_estado || '').toLowerCase();
  const accion = String(c.aprobacion_accion || '').toLowerCase();
  const revision = normalizarRevisionJuridicaEstado(c.revision_juridica_estado);

  if (estadoAprob !== 'pendiente' || !esDevueltoPorAbogadoEstado(revision)) {
    const err = new Error('Este contrato no tiene una solicitud devuelta que pueda retirarse.');
    err.status = 400;
    throw err;
  }

  if (accion === 'alta') {
    await eliminarDocumentosActivosContrato(dbQuery, numero);
    await eliminarAdjuntosContrato(dbQuery, numero);
    await dbQuery('DELETE FROM contratos_generales WHERE numero_contrato = ?', [numero]);
    return { ok: true, accion: 'alta', eliminado: true, numero_contrato: numero, empresa: c.empresa };
  }

  if (accion === 'edicion' || accion === 'cancelacion' || accion === 'cancelacion_archivo' || accion === 'archivo') {
    await dbQuery(
      `UPDATE contratos_generales
          SET aprobacion_estado = 'aprobado',
              aprobacion_accion = NULL,
              aprobacion_propuesta = NULL,
              aprobacion_resuelto_por = ?,
              aprobacion_resuelto_en = NOW(),
              aprobacion_resolucion_nota = NULL,
              revision_juridica_estado = 'na',
              revision_juridica_resuelto_por = NULL,
              revision_juridica_resuelto_en = NULL,
              revision_juridica_nota = NULL
        WHERE numero_contrato = ?`,
      [solicitadoPor, numero]
    );
    return { ok: true, accion, numero_contrato: numero, empresa: c.empresa };
  }

  const err = new Error('Acción de solicitud no reconocida.');
  err.status = 400;
  throw err;
}

async function listarComentarios(dbQuery, numero) {
  return dbQuery(
    `SELECT id, numero_contrato, autor_email, autor_nombre, tipo, texto, creado_en
       FROM contratos_juridico_comentarios
      WHERE numero_contrato = ?
      ORDER BY creado_en ASC`,
    [numero]
  );
}

async function agregarComentario(dbQuery, numero, { email, nombre, texto, tipo }) {
  const t = String(tipo || 'comentario').toLowerCase() === 'nota_legal' ? 'nota_legal' : 'comentario';
  const body = String(texto || '').trim();
  if (!body) {
    const err = new Error('El comentario no puede estar vacío.');
    err.status = 400;
    throw err;
  }
  if (body.length > 5000) {
    const err = new Error('El comentario es demasiado largo.');
    err.status = 400;
    throw err;
  }

  const exists = await dbQuery(
    'SELECT numero_contrato FROM contratos_generales WHERE numero_contrato = ? LIMIT 1',
    [numero]
  );
  if (!exists.length) {
    const err = new Error('Contrato no encontrado.');
    err.status = 404;
    throw err;
  }

  const ins = await dbQuery(
    `INSERT INTO contratos_juridico_comentarios
      (numero_contrato, autor_email, autor_nombre, tipo, texto)
     VALUES (?,?,?,?,?)`,
    [numero, String(email || '').trim(), String(nombre || '').trim() || null, t, body]
  );

  return {
    ok: true,
    id: ins.insertId,
    numero_contrato: numero,
    tipo: t,
    texto: body,
  };
}

function filtrarContratosParaAbogado(rows) {
  const activos = new Set([
    'pendiente',
    'observado',
    'rechazado',
    'correcciones_requeridas',
    'aprobado_juridico',
  ]);
  return (rows || []).filter((r) => {
    const aprob = String(r.aprobacion_estado || '').toLowerCase();
    const rev = normalizarRevisionJuridicaEstado(r.revision_juridica_estado);
    return aprob === 'pendiente' && activos.has(rev);
  });
}

module.exports = {
  TIPOS_RECHAZO_JURIDICO,
  normalizarRevisionJuridicaEstado,
  esDevueltoPorAbogadoEstado,
  sqlMarcarRevisionPendiente,
  assertPuedeAprobarOperativamente,
  verificarAprobar,
  verificarRechazar,
  retirarSolicitudDevuelta,
  listarComentarios,
  agregarComentario,
  filtrarContratosParaAbogado,
};
