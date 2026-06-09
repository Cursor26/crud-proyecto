import { useState, useEffect, useMemo } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { BTN_ANADIR_MD } from '../lib/actionButtonClasses';
import { usePermissions } from '../context/PermissionsContext';
import { normalizeTelefonoInput, telefonoValidoOpcional } from '../lib/userProfile';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function GestionUsuarios() {
  const { can } = usePermissions();
  const puedeCrearUsuarios = can('usuarios', 'create');
  const puedeEditarUsuarios = can('usuarios', 'edit');
  const puedeEliminarUsuarios = can('usuarios', 'delete');
  const puedeGestionarUsuarios = puedeEditarUsuarios || puedeEliminarUsuarios;
  const [usuariosList, setUsuarios] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userNombre, setUserNombre] = useState('');
  const [userTelefono, setUserTelefono] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPasswordConfirm, setUserPasswordConfirm] = useState('');
  const [userRol, setUserRol] = useState('');
  const [userActivo, setUserActivo] = useState(true);
  const [editandoUsuario, setEditandoUsuario] = useState(false);
  const [userEmailOriginal, setUserEmailOriginal] = useState('');
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const sesionEmail = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem('user') || '{}')?.email || '')
        .trim()
        .toLowerCase();
    } catch {
      return '';
    }
  }, []);

  const esPropioUsuario = (email) => {
    const rowEmail = String(email || '').trim().toLowerCase();
    return Boolean(sesionEmail && rowEmail && sesionEmail === rowEmail);
  };

  const editandoPropioUsuario =
    editandoUsuario && esPropioUsuario(userEmailOriginal);

  const [activoTogglePending, setActivoTogglePending] = useState(null);
  const [rolesCatalog, setRolesCatalog] = useState([]);
  const [usuarioModalKey, setUsuarioModalKey] = useState(0);

  const getUsuarios = () => {
    setLoadError('');
    Axios.get(`${API_BASE}/usuarios`)
      .then((response) => {
        const data = response.data;
        setUsuarios(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('Error al cargar usuarios:', error);
        setUsuarios([]);
        const msg = error.response?.data?.message || error.message || 'No se pudo cargar la lista de usuarios';
        setLoadError(msg);
      });
  };

  useEffect(() => {
    getUsuarios();
    Axios.get(`${API_BASE}/rbac/roles`)
      .then((res) => setRolesCatalog(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRolesCatalog([]));
  }, []);

  const limpiarUsuario = () => {
    setEditandoUsuario(false);
    setUserEmail('');
    setUserNombre('');
    setUserTelefono('');
    setUserPassword('');
    setUserPasswordConfirm('');
    setUserRol('');
    setUserActivo(true);
    setUserEmailOriginal('');
    setVerPassword(false);
    setFormErrors({});
  };

  const cerrarModalUsuario = () => {
    limpiarUsuario();
    setShowUsuarioModal(false);
  };

  const abrirModalNuevoUsuario = () => {
    limpiarUsuario();
    setUsuarioModalKey((k) => k + 1);
    setShowUsuarioModal(true);
  };

  const desbloquearCampoAutofill = (e) => {
    if (e?.target) e.target.readOnly = false;
  };

  const guardarUsuarioModal = () => {
    if (editandoUsuario) updateUsuario();
    else addUsuario();
  };

  const validarFormulario = () => {
    const errs = {};
    const email = userEmail.trim().toLowerCase();
    const nombre = userNombre.trim();
    const rol = String(userRol || '').trim().toLowerCase();
    const requierePassword = !editandoUsuario || userPassword.length > 0 || userPasswordConfirm.length > 0;

    if (!email) errs.email = 'Email obligatorio.';
    else if (!EMAIL_RE.test(email)) errs.email = 'Email inválido.';

    if (!nombre) errs.nombre = 'Nombre obligatorio.';
    else if (nombre.length < 3) errs.nombre = 'Nombre demasiado corto.';

    if (!rol) errs.rol = 'Rol obligatorio.';

    const tel = telefonoValidoOpcional(userTelefono);
    if (!tel.ok) errs.telefono = tel.message;

    if (requierePassword) {
      if (!userPassword) errs.password = 'Contraseña obligatoria.';
      else if (!PASSWORD_RE.test(userPassword)) {
        errs.password = 'Mínimo 8 caracteres, con mayúscula, minúscula y número.';
      }
      if (userPassword !== userPasswordConfirm) {
        errs.passwordConfirm = 'Las contraseñas no coinciden.';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addUsuario = () => {
    if (!validarFormulario()) return;
    Axios.post(`${API_BASE}/create-usuario`, {
      email: userEmail.trim().toLowerCase(),
      nombre: userNombre.trim(),
      telefono: telefonoValidoOpcional(userTelefono).value || null,
      password: userPassword,
      rol: userRol,
      activo: userActivo ? 1 : 0,
    })
      .then(() => {
        getUsuarios();
        cerrarModalUsuario();
        Swal.fire('Creado', 'Usuario creado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const updateUsuario = () => {
    if (!validarFormulario()) return;
    const original = usuariosList.find(
      (row) => String(row.email || '').trim().toLowerCase() === String(userEmailOriginal || '').trim().toLowerCase()
    );
    const payload = {
      email: userEmail.trim().toLowerCase(),
      nombre: userNombre.trim(),
      telefono: telefonoValidoOpcional(userTelefono).value || null,
      password: userPassword,
      rol: userRol,
      activo: userActivo ? 1 : 0,
    };
    if (editandoPropioUsuario && original) {
      payload.rol = original.rol;
      payload.activo = Number(original.activo ?? 1);
    }
    Axios.put(`${API_BASE}/update-usuario/${encodeURIComponent(userEmailOriginal)}`, payload)
      .then(() => {
        getUsuarios();
        cerrarModalUsuario();
        Swal.fire('Actualizado', 'Usuario actualizado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const toggleUsuarioActivo = (u) => {
    const rowEmail = String(u.email || '').trim().toLowerCase();
    if (esPropioUsuario(rowEmail)) return;
    const actualmenteActivo = Number(u.activo ?? 1) === 1;
    const nextActivo = actualmenteActivo ? 0 : 1;
    setActivoTogglePending(u.email);
    Axios.put(`${API_BASE}/update-usuario/${encodeURIComponent(u.email)}`, {
      email: rowEmail,
      nombre: String(u.nombre || '').trim(),
      telefono: u.telefono || null,
      password: '',
      rol: u.rol,
      activo: nextActivo,
    })
      .then(() => {
        getUsuarios();
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      })
      .finally(() => {
        setActivoTogglePending(null);
      });
  };

  const deleteUsuario = (email) => {
    if (esPropioUsuario(email)) return;
    Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Se eliminará',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`${API_BASE}/delete-usuario/${email}`)
          .then(() => {
            getUsuarios();
            Swal.fire('Eliminado', 'Usuario eliminado', 'success');
          })
          .catch((error) => {
            Swal.fire('Error', error.response?.data?.message || error.message, 'error');
          });
      }
    });
  };

  const editarUsuario = (u) => {
    setEditandoUsuario(true);
    setUserEmailOriginal(u.email);
    setUserEmail(u.email);
    setUserNombre(u.nombre);
    setUserTelefono(u.telefono ? String(u.telefono) : '');
    setUserRol(u.rol);
    setUserActivo(Number(u.activo ?? 1) !== 0);
    setUserPassword('');
    setUserPasswordConfirm('');
    setFormErrors({});
    setUsuarioModalKey((k) => k + 1);
    setShowUsuarioModal(true);
  };

  const esFormularioNuevoUsuario = showUsuarioModal && !editandoUsuario;

  const nombrePorEmail = useMemo(() => {
    const m = new Map();
    usuariosList.forEach((row) => {
      const key = String(row.email || '').trim().toLowerCase();
      if (key && row.nombre != null && String(row.nombre).trim() !== '') {
        m.set(key, String(row.nombre).trim());
      }
    });
    return m;
  }, [usuariosList]);

  const fmtDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('es-ES');
  };

  const fmtActor = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const key = raw.toLowerCase();
    const nombre = nombrePorEmail.get(key);
    if (nombre) return nombre;
    if (EMAIL_RE.test(raw)) return 'Usuario no encontrado';
    return raw;
  };

  return (
    <div>
      <ModuleTitleBar
        title="Gestión de Usuarios"
        actions={
          puedeCrearUsuarios ? (
            <button
              type="button"
              className={`${BTN_ANADIR_MD} btn-form-nowrap`}
              onClick={abrirModalNuevoUsuario}
              title="Abrir formulario para registrar un usuario nuevo"
            >
              <i className="bi bi-person-plus me-2" aria-hidden="true" />
              Agregar usuario
            </button>
          ) : null
        }
      />

      {loadError ? (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {loadError}
        </div>
      ) : null}

      <FormModal
        show={showUsuarioModal}
        onHide={cerrarModalUsuario}
        title={editandoUsuario ? 'Editar usuario' : '+ Usuario'}
        subtitle=""
        onPrimary={guardarUsuarioModal}
        primaryLabel={editandoUsuario ? 'Actualizar' : 'Crear'}
        autoCompleteOff
      >
        <div key={usuarioModalKey} className="minimal-form-stack" autoComplete="off">
          <div className="user-profile-settings__autofill-trap" aria-hidden="true">
            <input tabIndex={-1} type="text" name="fake-username-trap" autoComplete="username" readOnly />
            <input tabIndex={-1} type="password" name="fake-password-trap" autoComplete="current-password" readOnly />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Email:</label>
            <input
              type="email"
              name="aepg-admin-user-email"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              readOnly={esFormularioNuevoUsuario}
              className={`minimal-input ${formErrors.email ? 'is-invalid' : ''}`}
              placeholder="------------------------"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onFocus={desbloquearCampoAutofill}
              onMouseDown={desbloquearCampoAutofill}
            />
            {formErrors.email ? <small className="text-danger">{formErrors.email}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Nombre:</label>
            <input
              type="text"
              name="aepg-admin-user-name"
              autoComplete="off"
              data-1p-ignore
              data-form-type="other"
              readOnly={esFormularioNuevoUsuario}
              className={`minimal-input ${formErrors.nombre ? 'is-invalid' : ''}`}
              placeholder="------------------------"
              value={userNombre}
              onChange={(e) => setUserNombre(e.target.value)}
              onFocus={desbloquearCampoAutofill}
              onMouseDown={desbloquearCampoAutofill}
            />
            {formErrors.nombre ? <small className="text-danger">{formErrors.nombre}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Teléfono (opcional):</label>
            <input
              type="tel"
              name="aepg-admin-user-phone"
              inputMode="numeric"
              maxLength={8}
              autoComplete="off"
              className={`minimal-input ${formErrors.telefono ? 'is-invalid' : ''}`}
              placeholder="8 dígitos"
              value={userTelefono}
              onChange={(e) => setUserTelefono(normalizeTelefonoInput(e.target.value))}
            />
            {formErrors.telefono ? <small className="text-danger">{formErrors.telefono}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Contraseña:</label>
            <div className="minimal-password-wrap">
              <input
                type={verPassword ? 'text' : 'password'}
                name="aepg-admin-user-password"
                autoComplete={esFormularioNuevoUsuario ? 'new-password' : 'off'}
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                readOnly={esFormularioNuevoUsuario}
                className={`minimal-input minimal-input--with-eye ${formErrors.password ? 'is-invalid' : ''}`}
                placeholder={editandoUsuario ? 'Dejar vacía para mantener actual' : '------------------------'}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                onFocus={desbloquearCampoAutofill}
                onMouseDown={desbloquearCampoAutofill}
              />
              <button
                type="button"
                className="minimal-eye-btn"
                onClick={() => setVerPassword((v) => !v)}
                title={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                <i className={verPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} aria-hidden="true" />
              </button>
            </div>
            {formErrors.password ? <small className="text-danger">{formErrors.password}</small> : null}
            {!formErrors.password ? (
              <small className="text-muted">Mínimo 8 caracteres, mayúscula, minúscula y número.</small>
            ) : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Confirmar contraseña:</label>
            <input
              type={verPassword ? 'text' : 'password'}
              name="aepg-admin-user-password-confirm"
              autoComplete={esFormularioNuevoUsuario ? 'new-password' : 'off'}
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              readOnly={esFormularioNuevoUsuario}
              className={`minimal-input ${formErrors.passwordConfirm ? 'is-invalid' : ''}`}
              placeholder="------------------------"
              value={userPasswordConfirm}
              onChange={(e) => setUserPasswordConfirm(e.target.value)}
              onFocus={desbloquearCampoAutofill}
              onMouseDown={desbloquearCampoAutofill}
            />
            {formErrors.passwordConfirm ? <small className="text-danger">{formErrors.passwordConfirm}</small> : null}
          </div>
          <div className={`minimal-field ${editandoPropioUsuario ? 'minimal-field--locked' : ''}`}>
            <label className="minimal-label">Rol:</label>
            <AppSelect
              variant="modal"
              className={`minimal-select ${userRol ? 'is-selected' : ''}`}
              value={userRol}
              onChange={(e) => setUserRol(e.target.value)}
              disabled={editandoPropioUsuario}
              title={editandoPropioUsuario ? 'No puedes cambiar tu propio rol' : undefined}
            >
              <option value="" disabled hidden>--- Seleccione ---</option>
              {rolesCatalog
                .filter((r) => Number(r.activo ?? 1) === 1)
                .map((r) => (
                  <option key={r.id_rol} value={r.codigo}>
                    {r.nombre}
                    {Number(r.is_system) !== 1 ? ` (${r.codigo})` : ''}
                  </option>
                ))}
            </AppSelect>
            {formErrors.rol ? <small className="text-danger">{formErrors.rol}</small> : null}
            {editandoPropioUsuario ? (
              <small className="text-muted">No puedes cambiar tu propio rol mientras tienes la sesión abierta.</small>
            ) : null}
          </div>
          <div className={`minimal-field ${editandoPropioUsuario ? 'minimal-field--locked' : ''}`}>
            <label className="minimal-label d-block mb-2">Estado:</label>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="usuario-activo"
                checked={userActivo}
                onChange={(e) => setUserActivo(e.target.checked)}
                disabled={editandoPropioUsuario}
                title={editandoPropioUsuario ? 'No puedes cambiar tu propio estado' : undefined}
              />
              <label className={`form-check-label ${editandoPropioUsuario ? 'text-muted' : ''}`} htmlFor="usuario-activo">
                Usuario activo
              </label>
            </div>
            {editandoPropioUsuario ? (
              <small className="text-muted d-block mt-1">No puedes activar ni desactivar tu propia cuenta desde aquí.</small>
            ) : null}
          </div>
        </div>
      </FormModal>

      <div className="card p-3">
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-gestion-usuarios">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Auditoría</th>
                {puedeGestionarUsuarios ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {usuariosList.map((u) => {
                const propioUsuario = esPropioUsuario(u.email);
                return (
                <tr
                  key={u.email}
                  className={Number(u.activo ?? 1) === 0 ? 'usuario-row-inactivo' : undefined}
                >
                  <td>{u.email}</td>
                  <td>{u.nombre}</td>
                  <td>{u.telefono || '—'}</td>
                  <td>{u.rol}</td>
                  <td>
                    <span className={`badge ${Number(u.activo ?? 1) === 1 ? 'bg-success' : 'bg-secondary'}`}>
                      {Number(u.activo ?? 1) === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="small">
                    <div><strong>Creado:</strong> {fmtActor(u.created_by)} · {fmtDate(u.created_at)}</div>
                    <div><strong>Actualizado:</strong> {fmtActor(u.updated_by)} · {fmtDate(u.updated_at)}</div>
                  </td>
                  {puedeGestionarUsuarios ? (
                    <td>
                      <div className="usuario-acciones-cell">
                        <EditTableActionButton module="usuarios" onClick={() => editarUsuario(u)} />
                        <DeleteTableActionButton
                          module="usuarios"
                          onClick={() => deleteUsuario(u.email)}
                          disabled={propioUsuario}
                          title={propioUsuario ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
                        />
                        {puedeEditarUsuarios ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Number(u.activo ?? 1) === 1}
                            aria-label={Number(u.activo ?? 1) === 1 ? 'Desactivar usuario' : 'Activar usuario'}
                            title={
                              propioUsuario
                                ? 'No puedes cambiar tu propio estado desde aquí'
                                : Number(u.activo ?? 1) === 1
                                  ? 'Desactivar usuario'
                                  : 'Activar usuario'
                            }
                            disabled={activoTogglePending === u.email || propioUsuario}
                            className={`usuario-toggle ${Number(u.activo ?? 1) === 1 ? 'usuario-toggle--on' : 'usuario-toggle--off'}${propioUsuario ? ' usuario-toggle--locked' : ''}`}
                            onClick={() => toggleUsuarioActivo(u)}
                          >
                            <span className="usuario-toggle__caption">{Number(u.activo ?? 1) === 1 ? 'ON' : 'OFF'}</span>
                            <span className="usuario-toggle__thumb" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GestionUsuarios;
