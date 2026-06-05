import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Axios, { API_BASE } from '../axiosConfig';
import { vigenciaLegibleOGuion } from '../lib/convertirVigenciaLegible';
import { contactosFromContrato } from '../lib/contratosContactosNotificacion';
import { parseSuplementosFromContrato, etiquetaTipoSuplemento } from '../lib/contratosSuplementos';
import { parseAnexosFromContrato } from '../lib/contratosAnexos';
import { combinarDocumentosServidorYCache } from '../lib/contratosPdfs';
import {
  parsePropuestaAprobacion,
  clavesCamposModificadosEdicion,
  contactosDesdePropuesta,
} from '../lib/contratosAprobacionResumen';
import ContratosInfoFormStack from './ContratosInfoFormStack';

const PRIORIDAD_LABEL = {
  alta: 'Alta — avisos 60, 30, 15, 7 y 1 día',
  media: 'Media — avisos 30, 15 y 7 días',
  baja: 'Baja — avisos 15 y 7 días',
};

function esProveedor(valor) {
  if (valor === 1 || valor === '1') return true;
  const s = String(valor || '').toLowerCase();
  return s === 'proveedor' || s === 'p';
}

function InfoFieldCambio({ label, modificado, children, fullWidth }) {
  return (
    <div className={`minimal-field${fullWidth ? ' minimal-field--full' : ''}`}>
      <span className="minimal-label">{label}</span>
      <div className={modificado ? 'contratos-cambio-highlight' : 'minimal-info-value'}>{children ?? '—'}</div>
    </div>
  );
}

function ContratosPropuestaStack({
  contratoActual,
  propuesta,
  modKeys,
  fmt,
  tipo,
  getIconoEmpresa,
}) {
  const numActual = String(contratoActual?.numero_contrato || '').trim();
  const numPropuesta = String(propuesta?.numero_contrato || numActual).trim();
  const parteActual = esProveedor(contratoActual?.proveedor_cliente) ? 'Proveedor' : 'Cliente';
  const partePropuesta = propuesta
    ? esProveedor(propuesta.proveedor_cliente)
      ? 'Proveedor'
      : 'Cliente'
    : parteActual;
  const empresaMostrar = modKeys.has('empresa') ? propuesta?.empresa : contratoActual?.empresa;
  const icono =
    typeof getIconoEmpresa === 'function' ? getIconoEmpresa(empresaMostrar) : null;
  const contactosMostrar = modKeys.has('contactos')
    ? contactosDesdePropuesta(propuesta)
    : contactosFromContrato(contratoActual);
  const suplementosRaw = modKeys.has('suplementos')
    ? propuesta?.suplementos
    : contratoActual?.suplementos;
  const anexosRaw = modKeys.has('anexos') ? propuesta?.anexos : contratoActual?.anexos;
  const vigenciaMostrar = modKeys.has('vigencia') ? propuesta?.vigencia : contratoActual?.vigencia;
  const tipoMostrar = modKeys.has('tipo_contrato')
    ? tipo(propuesta?.tipo_contrato)
    : tipo(contratoActual?.tipo_contrato);
  const priMostrar = modKeys.has('prioridad')
    ? String(propuesta?.prioridad || 'media').toLowerCase()
    : String(contratoActual?.prioridad || 'media').toLowerCase();
  const fechaInicio = modKeys.has('fecha_inicio')
    ? propuesta?.fecha_inicio
    : contratoActual?.fecha_inicio;
  const fechaFin = modKeys.has('fecha_fin') ? propuesta?.fecha_fin : contratoActual?.fecha_fin;

  return (
    <div className="minimal-form-stack contratos-info-stack">
      <p className="contratos-cambios-modal-leyenda small mb-3">
        Recuadros <strong>amarillos</strong>: valor nuevo si aprueba. El resto coincide con el vigente.
      </p>

      <InfoFieldCambio label="No. Contrato:" modificado={modKeys.has('numero_contrato')}>
        {modKeys.has('numero_contrato') ? numPropuesta : numActual}
      </InfoFieldCambio>

      <div className="minimal-divider" />

      <InfoFieldCambio label="Parte:" modificado={modKeys.has('parte')}>
        {modKeys.has('parte') ? partePropuesta : parteActual}
      </InfoFieldCambio>

      <InfoFieldCambio label="Empresa:" modificado={modKeys.has('empresa')}>
        <span className="d-inline-flex align-items-center gap-2 flex-wrap">
          {icono ? <img src={icono} alt="" className="contrato-empresa-icon-preview" /> : null}
          <span>{empresaMostrar || '—'}</span>
        </span>
      </InfoFieldCambio>

      <InfoFieldCambio label="Contactos de notificación:" modificado={modKeys.has('contactos')} fullWidth>
        {contactosMostrar.length ? (
          <ul className="contratos-info-contactos-list mb-0">
            {contactosMostrar.map((c) => (
              <li key={c.correo}>
                {c.nombre ? (
                  <>
                    <span>{c.nombre}</span>
                    {' — '}
                  </>
                ) : null}
                <a href={`mailto:${c.correo}`}>{c.correo}</a>
              </li>
            ))}
          </ul>
        ) : (
          '—'
        )}
      </InfoFieldCambio>

      <InfoFieldCambio label="Suplementos:" modificado={modKeys.has('suplementos')} fullWidth>
        {(() => {
          const { legacyText, items } = parseSuplementosFromContrato({ suplementos: suplementosRaw });
          if (items.length) {
            return (
              <ul className="contratos-info-contactos-list mb-0">
                {items.map((s) => (
                  <li key={`${s.numero}-${s.nombre}`}>
                    <strong>Suplemento {s.numero}</strong>
                    {' — '}
                    <span className="badge text-bg-secondary me-1">{etiquetaTipoSuplemento(s.tipo)}</span>
                    {s.nombre}
                  </li>
                ))}
              </ul>
            );
          }
          return legacyText || '—';
        })()}
      </InfoFieldCambio>

      <InfoFieldCambio label="Anexos:" modificado={modKeys.has('anexos')} fullWidth>
        {(() => {
          const { activo, items } = parseAnexosFromContrato({ anexos: anexosRaw });
          if (!activo) return 'No aplica';
          if (items.length) {
            return (
              <ul className="contratos-info-contactos-list mb-0">
                {items.map((a) => (
                  <li key={`${a.numero}-${a.nombre}`}>
                    <strong>Anexo {a.numero}</strong>
                    {' — '}
                    <span className="badge text-bg-secondary me-1">{etiquetaTipoSuplemento(a.tipo)}</span>
                    {a.nombre}
                  </li>
                ))}
              </ul>
            );
          }
          return <span className="text-muted">Opción activada (sin archivos adjuntos)</span>;
        })()}
      </InfoFieldCambio>

      <InfoFieldCambio label="Vigencia:" modificado={modKeys.has('vigencia')}>
        {vigenciaLegibleOGuion(vigenciaMostrar)}
      </InfoFieldCambio>

      <InfoFieldCambio label="Tipo de contrato:" modificado={modKeys.has('tipo_contrato')}>
        {tipoMostrar || '—'}
      </InfoFieldCambio>

      <InfoFieldCambio label="Prioridad (recordatorios):" modificado={modKeys.has('prioridad')}>
        {PRIORIDAD_LABEL[priMostrar] || priMostrar || '—'}
      </InfoFieldCambio>

      <InfoFieldCambio label="Fecha de inicio:" modificado={modKeys.has('fecha_inicio')}>
        {fmt(fechaInicio)}
      </InfoFieldCambio>

      <InfoFieldCambio label="Fecha de fin:" modificado={modKeys.has('fecha_fin')}>
        {fmt(fechaFin)}
      </InfoFieldCambio>
    </div>
  );
}

