import { renderAsync } from 'docx-preview';

export const DOCX_PREVIEW_CLASS = 'contrato-docx-preview';

const FIT_PADDING_PX = 12;

export function esDocumentoWord(doc) {
  if (!doc) return false;
  if (doc.tipo === 'word') return true;
  return /\.docx?$/i.test(String(doc.nombre || ''));
}

export function esDocxLegacy(doc) {
  const nombre = String(doc?.nombre || '').toLowerCase();
  return /\.doc$/i.test(nombre) && !/\.docx$/i.test(nombre);
}

export function dataUrlToArrayBuffer(dataUrl) {
  const raw = String(dataUrl || '').trim();
  const [, base64] = raw.split(',');
  if (!base64) throw new Error('Formato de archivo no válido.');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function getWordPreviewViewport(paneEl) {
  return paneEl?.closest('.contrato-pdf-preview-body') || paneEl;
}

function limpiarEstilosZoom(wrapper, hostEl) {
  if (!wrapper) return;
  wrapper.style.transform = '';
  wrapper.style.transformOrigin = '';
  wrapper.style.zoom = '';
  wrapper.style.width = '';
  wrapper.style.margin = '';
  wrapper.style.display = '';
  if (hostEl) {
    hostEl.style.width = '';
    hostEl.style.height = '';
    hostEl.style.margin = '';
  }
}

function medirAnchoNatural(wrapper) {
  const sections = wrapper.querySelectorAll(`section.${DOCX_PREVIEW_CLASS}`);
  let maxW = wrapper.scrollWidth;
  sections.forEach((section) => {
    maxW = Math.max(maxW, section.scrollWidth, section.getBoundingClientRect().width);
  });
  const tables = wrapper.querySelectorAll('table');
  tables.forEach((table) => {
    maxW = Math.max(maxW, table.scrollWidth, table.getBoundingClientRect().width);
  });
  return Math.max(maxW, wrapper.getBoundingClientRect().width, 1);
}

/**
 * Escala el Word al ancho del visor (equivalente a PDF #zoom=page-width).
 * Usa transform + contenedor host para centrar sin recortes.
 */
export function ajustarWordZoomAlVisor(viewportEl, bodyContainer, hostEl) {
  const wrapper = bodyContainer?.querySelector(`.${DOCX_PREVIEW_CLASS}-wrapper`);
  if (!wrapper || !viewportEl) return;

  limpiarEstilosZoom(wrapper, hostEl);
  void wrapper.offsetWidth;

  const availW = Math.max(viewportEl.clientWidth - FIT_PADDING_PX, 1);
  const naturalW = medirAnchoNatural(wrapper);
  const naturalH = Math.max(wrapper.scrollHeight, 1);
  const scale = availW / naturalW;

  wrapper.style.width = `${naturalW}px`;
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.display = 'block';

  if (hostEl) {
    hostEl.style.width = `${naturalW * scale}px`;
    hostEl.style.height = `${naturalH * scale}px`;
    hostEl.style.margin = '0 auto';
    hostEl.style.overflow = 'hidden';
  }
}

function injectarEstilosVisor(styleContainer) {
  if (!styleContainer) return;
  const style = document.createElement('style');
  style.setAttribute('data-contrato-word-fit', '1');
  style.textContent = `
.${DOCX_PREVIEW_CLASS}-wrapper {
  padding: 0 !important;
  background: #ffffff !important;
  display: block !important;
  align-items: stretch !important;
}
.${DOCX_PREVIEW_CLASS}-wrapper > section.${DOCX_PREVIEW_CLASS} {
  box-shadow: none !important;
  margin-bottom: 1rem !important;
}
`;
  styleContainer.appendChild(style);
}

export async function renderWordPreviewInContainer(dataUrl, bodyContainer, styleContainer) {
  if (!bodyContainer) return;
  bodyContainer.innerHTML = '';
  if (styleContainer) styleContainer.innerHTML = '';
  const buffer = dataUrlToArrayBuffer(dataUrl);
  await renderAsync(buffer, bodyContainer, styleContainer || bodyContainer, {
    className: DOCX_PREVIEW_CLASS,
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
  });
  injectarEstilosVisor(styleContainer);
}
