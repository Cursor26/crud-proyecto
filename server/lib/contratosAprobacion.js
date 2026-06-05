const fs = require('fs');
const path = require('path');

function usuarioDesdeReq(req) {
  return String(req.user?.email || req.user?.nombre || '').trim() || null;
}

function normalizarAprobacionEstado(val) {
  return String(val || 'aprobado').trim().toLowerCase();
}

function parsePropuesta(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

async function aplicarDatosContratoDesdeBody(dbQuery, deps, numeroWhere, body) {
  const { idsContratoDesdeBody, prioridadDesdeBody, prepareContactosNivelesForSave, prepareAnexosForSave } = deps;
  const { idContraparte, idTipo } = await idsContratoDesdeBody(dbQuery, body);
  const prioridad = prioridadDesdeBody(body);
  const { contactosJson, correoPrincipal, nivelesJson } = prepareContactosNivelesForSave(body);
  const anexosJson = prepareAnexosForSave(body);
  const numeroNuevo = String(body.numero_contrato || numeroWhere || '').trim();

  const result = await dbQuery(
    `UPDATE contratos_generales
        SET numero_contrato = ?,
            id_contraparte = ?,
            empresa = ?,
            correo_notificacion = ?,
            contactos_notificacion = ?,
            contactos_niveles = ?,
            suplementos = ?,
            anexos = ?,
            vigencia = ?,
            id_tipo_contrato = ?,
            prioridad = ?,
            fecha_inicio = ?,
            fecha_fin = ?,
            cancelado = IF(? IS NOT NULL AND ? >= CURDATE(), 0, cancelado),
            cancelado_en = IF(? IS NOT NULL AND ? >= CURDATE(), NULL, cancelado_en),
            cancelado_por = IF(? IS NOT NULL AND ? >= CURDATE(), NULL, cancelado_por)
      WHERE numero_contrato = ?`,
    [
      numeroNuevo,
      idContraparte,
      body.empresa,
      correoPrincipal,
      contactosJson,
      nivelesJson,
      body.suplementos,
      anexosJson,
      body.vigencia,
      idTipo,
      prioridad,
      body.fecha_inicio,
      body.fecha_fin,
      body.fecha_fin,
      body.fecha_fin,
      body.fecha_fin,
      body.fecha_fin,
      body.fecha_fin,
      body.fecha_fin,
      numeroWhere,
    ]
  );

  return { result, numeroNuevo };
}

async function eliminarDocumentosContrato(dbQuery, resolveAbsPath, numero) {
  const docs = await dbQuery(
    'SELECT id_documento, ruta_relativa FROM contratos_documentos WHERE numero_contrato = ?',
    [numero]
  );
  for (const doc of docs || []) {
    try {
      const abs = resolveAbsPath(doc.ruta_relativa);
      if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      /* best-effort */
    }
  }
  await dbQuery('DELETE FROM contratos_documentos WHERE numero_contrato = ?', [numero]);
}

async function marcarAprobacionResuelta(dbQuery, numero, resueltoPor) {
  await dbQuery(
    `UPDATE contratos_generales
        SET aprobacion_estado = 'aprobado',
            aprobacion_accion = NULL,
            aprobacion_propuesta = NULL,
            aprobacion_resuelto_por = ?,
            aprobacion_resuelto_en = NOW(),
            aprobacion_resolucion_nota = NULL
      WHERE numero_contrato = ?`,
    [resueltoPor, numero]
  );
}

async function aprobarContratoPendiente(dbQuery, deps, numero, resueltoPor) {
  const rows = await dbQuery(
    `SELECT numero_contrato, aprobacion_estado, aprobacion_accion, aprobacion_propuesta,
            COALESCE(cancelado, 0) AS cancelado
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
  const estado = normalizarAprobacionEstado(c.aprobacion_estado);
  const accion = String(c.aprobacion_accion || '').toLowerCase();

  if (estado !== 'pendiente') {
    const err = new Error('Este contrato no tiene una solicitud pendiente de aprobación.');
    err.status = 400;
    throw err;
  }

  if (accion === 'alta') {
    await marcarAprobacionResuelta(dbQuery, numero, resueltoPor);
    return { ok: true, accion: 'alta', numero_contrato: numero, estado: 'Activo' };
  }

  if (accion === 'edicion') {
    const propuesta = parsePropuesta(c.aprobacion_propuesta);
    if (!propuesta || typeof propuesta !== 'object') {
      const err = new Error('No hay datos de modificación para aplicar.');
      err.status = 400;
      throw err;
    }
    const { numeroNuevo } = await aplicarDatosContratoDesdeBody(dbQuery, deps, numero, propuesta);
    await marcarAprobacionResuelta(dbQuery, numeroNuevo, resueltoPor);
    return { ok: true, accion: 'edicion', numero_contrato: numeroNuevo, estado: 'Activo' };
  }

  if (accion === 'archivo' || accion === 'cancelacion_archivo') {
    const propuesta = parsePropuesta(c.aprobacion_propuesta);
    const motivo =
      propuesta?.motivo != null && String(propuesta.motivo).trim()
        ? String(propuesta.motivo).trim().slice(0, 500)
        : null;
    if (typeof deps.archivarContratoActivo !== 'function') {
      const err = new Error('Archivo de contrato no configurado en el servidor.');
      err.status = 500;
      throw err;
    }
    const archivado = await deps.archivarContratoActivo(numero, {
      motivo,
      eliminadoPor: resueltoPor,
      documentosCliente: Array.isArray(deps.documentosClienteAprobar)
        ? deps.documentosClienteAprobar
        : [],
    });
    return {
      ok: true,
      accion,
      numero_contrato: numero,
      estado: 'Archivado',
      id_archivo: archivado.id_archivo,
      retencion_hasta: archivado.retencion_hasta,
      motivo: archivado.motivo,
      empresa: archivado.empresa,
    };
  }

  if (accion === 'cancelacion') {
    if (Number(c.cancelado) === 1) {
      const err = new Error('El contrato ya está cancelado.');
      err.status = 400;
      throw err;
    }
    await dbQuery(
      `UPDATE contratos_generales
          SET cancelado = 1,
              cancelado_en = NOW(),
              cancelado_por = ?,
              aprobacion_estado = 'aprobado',
              aprobacion_accion = NULL,
              aprobacion_propuesta = NULL,
              aprobacion_resuelto_por = ?,
              aprobacion_resuelto_en = NOW(),
              aprobacion_resolucion_nota = NULL
        WHERE numero_contrato = ?`,
      [resueltoPor, resueltoPor, numero]
    );
    return { ok: true, accion: 'cancelacion', numero_contrato: numero, estado: 'Cancelado' };
  }

  const err = new Error('Acción de aprobación no reconocida.');
  err.status = 400;
  throw err;
}

async function rechazarContratoPendiente(dbQuery, deps, numero, resueltoPor, motivoRechazo = null) {
  const { resolveAbsPath } = deps;
  const motivo = motivoRechazo != null && String(motivoRechazo).trim() ? String(motivoRechazo).trim().slice(0, 500) : null;
  if (!motivo) {
    const err = new Error('Debe indicar el motivo del rechazo.');
    err.status = 400;
    throw err;
  }
  const rows = await dbQuery(
    `SELECT numero_contrato, empresa, aprobacion_estado, aprobacion_accion
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
  const estado = normalizarAprobacionEstado(c.aprobacion_estado);
  const accion = String(c.aprobacion_accion || '').toLowerCase();

  if (estado !== 'pendiente') {
    const err = new Error('Este contrato no tiene una solicitud pendiente de aprobación.');
    err.status = 400;
    throw err;
  }

  if (accion === 'alta') {
    await eliminarDocumentosContrato(dbQuery, resolveAbsPath, numero);
    await dbQuery('DELETE FROM contratos_generales WHERE numero_contrato = ?', [numero]);
    return { ok: true, accion: 'alta', eliminado: true, motivo, empresa: c.empresa };
  }

  if (accion === 'edicion' || accion === 'cancelacion' || accion === 'cancelacion_archivo' || accion === 'archivo') {
    await dbQuery(
      `UPDATE contratos_generales
          SET aprobacion_estado = 'aprobado',
              aprobacion_accion = NULL,
              aprobacion_propuesta = NULL,
              aprobacion_resuelto_por = ?,
              aprobacion_resuelto_en = NOW(),
              aprobacion_resolucion_nota = ?
        WHERE numero_contrato = ?`,
      [resueltoPor, motivo, numero]
    );
    return { ok: true, accion, numero_contrato: numero, motivo, empresa: c.empresa };
  }

  const err = new Error('Acción de rechazo no reconocida.');
  err.status = 400;
  throw err;
}

module.exports = {
  usuarioDesdeReq,
  normalizarAprobacionEstado,
  parsePropuesta,
  aplicarDatosContratoDesdeBody,
  aprobarContratoPendiente,
  rechazarContratoPendiente,
};
