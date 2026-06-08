import { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import UserProfileAvatar from './UserProfileAvatar';
import { BTN_CONSULTAR, BTN_CANCELAR } from '../lib/actionButtonClasses';
import { getApiErrorMessage } from '../axiosConfig';
import {
  changeUserPassword,
  fetchUserProfile,
  normalizeTelefonoInput,
  saveUserProfile,
  telefonoValidoOpcional,
} from '../lib/userProfile';
import { isValidEmail, passwordValidationForSubmit } from '../utils/userCredentialsValidation';

/** Campo contraseña con ojito; antiAutofill evita sugerencias del navegador en campos nuevos. */
function PasswordInputWithEye({ id, value, onChange, className, autoComplete, antiAutofill = false }) {
  const [visible, setVisible] = useState(false);

  const type = antiAutofill || visible ? 'text' : 'password';
  const inputClass = [
    className,
    'user-profile-settings__pw-with-eye',
    antiAutofill && !visible ? 'user-profile-settings__pw-no-autofill' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="user-profile-settings__password-wrap">
      <input
        id={id}
        name={antiAutofill ? id : undefined}
        type={type}
        inputMode="text"
        spellCheck={false}
        className={inputClass}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete ?? (antiAutofill ? 'off' : undefined)}
        {...(antiAutofill
          ? { 'data-1p-ignore': true, 'data-lpignore': 'true', 'data-form-type': 'other' }
          : {})}
      />
      <button
        type="button"
        className="user-profile-settings__eye-btn"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
        aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
      >
        <i className={visible ? 'bi bi-eye-slash' : 'bi bi-eye'} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function UserProfileSettings({ user, onProfileUpdated }) {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailOriginal, setEmailOriginal] = useState('');
  const [currentPasswordProfile, setCurrentPasswordProfile] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const emailCambia = useMemo(
    () => email.trim().toLowerCase() !== emailOriginal.trim().toLowerCase(),
    [email, emailOriginal]
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserProfile();
      setNombre(String(data?.nombre || ''));
      setEmail(String(data?.email || ''));
      setEmailOriginal(String(data?.email || ''));
      setTelefono(data?.telefono ? String(data.telefono) : '');
    } catch (err) {
      Swal.fire('Error', getApiErrorMessage(err, 'No se pudo cargar el perfil'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email) loadProfile();
  }, [user?.email, loadProfile]);

  const handlePhotoUpdated = (fotoPerfil) => {
    if (typeof onProfileUpdated === 'function') {
      onProfileUpdated({ fotoPerfil: fotoPerfil || null });
    }
  };

  const validarPerfil = () => {
    const errs = {};
    const nombreTrim = nombre.trim();
    const emailTrim = email.trim().toLowerCase();

    if (!nombreTrim || nombreTrim.length < 3) {
      errs.nombre = 'El nombre de usuario debe tener al menos 3 caracteres.';
    }
    if (!isValidEmail(emailTrim)) errs.email = 'Correo electrónico inválido.';
    const tel = telefonoValidoOpcional(telefono);
    if (!tel.ok) errs.telefono = tel.message;
    if (emailCambia && !currentPasswordProfile.trim()) {
      errs.currentPasswordProfile = 'Indique su contraseña actual para cambiar el correo.';
    }

    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const guardarPerfil = async () => {
    if (!validarPerfil()) return;
    setSavingProfile(true);
    try {
      const tel = telefonoValidoOpcional(telefono);
      const res = await saveUserProfile({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: tel.value || null,
        currentPassword: emailCambia ? currentPasswordProfile : undefined,
      });
      const updated = res?.usuario || {};
      setEmailOriginal(String(updated.email || email));
      setEmail(String(updated.email || email));
      setNombre(String(updated.nombre || nombre));
      setTelefono(updated.telefono ? String(updated.telefono) : '');
      setCurrentPasswordProfile('');
      if (typeof onProfileUpdated === 'function') {
        onProfileUpdated({
          ...updated,
          token: res?.token || null,
        });
      }
      await Swal.fire('Guardado', 'Datos de cuenta actualizados.', 'success');
    } catch (err) {
      Swal.fire('Error', getApiErrorMessage(err, 'No se pudo guardar'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const validarPassword = () => {
    const errs = {};
    const actual = currentPassword.trim();
    const nueva = newPassword.trim();

    if (!actual) errs.currentPassword = 'Indique su contraseña actual.';
    const fb = passwordValidationForSubmit(nueva, { required: true, allowOmit: false });
    if (!fb.ok) errs.newPassword = fb.message;
    if (nueva && actual && nueva === actual) {
      errs.newPassword = 'La nueva contraseña debe ser distinta de la actual.';
    }
    if (newPassword !== newPasswordConfirm) errs.newPasswordConfirm = 'Las contraseñas no coinciden.';
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const guardarPassword = async () => {
    if (!validarPassword()) return;
    setSavingPassword(true);
    setPasswordErrors({});
    try {
      await changeUserPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      await Swal.fire('Listo', 'Contraseña actualizada correctamente.', 'success');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'No se pudo cambiar la contraseña');
      if (err.response?.status === 401 || /contraseña actual incorrecta/i.test(msg)) {
        setPasswordErrors({ currentPassword: 'Contraseña actual incorrecta.' });
        Swal.fire('Error', 'La contraseña actual no es correcta. No se realizó ningún cambio.', 'error');
      } else {
        Swal.fire('Error', msg, 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <p className="text-muted small mb-0">Cargando datos de cuenta…</p>;
  }

  return (
    <div className="user-profile-settings">
      <div className="user-profile-settings__photo mb-3">
        <label className="form-label small fw-semibold d-block">Foto de perfil</label>
        <div className="user-profile-settings__avatar-wrap">
          <UserProfileAvatar
            user={user}
            onPhotoUpdated={handlePhotoUpdated}
            className="dashboard-user-avatar"
            menuAlign="start"
          />
        </div>
        <p className="text-muted small mb-0 mt-2">Use el botón sobre la foto para cambiar o quitar la imagen.</p>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="profile-nombre">
            Nombre de usuario
          </label>
          <input
            id="profile-nombre"
            type="text"
            className={`form-control form-control-sm${profileErrors.nombre ? ' is-invalid' : ''}`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="username"
          />
          {profileErrors.nombre ? <div className="invalid-feedback d-block">{profileErrors.nombre}</div> : null}
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="profile-email">
            Correo electrónico
          </label>
          <input
            id="profile-email"
            type="email"
            className={`form-control form-control-sm${profileErrors.email ? ' is-invalid' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {profileErrors.email ? <div className="invalid-feedback d-block">{profileErrors.email}</div> : null}
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold" htmlFor="profile-telefono">
            Teléfono <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <input
            id="profile-telefono"
            type="tel"
            inputMode="numeric"
            maxLength={8}
            className={`form-control form-control-sm${profileErrors.telefono ? ' is-invalid' : ''}`}
            value={telefono}
            onChange={(e) => setTelefono(normalizeTelefonoInput(e.target.value))}
            placeholder="8 dígitos"
            autoComplete="tel"
          />
          {profileErrors.telefono ? <div className="invalid-feedback d-block">{profileErrors.telefono}</div> : null}
        </div>
        {emailCambia ? (
          <div className="col-md-6">
            <label className="form-label small fw-semibold" htmlFor="profile-current-pw-email">
              Contraseña actual (para cambiar correo)
            </label>
            <PasswordInputWithEye
              id="profile-current-pw-email"
              className={`form-control form-control-sm${profileErrors.currentPasswordProfile ? ' is-invalid' : ''}`}
              value={currentPasswordProfile}
              onChange={(e) => setCurrentPasswordProfile(e.target.value)}
              autoComplete="current-password"
            />
            {profileErrors.currentPasswordProfile ? (
              <div className="invalid-feedback d-block">{profileErrors.currentPasswordProfile}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-4">
        <button type="button" className={BTN_CONSULTAR} onClick={guardarPerfil} disabled={savingProfile}>
          {savingProfile ? 'Guardando…' : 'Guardar datos de cuenta'}
        </button>
      </div>

      <hr className="my-3" />

      <h6 className="fw-semibold mb-2">Cambiar contraseña</h6>
      <div className="user-profile-settings__autofill-trap" aria-hidden="true">
        <input tabIndex={-1} type="text" name="fake-user" autoComplete="username" readOnly />
        <input tabIndex={-1} type="password" name="fake-pass" autoComplete="current-password" readOnly />
      </div>
      <div className="row g-2 mb-3 user-profile-settings__password-row">
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="profile-current-pw">
            Contraseña actual
          </label>
          <PasswordInputWithEye
            id="profile-current-pw"
            className={`form-control form-control-sm${passwordErrors.currentPassword ? ' is-invalid' : ''}`}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          {passwordErrors.currentPassword ? (
            <div className="invalid-feedback d-block">{passwordErrors.currentPassword}</div>
          ) : null}
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="profile-new-pw">
            Nueva contraseña
          </label>
          <PasswordInputWithEye
            id="profile-new-pw"
            className={`form-control form-control-sm${passwordErrors.newPassword ? ' is-invalid' : ''}`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            antiAutofill
          />
          {passwordErrors.newPassword ? (
            <div className="invalid-feedback d-block">{passwordErrors.newPassword}</div>
          ) : (
            <small className="text-muted user-profile-settings__password-hint">
              Mínimo 8 caracteres, mayúscula, minúscula y número.
            </small>
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="profile-new-pw2">
            Confirmar nueva contraseña
          </label>
          <PasswordInputWithEye
            id="profile-new-pw2"
            className={`form-control form-control-sm${passwordErrors.newPasswordConfirm ? ' is-invalid' : ''}`}
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            antiAutofill
          />
          {passwordErrors.newPasswordConfirm ? (
            <div className="invalid-feedback d-block">{passwordErrors.newPasswordConfirm}</div>
          ) : null}
        </div>
      </div>
      <button type="button" className={BTN_CANCELAR} onClick={guardarPassword} disabled={savingPassword}>
        {savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </div>
  );
}
