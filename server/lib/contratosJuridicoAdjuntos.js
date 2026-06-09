const fs = require('fs');
const { saveJuridicoAdjunto, resolveAbsPath } = require('./contratosDocumentosStorage');

const MAX_ADJUNTOS_RECHAZO = 3;
const MAX_BYTES_ADJUNTO = 15 * 1024 * 1024;

async function guardarAdjuntosRechazo(dbQuery, numero, revisionEstado, subidoPor, documentos) {
  const docs = Array.isArray(documentos) ? documentos : [];
  const guardados = [];

  for (const doc of docs.slice(0, MAX_ADJUNTOS_RECHAZO)) {
    const nombre = String(doc?.nombre || 'documento').trim();
    const dataUrl = String(doc?.dataUrl || '').trim();
    if (!nombre || !dataUrl) continue;

    const saved = saveJuridicoAdjunto(numero, nombre, dataUrl, doc?.mimeType);
    if (saved.tamanoBytes > MAX_BYTES_ADJUNTO) {
      try {
        const abs = resolveAbsPath(saved.rutaRelativa);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch {
        /* best-effort */
      }
      const err = new Error(`El archivo «${nombre}» supera el tamaño máximo permitido (15 MB).`);
      err.status = 400;
      throw err;
    }

    const ins = await dbQuery(
      `INSERT INTO contratos_juridico_adjuntos
        (numero_contrato, revision_juridica_estado, nombre_archivo, ruta_relativa, tamano_bytes, subido_por)
       VALUES (?,?,?,?,?,?)`,
      [numero, revisionEstado, saved.nombreArchivo, saved.rutaRelativa, saved.tamanoBytes, subidoPor]
    );

    guardados.push({
      id: ins.insertId,
      numero_contrato: numero,
      nombre_archivo: saved.nombreArchivo,
      tamano_bytes: saved.tamanoBytes,
    });
  }

  return guardados;
}

async function listarAdjuntos(dbQuery, numero) {
  return dbQuery(
    `SELECT id, numero_contrato, revision_juridica_estado, nombre_archivo, tamano_bytes, subido_por, subido_en
       FROM contratos_juridico_adjuntos
      WHERE numero_contrato = ?
      ORDER BY subido_en DESC, id DESC`,
    [numero]
  );
}

async function obtenerAdjunto(dbQuery, numero, idAdjunto) {
  const rows = await dbQuery(
    `SELECT id, numero_contrato, nombre_archivo, ruta_relativa
       FROM contratos_juridico_adjuntos
      WHERE id = ? AND numero_contrato = ?
      LIMIT 1`,
    [idAdjunto, numero]
  );
  return rows[0] || null;
}

async function eliminarDocumentosActivosContrato(dbQuery, numero) {
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

async function eliminarAdjuntosContrato(dbQuery, numero) {
  const rows = await dbQuery(
    'SELECT id, ruta_relativa FROM contratos_juridico_adjuntos WHERE numero_contrato = ?',
    [numero]
  );
  for (const row of rows || []) {
    try {
      const abs = resolveAbsPath(row.ruta_relativa);
      if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      /* best-effort */
    }
  }
  await dbQuery('DELETE FROM contratos_juridico_adjuntos WHERE numero_contrato = ?', [numero]);
}

module.exports = {
  guardarAdjuntosRechazo,
  listarAdjuntos,
  obtenerAdjunto,
  eliminarDocumentosActivosContrato,
  eliminarAdjuntosContrato,
};
