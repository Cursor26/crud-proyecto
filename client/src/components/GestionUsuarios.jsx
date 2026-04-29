import { useState, useEffect, useMemo, useCallback } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { isValidEmail, getPasswordFeedback, passwordValidationForSubmit } from '../utils/userCredentialsValidation';
import { esSoloBlancosOVacio, MSJ_OBLIGATORIO_NO_SOLO_BLANCOS } from '../utils/validation';

/** Alineado con el servidor: esta cuenta solo la edita su titular; no se elimina. */
const EMAIL_USUARIO_ADMIN_PERMANENTE = 'admin@admin.com';

const STRENGTH_BADGE = {
  empty: { text: 'Sin contraseña', cls: 'usuario-cred-pw-label usuario-cred-pw-label--empty' },
  short: { text: 'Muy corta (mín. 8)', cls: 'usuario-cred-pw-label usuario-cred-pw-label--short' },
  weak: { text: 'Débil', cls: 'usuario-cred-pw-label usuario-cred-pw-label--weak' },
  medium: { text: 'Aceptable', cls: 'usuario-cred-pw-label usuario-cred-pw-label--medium' },
  strong: { text: 'Fuerte', cls: 'usuario-cred-pw-label usuario-cred-pw-label--strong' },
};

function GestionUsuarios({ currentUser }) {
  const puedeEscribir = usePuedeEscribir();
  const [usuariosList, setUsuarios] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userNombre, setUserNombre] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRol, setUserRol] = useState('');
  const [editandoUsuario, setEditandoUsuario] = useState(false);
  const [userEmailOriginal, setUserEmailOriginal] = useState('');
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const esCuentaAdminPermanente = (email) =>
    String(email || '')
      .trim()
      .toLowerCase() === EMAIL_USUARIO_ADMIN_PERMANENTE;

  const filaProtegidaParaUsuario = (filaEmail) => {
    if (!esCuentaAdminPermanente(filaEmail)) return false;
    const yo = String(currentUser?.email || '')
      .trim()
      .toLowerCase();
    return yo !== EMAIL_USUARIO_ADMIN_PERMANENTE;
  };

  const edicionPropioAdminPermanente =
    editandoUsuario && esCuentaAdminPermanente(userEmailOriginal);

  const emailTrim = String(userEmail || '').trim();
  const emailStatus = useMemo(() => {
    if (!emailTrim) return { state: 'empty' };
    if (isValidEmail(emailTrim)) return { state: 'ok' };
    return { state: 'bad' };
  }, [emailTrim]);

  const passwordSubmitCheck = useMemo(
    () =>
      passwordValidationForSubmit(userPassword, {
        required: !editandoUsuario,
        allowOmit: editandoUsuario,
      }),
    [userPassword, editandoUsuario]
  );

  const passwordVisual = useMemo(() => {
    if (editandoUsuario && !String(userPassword || '').length) {
      return { mode: 'omit' };
    }
    return { mode: 'value', feedback: getPasswordFeedback(userPassword) };
  }, [userPassword, editandoUsuario]);

  const canSubmit = useMemo(() => {
    if (!puedeEscribir) return false;
    if (edicionPropioAdminPermanente) {
      if (esSoloBlancosOVacio(userEmail) || !isValidEmail(emailTrim)) return false;
      if (esSoloBlancosOVacio(userNombre) || esSoloBlancosOVacio(userRol)) return false;
      return passwordSubmitCheck.ok;
    }
    if (esSoloBlancosOVacio(userEmail) || !isValidEmail(emailTrim)) return false;
    if (esSoloBlancosOVacio(userNombre) || esSoloBlancosOVacio(userRol)) return false;
    return passwordSubmitCheck.ok;
  }, [puedeEscribir, edicionPropioAdminPermanente, userEmail, emailTrim, userNombre, userRol, passwordSubmitCheck]);

  const getUsuarios = () => {
    setLoadError('');
    Axios.get('/usuarios')
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

  const clearFieldError = useCallback((key) => {
    setFieldErrors((f) => {
      if (!f[key]) return f;
      const next = { ...f };
      delete next[key];
      return next;
    });
  }, []);

  const limpiarUsuario = () => {
    setEditandoUsuario(false);
    setUserEmail('');
    setUserNombre('');
    setUserPassword('');
    setUserRol('');
    setUserEmailOriginal('');
    setVerPassword(false);
    setFieldErrors({});
  };

  const cerrarModalUsuario = () => {
    limpiarUsuario();
    setShowUsuarioModal(false);
  };

  const abrirModalNuevoUsuario = () => {
    limpiarUsuario();
    setShowUsuarioModal(true);
  };

  const validateForm = () => {
    const e = {};
    if (esSoloBlancosOVacio(userEmail)) {
      e.email = `Email: ${MSJ_OBLIGATORIO_NO_SOLO_BLANCOS}`;
    } else if (!isValidEmail(emailTrim)) {
      e.email = 'Escriba un email válido: debe incluir @ y un dominio (por ejemplo, usuario@empresa.cu).';
    }
    if (esSoloBlancosOVacio(userNombre)) {
      e.nombre = `Nombre: ${MSJ_OBLIGATORIO_NO_SOLO_BLANCOS}`;
    }
    if (esSoloBlancosOVacio(userRol)) {
      e.rol = 'Seleccione un rol. No basta con espacios u otros blancos si el formulario acepta texto libre.';
    }
    const pvs = passwordValidationForSubmit(userPassword, {
      required: !editandoUsuario,
      allowOmit: editandoUsuario,
    });
    if (!pvs.ok) {
      e.password = pvs.message;
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardarUsuarioModal = () => {
    if (!validateForm()) return;
    if (editandoUsuario) updateUsuario();
    else addUsuario();
  };

  const payloadForApi = () => {
    return {
      email: emailTrim.toLowerCase(),
      nombre: String(userNombre || '').trim(),
      password: String(userPassword || ''),
      rol: String(userRol || '').trim(),
    };
  };

  const addUsuario = () => {
    const body = payloadForApi();
    Axios.post('/create-usuario', body)
      .then(() => {
        getUsuarios();
        cerrarModalUsuario();
        Swal.fire('Creado', 'Usuario creado correctamente.', 'success');
      })
      .catch((error) => {
        const msg = error.response?.data?.message || error.message || 'No se pudo crear el usuario';
        Swal.fire('No se pudo guardar', msg, 'error');
      });
  };

  const updateUsuario = () => {
    const body = payloadForApi();
    Axios.put(`/update-usuario/${encodeURIComponent(userEmailOriginal)}`, {
      email: body.email,
      nombre: body.nombre,
      password: body.password,
      rol: body.rol,
    })
      .then((res) => {
        getUsuarios();
        cerrarModalUsuario();
        const msg = res.data?.message || 'Los datos del usuario se guardaron.';
        Swal.fire('Actualizado', msg, 'success');
      })
      .catch((error) => {
        const msg = error.response?.data?.message || error.message || 'No se pudo actualizar';
        Swal.fire('No se pudo guardar', msg, 'error');
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
        Axios.delete(`/delete-usuario/${encodeURIComponent(email)}`)
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
    setUserPassword('');
    setFieldErrors({});
    setShowUsuarioModal(true);
  };

  const intentarEditarUsuario = (u) => {
    if (filaProtegidaParaUsuario(u.email)) {
      Swal.fire({
        icon: 'warning',
        title: 'No puede editar esta cuenta',
        html: 'La <strong>cuenta de administrador permanente</strong> (<code>admin@admin.com</code>) solo puede ser modificada por quien inicia sesión con ese correo. Usted no tiene permiso para editarla.',
        confirmButtonText: 'Entendido',
      });
      return;
    }
    editarUsuario(u);
  };

  const intentarEliminarUsuario = (email) => {
    if (esCuentaAdminPermanente(email)) {
      Swal.fire({
        icon: 'warning',
        title: 'No puede eliminar esta cuenta',
        html: 'La <strong>cuenta de administrador permanente</strong> está protegida. Nadie puede eliminarla, ni aunque sea el titular, para no dejar el sistema sin un administrador.',
        confirmButtonText: 'Entendido',
      });
      return;
    }
    deleteUsuario(email);
  };

  const emailClass =
    'minimal-input' +
    (emailTrim
      ? emailStatus.state === 'ok'
        ? ' is-valid'
        : ' is-invalid'
      : '');

  const barsClass = (() => {
    if (passwordVisual.mode === 'omit') return 'usuario-cred-pw-bars';
    const st = passwordVisual.feedback.strength;
    if (st === 'empty' || st === 'short') return st === 'short' ? 'usuario-cred-pw-bars usuario-cred-pw-bars--short' : 'usuario-cred-pw-bars';
    return `usuario-cred-pw-bars usuario-cred-pw-bars--${st}`;
  })();

  const strengthKey =
    passwordVisual.mode === 'omit' ? 'empty' : passwordVisual.feedback.strength;

  return (
    <div>
      <ModuleTitleBar
        title="Gestión de Usuarios"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-form-nowrap d-inline-flex align-items-center"
            onClick={abrirModalNuevoUsuario}
            disabled={!puedeEscribir}
          >
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
        primaryDisabled={!canSubmit}
      >
        <div className="minimal-form-stack">
          <p className="text-muted small mb-2" style={{ maxWidth: 400 }}>
            Los campos obligatorios se validan al guardar. El email y la contraseña se comprueban en vivo para orientarle antes de enviar.
          </p>

          {edicionPropioAdminPermanente ? (
            <div className="alert alert-info py-2 small mb-3" role="status">
              <strong>Cuenta de administrador permanente:</strong> solo puede modificar su <strong>contraseña</strong>. El email, el nombre
              y el rol no se pueden cambiar desde aquí (además de las demás reglas del módulo).
            </div>
          ) : null}

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="usuario-form-email">
              Email:
            </label>
            <input
              id="usuario-form-email"
              type="email"
              autoComplete="email"
              className={emailClass}
              placeholder="nombre@empresa.cu"
              value={userEmail}
              readOnly={edicionPropioAdminPermanente}
              onChange={(e) => {
                setUserEmail(e.target.value);
                clearFieldError('email');
              }}
            />
            <p
              className={
                'usuario-cred-hint' +
                (fieldErrors.email
                  ? ' usuario-cred-hint--err'
                  : emailStatus.state === 'ok' && emailTrim
                    ? ' usuario-cred-hint--ok'
                    : '')
              }
            >
              {fieldErrors.email ||
                (edicionPropioAdminPermanente
                  ? 'El email de la cuenta de administrador permanente no se puede modificar.'
                  : emailTrim
                    ? emailStatus.state === 'ok'
                      ? 'Formato de email aceptable.'
                      : 'Use un @ y un dominio con extensión (p. ej. .cu, .com).'
                    : 'Escriba un correo con formato válido. Ej.: rrhh@miempresa.cu')}
            </p>
          </div>

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="usuario-form-nombre">
              Nombre:
            </label>
            <input
              id="usuario-form-nombre"
              type="text"
              className={
                'minimal-input' +
                (edicionPropioAdminPermanente ? ' bg-light' : '') +
                (fieldErrors.nombre && !String(userNombre || '').trim() ? ' is-invalid' : String(userNombre || '').trim() ? ' is-valid' : '')
              }
              autoComplete="name"
              placeholder="Nombre completo o visible en el sistema"
              value={userNombre}
              readOnly={edicionPropioAdminPermanente}
              onChange={(e) => {
                setUserNombre(e.target.value);
                clearFieldError('nombre');
              }}
            />
            <p className={'usuario-cred-hint' + (fieldErrors.nombre ? ' usuario-cred-hint--err' : '')}>
              {fieldErrors.nombre ||
                (edicionPropioAdminPermanente
                  ? 'Este dato no es editable en la cuenta de administrador permanente.'
                  : 'Obligatorio. Es el nombre que se muestra al iniciar sesión y en registros de auditoría.')}
            </p>
          </div>

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="usuario-form-password">
              Contraseña:
            </label>
            {editandoUsuario && (
              <p className="usuario-cred-pw-omit">
                <i className="bi bi-info-circle me-1" aria-hidden="true" />
                Si deja este campo <strong>vacío</strong>, se conservará la contraseña actual. Si escribe una nueva, debe cumplir las
                reglas de abajo.
              </p>
            )}
            <div className="minimal-password-wrap">
              <input
                id="usuario-form-password"
                type={verPassword ? 'text' : 'password'}
                className="minimal-input minimal-input--with-eye"
                placeholder={editandoUsuario ? 'Vacío = no cambiar' : 'Mínimo 8 caracteres'}
                value={userPassword}
                onChange={(e) => {
                  setUserPassword(e.target.value);
                  clearFieldError('password');
                }}
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

            {editandoUsuario && String(userPassword || '').length > 0 && (
              <div className="alert alert-warning small py-2 px-2 mt-2 mb-0" role="status">
                <i className="bi bi-shield-exclamation me-1" aria-hidden="true" />
                {edicionPropioAdminPermanente ? (
                  <>
                    <strong>Importante:</strong> va a reemplazar la <strong>contraseña de acceso</strong> de esta cuenta. Asegúrese
                    de recordar la nueva clave o guárdela de forma segura.
                  </>
                ) : (
                  <>
                    <strong>Importante (confianza y acceso):</strong> va a fijar una <strong>contraseña nueva</strong> para otra
                    persona. Si hace esto <strong>sin su consentimiento o sin avisarle</strong>, quedará bloqueada su clave anterior y
                    no podrá entrar hasta que use la nueva. Comunique la clave con seguridad o confirme antes con el usuario.
                  </>
                )}
              </div>
            )}

            {passwordVisual.mode === 'value' && (
              <>
                <p id="usuario-password-help" className="usuario-cred-pw-label p-0 mt-2" style={{ fontSize: '0.7rem' }}>
                  Fortaleza
                </p>
                <div className={barsClass} aria-hidden="true">
                  <div className="usuario-cred-pw-bar" />
                  <div className="usuario-cred-pw-bar" />
                  <div className="usuario-cred-pw-bar" />
                </div>
                <p className={STRENGTH_BADGE[strengthKey].cls} style={{ fontSize: '0.8rem' }}>
                  {STRENGTH_BADGE[strengthKey].text}
                </p>
                <p
                  className={
                    'usuario-cred-hint' +
                    (fieldErrors.password
                      ? ' usuario-cred-hint--err'
                      : !passwordVisual.feedback.valid
                        ? ' usuario-cred-hint--err'
                        : ' usuario-cred-hint--ok')
                  }
                >
                  {fieldErrors.password || passwordVisual.feedback.message}
                </p>
                <ul className="small text-muted mb-0 ps-3" style={{ maxWidth: 400 }}>
                  <li>Mínimo 8 caracteres (obligatorio para crear; también si cambia al editar).</li>
                  <li>Mezcle letras (mayúsculas y minúsculas), números y símbolos para que sea difícil de adivinar.</li>
                </ul>
              </>
            )}

            {passwordVisual.mode === 'omit' && (
              <p className="usuario-cred-hint text-muted small mt-1 mb-0">
                Sin cambios en la contraseña. Escriba solo si desea reemplazarla; entonces aplica el mínimo de 8 caracteres y el aviso
                de arriba.
              </p>
            )}
          </div>

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="usuario-form-rol">
              Rol:
            </label>
            <AppSelect
              id="usuario-form-rol"
              className={'minimal-select ' + (userRol ? 'is-selected ' : '') + (fieldErrors.rol && !userRol ? 'is-invalid' : userRol ? 'is-valid' : '')}
              value={userRol}
              disabled={edicionPropioAdminPermanente}
              onChange={(e) => {
                setUserRol(e.target.value);
                clearFieldError('rol');
              }}
            >
              <option value="" disabled hidden>
                --- Seleccione ---
              </option>
              <option value="rrhh">Rec. humanos</option>
              <option value="contratacion">Contratación</option>
              <option value="estadistica">Estadística</option>
              <option value="director">Director (solo consulta)</option>
              <option value="admin">Administrador (solo usuarios)</option>
            </AppSelect>
            <p className={'usuario-cred-hint' + (fieldErrors.rol ? ' usuario-cred-hint--err' : '')}>
              {fieldErrors.rol ||
                (edicionPropioAdminPermanente
                  ? 'El rol no es editable en la cuenta de administrador permanente.'
                  : 'El rol limita qué módulos puede ver o editar en el sistema.')}
            </p>
          </div>
        </div>
      </FormModal>

      <div className="card p-3">
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosList.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>{u.nombre}</td>
                  <td>{u.rol}</td>
                  <td>
                    <EditTableActionButton
                      onClick={() => intentarEditarUsuario(u)}
                      className="me-2"
                    />
                    <DeleteTableActionButton onClick={() => intentarEliminarUsuario(u.email)} />
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
