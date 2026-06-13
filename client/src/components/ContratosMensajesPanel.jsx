import { Button, Offcanvas } from 'react-bootstrap';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useContratosMensajes } from '../context/ContratosMensajesContext';
import { formatAppDate, formatAppTime } from '../lib/formatAppDate';

function claseTipoBadge(tipo) {
  if (tipo === 'aprobacion' || tipo === 'juridico_aprobado') return 'bg-success';
  if (tipo === 'rechazo' || tipo === 'juridico_rechazado') return 'bg-danger';
  if (tipo === 'solicitud') return 'bg-primary';
  return 'bg-secondary';
}

function iconoTipo(tipo) {
  if (tipo === 'aprobacion' || tipo === 'juridico_aprobado') return 'bi-check-circle';
  if (tipo === 'rechazo' || tipo === 'juridico_rechazado') return 'bi-x-circle';
  return 'bi-chat-left-text';
}

export default function ContratosMensajesPanel() {
  const { preferences } = useAppPreferences();
  const { panelOpen, closePanel, mensajes, loading, clearing, limpiarBandeja, quitarMensaje } = useContratosMensajes();

  const fmtFechaHora = (value) => {
    const fecha = formatAppDate(value, preferences.dateFormat);
    const hora = formatAppTime(value, preferences.timeFormat);
    if (fecha && hora) return `${fecha} · ${hora}`;
    return fecha || hora || '';
  };

  return (
    <Offcanvas
      show={panelOpen}
      onHide={closePanel}
      placement="end"
      className="contratos-mensajes-offcanvas"
      scroll
    >
      <Offcanvas.Header closeButton className="contratos-mensajes-offcanvas__header">
        <Offcanvas.Title>
          <i className="bi bi-chat-left-text me-2" aria-hidden="true" />
          Mensajes de contratación
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="contratos-mensajes-offcanvas__body">
        {!loading && mensajes.length > 0 ? (
          <div className="contratos-mensajes-toolbar mb-3">
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              className="contratos-mensajes-toolbar__btn"
              disabled={clearing}
              onClick={limpiarBandeja}
            >
              {clearing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Limpiando…
                </>
              ) : (
                <>
                  <i className="bi bi-trash3 me-1" aria-hidden="true" />
                  Limpiar bandeja
                </>
              )}
            </Button>
          </div>
        ) : null}
        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status" aria-label="Cargando mensajes" />
          </div>
        ) : mensajes.length === 0 ? (
          <div className="contratos-mensajes-empty text-center text-muted py-5">
            <i className="bi bi-inbox display-6 d-block mb-2 opacity-50" aria-hidden="true" />
            No hay mensajes registrados.
          </div>
        ) : (
          <ul className="contratos-mensajes-list list-unstyled mb-0">
            {mensajes.map((msg) => (
              <li key={msg.id} className="contratos-mensajes-item">
                <div className="contratos-mensajes-item__head">
                  <span className={`badge ${claseTipoBadge(msg.tipo)}`}>{msg.tipo_label}</span>
                  <div className="contratos-mensajes-item__meta">
                    <time className="small text-muted" dateTime={msg.created_at}>
                      {fmtFechaHora(msg.created_at)}
                    </time>
                    <button
                      type="button"
                      className="contratos-mensajes-item__dismiss"
                      aria-label={`Quitar mensaje de ${msg.numero_contrato || 'contrato'}`}
                      onClick={() => quitarMensaje(msg.id)}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="contratos-mensajes-item__titulo">
                  <i className={`bi ${iconoTipo(msg.tipo)} me-1`} aria-hidden="true" />
                  {msg.titulo}
                </div>
                <div className="contratos-mensajes-item__contrato small">
                  <strong>{msg.numero_contrato || '—'}</strong>
                  {msg.empresa ? ` — ${msg.empresa}` : ''}
                </div>
                {msg.motivo ? (
                  <div className="contratos-mensajes-item__motivo">
                    <span className="small text-muted d-block mb-1">Motivo</span>
                    <p className="mb-0">{msg.motivo}</p>
                  </div>
                ) : null}
                <div className="contratos-mensajes-item__actor small text-muted">
                  Por {msg.actor}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
