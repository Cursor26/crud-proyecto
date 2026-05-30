const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');
const ACTIVOS_DIR = 'contratos-activos';
const ARCHIVO_DIR = 'contratos-archivo';

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const sanitizeFilename = (name) => {
  const base = String(name || 'documento.pdf')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
  const withExt = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  return withExt.slice(0, 180) || 'documento.pdf';
};

const extractPdfBuffer = (dataUrl) => {
  const raw = String(dataUrl || '');
  const match = raw.match(/^data:application\/pdf;base64,(.+)$/i) || raw.match(/^data:.*?;base64,(.+)$/i);
  const b64 = match ? match[1] : raw;
  if (!b64) throw new Error('PDF inválido o vacío');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw new Error('PDF inválido o vacío');
  return buf;
};

const uniqueFileName = (nombre, suffix) => {
  const safe = sanitizeFilename(nombre);
  const stem = safe.replace(/\.pdf$/i, '');
  return `${stem}_${suffix}.pdf`;
};

const savePdfToDir = (dirAbs, nombre, buffer) => {
  ensureDir(dirAbs);
  const suffix = crypto.randomBytes(4).toString('hex');
  const fileName = uniqueFileName(nombre, suffix);
  const absPath = path.join(dirAbs, fileName);
  fs.writeFileSync(absPath, buffer);
  return { fileName, absPath, tamano: buffer.length };
};

const saveActivoPdf = (numeroContrato, nombre, dataUrl) => {
  const numKey = String(numeroContrato || '').trim();
  if (!numKey) throw new Error('Número de contrato requerido');
  const buffer = extractPdfBuffer(dataUrl);
  const relDir = path.join(ACTIVOS_DIR, numKey);
  const dirAbs = path.join(STORAGE_ROOT, relDir);
  const saved = savePdfToDir(dirAbs, nombre, buffer);
  const rutaRelativa = path.join(relDir, saved.fileName).replace(/\\/g, '/');
  return { rutaRelativa, tamanoBytes: saved.tamano, nombreArchivo: sanitizeFilename(nombre) };
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
  saveActivoPdf,
  saveArchivoPdf,
  copyFileToArchivo,
  resolveAbsPath,
  removeDirIfExists,
  calcRetencionHasta,
};
