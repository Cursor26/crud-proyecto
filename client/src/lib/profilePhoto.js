import Axios from '../axiosConfig';

export const DEFAULT_PROFILE_PHOTO = '/images/usuario.png';
export const DEFAULT_LOGIN_LOGO = '/images/LOGOTIPO.png';
export const CROP_SOURCE_MAX_DIM = 1400;
export const CROP_OUTPUT_SIZE = 320;

function profilePhotoErrorMessage(err) {
  const status = err?.response?.status;
  if (status === 404) {
    return 'El servidor no tiene activa la función de foto de perfil. Reinicie el servidor (node index.js en la carpeta server) e intente de nuevo.';
  }
  return err?.response?.data?.message || err?.message || 'No se pudo guardar la foto.';
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('No se pudo cargar la imagen.')));
    image.src = url;
  });
}

export function readImageFileAsDataUrl(file, maxDim = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Seleccione una imagen válida (JPG, PNG o WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height, 1));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export async function getCroppedProfilePhoto(imageSrc, pixelCrop, outputSize = CROP_OUTPUT_SIZE) {
  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo recortar la imagen.');

  canvas.width = outputSize;
  canvas.height = outputSize;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas.toDataURL('image/jpeg', 0.88);
}

export async function fetchProfilePhoto() {
  const res = await Axios.get('/user/profile-photo');
  const foto = res.data?.fotoPerfil;
  return foto && typeof foto === 'string' ? foto : null;
}

export async function saveProfilePhoto(fotoPerfil) {
  try {
    const res = await Axios.put('/user/profile-photo', { fotoPerfil: fotoPerfil || null });
    const foto = res.data?.fotoPerfil;
    return foto && typeof foto === 'string' ? foto : null;
  } catch (err) {
    const wrapped = new Error(profilePhotoErrorMessage(err));
    wrapped.cause = err;
    throw wrapped;
  }
}

