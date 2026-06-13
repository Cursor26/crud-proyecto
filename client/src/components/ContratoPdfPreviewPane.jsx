import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPdfDocument, renderPdfPageToCanvas } from '../lib/contratosPdfPreview';
import { BTN_CONSULTAR } from '../lib/actionButtonClasses';

export default function ContratoPdfPreviewPane({
  dataUrl,
  nombre,
  maximizado = false,
  onDescargar,
}) {
  const paneRef = useRef(null);
  const stageRef = useRef(null);
  const [estado, setEstado] = useState('loading');
  const [mensaje, setMensaje] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const pdfRef = useRef(null);

  const renderPages = useCallback(async () => {
    const pane = paneRef.current;
    const stage = stageRef.current;
    const pdf = pdfRef.current;
    if (!pane || !stage || !pdf) return;

    stage.innerHTML = '';
    const viewportWidth = Math.max(pane.clientWidth - 16, 280);
    const total = pdf.numPages;

    for (let pageNum = 1; pageNum <= total; pageNum += 1) {
      const wrap = document.createElement('div');
      wrap.className = 'contrato-pdf-preview-page';
      const canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
      stage.appendChild(wrap);
      // eslint-disable-next-line no-await-in-loop
      await renderPdfPageToCanvas(pdf, pageNum, canvas, viewportWidth);
    }
  }, []);

  useEffect(() => {
    if (!dataUrl) {
      setEstado('error');
      setMensaje('No hay documento disponible.');
      return undefined;
    }

    let cancelado = false;
    setEstado('loading');
    setMensaje('');
    setPageCount(0);
    pdfRef.current = null;

    loadPdfDocument(dataUrl)
      .then(async (pdf) => {
        if (cancelado) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        await renderPages();
        if (!cancelado) setEstado('ready');
      })
      .catch((err) => {
        if (!cancelado) {
          setEstado('error');
          setMensaje(err?.message || 'No se pudo mostrar el PDF.');
        }
      });

    return () => {
      cancelado = true;
      pdfRef.current = null;
      if (stageRef.current) stageRef.current.innerHTML = '';
    };
  }, [dataUrl, nombre, renderPages]);

  useEffect(() => {
    if (estado !== 'ready') return undefined;
    renderPages().catch(() => {});

    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === 'undefined') return undefined;

    const modal = pane.closest('.contrato-pdf-preview-modal');
    const observer = new ResizeObserver(() => {
      renderPages().catch(() => {});
    });
    observer.observe(pane);
    if (modal) observer.observe(modal);

    return () => observer.disconnect();
  }, [estado, maximizado, renderPages]);

  if (estado === 'error') {
    return (
      <div className="contrato-pdf-preview-fallback">
        <p className="mb-3">{mensaje}</p>
        {typeof onDescargar === 'function' && (
          <button type="button" className={BTN_CONSULTAR} onClick={onDescargar}>
            <i className="bi bi-download me-1" aria-hidden="true" />
            Descargar PDF
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={paneRef}
      className={`contrato-pdf-preview-pane${maximizado ? ' is-maximized' : ''}`}
      data-estado={estado}
      data-pages={pageCount || undefined}
    >
      {estado === 'loading' && (
        <div className="contrato-pdf-preview-loading">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Cargando PDF…
        </div>
      )}
      <div ref={stageRef} className="contrato-pdf-preview-stage" />
    </div>
  );
}
