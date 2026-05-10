import Axios from 'axios';
import Swal from 'sweetalert2';

const base = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
Axios.defaults.baseURL = base;

Axios.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    if (u && u.rol === 'director' && config.method) {
      const m = String(config.method).toLowerCase();
      if (!['get', 'head', 'options'].includes(m)) {
        Swal.fire({
          icon: 'info',
          title: 'Solo consulta',
          text: 'Tu rol (director) no puede modificar datos en el sistema.',
        });
        return Promise.reject(new Error('ROL_LECTURA_DIRECTOR'));
      }
    }
  } catch (_) {
    /* ignore */
  }
  return config;
});
