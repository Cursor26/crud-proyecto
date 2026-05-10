import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function GestionUsuarios() {
  const [usuariosList, setUsuarios] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userNombre, setUserNombre] = useState('');
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

  const rolActual = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem('user') || '{}')?.rol || '').toLowerCase();
    } catch {
      return '';
    }
  }, []);

  const sesionEmail = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem('user') || '{}')?.email || '')
        .trim()
        .toLowerCase();
    } catch {
      return '';
    }
  }, []);

  const [activoTogglePending, setActivoTogglePending] = useState(null);

  const getUsuarios = () => {
    setLoadError('');
    Axios.get('http://localhost:3001/usuarios')
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
  }, []);

  const limpiarUsuario = () => {
    setEditandoUsuario(false);
    setUserEmail('');
    setUserNombre('');
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
    setShowUsuarioModal(true);
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
    Axios.post('http://localhost:3001/create-usuario', {
      email: userEmail.trim().toLowerCase(),
      nombre: userNombre.trim(),
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
    Axios.put(`http://localhost:3001/update-usuario/${encodeURIComponent(userEmailOriginal)}`, {
      email: userEmail.trim().toLowerCase(),
      nombre: userNombre.trim(),
      password: userPassword,
      rol: userRol,
      activo: userActivo ? 1 : 0,
    })
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
    const actualmenteActivo = Number(u.activo ?? 1) === 1;
    if (sesionEmail && sesionEmail === rowEmail && actualmenteActivo) {
      Swal.fire({
        icon: 'info',
        title: 'Acción no permitida',
        text: 'No puedes desactivar tu propia cuenta desde aquí.',
      });
      return;
    }
    const nextActivo = actualmenteActivo ? 0 : 1;
    setActivoTogglePending(u.email);
    Axios.put(`http://localhost:3001/update-usuario/${encodeURIComponent(u.email)}`, {
      email: rowEmail,
      nombre: String(u.nombre || '').trim(),
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
    Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Se eliminará',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-usuario/${email}`)
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
    setUserRol(u.rol);
    setUserActivo(Number(u.activo ?? 1) !== 0);
    setUserPassword('');
    setUserPasswordConfirm('');
    setFormErrors({});
    setShowUsuarioModal(true);
  };

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
          <button type="button" className="btn btn-primary btn-form-nowrap d-inline-flex align-items-center" onClick={abrirModalNuevoUsuario}>
            <i className="bi bi-person-plus me-2" aria-hidden="true" />
            Agregar usuario
          </button>
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
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Email:</label>
            <input
              type="email"
              className={`minimal-input ${formErrors.email ? 'is-invalid' : ''}`}
              placeholder="------------------------"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            {formErrors.email ? <small className="text-danger">{formErrors.email}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Nombre:</label>
            <input
              type="text"
              className={`minimal-input ${formErrors.nombre ? 'is-invalid' : ''}`}
              placeholder="------------------------"
              value={userNombre}
              onChange={(e) => setUserNombre(e.target.value)}
            />
            {formErrors.nombre ? <small className="text-danger">{formErrors.nombre}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Contraseña:</label>
            <div className="minimal-password-wrap">
              <input
                type={verPassword ? 'text' : 'password'}
                className={`minimal-input minimal-input--with-eye ${formErrors.password ? 'is-invalid' : ''}`}
                placeholder={editandoUsuario ? 'Dejar vacía para mantener actual' : '------------------------'}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                autoComplete="new-password"
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
              className={`minimal-input ${formErrors.passwordConfirm ? 'is-invalid' : ''}`}
              placeholder="------------------------"
              value={userPasswordConfirm}
              onChange={(e) => setUserPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {formErrors.passwordConfirm ? <small className="text-danger">{formErrors.passwordConfirm}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Rol:</label>
            <AppSelect className={`minimal-select ${userRol ? 'is-selected' : ''}`} value={userRol} onChange={(e) => setUserRol(e.target.value)}>
              <option value="" disabled hidden>--- Seleccione ---</option>
              <option value="rrhh">Rec. humanos</option>
              <option value="contratacion">Contratación</option>
              <option value="admin">Administrador</option>
              <option value="produccion">Producción</option>
            </AppSelect>
            {formErrors.rol ? <small className="text-danger">{formErrors.rol}</small> : null}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Estado:</label>
            <AppSelect className={`minimal-select ${userActivo ? 'is-selected' : ''}`} value={userActivo ? '1' : '0'} onChange={(e) => setUserActivo(e.target.value === '1')}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </AppSelect>
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
                <th>Rol</th>
                <th>Estado</th>
                <th>Auditoría</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosList.map((u) => (
                <tr
                  key={u.email}
                  className={Number(u.activo ?? 1) === 0 ? 'usuario-row-inactivo' : undefined}
                >
                  <td>{u.email}</td>
                  <td>{u.nombre}</td>
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
                  <td>
                    <div className="usuario-acciones-cell">
                      <EditTableActionButton onClick={() => editarUsuario(u)} />
                      <DeleteTableActionButton onClick={() => deleteUsuario(u.email)} />
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Number(u.activo ?? 1) === 1}
                        aria-label={Number(u.activo ?? 1) === 1 ? 'Desactivar usuario' : 'Activar usuario'}
                        title={
                          sesionEmail && sesionEmail === String(u.email || '').trim().toLowerCase() && Number(u.activo ?? 1) === 1
                            ? 'No puedes desactivar tu propia cuenta desde aquí'
                            : Number(u.activo ?? 1) === 1
                              ? 'Desactivar usuario'
                              : 'Activar usuario'
                        }
                        disabled={
                          activoTogglePending === u.email ||
                          (sesionEmail !== '' &&
                            sesionEmail === String(u.email || '').trim().toLowerCase() &&
                            Number(u.activo ?? 1) === 1)
                        }
                        className={`usuario-toggle ${Number(u.activo ?? 1) === 1 ? 'usuario-toggle--on' : 'usuario-toggle--off'}`}
                        onClick={() => toggleUsuarioActivo(u)}
                      >
                        <span className="usuario-toggle__caption">{Number(u.activo ?? 1) === 1 ? 'ON' : 'OFF'}</span>
                        <span className="usuario-toggle__thumb" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GestionUsuarios;
