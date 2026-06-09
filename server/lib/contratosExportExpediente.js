const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { SQL_CONTRATO_SELECT } = require('../db/queryHelpers');
const { resolveAbsPath, sanitizeFilename } = require('./contratosDocumentosStorage');
const {
  etiquetaDocumentoIndice,
  buildIndiceContratosPdfBuffer,
  buildFichaContratoPdfBuffer,
} = require('./contratosExportPdfIndice');

const MAX_CONTRATOS = Number(process.env.CONTRATOS_EXPORT_MAX || 100);
const MAX_BYTES = Number(process.env.CONTRATOS_EXPORT_MAX_BYTES || 200 * 1024 * 1024);

function normalizarAprobacionEstado(val) {
  return String(val || 'aprobado').trim().toLowerCase();
}

function etiquetaTipoParte(val) {
  if (Number(val) === 1) return 'Proveedor';
  const codigo = String(val || '').trim().toLowerCase();
  if (codigo === 'proveedor') return 'Proveedor';
  if (codigo === 'cliente') return 'Cliente';
  return Number(val) === 0 ? 'Cliente' : 'Cliente';
}

function calcDiasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);
  return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function getEstadoContrato(row) {
  const accionPend = String(row?.aprobacion_accion || '').toLowerCase();
  const aprobPendiente =
    normalizarAprobacionEstado(row?.aprobacion_estado) === 'pendiente' &&
    ['cancelacion', 'cancelacion_archivo', 'archivo', 'edicion', 'alta'].includes(accionPend);
  if (!aprobPendiente && Number(row?.cancelado) === 1) return 'Cancelado';
  const dias = calcDiasRestantes(row.fecha_fin);
  if (dias === null) return 'Sin fecha';
  if (dias < 0) return 'Vencido';
  if (dias <= 30) return 'Por vencer';
  if (dias <= 90) return 'En seguimiento';
  return 'Activo';
}

function fechaParaExportEs(value) {
  const iso = value ? String(value).slice(0, 10) : '';
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseJsonField(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function countSuplementosMeta(suplementos) {
  const data = parseJsonField(suplementos);
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.items)) return data.items.length;
  return 0;
}

