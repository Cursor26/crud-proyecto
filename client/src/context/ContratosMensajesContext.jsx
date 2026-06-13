import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Axios, { API_BASE } from '../axiosConfig';

const POLL_MS = 90000;

const ContratosMensajesContext = createContext({
  unreadCount: 0,
  panelOpen: false,
  mensajes: [],
  loading: false,
  clearing: false,
  openPanel: () => {},
  closePanel: () => {},
  refreshCount: () => {},
  limpiarBandeja: () => {},
  quitarMensaje: () => {},
});

export function ContratosMensajesProvider({ children, enabled = false }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await Axios.get(`${API_BASE}/contratos/mensajes/no-leidos`);
      setUnreadCount(Number(res.data?.no_leidos) || 0);
    } catch {
      /* ignorar errores de red puntuales */
    }
  }, [enabled]);

  const fetchMensajes = useCallback(async () => {
    const res = await Axios.get(`${API_BASE}/contratos/mensajes`);
    const list = Array.isArray(res.data?.mensajes) ? res.data.mensajes : [];
    setMensajes(list);
    setUnreadCount(Number(res.data?.no_leidos) ?? list.length);
    return list;
  }, []);

  const openPanel = useCallback(async () => {
    if (!enabled) return;
    setPanelOpen(true);
    setLoading(true);
    try {
      await fetchMensajes();
    } catch {
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchMensajes]);

  const limpiarBandeja = useCallback(async () => {
    if (!enabled || clearing) return;
    setClearing(true);
    try {
      const res = await Axios.post(`${API_BASE}/contratos/mensajes/marcar-leidos`, { todos: true });
      setMensajes([]);
      setUnreadCount(Number(res.data?.no_leidos) || 0);
    } catch {
      /* mantener lista si falla */
    } finally {
      setClearing(false);
    }
  }, [enabled, clearing]);

  const quitarMensaje = useCallback(async (eventId) => {
    const id = Number(eventId);
    if (!enabled || !id) return;
    setMensajes((prev) => prev.filter((m) => m.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await Axios.post(`${API_BASE}/contratos/mensajes/marcar-leidos`, { ids: [id] });
      setUnreadCount(Number(res.data?.no_leidos) ?? 0);
    } catch {
      try {
        await fetchMensajes();
      } catch {
        /* ignorar */
      }
    }
  }, [enabled, fetchMensajes]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      setMensajes([]);
      setPanelOpen(false);
      return undefined;
    }
    refreshCount();
    const id = window.setInterval(refreshCount, POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, refreshCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      panelOpen,
      mensajes,
      loading,
      clearing,
      openPanel,
      closePanel,
      refreshCount,
      limpiarBandeja,
      quitarMensaje,
    }),
    [unreadCount, panelOpen, mensajes, loading, clearing, openPanel, closePanel, refreshCount, limpiarBandeja, quitarMensaje]
  );

  return (
    <ContratosMensajesContext.Provider value={value}>
      {children}
    </ContratosMensajesContext.Provider>
  );
}

export function useContratosMensajes() {
  return useContext(ContratosMensajesContext);
}
