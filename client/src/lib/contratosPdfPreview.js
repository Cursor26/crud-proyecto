import * as pdfjsLib from 'pdfjs-dist';

let workerConfigured = false;

export function ensurePdfWorker() {
  if (workerConfigured) return;
  const base = String(process.env.PUBLIC_URL || '').replace(/\/$/, '');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
  workerConfigured = true;
}

export function dataUrlToUint8Array(dataUrl) {
  const raw = String(dataUrl || '').trim();
  if (!raw) return null;
  const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function loadPdfDocument(dataUrl) {
  ensurePdfWorker();
  const data = dataUrlToUint8Array(dataUrl);
  if (!data) throw new Error('No se pudo leer el documento PDF.');
  const task = pdfjsLib.getDocument({ data, disableAutoFetch: false, disableStream: false });
  return task.promise;
}

export async function renderPdfPageToCanvas(pdf, pageNumber, canvas, viewportWidth) {
  const page = await pdf.getPage(pageNumber);
  const cssWidth = Math.max(Number(viewportWidth) || 280, 120);
  const dpr = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio || 1, 2.5)
    : 1;
  const baseViewport = page.getViewport({ scale: 1 });
  const displayScale = Math.max(cssWidth / baseViewport.width, 0.1);
  const viewport = page.getViewport({ scale: displayScale * dpr });
  const context = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  await page.render({ canvasContext: context, viewport }).promise;
  return viewport;
}