function sanitizeFolderSegment(value, maxLen = 80) {
  return String(value || '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, maxLen) || 'sin_nombre';
}

function carpetaContrato(numero, empresa) {
  return `${sanitizeFolderSegment(numero, 40)}_${sanitizeFolderSegment(empresa, 50)}`;
}

function zipEntryFileName(orden, nombreArchivo) {
  const safe = sanitizeFilename(nombreArchivo || 'documento');
  return `${String(orden).padStart(2, '0')}_${safe}`;
}

function subcarpetaTipo(tipo) {
  const t = String(tipo || 'contrato').toLowerCase();
  if (t === 'suplemento') return 'suplementos';
  if (t === 'anexo') return 'anexos';
  return 'contrato';
}

function listarMetaEsperada(contrato) {
  const esperados = [];
  const sup = parseJsonField(contrato.suplementos);
  const supItems = Array.isArray(sup) ? sup : Array.isArray(sup?.items) ? sup.items : [];
  supItems.forEach((it, idx) => {
    esperados.push({
      tipo: 'suplemento',
      numero: it?.numero ?? idx + 1,
      nombre: it?.nombre || `Suplemento_${idx + 1}`,
      clienteId: it?.clienteId || it?.cliente_id || null,
    });
  });
  const anx = parseJsonField(contrato.anexos);
  const anxItems = Array.isArray(anx?.items) ? anx.items : [];
  if (anx?.activo !== false) {
    anxItems.forEach((it, idx) => {
      esperados.push({
        tipo: 'anexo',
        numero: it?.numero ?? idx + 1,
        nombre: it?.nombre || `Anexo_${idx + 1}`,
        clienteId: it?.clienteId || it?.cliente_id || null,
      });
    });
  }
  return esperados;
}

function documentoCoincideMeta(doc, meta) {
  const tipoDoc = String(doc.tipo_documento || '').toLowerCase();
  const tipoMeta = String(meta.tipo || '').toLowerCase();
  if (tipoDoc !== tipoMeta) return false;
  const numDoc = Number(doc.numero_suplemento) || 0;
  const numMeta = Number(meta.numero) || 0;
  if (numDoc && numMeta && numDoc !== numMeta) return false;
  if (meta.clienteId && doc.cliente_id && String(doc.cliente_id) !== String(meta.clienteId)) {
    return false;
  }
  return true;
}

function buildLeemeTxt({ exportadoPor, numeros, resumen }) {
  const lineas = [
    'EXPORTACIÓN DE EXPEDIENTES DE CONTRATOS',
    '========================================',
    '',
    `Fecha: ${new Date().toLocaleString('es-ES')}`,
    `Exportado por: ${exportadoPor || 'usuario'}`,
    `Contratos incluidos: ${numeros.length}`,
    `Con documento principal: ${resumen.conPrincipal}`,
    `Total archivos suplementos: ${resumen.totalSuplementos}`,
    `Total archivos anexos: ${resumen.totalAnexos}`,
    `Contratos con archivos faltantes: ${resumen.conFaltantes}`,
    '',
    'Estructura:',
    '- indice_contratos.pdf: tabla resumen de todos los contratos (estilo Contratación)',
    '- contratos/{numero_empresa}/resumen_contrato.pdf: ficha del contrato en tabla',
    '- contratos/{numero_empresa}/contrato/: documento principal',
    '- contratos/{numero_empresa}/suplementos/: archivos de suplementos',
    '- contratos/{numero_empresa}/anexos/: archivos de anexos',
    '- faltantes.txt (si aplica): documentos referenciados sin archivo en servidor',
    '',
    'Lista de contratos:',
    ...numeros.map((n) => `  - ${n}`),
  ];
  return lineas.join('\r\n');
}

function createContratosExportExpedienteService(dbQuery) {
  async function validarYNormalizarNumeros(numeros) {
    const lista = [...new Set((numeros || []).map((n) => String(n || '').trim()).filter(Boolean))];
    if (!lista.length) {
      const err = new Error('Debe indicar al menos un número de contrato.');
      err.status = 400;
      throw err;
    }
    if (lista.length > MAX_CONTRATOS) {
      const err = new Error(`Máximo ${MAX_CONTRATOS} contratos por exportación. Reduzca la selección.`);
      err.status = 400;
      throw err;
    }
    const placeholders = lista.map(() => '?').join(',');
    const existentes = await dbQuery(
      `SELECT numero_contrato FROM contratos_generales WHERE numero_contrato IN (${placeholders})`,
      lista
    );
    const encontrados = new Set((existentes || []).map((r) => String(r.numero_contrato)));
    const faltan = lista.filter((n) => !encontrados.has(n));
    if (faltan.length) {
      const err = new Error(`No existen contratos: ${faltan.join(', ')}`);
      err.status = 404;
      throw err;
    }
    return lista;
  }

  async function estimarTamanoTotal(numeros) {
    const placeholders = numeros.map(() => '?').join(',');
    const rows = await dbQuery(
      `SELECT COALESCE(SUM(tamano_bytes), 0) AS total
         FROM contratos_documentos
        WHERE numero_contrato IN (${placeholders})`,
      numeros
    );
    return Number(rows[0]?.total) || 0;
  }

  async function cargarContratos(numeros) {
    const placeholders = numeros.map(() => '?').join(',');
    const rows = await dbQuery(
      `${SQL_CONTRATO_SELECT} WHERE c.numero_contrato IN (${placeholders}) ORDER BY c.numero_contrato ASC`,
      numeros
    );
    const map = new Map(rows.map((r) => [String(r.numero_contrato), r]));
    return numeros.map((n) => map.get(n)).filter(Boolean);
  }

  async function cargarDocumentos(numeros) {
    const placeholders = numeros.map(() => '?').join(',');
    return dbQuery(
      `SELECT id_documento, numero_contrato, tipo_documento, numero_suplemento,
              nombre_archivo, ruta_relativa, tamano_bytes, cliente_id, subido_en
         FROM contratos_documentos
        WHERE numero_contrato IN (${placeholders})
        ORDER BY numero_contrato ASC, tipo_documento ASC, numero_suplemento ASC, id_documento ASC`,
      numeros
    );
  }

  async function streamExpedienteZip(res, { numeros, exportadoPor }) {
    const lista = await validarYNormalizarNumeros(numeros);
    const tamanoEstimado = await estimarTamanoTotal(lista);
    if (tamanoEstimado > MAX_BYTES) {
      const err = new Error(
        `El tamaño estimado (${Math.round(tamanoEstimado / (1024 * 1024))} MB) supera el límite de ${Math.round(MAX_BYTES / (1024 * 1024))} MB. Reduzca la selección.`
      );
      err.status = 400;
      throw err;
    }

    const contratos = await cargarContratos(lista);
    const todosDocumentos = await cargarDocumentos(lista);
    const docsPorContrato = new Map();
    for (const doc of todosDocumentos) {
      const key = String(doc.numero_contrato);
      if (!docsPorContrato.has(key)) docsPorContrato.set(key, []);
      docsPorContrato.get(key).push(doc);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipName = `export_contratos_${timestamp}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const filasIndice = [];
    const fichasPdf = [];
    const entradasArchivo = [];
    const entradasTexto = [];
    const resumenGlobal = {
      conPrincipal: 0,
      totalSuplementos: 0,
      totalAnexos: 0,
      conFaltantes: 0,
    };
    let bytesAcumulados = 0;

    for (const contrato of contratos) {
      const num = String(contrato.numero_contrato);
      const docs = docsPorContrato.get(num) || [];
      const carpeta = `contratos/${carpetaContrato(num, contrato.empresa)}`;
      const faltantes = [];
      const metaEsperada = listarMetaEsperada(contrato);

      const conteos = { contrato: 0, suplemento: 0, anexo: 0 };
      const ordenPorTipo = { contrato: 0, suplemento: 0, anexo: 0 };

      for (const doc of docs) {
        const abs = resolveAbsPath(doc.ruta_relativa);
        if (!fs.existsSync(abs)) {
          faltantes.push({
            tipo: doc.tipo_documento,
            nombre: doc.nombre_archivo,
            motivo: 'Archivo no encontrado en almacenamiento',
          });
          continue;
        }
        const stat = fs.statSync(abs);
        bytesAcumulados += stat.size;
        if (bytesAcumulados > MAX_BYTES) {
          const err = new Error(
            `El expediente supera el límite de ${Math.round(MAX_BYTES / (1024 * 1024))} MB. Reduzca la selección.`
          );
          err.status = 400;
          throw err;
        }

        const tipo = String(doc.tipo_documento || 'contrato').toLowerCase();
        ordenPorTipo[tipo] = (ordenPorTipo[tipo] || 0) + 1;
        conteos[tipo] = (conteos[tipo] || 0) + 1;

        const sub = subcarpetaTipo(tipo);
        const entryName = `${carpeta}/${sub}/${zipEntryFileName(ordenPorTipo[tipo], doc.nombre_archivo)}`;
        entradasArchivo.push({ abs, name: entryName });
      }

      for (const meta of metaEsperada) {
        const coincidencias = docs.filter((d) => documentoCoincideMeta(d, meta));
        if (!coincidencias.length) {
          faltantes.push({
            tipo: meta.tipo,
            numero: meta.numero,
            nombre: meta.nombre,
            motivo: 'Referenciado en metadatos sin registro en servidor',
          });
        } else if (
          !coincidencias.some((d) => fs.existsSync(resolveAbsPath(d.ruta_relativa)))
        ) {
          faltantes.push({
            tipo: meta.tipo,
            numero: meta.numero,
            nombre: meta.nombre,
            motivo: 'Registro en BD sin archivo físico',
          });
        }
      }

      if (faltantes.length) {
        resumenGlobal.conFaltantes += 1;
        entradasTexto.push({
          name: `${carpeta}/faltantes.txt`,
          content: faltantes.map((f) => `- [${f.tipo}] ${f.nombre || ''}: ${f.motivo}`).join('\r\n'),
        });
      }

      if (conteos.contrato) resumenGlobal.conPrincipal += 1;
      resumenGlobal.totalSuplementos += conteos.suplemento || 0;
      resumenGlobal.totalAnexos += conteos.anexo || 0;

      const dias = calcDiasRestantes(contrato.fecha_fin);
      const filaTabla = [
        num,
        etiquetaTipoParte(contrato.proveedor_cliente),
        String(contrato.empresa || '').trim(),
        String(contrato.vigencia || '').trim(),
        countSuplementosMeta(contrato.suplementos) || '—',
        fechaParaExportEs(contrato.fecha_inicio),
        fechaParaExportEs(contrato.fecha_fin),
        getEstadoContrato(contrato),
        dias == null ? '—' : dias < 0 ? `-${Math.abs(dias)}` : String(dias),
        etiquetaDocumentoIndice(conteos),
      ];
      filasIndice.push(filaTabla);

      fichasPdf.push({
        name: `${carpeta}/resumen_contrato.pdf`,
        buffer: buildFichaContratoPdfBuffer(filaTabla, { numero: num, empresa: contrato.empresa }),
      });
    }

    const indicePdf = buildIndiceContratosPdfBuffer({
      filas: filasIndice,
      exportadoPor,
      totalContratos: lista.length,
    });
    console.log(
      `[export-expediente] PDF índice generado (${indicePdf.length} bytes, ${lista.length} contratos)`
    );

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);

    archive.append(buildLeemeTxt({ exportadoPor, numeros: lista, resumen: resumenGlobal }), {
      name: 'LEEME.txt',
    });
    archive.append(indicePdf, { name: 'indice_contratos.pdf' });

    for (const ficha of fichasPdf) {
      archive.append(ficha.buffer, { name: ficha.name });
    }
    for (const txt of entradasTexto) {
      archive.append(txt.content, { name: txt.name });
    }
    for (const entry of entradasArchivo) {
      archive.file(entry.abs, { name: entry.name });
    }

    await archive.finalize();
  }

  return {
    streamExpedienteZip,
    MAX_CONTRATOS,
    MAX_BYTES,
  };
}

module.exports = { createContratosExportExpedienteService };
