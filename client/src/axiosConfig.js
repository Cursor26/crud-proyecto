import Axios from 'axios';
import Swal from 'sweetalert2';

const base = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
export const API_BASE = base;
Axios.defaults.baseURL = base;

export default Axios;

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

Axios.interceptors.request.use((config) => {
  try {
    if (config.method) {
      const m = String(config.method).toLowerCase();
      if (!['get', 'head', 'options'].includes(m) && !usuarioPuedeEscribir()) {
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
