import { useState, useEffect, useMemo, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import ModuleTitleBar from './ModuleTitleBar';
import RecordatoriosContratosConfig from './RecordatoriosContratosConfig';
import { usePermissions } from '../context/PermissionsContext';
import { BTN_GUARDAR_MD, BTN_SECUNDARIO } from '../lib/actionButtonClasses';
import { TIP } from '../lib/actionTooltips';

function ConfigCorreoServicio({
  currentUser,
  embedded = false,
  mostrarSmtp = true,
  mostrarRecordatorios = true,
  smtpPrimero = false,
}) {
  const { can } = usePermissions();
  const rol = String(currentUser?.rol || '').toLowerCase();
  const puedeVerCorreoSistema = can('usuarios', 'view');
  const puedeEditarSmtp = can('usuarios', 'edit') || rol === 'admin';
  const esAdminConfig = puedeEditarSmtp;
  const puedeEditarRecordatorios = can('contratos', 'edit') || esAdminConfig;
  const puedeEjecutarRecordatorios = can('contratos', 'approve') || esAdminConfig;

  const [loading, setLoading] = useState(mostrarSmtp);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mailerMode, setMailerMode] = useState('');
  const [source, setSource] = useState('env');
  const [passwordSet, setPasswordSet] = useState(false);
  const [useDbConfig, setUseDbConfig] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const sesionEmail = useMemo(() => {
    try {
      return String(currentUser?.email || JSON.parse(localStorage.getItem('user') || '{}')?.email || '')
        .trim()
        .toLowerCase();
    } catch {
      return '';
    }
  }, [currentUser]);

  const applyConfig = useCallback((data) => {
    setMailerMode(data.mailerMode || '');
    setSource(data.source || 'env');
    setPasswordSet(Boolean(data.passwordSet));
    setUseDbConfig(Boolean(data.use_db_config));
    setSmtpHost(data.smtp_host || '');
    setSmtpPort(Number(data.smtp_port) || 587);
    setSmtpSecure(Boolean(data.smtp_secure));
    setSmtpUser(data.smtp_user || '');
    setSmtpFrom(data.smtp_from || '');
    setSmtpPass('');
    if (!testEmail && sesionEmail) setTestEmail(sesionEmail);
  }, [sesionEmail, testEmail]);

  const loadConfig = useCallback(() => {
    if (!mostrarSmtp || !puedeVerCorreoSistema) return;
    setLoading(true);
    setLoadError('');
    Axios.get(`${API_BASE}/config/correo`)
      .then((res) => applyConfig(res.data || {}))
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'No se pudo cargar la configuración';
        setLoadError(msg);
      })
      .finally(() => setLoading(false));
  }, [applyConfig, mostrarSmtp, puedeVerCorreoSistema]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!puedeEditarSmtp) {
      await Swal.fire('Sin permiso', 'No tiene permiso para modificar la configuración SMTP.', 'warning');
      return;
    }
    if (useDbConfig && (!smtpHost.trim() || !smtpUser.trim())) {
      await Swal.fire('Datos incompletos', 'Host SMTP y usuario son obligatorios.', 'warning');
      return;
    }
    if (useDbConfig && !passwordSet && !smtpPass.trim()) {
      await Swal.fire('Contraseña requerida', 'Indique la contraseña SMTP al activar la configuración en base de datos.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await Axios.put(`${API_BASE}/config/correo`, {
        use_db_config: useDbConfig,
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort) || 587,
        smtp_secure: smtpSecure,
        smtp_user: smtpUser.trim(),
        smtp_pass: smtpPass.trim() || undefined,
        smtp_from: smtpFrom.trim() || smtpUser.trim(),
      });
      applyConfig(res.data || {});
      await Swal.fire('Guardado', res.data?.message || 'Configuración actualizada.', 'success');
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSmtp = async () => {
    if (!puedeEditarSmtp) {
      await Swal.fire('Sin permiso', 'No tiene permiso para modificar la configuración SMTP.', 'warning');
      return;
    }
    const result = await Swal.fire({
      icon: 'question',
      title: 'Restablecer correo del sistema',
      text: 'Se desactivará la configuración guardada en la aplicación y el servidor volverá a usar server/.env.',
      showCancelButton: true,
      confirmButtonText: 'Restablecer',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      const res = await Axios.put(`${API_BASE}/config/correo`, { use_db_config: false });
      applyConfig(res.data || {});
      await Swal.fire('Listo', res.data?.message || 'Configuración restablecida.', 'success');
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo restablecer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!puedeEditarSmtp) {
      await Swal.fire('Sin permiso', 'No tiene permiso para enviar correos de prueba.', 'warning');
      return;
    }
    const destino = testEmail.trim();
    if (!destino) {
      await Swal.fire('Correo requerido', 'Indique un correo de prueba.', 'warning');
      return;
    }
    setTesting(true);
    try {
      const res = await Axios.post(`${API_BASE}/config/correo/probar`, { email: destino });
      await Swal.fire('Enviado', res.data?.message || 'Correo de prueba enviado.', 'success');
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo enviar la prueba.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const sourceLabel =
    source === 'db'
      ? 'Base de datos (configuración guardada en la app)'
      : 'Archivo server/.env (predeterminado del servidor)';

  const bloqueRecordatorios = mostrarRecordatorios ? (
    <>
      <div className="alert alert-info small mb-3">
        El servidor revisa y envía los avisos de forma automática. Los correos salen solo en los hitos que configure
        abajo (p. ej. 30, 15 y 7 días antes del vencimiento), según la prioridad o el tipo de cada contrato.
      </div>
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-2">Recordatorios automáticos de contratos</h5>
          <RecordatoriosContratosConfig
            puedeEditar={puedeEditarRecordatorios}
            puedeEjecutar={puedeEjecutarRecordatorios}
          />
        </div>
      </div>
    </>
  ) : null;

  const bloqueSmtp = mostrarSmtp ? (
        <>
          <div className="alert alert-secondary small">
            <strong>Remitente (De:)</strong> cuenta SMTP usada para recordatorios de contratos y recuperación de
            contraseña.
            <br />
            <strong>Destinatario (Para:)</strong> se define por contrato en el campo <em>Correo notificación</em>; no se
            cambia aquí.
          </div>

          {loadError ? (
            <div className="alert alert-danger d-flex justify-content-between align-items-center">
              <span>{loadError}</span>
              <button type="button" className={BTN_SECUNDARIO} onClick={loadConfig} title="Volver a cargar la configuración SMTP">
                Reintentar
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                  <h5 className="card-title mb-0">Servidor SMTP</h5>
                  {puedeEditarSmtp ? (
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={handleResetSmtp}
                      disabled={saving}
                      title="Usar de nuevo la configuración de server/.env"
                    >
                      Restablecer predeterminados
                    </button>
                  ) : null}
                </div>
                {!puedeEditarSmtp ? (
                  <div className="alert alert-warning small mb-3">
                    Solo lectura: necesita permiso de <strong>editar usuarios</strong> para cambiar el correo del
                    sistema o enviar pruebas.
                  </div>
                ) : null}
                <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                  <span className="badge bg-secondary">Origen activo: {sourceLabel}</span>
                  <span className={`badge ${mailerMode === 'smtp' ? 'bg-success' : 'bg-warning text-dark'}`}>
                    Modo: {mailerMode === 'smtp' ? 'SMTP real' : 'Desarrollo (sin envío real)'}
                  </span>
                </div>

                <div className="form-check form-switch mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="useDbConfig"
                    checked={useDbConfig}
                    onChange={(e) => setUseDbConfig(e.target.checked)}
                    disabled={!puedeEditarSmtp}
                  />
                  <label className="form-check-label" htmlFor="useDbConfig">
                    Usar configuración guardada en la aplicación (en lugar de server/.env)
                  </label>
                </div>

                <fieldset disabled={!useDbConfig || !puedeEditarSmtp} className={!useDbConfig || !puedeEditarSmtp ? 'opacity-50' : ''}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="smtpHost">
                        Host SMTP
                      </label>
                      <input
                        id="smtpHost"
                        type="text"
                        className="form-control"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="smtpPort">
                        Puerto
                      </label>
                      <input
                        id="smtpPort"
                        type="number"
                        className="form-control"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        min={1}
                        max={65535}
                      />
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="smtpSecure"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="smtpSecure">
                          Conexión segura (SSL/TLS directo, p. ej. puerto 465)
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="smtpUser">
                        Usuario SMTP
                      </label>
                      <input
                        id="smtpUser"
                        type="text"
                        className="form-control"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="smtpPass">
                        Contraseña SMTP
                        {passwordSet ? (
                          <span className="text-muted small ms-1">(dejar vacío para mantener la actual)</span>
                        ) : null}
                      </label>
                      <input
                        id="smtpPass"
                        type="password"
                        className="form-control"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="smtpFrom">
                        Remitente visible (De:)
                      </label>
                      <input
                        id="smtpFrom"
                        type="text"
                        className="form-control"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder='Mi Empresa <notificaciones@empresa.com>'
                      />
                    </div>
                  </div>
                </fieldset>

                {!useDbConfig ? (
                  <p className="text-muted small mt-3 mb-0">
                    Con la opción desactivada, el servidor usa las variables SMTP de <code>server/.env</code>. Active la
                    opción superior para definir el correo desde aquí sin editar archivos.
                  </p>
                ) : null}

                <hr />

                <div className="row g-3 align-items-end">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="testEmail">
                      Correo de prueba
                    </label>
                    <input
                      id="testEmail"
                      type="email"
                      className="form-control"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                    />
                  </div>
                  <div className="col-md-6 d-flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className={BTN_GUARDAR_MD}
                      disabled={saving || !puedeEditarSmtp}
                      title={TIP.guardarConfig}
                    >
                      {saving ? 'Guardando…' : 'Guardar configuración'}
                    </button>
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={handleTest}
                      disabled={testing || !puedeEditarSmtp}
                      title="Enviar un correo de prueba al destinatario indicado"
                    >
                      {testing ? 'Enviando…' : 'Enviar correo de prueba'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </>
  ) : null;

  return (
    <div className="container-fluid px-0">
      {!embedded ? <ModuleTitleBar title="Correo del sistema" /> : null}
      {smtpPrimero ? (
        <>
          {bloqueSmtp}
          {bloqueRecordatorios}
        </>
      ) : (
        <>
          {bloqueRecordatorios}
          {bloqueSmtp}
        </>
      )}
    </div>
  );
}

export default ConfigCorreoServicio;
