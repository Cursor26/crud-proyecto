import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import { formatAppDate, formatAppTime } from '../lib/formatAppDate';
import { BTN_CONSULTAR } from '../lib/actionButtonClasses';
import { usePermissions } from '../context/PermissionsContext';
import { descargarPdfTablaVerde } from '../utils/exportContratosPdfTabla';
import { formatContratoAuditRow } from '../lib/contratosAuditoriaFormat';

const AUDITORIA_CONTRATOS_PDF_HEADERS = [
  'Cuándo',
  'Tipo',
  'Realizado por',
  'Contrato',
  'Evento',
  'Detalle',
  'IP',
];

const TABS = [
  { id: 'todos', label: 'Todos', icon: 'bi-list-ul' },
  { id: 'solicitudes', label: 'Solicitudes', icon: 'bi-hourglass-split' },
  { id: 'altas', label: 'Altas', icon: 'bi-plus-circle' },
  { id: 'ediciones', label: 'Ediciones', icon: 'bi-pencil-square' },
  { id: 'aprobaciones', label: 'Aprobaciones / Rechazos', icon: 'bi-check2-square' },
  { id: 'cancelaciones', label: 'Cancelaciones', icon: 'bi-x-circle' },
  { id: 'eliminaciones', label: 'Eliminación', icon: 'bi-trash' },
  { id: 'correos', label: 'Recordatorios (manual y auto)', icon: 'bi-envelope' },
];

const TIPO_BADGE = {
  solicitud: 'bg-warning text-dark',
  aprobacion: 'bg-success',
  rechazo: 'bg-secondary',
  eliminacion: 'bg-danger',
  recordatorio: 'bg-info text-dark',
  recordatorio_manual: 'bg-info text-dark',
  recordatorio_automatico: 'bg-primary',
  actualizacion: 'bg-primary',
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${formatAppDate(d)} ${formatAppTime(d)}`;
}

function actorLabel(row) {
  return row.actor_nombre || row.actor_email || '—';
}

function detalleExtra(row) {
  const d = row.details || {};
  const partes = [];
  if (d.solicitado_por) partes.push(`Solicitó: ${d.solicitado_por}`);
  if (d.aprobado_por) partes.push(`Aprobó: ${d.aprobado_por}`);
  if (d.rechazado_por) partes.push(`Rechazó: ${d.rechazado_por}`);
  if (d.ejecutado_por) partes.push(`Ejecutó: ${d.ejecutado_por}`);
  if (d.motivo) partes.push(`Motivo: ${d.motivo}`);
  if (d.origen_envio === 'manual') partes.push('Envío: manual');
  if (d.origen_envio === 'automatico') {
    partes.push(`Envío: automático${d.disparador_label ? ` (${d.disparador_label})` : ''}`);
  }
  if (d.evento) partes.push(`Evento: ${d.evento === 'vencido' ? 'Vencido' : 'Por vencer'}`);
  if (d.dias_restantes != null && d.dias_restantes !== '') {
    partes.push(
      Number(d.dias_restantes) < 0 ? 'Estado: vencido' : `Días restantes: ${d.dias_restantes}`
    );
  }
  if (row.accion_pendiente_label && row.accion_pendiente_label !== '—') {
    partes.push(row.accion_pendiente_label);
  }
  if (d.destino) partes.push(`Destino: ${d.destino}`);
  if (d.id_archivo) partes.push(`Archivo #${d.id_archivo}`);
  if (d.directo) partes.push('Eliminación directa');
  return partes.length ? partes.join(' · ') : '—';
}

