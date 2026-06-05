const path = require('path');
const {
  ACTIVOS_DIR,
  copyFileToArchivo,
  saveArchivoPdf,
  removeDirIfExists,
  calcRetencionHasta,
} = require('./contratosDocumentosStorage');

/**
 * Archiva un contrato activo (copia PDFs, inserta en contratos_archivo, elimina fila activa).
 */
async function ejecutarArchivoContrato(dbQuery, numero, opts = {}) {
  const motivo = opts.motivo != null && String(opts.motivo).trim() ? String(opts.motivo).trim().slice(0, 500) : null;
  const documentosCliente = Array.isArray(opts.documentosCliente) ? opts.documentosCliente : [];
  const eliminadoPor =
    opts.eliminadoPor != null && String(opts.eliminadoPor).trim()
      ? String(opts.eliminadoPor).trim()
      : null;

  const rows = await dbQuery(
    `SELECT c.numero_contrato, c.id_contraparte, c.empresa, c.correo_notificacion, c.suplementos,
            c.vigencia, c.id_tipo_contrato, c.fecha_inicio, c.fecha_fin,
            COALESCE(tc.nombre, '') AS tipo_contrato
       FROM contratos_generales c
       LEFT JOIN catalogo_tipo_contrato tc ON tc.id_tipo_contrato = c.id_tipo_contrato
      WHERE c.numero_contrato = ?
      LIMIT 1`,
    [numero]
  );
  if (!rows.length) {
    const err = new Error('Contrato no encontrado.');
    err.status = 404;
    throw err;
  }

  const c = rows[0];
  const eliminadoEn = new Date();
  const retencionHasta = calcRetencionHasta(eliminadoEn);

  const insertArchivo = await dbQuery(
    `INSERT INTO contratos_archivo
      (numero_contrato, id_contraparte, empresa, correo_notificacion, suplementos, vigencia,
       id_tipo_contrato, tipo_contrato, fecha_inicio, fecha_fin, eliminado_en, eliminado_por, motivo, retencion_hasta)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      c.numero_contrato,
      c.id_contraparte,
      c.empresa,
      c.correo_notificacion,
      c.suplementos,
      c.vigencia,
      c.id_tipo_contrato,
      c.tipo_contrato,
      c.fecha_inicio,
      c.fecha_fin,
      eliminadoEn,
      eliminadoPor,
      motivo,
      retencionHasta,
    ]
  );
  const idArchivo = insertArchivo.insertId;
  const nombresGuardados = new Set();

  const docsActivos = await dbQuery(
    'SELECT id_documento, nombre_archivo, ruta_relativa FROM contratos_documentos WHERE numero_contrato = ?',
    [numero]
  );
  for (const doc of docsActivos) {
    const copied = copyFileToArchivo(idArchivo, doc.ruta_relativa, doc.nombre_archivo);
    if (!copied) continue;
    await dbQuery(
      `INSERT INTO contratos_archivo_documentos (id_archivo, nombre_archivo, ruta_relativa, tamano_bytes)
       VALUES (?,?,?,?)`,
      [idArchivo, copied.nombreArchivo, copied.rutaRelativa, copied.tamanoBytes]
    );
    nombresGuardados.add(String(copied.nombreArchivo).toLowerCase());
  }

  for (const item of documentosCliente) {
    const nombre = String(item?.nombre || 'Contrato.pdf').trim();
    const dataUrl = String(item?.dataUrl || '');
    if (!dataUrl) continue;
    const key = nombre.toLowerCase();
    if (nombresGuardados.has(key)) continue;
    try {
      const saved = saveArchivoPdf(idArchivo, nombre, dataUrl);
      await dbQuery(
        `INSERT INTO contratos_archivo_documentos (id_archivo, nombre_archivo, ruta_relativa, tamano_bytes)
         VALUES (?,?,?,?)`,
        [idArchivo, saved.nombreArchivo, saved.rutaRelativa, saved.tamanoBytes]
      );
      nombresGuardados.add(String(saved.nombreArchivo).toLowerCase());
    } catch (pdfErr) {
      console.warn('PDF cliente omitido al archivar:', pdfErr?.message || pdfErr);
    }
  }

  await dbQuery('DELETE FROM contratos_generales WHERE numero_contrato = ?', [numero]);
  removeDirIfExists(path.join(ACTIVOS_DIR, numero));

  return {
    ok: true,
    id_archivo: idArchivo,
    retencion_hasta: retencionHasta,
    documentos: nombresGuardados.size,
    empresa: c.empresa,
    numero_contrato: numero,
    motivo,
  };
}

module.exports = { ejecutarArchivoContrato };
