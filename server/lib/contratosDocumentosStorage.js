const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');
const ACTIVOS_DIR = 'contratos-activos';
const ARCHIVO_DIR = 'contratos-archivo';

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const detectExt = (nombre, mimeHint) => {
  const lower = String(nombre || '').toLowerCase();
  if (lower.endsWith('.pdf')) return '.pdf';
  if (lower.endsWith('.docx')) return '.docx';
  if (lower.endsWith('.doc')) return '.doc';
  const mime = String(mimeHint || '').toLowerCase();
  return EXT_BY_MIME[mime] || '.pdf';
};

const sanitizeFilename = (name, mimeHint) => {
  const ext = detectExt(name, mimeHint);
  let base = String(name || 'documento')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
  base = base.replace(/\.(pdf|docx?)$/i, '');
  const withExt = `${base}${ext}`;
  return withExt.slice(0, 180) || `documento${ext}`;
};

const extractDocumentBuffer = (dataUrl) => {
  const raw = String(dataUrl || '');
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  const b64 = match ? match[2] : raw;
  if (!b64) throw new Error('Documento inválido o vacío');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw new Error('Documento inválido o vacío');
  return { buffer: buf, mimeHint: match ? match[1] : null };
};

const extractPdfBuffer = (dataUrl) => extractDocumentBuffer(dataUrl).buffer;

const uniqueFileName = (nombre, suffix, mimeHint) => {
  const safe = sanitizeFilename(nombre, mimeHint);
  const ext = detectExt(safe, mimeHint);
  const stem = safe.replace(/\.(pdf|docx?)$/i, '');
  return `${stem}_${suffix}${ext}`;
};

const saveFileToDir = (dirAbs, nombre, buffer, mimeHint) => {
  ensureDir(dirAbs);
  const suffix = crypto.randomBytes(4).toString('hex');
  const fileName = uniqueFileName(nombre, suffix, mimeHint);
  const absPath = path.join(dirAbs, fileName);
  fs.writeFileSync(absPath, buffer);
  return { fileName, absPath, tamano: buffer.length };
};

const savePdfToDir = (dirAbs, nombre, buffer) => saveFileToDir(dirAbs, nombre, buffer, 'application/pdf');

const saveActivoDocumento = (numeroContrato, nombre, dataUrl, mimeHint) => {
  const numKey = String(numeroContrato || '').trim();
  if (!numKey) throw new Error('Número de contrato requerido');
  const { buffer, mimeHint: parsedMime } = extractDocumentBuffer(dataUrl);
  const hint = mimeHint || parsedMime;
  const relDir = path.join(ACTIVOS_DIR, numKey);
  const dirAbs = path.join(STORAGE_ROOT, relDir);
  const saved = saveFileToDir(dirAbs, nombre, buffer, hint);
  const rutaRelativa = path.join(relDir, saved.fileName).replace(/\\/g, '/');
  return {
    rutaRelativa,
    tamanoBytes: saved.tamano,
    nombreArchivo: sanitizeFilename(nombre, hint),
  };
};

const saveActivoPdf = (numeroContrato, nombre, dataUrl) =>
  saveActivoDocumento(numeroContrato, nombre, dataUrl, 'application/pdf');

const contentTypeFromNombre = (nombreArchivo) => {
  const lower = String(nombreArchivo || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.doc')) return 'application/msword';
  return 'application/octet-stream';
};

const saveArchivoPdf = (idArchivo, nombre, dataUrlOrBuffer) => {
  const id = Number(idArchivo);
  if (!id) throw new Error('id_archivo inválido');
  const buffer =
    Buffer.isBuffer(dataUrlOrBuffer) ? dataUrlOrBuffer : extractPdfBuffer(dataUrlOrBuffer);
  const relDir = path.join(ARCHIVO_DIR, String(id));
  const dirAbs = path.join(STORAGE_ROOT, relDir);
  const saved = savePdfToDir(dirAbs, nombre, buffer);
  const rutaRelativa = path.join(relDir, saved.fileName).replace(/\\/g, '/');
  return { rutaRelativa, tamanoBytes: saved.tamano, nombreArchivo: sanitizeFilename(nombre) };
};

const copyFileToArchivo = (idArchivo, rutaRelativaOrigen, nombreArchivo) => {
  const src = path.join(STORAGE_ROOT, String(rutaRelativaOrigen).replace(/\\/g, '/'));
  if (!fs.existsSync(src)) return null;
  const buffer = fs.readFileSync(src);
  return saveArchivoPdf(idArchivo, nombreArchivo, buffer);
};

const resolveAbsPath = (rutaRelativa) =>
  path.join(STORAGE_ROOT, String(rutaRelativa || '').replace(/\\/g, '/'));

const removeDirIfExists = (relDir) => {
  const abs = path.join(STORAGE_ROOT, String(relDir || '').replace(/\\/g, '/'));
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true });
  }
};

const calcRetencionHasta = (fromDate = new Date()) => {
  const d = new Date(fromDate);
  d.setFullYear(d.getFullYear() + 5);
  return d.toISOString().slice(0, 10);
};

module.exports = {
  STORAGE_ROOT,
  ACTIVOS_DIR,
  ARCHIVO_DIR,
  ensureDir,
  sanitizeFilename,
  extractPdfBuffer,
  extractDocumentBuffer,
  saveActivoPdf,
  saveActivoDocumento,
  saveArchivoPdf,
  copyFileToArchivo,
  resolveAbsPath,
  removeDirIfExists,
  calcRetencionHasta,
  contentTypeFromNombre,
};