function ContratosAuditoria() {
  const { can } = usePermissions();
  const puedeExportar = can('contratos', 'export');
  const [tab, setTab] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventos, setEventos] = useState([]);
  const [filterNumero, setFilterNumero] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { tab, limit: 400 };
      if (filterNumero.trim()) params.numero = filterNumero.trim();
      if (filterDesde) params.desde = `${filterDesde} 00:00:00`;
      if (filterHasta) params.hasta = `${filterHasta} 23:59:59`;
      const res = await Axios.get(`${API_BASE}/contratos/auditoria`, { params });
      const rows = Array.isArray(res.data) ? res.data : [];
      setEventos(rows.map(formatContratoAuditRow));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'No se pudo cargar la auditoría de contratos';
      setError(msg);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [tab, filterNumero, filterDesde, filterHasta]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabInfo = TABS.find((t) => t.id === tab);

  const exportarAuditoriaPdf = () => {
    if (eventos.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay movimientos para exportar en esta vista.',
      });
      return;
    }
    try {
      const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      const vista = tabInfo?.label || tab;
      const dataRows = eventos.map((row) => [
        formatDateTime(row.created_at),
        row.tipo_evento_label || row.tipo_evento || '—',
        actorLabel(row),
        row.target_label || row.target_id || '—',
        row.mensaje || '—',
        detalleExtra(row),
        row.ip_address || '—',
      ]);
      descargarPdfTablaVerde({
        titulo: 'Auditoría de contratos',
        metaLinea: `Generado: ${fechaTxt}  |  Vista: ${vista}  |  Registros: ${dataRows.length}`,
        headers: AUDITORIA_CONTRATOS_PDF_HEADERS,
        dataRows,
        nombreArchivo: `auditoria_contratos_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`,
        fontSize: 5.5,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar PDF',
        text: String(err?.message || err),
      });
    }
  };

  return (
    <>
      <div className="mb-3">
        <h5 className="mb-1">Auditoría de contratos</h5>
        <p className="small text-muted mb-0">
          Registro completo de movimientos: quién solicita, quién aprueba o rechaza, eliminaciones efectivas y
          recordatorios manuales y automáticos.
        </p>
      </div>

      <div className="contratos-tabs-card mb-3">
        <div className="contratos-tabs-row">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm contratos-tab ${tab === t.id ? 'contratos-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="contratos-card p-3">
      <div className="row g-2 align-items-end mb-3 auditoria-filter-row">
        <div className="col-4 col-md-3">
          <label className="form-label small mb-0">N.º contrato</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="N.º"
            value={filterNumero}
            onChange={(e) => setFilterNumero(e.target.value)}
          />
        </div>
        <div className="col-4 col-md-3">
          <label className="form-label small mb-0">Desde</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={filterDesde}
            onChange={(e) => setFilterDesde(e.target.value)}
          />
        </div>
        <div className="col-4 col-md-3">
          <label className="form-label small mb-0">Hasta</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={filterHasta}
            onChange={(e) => setFilterHasta(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-3 auditoria-filter-actions d-flex flex-wrap gap-2">
          <button type="button" className={BTN_CONSULTAR} onClick={loadData} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
            Actualizar
          </button>
          {puedeExportar ? (
            <button
              type="button"
              className="btn btn-sm reportes-export-btn-pdf d-inline-flex align-items-center flex-shrink-0"
              onClick={exportarAuditoriaPdf}
              disabled={loading}
              title="Exportar vista actual a PDF"
            >
              <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
              PDF
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-muted py-4 small">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Cargando…
        </div>
      )}

      {!loading && (
        <div className="table-responsive">
          <p className="small text-muted mb-2">
            {tabInfo ? (
              <>
                Vista: <strong>{tabInfo.label}</strong> — {eventos.length} registro(s)
              </>
            ) : null}
          </p>
          <table className="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Tipo</th>
                <th>Realizado por</th>
                <th>Contrato</th>
                <th>Evento</th>
                <th>Detalle</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted text-center py-4">
                    No hay movimientos registrados en esta vista.
                  </td>
                </tr>
              )}
              {eventos.map((row) => (
                <tr key={row.id}>
                  <td className="small text-nowrap">{formatDateTime(row.created_at)}</td>
                  <td>
                    <span className={`badge ${TIPO_BADGE[row.tipo_evento] || 'bg-light text-dark'}`}>
                      {row.tipo_evento_label || row.tipo_evento || '—'}
                    </span>
                  </td>
                  <td className="small">{actorLabel(row)}</td>
                  <td className="small">{row.target_label || row.target_id || '—'}</td>
                  <td className="small">{row.mensaje}</td>
                  <td className="small text-muted">{detalleExtra(row)}</td>
                  <td className="small">{row.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </>
  );
}

export default ContratosAuditoria;
