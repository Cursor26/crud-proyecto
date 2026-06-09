import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Axios, { API_BASE, getApiErrorMessage } from '../axiosConfig';
import { BTN_ANADIR_MD, BTN_CANCELAR_MD } from '../lib/actionButtonClasses';

function esRealizado(val) {
  return Number(val) === 1 || val === true;
}

export default function ContratosJuridicoComentariosModal({
  show,
  onHide,
  numeroContrato,
  puedeAgregar = false,
  puedeMarcarRealizado = false,
  fmtFecha,
}) {
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoId, setGuardandoId] = useState(null);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const numero = String(numeroContrato || '').trim();

  const cargarComentarios = useCallback(async () => {
    if (!numero) return;
    setCargando(true);
    setError('');
    try {
      const res = await Axios.get(
        `${API_BASE}/contratos/${encodeURIComponent(numero)}/juridico-comentarios`
      );
      setComentarios(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudieron cargar los comentarios.');
      setComentarios([]);
    } finally {
      setCargando(false);
    }
  }, [numero]);

  useEffect(() => {
    if (!show || !numero) return undefined;
    cargarComentarios();
    setNuevoTexto('');
    return undefined;
  }, [show, numero, cargarComentarios]);

  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onHide();
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

  const toggleRealizado = async (comentario) => {
    if (!puedeMarcarRealizado || !numero || !comentario?.id) return;
    const marcar = !esRealizado(comentario.realizado);
    setGuardandoId(comentario.id);
    setError('');
    try {
      const res = await Axios.post(
        `${API_BASE}/contratos/${encodeURIComponent(numero)}/juridico-comentarios`,
        {
          accion: 'marcar_realizado',
          id_comentario: comentario.id,
          realizado: marcar,
        }
      );
      const actualizado = res.data || {};
      setComentarios((prev) =>
        prev.map((c) => (c.id === comentario.id ? { ...c, ...actualizado } : c))
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el comentario.'));
    } finally {
      setGuardandoId(null);
    }
  };

  const agregarComentario = async () => {
    const texto = String(nuevoTexto || '').trim();
    if (!puedeAgregar || !texto || !numero) return;
    setEnviando(true);
    setError('');
    try {
      await Axios.post(`${API_BASE}/contratos/${encodeURIComponent(numero)}/juridico-comentarios`, {
        texto,
        tipo: 'nota_legal',
      });
      setNuevoTexto('');
      await cargarComentarios();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo guardar el comentario.');
    } finally {
      setEnviando(false);
    }
  };

  if (!show || !numero) return null;

  const pendientes = comentarios.filter((c) => !esRealizado(c.realizado)).length;

  return createPortal(
    <div className="contratos-motivo-overlay" role="presentation">
      <div className="contratos-motivo-backdrop" onClick={onHide} aria-hidden="true" />
      <div
        className="contratos-motivo-window modal-minimal-content contratos-juridico-comentarios-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contratos-juridico-comentarios-title"
      >
        <div className="modal-premium-header modal-minimal-header border-0">
          <div className="modal-premium-header-inner modal-minimal-header-inner">
            <span id="contratos-juridico-comentarios-title" className="modal-premium-badge modal-minimal-badge">
              Observaciones jurídicas — {numero}
            </span>
            <button type="button" className="btn-close" onClick={onHide} aria-label="Cerrar" />
          </div>
        </div>
        <div className="modal-minimal-body">
          <p className="text-muted small mb-2">
            {comentarios.length === 0
              ? 'El abogado puede registrar observaciones y marcarlas como realizadas cuando las haya revisado.'
              : pendientes === 0
                ? 'Todas las observaciones están marcadas como realizadas por el abogado.'
                : `${pendientes} observación(es) pendiente(s). Solo el abogado puede confirmar que ya las revisó.`}
          </p>

          {error ? <div className="alert alert-danger py-2 small mb-2">{error}</div> : null}

          <div className="contratos-juridico-comentarios-list">
            {cargando ? (
              <p className="text-muted small mb-0">Cargando comentarios…</p>
            ) : comentarios.length === 0 ? (
              <p className="text-muted small mb-0">Sin comentarios jurídicos aún.</p>
            ) : (
              comentarios.map((c) => {
                const hecho = esRealizado(c.realizado);
                const autor = c.autor_nombre || c.autor_email || 'Abogado';
                return (
                  <div
                    key={c.id}
                    className={`contratos-juridico-comentario${hecho ? ' contratos-juridico-comentario--realizado' : ''}`}
                  >
                    <div className="contratos-juridico-comentario__head">
                      <div>
                        <strong>{autor}</strong>
                        <span className="text-muted ms-1">({c.tipo || 'comentario'})</span>
                        {hecho ? (
                          <span className="badge bg-success ms-2">Realizado</span>
                        ) : (
                          <span className="badge bg-secondary ms-2">Pendiente</span>
                        )}
                      </div>
                      {puedeMarcarRealizado ? (
                        <button
                          type="button"
                          className={`btn btn-sm ${hecho ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                          onClick={() => toggleRealizado(c)}
                          disabled={guardandoId === c.id}
                          title={hecho ? 'Marcar como pendiente' : 'Marcar como realizado'}
                        >
                          <i
                            className={`bi ${hecho ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'} me-1`}
                            aria-hidden="true"
                          />
                          {guardandoId === c.id
                            ? '…'
                            : hecho
                              ? 'Marcar pendiente'
                              : 'Marcar realizado'}
                        </button>
                      ) : null}
                    </div>
                    <p className="contratos-juridico-comentario__texto mb-1">{c.texto}</p>
                    {hecho && c.realizado_por ? (
                      <p className="contratos-juridico-comentario__meta mb-0">
                        Revisado por {c.realizado_por}
                        {c.realizado_en && typeof fmtFecha === 'function'
                          ? ` · ${fmtFecha(c.realizado_en)}`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {puedeAgregar ? (
            <div className="mt-3">
              <label className="form-label small fw-semibold mb-1" htmlFor="juridico-comentario-nuevo">
                Nuevo comentario jurídico
              </label>
              <textarea
                id="juridico-comentario-nuevo"
                className="form-control form-control-sm"
                rows={3}
                value={nuevoTexto}
                onChange={(e) => setNuevoTexto(e.target.value)}
                placeholder="Observación o nota legal…"
                disabled={enviando}
              />
            </div>
          ) : null}
        </div>
        <div className="modal-minimal-footer d-flex flex-wrap gap-2 justify-content-end border-top pt-3 px-3 pb-3">
          {puedeAgregar ? (
            <button
              type="button"
              className={BTN_ANADIR_MD}
              onClick={agregarComentario}
              disabled={enviando || !String(nuevoTexto || '').trim()}
            >
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Agregar comentario
            </button>
          ) : null}
          <button type="button" className={BTN_CANCELAR_MD} onClick={onHide}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
