import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Axios, { API_BASE } from '../axiosConfig';

const POLL_MS = 90000;

const ContratosMensajesContext = createContext({
  unreadCount: 0,
  panelOpen: false,
  mensajes: [],
  loading: false,
  openPanel: () => {},
  closePanel: () => {},
  refreshCount: () => {},
});

export function ContratosMensajesProvider({ children, enabled = false }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const openPanel = useCallback(async () => {
    if (!enabled) return;
    setPanelOpen(true);
    setLoading(true);
    try {
      const res = await Axios.get(`${API_BASE}/contratos/mensajes`);
      const list = Array.isArray(res.data?.mensajes) ? res.data.mensajes : [];
      setMensajes(list);
      const markRes = await Axios.post(`${API_BASE}/contratos/mensajes/marcar-leidos`, { todos: true });
      setUnreadCount(Number(markRes.data?.no_leidos) || 0);
    } catch {
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

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
      openPanel,
      closePanel,
      refreshCount,
    }),
    [unreadCount, panelOpen, mensajes, loading, openPanel, closePanel, refreshCount]
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
