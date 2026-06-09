import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';

export function useMailServiceStatus(enabled = true) {
  const [status, setStatus] = useState({
    smtp_disponible: true,
    mensaje: null,
    correos_pendientes: 0,
    loading: true,
  });

  const refresh = useCallback(() => {
    if (!enabled) {
      setStatus({ smtp_disponible: true, mensaje: null, correos_pendientes: 0, loading: false });
      return Promise.resolve();
    }
    return Axios.get(`${API_BASE}/config/correo/estado`)
      .then((res) => {
        setStatus({
          smtp_disponible: res.data?.smtp_disponible !== false,
          mensaje: res.data?.mensaje || null,
          correos_pendientes: Number(res.data?.correos_pendientes) || 0,
          loading: false,
        });
      })
      .catch(() => {
        setStatus({ smtp_disponible: true, mensaje: null, correos_pendientes: 0, loading: false });
      });
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return undefined;
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  return { ...status, refresh };
}
