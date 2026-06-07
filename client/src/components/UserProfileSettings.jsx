import { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import UserProfileAvatar from './UserProfileAvatar';
import { BTN_CONSULTAR, BTN_CANCELAR } from '../lib/actionButtonClasses';
import {
  changeUserPassword,
  fetchUserProfile,
  normalizeTelefonoInput,
  saveUserProfile,
  telefonoValidoOpcional,
} from '../lib/userProfile';
import { isValidEmail, passwordValidationForSubmit } from '../utils/userCredentialsValidation';

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
      Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo cargar el perfil', 'error');
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
      Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo guardar', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const validarPassword = () => {
    const errs = {};
    if (!currentPassword.trim()) errs.currentPassword = 'Indique su contraseña actual.';
    const fb = passwordValidationForSubmit(newPassword, { required: true, allowOmit: false });
    if (!fb.ok) errs.newPassword = fb.message;
    if (newPassword !== newPasswordConfirm) errs.newPasswordConfirm = 'Las contraseñas no coinciden.';
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const guardarPassword = async () => {
    if (!validarPassword()) return;
    setSavingPassword(true);
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
      Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo cambiar la contraseña', 'error');
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
          <UserProfileAvatar user={user} onPhotoUpdated={handlePhotoUpdated} className="dashboard-user-avatar" />
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
            <input
              id="profile-current-pw-email"
              type="password"
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
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="profile-current-pw">
            Contraseña actual
          </label>
          <input
            id="profile-current-pw"
            type="password"
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
          <input
            id="profile-new-pw"
            type="password"
            className={`form-control form-control-sm${passwordErrors.newPassword ? ' is-invalid' : ''}`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {passwordErrors.newPassword ? (
            <div className="invalid-feedback d-block">{passwordErrors.newPassword}</div>
          ) : (
            <small className="text-muted">Mínimo 8 caracteres, mayúscula, minúscula y número.</small>
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="profile-new-pw2">
            Confirmar nueva contraseña
          </label>
          <input
            id="profile-new-pw2"
            type="password"
            className={`form-control form-control-sm${passwordErrors.newPasswordConfirm ? ' is-invalid' : ''}`}
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            autoComplete="new-password"
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
