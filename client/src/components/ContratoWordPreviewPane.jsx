import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ajustarWordZoomAlVisor,
  esDocxLegacy,
  getWordPreviewViewport,
  renderWordPreviewInContainer,
} from '../lib/contratosWordPreview';

export default function ContratoWordPreviewPane({
  dataUrl,
  nombre,
  maximizado = false,
  onDescargar,
}) {
  const paneRef = useRef(null);
  const hostRef = useRef(null);
  const styleRef = useRef(null);
  const bodyRef = useRef(null);
  const [estado, setEstado] = useState('loading');
  const [mensaje, setMensaje] = useState('');

  const esLegacyDoc = esDocxLegacy({ nombre });

  const aplicarAjusteAncho = useCallback(() => {
    const pane = paneRef.current;
    const body = bodyRef.current;
    const host = hostRef.current;
    if (!pane || !body) return;
    const viewport = getWordPreviewViewport(pane);
    ajustarWordZoomAlVisor(viewport, body, host);
  }, []);

  useEffect(() => {
    if (!dataUrl) {
      setEstado('error');
      setMensaje('No hay documento disponible.');
      return undefined;
    }

    if (esLegacyDoc) {
      setEstado('legacy');
      setMensaje(
        'El formato .doc no se puede previsualizar en el navegador. Use .docx o descargue el archivo.'
      );
      return undefined;
    }

    const body = bodyRef.current;
    const styles = styleRef.current;
    if (!body) return undefined;

    let cancelado = false;
    setEstado('loading');
    setMensaje('');

    renderWordPreviewInContainer(dataUrl, body, styles)
      .then(() => {
        if (cancelado) return;
        setEstado('ready');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelado) aplicarAjusteAncho();
          });
        });
      })
      .catch((err) => {
        if (!cancelado) {
          setEstado('error');
          setMensaje(err?.message || 'No se pudo mostrar el documento Word.');
        }
      });

    return () => {
      cancelado = true;
      if (body) body.innerHTML = '';
      if (styles) styles.innerHTML = '';
    };
  }, [dataUrl, nombre, esLegacyDoc, aplicarAjusteAncho]);

  useEffect(() => {
    if (estado !== 'ready') return undefined;

    aplicarAjusteAncho();

    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === 'undefined') return undefined;

    const viewport = getWordPreviewViewport(pane);
    const modal = pane.closest('.contrato-pdf-preview-modal');

    const observer = new ResizeObserver(() => {
      aplicarAjusteAncho();
    });

    if (viewport) observer.observe(viewport);
    if (modal) observer.observe(modal);

    return () => observer.disconnect();
  }, [estado, maximizado, aplicarAjusteAncho]);

  if (estado === 'legacy' || estado === 'error') {
    return (
      <div className="contrato-word-preview-fallback">
        <p className="mb-3">{mensaje}</p>
        {typeof onDescargar === 'function' && (
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={onDescargar}>
            <i className="bi bi-download me-1" aria-hidden="true" />
            Descargar archivo
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={paneRef}
      className={`contrato-word-preview-pane${maximizado ? ' is-maximized' : ''}`}
      data-estado={estado}
    >
      <div ref={styleRef} className="contrato-word-preview-styles" aria-hidden="true" />
      {estado === 'loading' && (
        <div className="contrato-word-preview-loading">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Cargando vista previa…
        </div>
      )}
      <div className="contrato-word-preview-stage">
        <div ref={hostRef} className="contrato-word-preview-host">
          <div ref={bodyRef} className="contrato-word-preview-doc" />
        </div>
      </div>
    </div>
  );
}
