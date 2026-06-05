import { useMemo } from 'react';
import { vigenciaLegibleOGuion } from '../lib/convertirVigenciaLegible';
import { contactosFromContrato } from '../lib/contratosContactosNotificacion';
import { parseSuplementosFromContrato, etiquetaTipoSuplemento } from '../lib/contratosSuplementos';
import { parseAnexosFromContrato } from '../lib/contratosAnexos';

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

export function InfoField({ label, children, fullWidth }) {
  return (
    <div className={`minimal-field${fullWidth ? ' minimal-field--full' : ''}`}>
      <span className="minimal-label">{label}</span>
      <div className="minimal-info-value">{children ?? '—'}</div>
    </div>
  );
}

export default function ContratosInfoFormStack({
  contrato,
  recordatorios,
  pdfs = [],
  numeroContrato,
  fmtDisplayDate,
  getIconoEmpresa,
  onVerPdf,
}) {
  const num = String(numeroContrato || contrato?.numero_contrato || '').trim();
  const fmt = typeof fmtDisplayDate === 'function' ? fmtDisplayDate : (v) => v || '—';
  const icono =
    contrato && typeof getIconoEmpresa === 'function' ? getIconoEmpresa(contrato.empresa) : null;
  const pri = String(contrato?.prioridad || 'media').toLowerCase();
  const envios = Array.isArray(recordatorios?.envios) ? recordatorios.envios : [];
  const hitos = Array.isArray(recordatorios?.hitos_dias) ? recordatorios.hitos_dias : [];
  const contactosNotif = useMemo(
    () => (contrato ? contactosFromContrato(contrato) : []),
    [contrato]
  );

  if (!contrato) return null;

  return (
    <div className="minimal-form-stack contratos-info-stack">
      <InfoField label="No. Contrato:">{num}</InfoField>

      <div className="minimal-divider" />

      <InfoField label="Parte:">
        {esProveedor(contrato.proveedor_cliente) ? 'Proveedor' : 'Cliente'}
      </InfoField>

      <InfoField label="Empresa:">
        <span className="d-inline-flex align-items-center gap-2 flex-wrap">
          {icono ? <img src={icono} alt="" className="contrato-empresa-icon-preview" /> : null}
          <span>{contrato.empresa || '—'}</span>
        </span>
      </InfoField>

      <InfoField label="Contactos de notificación:" fullWidth>
        {contactosNotif.length ? (
          <ul className="contratos-info-contactos-list mb-0">
            {contactosNotif.map((c) => (
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
      </InfoField>

      <InfoField label="Suplementos:" fullWidth>
        {(() => {
          const { legacyText, items } = parseSuplementosFromContrato(contrato);
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
      </InfoField>

      <InfoField label="Anexos:" fullWidth>
        {(() => {
          const { activo, items } = parseAnexosFromContrato(contrato);
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
      </InfoField>

      <InfoField label="Vigencia:">{vigenciaLegibleOGuion(contrato.vigencia)}</InfoField>

      <InfoField label="Tipo de contrato:">{contrato.tipo_contrato || '—'}</InfoField>

      <InfoField label="Prioridad (recordatorios):">
        {PRIORIDAD_LABEL[pri] || contrato.prioridad || '—'}
      </InfoField>

      <InfoField label="Fecha de inicio:">{fmt(contrato.fecha_inicio)}</InfoField>

      <InfoField label="Fecha de fin:">{fmt(contrato.fecha_fin)}</InfoField>

      <InfoField label="Estado:">
        <span className="fw-bold">{contrato.estado || '—'}</span>
      </InfoField>

      <InfoField label="Días restantes:">
        {contrato.dias_restantes == null
          ? '—'
          : contrato.dias_restantes < 0
            ? `Vencido hace ${Math.abs(contrato.dias_restantes)} día(s)`
            : `${contrato.dias_restantes} día(s)`}
      </InfoField>

      {Number(contrato.cancelado) === 1 ? (
        <InfoField label="Cancelación:" fullWidth>
          {contrato.cancelado_por ? `Por ${contrato.cancelado_por}` : 'Cancelado'}
          {contrato.cancelado_en ? ` — ${fmt(contrato.cancelado_en)}` : ''}
        </InfoField>
      ) : null}

      <div className="minimal-divider" />

      <InfoField label="Recordatorios automáticos:">
        {recordatorios?.automaticos_activos ? 'Activados en el sistema' : 'Desactivados en el sistema'}
      </InfoField>

      <InfoField label="Regla de avisos:">{recordatorios?.regla_descripcion || '—'}</InfoField>

      <InfoField label="Hitos programados (días antes del vencimiento):">
        {hitos.length ? hitos.join(', ') : '—'}
      </InfoField>

      <InfoField label="Destinos de recordatorios:" fullWidth>
        {Array.isArray(recordatorios?.contactos_destino) && recordatorios.contactos_destino.length ? (
          <ul className="contratos-info-contactos-list mb-0">
            {recordatorios.contactos_destino.map((c) => (
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
          <span className="text-muted">Sin correo registrado — no se enviarán avisos</span>
        )}
      </InfoField>

      <div className="minimal-field minimal-field--full">
        <span className="minimal-label">Historial de correos enviados:</span>
        {envios.length === 0 ? (
          <div className="minimal-info-value text-muted">Aún no hay envíos registrados para este contrato.</div>
        ) : (
          <ul className="contratos-info-envios-list mb-0">
            {envios.map((e) => (
              <li key={e.id_envio} className="contratos-info-envios-list__item">
                <span className="contratos-info-envios-list__fecha">{fmt(e.enviado_en)}</span>
                <span className="contratos-info-envios-list__correo" title={e.correo_destino}>
                  {e.correo_destino}
                </span>
                <span className="contratos-info-envios-list__meta">
                  {e.dias_antes_vencimiento >= 0
                    ? `${e.dias_antes_vencimiento} días antes`
                    : 'Recordatorio'}
                  {' · '}
                  {e.origen === 'manual' ? 'Manual' : 'Automático'}
                  {' · '}
                  <span
                    className={
                      e.resultado === 'ok'
                        ? 'text-success'
                        : e.resultado === 'error'
                          ? 'text-danger'
                          : 'text-warning'
                    }
                  >
                    {e.resultado}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="minimal-divider" />

      <div className="minimal-field minimal-field--full">
        <span className="minimal-label">Archivos PDF del contrato:</span>
        {pdfs.length === 0 ? (
          <div className="minimal-info-value text-muted">Sin archivos PDF adjuntos.</div>
        ) : (
          <ul className="list-unstyled mb-0 contratos-pdf-modal-list">
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="contratos-pdf-modal-list__item">
                <small className="text-muted text-truncate flex-grow-1" title={pdf.nombre}>
                  {pdf.nombre}
                </small>
                {typeof onVerPdf === 'function' ? (
                  <button
                    type="button"
                    className="btn btn-sm contratos-btn-view"
                    onClick={() => onVerPdf(num, pdf)}
                  >
                    Ver
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
