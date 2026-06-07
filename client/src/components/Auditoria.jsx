import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import ModuleTitleBar from './ModuleTitleBar';
import { BTN_CONSULTAR } from '../lib/actionButtonClasses';
import { formatAppDate, formatAppTime } from '../lib/formatAppDate';
import { usePermissions } from '../context/PermissionsContext';
import { descargarPdfTablaVerde } from '../utils/exportContratosPdfTabla';

const TABS = [
  { id: 'sessions', label: 'Sesiones', icon: 'bi-box-arrow-in-right' },
  { id: 'failed', label: 'Intentos fallidos', icon: 'bi-shield-exclamation' },
  { id: 'roles', label: 'Roles y permisos', icon: 'bi-person-gear' },
  { id: 'changes', label: 'Eliminación', icon: 'bi-trash' },
];

function actorLabel(row) {
  return row.actor_nombre || row.actor_email || '—';
}

const REASON_LABELS = {
  bad_password: 'Contraseña incorrecta',
  user_not_found: 'Usuario no encontrado',
  user_inactive: 'Usuario inactivo',
  locked: 'Cuenta bloqueada',
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${formatAppDate(d)} ${formatAppTime(d)}`;
}

function Auditoria() {
  const { can } = usePermissions();
  const puedeExportar = can('auditoria', 'export');
  const [tab, setTab] = useState('sessions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [failedSummary, setFailedSummary] = useState({ grouped: [], lockouts: [] });
  const [roleEvents, setRoleEvents] = useState([]);
  const [changeEvents, setChangeEvents] = useState([]);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterHours, setFilterHours] = useState(24);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'sessions') {
        const params = {};
        if (filterEmail.trim()) params.email = filterEmail.trim();
        const res = await Axios.get(`${API_BASE}/audit/sessions`, { params });
        setSessions(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'failed') {
        const [listRes, sumRes] = await Promise.all([
          Axios.get(`${API_BASE}/audit/failed-logins`, {
            params: filterEmail.trim() ? { identifier: filterEmail.trim(), limit: 200 } : { limit: 200 },
          }),
          Axios.get(`${API_BASE}/audit/failed-summary`, { params: { hours: filterHours } }),
        ]);
        setFailedLogins(Array.isArray(listRes.data) ? listRes.data : []);
        setFailedSummary(sumRes.data || { grouped: [], lockouts: [] });
      } else if (tab === 'roles') {
        const res = await Axios.get(`${API_BASE}/audit/events`, { params: { scope: 'roles', limit: 200 } });
        setRoleEvents(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'changes') {
        const res = await Axios.get(`${API_BASE}/audit/events`, { params: { scope: 'changes', limit: 300 } });
        setChangeEvents(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'No se pudo cargar la auditoría';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tab, filterEmail, filterHours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabLabel = TABS.find((t) => t.id === tab)?.label || tab;

  const exportarAuditoriaPdf = () => {
    let headers = [];
    let dataRows = [];

    if (tab === 'sessions') {
      headers = ['Usuario', 'Email', 'Rol', 'Inicio de sesión', 'Cierre de sesión', 'IP', 'Navegador'];
      dataRows = sessions.map((row) => [
        row.user_nombre || row.user_email || '—',
        row.user_email || '—',
        row.user_rol || '—',
        formatDateTime(row.login_at),
        row.logout_at ? formatDateTime(row.logout_at) : 'Activa',
        row.ip_address || '—',
        row.user_agent || '—',
      ]);
    } else if (tab === 'failed') {
      headers = ['Fecha', 'Identificador', 'Usuario', 'Motivo', 'IP'];
      dataRows = failedLogins.map((row) => [
        formatDateTime(row.created_at),
        row.identifier_attempted || '—',
        row.user_email || '—',
        REASON_LABELS[row.reason] || row.reason || '—',
        row.ip_address || '—',
      ]);
    } else if (tab === 'roles') {
      headers = ['Cuándo', 'Realizado por', 'Usuario', 'Evento', 'IP'];
      dataRows = roleEvents.map((row) => [
        formatDateTime(row.created_at),
        actorLabel(row),
        row.target_label || row.target_id || '—',
        row.mensaje || '—',
        row.ip_address || '—',
      ]);
    } else if (tab === 'changes') {
      headers = ['Cuándo', 'Tipo', 'Realizado por', 'Contrato', 'Detalle', 'IP'];
      dataRows = changeEvents.map((row) => [
        formatDateTime(row.created_at),
        'Eliminación',
        actorLabel(row),
        row.target_label || row.target_id || '—',
        row.mensaje || '—',
        row.ip_address || '—',
      ]);
    }

    if (dataRows.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay registros para exportar en esta vista.',
      });
      return;
    }

    try {
      const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      descargarPdfTablaVerde({
        titulo: 'Auditoría de seguridad',
        metaLinea: `Generado: ${fechaTxt}  |  Vista: ${tabLabel}  |  Registros: ${dataRows.length}`,
        headers,
        dataRows,
        nombreArchivo: `auditoria_seguridad_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    <div className="contratos-module">
      <ModuleTitleBar
        title="Auditoría de seguridad"
        subtitle="Accesos, intentos fallidos, gestión de usuarios (roles) y eliminación de contratos (solo administrador)."
      />

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

      <div className="contratos-card p-3 mb-3">
        <div className="row g-2 align-items-end mb-3">
          {(tab === 'sessions' || tab === 'failed') && (
            <div className="col-md-4">
              <label className="form-label small mb-0">Filtrar por usuario / identificador</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="correo o nombre de usuario"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
              />
            </div>
          )}
          {tab === 'failed' && (
            <div className="col-md-3">
              <label className="form-label small mb-0">Resumen (horas)</label>
              <select
                className="form-select form-select-sm"
                value={filterHours}
                onChange={(e) => setFilterHours(Number(e.target.value))}
              >
                <option value={6}>Últimas 6 h</option>
                <option value={24}>Últimas 24 h</option>
                <option value={72}>Últimas 72 h</option>
                <option value={168}>Última semana</option>
              </select>
            </div>
          )}
          <div className="col-auto d-flex gap-2">
            <button type="button" className={BTN_CONSULTAR} onClick={loadData} disabled={loading}>
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
            {puedeExportar ? (
              <button
                type="button"
                className="btn btn-sm reportes-export-btn-pdf d-inline-flex align-items-center"
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
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        {tab === 'sessions' && (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Inicio de sesión</th>
                  <th>Cierre de sesión</th>
                  <th>IP</th>
                  <th>Navegador</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-muted text-center py-4">
                      No hay registros de sesión.
                    </td>
                  </tr>
                )}
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="fw-semibold">{row.user_nombre || row.user_email}</div>
                      <div className="small text-muted">{row.user_email}</div>
                    </td>
                    <td>{row.user_rol || '—'}</td>
                    <td>{formatDateTime(row.login_at)}</td>
                    <td>{row.logout_at ? formatDateTime(row.logout_at) : <span className="text-warning">Activa</span>}</td>
                    <td className="small">{row.ip_address || '—'}</td>
                    <td className="small text-truncate" style={{ maxWidth: 220 }} title={row.user_agent || ''}>
                      {row.user_agent || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'failed' && (
          <>
            <h6 className="mb-2">Resumen por cuenta (últimas {filterHours} h)</h6>
            <div className="mb-4">
              {(failedSummary.grouped || []).length === 0 && !loading && (
                <p className="text-muted small mb-0">Sin intentos fallidos en el período.</p>
              )}
              <ul className="list-group list-group-flush mb-2">
                {(failedSummary.grouped || []).map((g, idx) => {
                  const cuenta = g.user_email || g.cuenta || g.identifier_attempted;
                  return (
                    <li key={`${cuenta}-${idx}`} className="list-group-item px-0 py-2">
                      <strong>Usuario {cuenta}</strong>
                      {' — '}
                      <span className="text-danger">{g.intentos} intento(s) fallido(s)</span>
                      {g.ultima_ip ? ` — IP ${g.ultima_ip}` : ''}
                      <span className="small text-muted d-block">
                        Último: {formatDateTime(g.ultimo_intento)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {(failedSummary.lockouts || []).length > 0 && (
                <>
                  <h6 className="mb-2 text-danger">Cuentas bloqueadas ahora</h6>
                  <ul className="list-group list-group-flush">
                    {failedSummary.lockouts.map((l) => (
                      <li key={l.identifier_key} className="list-group-item px-0 py-1 small">
                        {l.identifier_key}: {l.fail_count} fallos — bloqueado hasta{' '}
                        {formatDateTime(l.locked_until)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <h6 className="mb-2">Detalle de intentos</h6>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Identificador</th>
                    <th>Usuario</th>
                    <th>Motivo</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {failedLogins.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-muted text-center py-3">
                        Sin registros.
                      </td>
                    </tr>
                  )}
                  {failedLogins.map((row) => (
                    <tr key={row.id}>
                      <td className="small">{formatDateTime(row.created_at)}</td>
                      <td>{row.identifier_attempted}</td>
                      <td>{row.user_email || '—'}</td>
                      <td>{REASON_LABELS[row.reason] || row.reason}</td>
                      <td className="small">{row.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'roles' && (
          <div className="table-responsive">
            <p className="small text-muted mb-2">
              Creación de usuarios, cambios de rol, habilitación/deshabilitación y eliminación de cuentas.
            </p>
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Realizado por</th>
                  <th>Usuario</th>
                  <th>Evento</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {roleEvents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-muted text-center py-4">
                      No hay eventos de usuarios registrados.
                    </td>
                  </tr>
                )}
                {roleEvents.map((row) => (
                  <tr key={row.id}>
                    <td className="small text-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="small">{actorLabel(row)}</td>
                    <td className="small">{row.target_label || row.target_id || '—'}</td>
                    <td>{row.mensaje}</td>
                    <td className="small">{row.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'changes' && (
          <div className="table-responsive">
            <p className="small text-muted mb-2">
              Contratos eliminados (archivados): quién los eliminó, qué contrato y cuándo. Para el historial completo de movimientos use Auditoría dentro de Contratación.
            </p>
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Tipo</th>
                  <th>Realizado por</th>
                  <th>Contrato</th>
                  <th>Detalle</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {changeEvents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-muted text-center py-4">
                      No hay contratos archivados registrados.
                    </td>
                  </tr>
                )}
                {changeEvents.map((row) => (
                  <tr key={row.id}>
                    <td className="small text-nowrap">{formatDateTime(row.created_at)}</td>
                    <td>
                      <span className="badge bg-danger">Eliminación</span>
                    </td>
                    <td className="small">{actorLabel(row)}</td>
                    <td className="small">{row.target_label || row.target_id || '—'}</td>
                    <td>{row.mensaje}</td>
                    <td className="small">{row.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auditoria;
