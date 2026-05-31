import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import Cropper from 'react-easy-crop';
import Swal from 'sweetalert2';
import {
  CROP_SOURCE_MAX_DIM,
  DEFAULT_PROFILE_PHOTO,
  fetchProfilePhoto,
  getCroppedProfilePhoto,
  readImageFileAsDataUrl,
  saveProfilePhoto,
} from '../lib/profilePhoto';

function UserProfileAvatar({ user, className = 'dashboard-user-avatar', onPhotoUpdated }) {
  const hostRef = useRef(null);
  const fileRef = useRef(null);
  const croppedAreaPixelsRef = useRef(null);
  const [photo, setPhoto] = useState(user?.fotoPerfil || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);

  const syncPhoto = useCallback(
    (next) => {
      setPhoto(next);
      if (typeof onPhotoUpdated === 'function') onPhotoUpdated(next);
    },
    [onPhotoUpdated]
  );

  const resetCropState = useCallback(() => {
    setCropImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedAreaPixelsRef.current = null;
  }, []);

  const closeCropModal = useCallback(() => {
    if (saving) return;
    setCropOpen(false);
    resetCropState();
  }, [resetCropState, saving]);

  useEffect(() => {
    if (!user?.email) return undefined;
    let cancelled = false;
    fetchProfilePhoto()
      .then((foto) => {
        if (!cancelled) syncPhoto(foto);
      })
      .catch(() => {
        if (!cancelled && user?.fotoPerfil) syncPhoto(user.fotoPerfil);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.fotoPerfil, syncPhoto]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (e) => {
      if (hostRef.current && !hostRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const displaySrc = photo || DEFAULT_PROFILE_PHOTO;

  const openFilePicker = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => {
      fileRef.current?.click();
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file, CROP_SOURCE_MAX_DIM, 0.92);
      setCropImage(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      croppedAreaPixelsRef.current = null;
      setCropOpen(true);
    } catch (err) {
      Swal.fire('Imagen no válida', err.message || 'No se pudo procesar la imagen.', 'warning');
    }
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    croppedAreaPixelsRef.current = croppedAreaPixels;
  }, []);

  const handleSavePhoto = async () => {
    if (!cropImage || !croppedAreaPixelsRef.current) {
      Swal.fire('Ajuste la imagen', 'Mueva o amplíe la foto dentro del círculo antes de guardar.', 'info');
      return;
    }
    setSaving(true);
    try {
      const cropped = await getCroppedProfilePhoto(cropImage, croppedAreaPixelsRef.current);
      const saved = await saveProfilePhoto(cropped);
      syncPhoto(saved);
      setCropOpen(false);
      resetCropState();
      Swal.fire({ icon: 'success', title: 'Foto actualizada', timer: 1600, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.message || 'No se pudo guardar la foto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setMenuOpen(false);
    const result = await Swal.fire({
      icon: 'question',
      title: 'Eliminar foto de perfil',
      text: 'Volverás a usar la imagen predeterminada.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      await saveProfilePhoto(null);
      syncPhoto(null);
      Swal.fire({ icon: 'success', title: 'Foto eliminada', timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || err.message || 'No se pudo eliminar la foto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-user-avatar-host" ref={hostRef}>
      <button
        type="button"
        className="dashboard-user-avatar-btn"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Opciones de foto de perfil"
        disabled={saving}
      >
        <img src={displaySrc} alt="" className={className} />
        <span className="dashboard-user-avatar-overlay" aria-hidden="true">
          <i className="bi bi-camera-fill" />
        </span>
      </button>

      {menuOpen ? (
        <div className="profile-photo-menu" role="menu">
          <button type="button" className="profile-photo-menu__item" role="menuitem" onClick={openFilePicker}>
            <i className="bi bi-camera me-2" aria-hidden="true" />
            Cambiar foto de perfil
          </button>
          {photo ? (
            <button
              type="button"
              className="profile-photo-menu__item profile-photo-menu__item--danger"
              role="menuitem"
              onClick={handleRemovePhoto}
            >
              <i className="bi bi-trash me-2" aria-hidden="true" />
              Eliminar foto
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="profile-photo-file-input"
        onChange={handleFileChange}
      />

      <Modal show={cropOpen} onHide={closeCropModal} centered size="lg" className="profile-photo-modal">
        <Modal.Header closeButton={!saving}>
          <Modal.Title>Recortar foto de perfil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cropImage ? (
            <>
              <div className="profile-photo-crop-area">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <label className="profile-photo-zoom-label" htmlFor="profile-photo-zoom">
                Ampliar imagen
              </label>
              <input
                id="profile-photo-zoom"
                type="range"
                className="form-range profile-photo-zoom-range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <p className="text-muted small mb-0 mt-2">
                Arrastre la imagen y use el control para ampliar. Solo la parte dentro del círculo se verá en su perfil.
              </p>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeCropModal} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSavePhoto} disabled={saving || !cropImage}>
            {saving ? 'Guardando…' : 'Guardar foto'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default UserProfileAvatar;
