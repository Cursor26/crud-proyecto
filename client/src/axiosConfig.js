import Axios from 'axios';
import Swal from 'sweetalert2';

const base = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
export const API_BASE = base;
Axios.defaults.baseURL = base;

export default Axios;

/** Mensaje legible para errores de API (incluye «Network Error» cuando el servidor no responde). */
export function getApiErrorMessage(err, fallback = 'Error de comunicación con el servidor.') {
  if (!err) return fallback;
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return `No se pudo conectar con el servidor (${API_BASE}). Compruebe que esté en marcha (node index.js en la carpeta server) y recargue la página.`;
  }
  if (err.message === 'ROL_SIN_ESCRITURA') {
    return 'Tu rol no tiene permiso para modificar datos en el sistema.';
  }
  return err.response?.data?.message || err.message || fallback;
}

function usuarioPuedeEscribir() {
  try {
    const raw = localStorage.getItem('permisos');
    if (!raw) return true;
    const perms = JSON.parse(raw);
    return Object.values(perms || {}).some(
      (m) => m?.create || m?.edit || m?.delete || m?.approve
    );
  } catch {
    return true;
  }
}

function esRutaAutogestionUsuario(url) {
  const path = String(url || '');
  return (
    path.includes('/user/profile') ||
    path.includes('/user/change-password') ||
    path.includes('/user/profile-photo') ||
    path.includes('/user/preferences') ||
    path.includes('/auth/logout')
  );
}

Axios.interceptors.request.use((config) => {
  try {
    if (config.method) {
      const m = String(config.method).toLowerCase();
      if (
        !['get', 'head', 'options'].includes(m) &&
        !usuarioPuedeEscribir() &&
        !esRutaAutogestionUsuario(config.url)
      ) {
        Swal.fire({
          icon: 'info',
          title: 'Solo consulta',
          text: 'Tu rol no tiene permiso para modificar datos en el sistema.',
        });
        return Promise.reject(new Error('ROL_SIN_ESCRITURA'));
      }
    }
  } catch (_) {
    /* ignore */
  }
  return config;
});

let sesionExpiradaDialogo = false;

Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const msg = String(error?.response?.data?.message || '');
    const tokenInvalido =
      (status === 403 || status === 401) &&
      /token|expirado|expired|denegado/i.test(msg);

    if (tokenInvalido && !sesionExpiradaDialogo) {
      sesionExpiradaDialogo = true;
      Swal.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        text: 'Su token de acceso caducó o ya no es válido. Vuelva a iniciar sesión.',
        confirmButtonText: 'Ir al login',
        allowOutsideClick: false,
      }).then(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permisos');
        delete Axios.defaults.headers.common.Authorization;
        window.location.reload();
      });
    }

    return Promise.reject(error);
  }
);