function ContratosCambiosPendientesModal({
  show,
  onHide,
  contratoActual,
  fmtDisplayDate,
  tipoLegible,
  getIconoEmpresa,
  getPdfsContrato,
  onVerPdf,
}) {
  const [compararActivo, setCompararActivo] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoData, setInfoData] = useState(null);

  const scrollPropuestaRef = useRef(null);
  const scrollInfoRef = useRef(null);
  const scrollSyncLock = useRef(null);

  const fmt = typeof fmtDisplayDate === 'function' ? fmtDisplayDate : (v) => v || '—';
  const tipo = typeof tipoLegible === 'function' ? tipoLegible : (t) => t || '—';
  const num = String(contratoActual?.numero_contrato || '').trim();

  const { propuesta, modKeys, sinPropuesta } = useMemo(() => {
    const p = parsePropuestaAprobacion(contratoActual?.aprobacion_propuesta);
    if (!p || !contratoActual) {
      return { propuesta: null, modKeys: new Set(), sinPropuesta: true };
    }
    const keys = clavesCamposModificadosEdicion(contratoActual, contratoActual.aprobacion_propuesta, {
      fmtFecha: fmt,
      tipoLegible: tipo,
    });
    return { propuesta: p, modKeys: keys, sinPropuesta: false };
  }, [contratoActual, fmt, tipo]);

  useEffect(() => {
    if (!show) {
      setCompararActivo(false);
      setInfoData(null);
      setInfoError('');
      return undefined;
    }

    if (!num) return undefined;

    let cancelled = false;
    setInfoLoading(true);
    setInfoError('');

    Axios.get(`${API_BASE}/contratos/${encodeURIComponent(num)}/informacion`)
      .then((res) => {
        if (!cancelled) setInfoData(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setInfoError(
            err.response?.data?.message || err.message || 'No se pudo cargar la información.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setInfoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, num]);

  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setCompararActivo(false);
        onHide();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onHide]);

  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  const syncScroll = useCallback(
    (source) => {
      if (!compararActivo || scrollSyncLock.current) return;
      scrollSyncLock.current = source;
      const left = scrollPropuestaRef.current;
      const right = scrollInfoRef.current;
      if (left && right) {
        const src = source === 'left' ? left : right;
        const dst = source === 'left' ? right : left;
        dst.scrollTop = src.scrollTop;
      }
      requestAnimationFrame(() => {
        scrollSyncLock.current = null;
      });
    },
    [compararActivo]
  );

  const contratoInfo = infoData?.contrato;
  const recordatorios = infoData?.recordatorios;
  const documentosServidor = Array.isArray(infoData?.documentos) ? infoData.documentos : [];
  const pdfsLocales = typeof getPdfsContrato === 'function' ? getPdfsContrato(num) : [];
  const pdfs = combinarDocumentosServidorYCache(documentosServidor, pdfsLocales);

  const handleHide = () => {
    setCompararActivo(false);
    onHide();
  };

  if (!show) return null;

  return createPortal(
    <div className="contratos-cambios-overlay" role="presentation">
      <div className="contratos-cambios-backdrop" onClick={handleHide} aria-hidden="true" />

      <div
        className={`contratos-cambios-stage${compararActivo ? ' contratos-cambios-stage--split' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contratos-cambios-title"
      >
        <div className="contratos-cambios-stage__propuesta-wrap">
          <div className="contratos-cambios-window modal-minimal-content">
            <div className="modal-premium-header modal-minimal-header border-0">
              <div className="modal-premium-header-inner modal-minimal-header-inner">
                <span id="contratos-cambios-title" className="modal-premium-badge modal-minimal-badge">
                  Cambios propuestos
                </span>
              </div>
              <button
                type="button"
                className="btn-close contratos-cambios-window__close"
                aria-label="Cerrar"
                onClick={handleHide}
              />
            </div>

            <div className="contratos-cambios-window__subhead">Propuesta (si aprueba)</div>

            <div
              className="contratos-cambios-window__scroll modal-premium-body modal-minimal-body"
              ref={scrollPropuestaRef}
              onScroll={() => syncScroll('left')}
            >
              {sinPropuesta ? (
                <p className="text-muted small mb-0">No hay datos de modificación guardados.</p>
              ) : (
                <ContratosPropuestaStack
                  contratoActual={contratoActual}
                  propuesta={propuesta}
                  modKeys={modKeys}
                  fmt={fmt}
                  tipo={tipo}
                  getIconoEmpresa={getIconoEmpresa}
                />
              )}
            </div>

            <div className="modal-premium-footer modal-minimal-footer border-0">
              <span aria-hidden="true" />
              <button
                type="button"
                className="btn btn-outline-secondary modal-minimal-btn"
                onClick={handleHide}
              >
                Cerrar
              </button>
            </div>
          </div>

          {!sinPropuesta && !compararActivo ? (
            <button
              type="button"
              className="contratos-cambios-info-fab-outside"
              onClick={() => setCompararActivo(true)}
              title="Comparar con información del contrato vigente"
              aria-label="Comparar con información del contrato vigente"
            >
              <i className="bi bi-info-lg" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {compararActivo ? (
          <>
            <div className="contratos-cambios-stage__gap">
              <button
                type="button"
                className="contratos-cambios-collapse-fab"
                onClick={() => setCompararActivo(false)}
                title="Recoger ventana de información"
                aria-label="Recoger ventana de información y volver solo a cambios propuestos"
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
            </div>

            <div className="contratos-cambios-window contratos-cambios-window--info modal-minimal-content">
              <div className="modal-premium-header modal-minimal-header border-0">
                <div className="modal-premium-header-inner modal-minimal-header-inner">
                  <span className="modal-premium-badge modal-minimal-badge">Información</span>
                </div>
              </div>

              <div className="contratos-cambios-window__subhead contratos-cambios-window__subhead--info">
                Contrato vigente
              </div>

              <div
                className="contratos-cambios-window__scroll modal-premium-body modal-minimal-body"
                ref={scrollInfoRef}
                onScroll={() => syncScroll('right')}
              >
                {infoLoading ? (
                  <p className="text-muted small mb-0 py-2">Cargando información…</p>
                ) : null}
                {infoError ? <p className="text-danger small mb-0">{infoError}</p> : null}
                {!infoLoading && !infoError && contratoInfo ? (
                  <ContratosInfoFormStack
                    contrato={contratoInfo}
                    recordatorios={recordatorios}
                    pdfs={pdfs}
                    numeroContrato={num}
                    fmtDisplayDate={fmtDisplayDate}
                    getIconoEmpresa={getIconoEmpresa}
                    onVerPdf={onVerPdf}
                  />
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default ContratosCambiosPendientesModal;
