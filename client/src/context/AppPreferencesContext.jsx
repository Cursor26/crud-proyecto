import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import {
  DEFAULT_PREFERENCES,
  applyPreferencesToDocument,
  loadStoredPreferences,
  mergePreferencesFromServer,
  normalizePreferences,
  resolvePreferences,
  saveStoredPreferences,
} from '../lib/appPreferences';

const AppPreferencesContext = createContext(null);

export function AppPreferencesProvider({ userEmail, children }) {
  const email = String(userEmail || '').trim().toLowerCase();
  const [preferences, setPreferences] = useState(() => loadStoredPreferences(email));
  const [syncState, setSyncState] = useState('idle');
  const syncTimer = useRef(null);
  const loadedRemote = useRef(false);

  const syncToServer = useCallback(
    async (prefs) => {
      if (!email) return;
      setSyncState('syncing');
      try {
        await Axios.put(`${API_BASE}/user/preferences`, { preferences: prefs });
        setSyncState('synced');
      } catch (_) {
        setSyncState('error');
      }
    },
    [email]
  );

  const scheduleSync = useCallback(
    (prefs) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => syncToServer(prefs), 900);
    },
    [syncToServer]
  );

  useEffect(() => {
    let cancelled = false;
    loadedRemote.current = false;
    const local = loadStoredPreferences(email);
    setPreferences(local);
    applyPreferencesToDocument(local);

    if (!email) return undefined;

    (async () => {
      try {
        const res = await Axios.get(`${API_BASE}/user/preferences`);
        if (cancelled) return;
        const remote = res.data?.preferences;
        if (remote) {
          const merged = mergePreferencesFromServer(local, remote);
          setPreferences(merged);
          saveStoredPreferences(email, merged);
          applyPreferencesToDocument(merged);
        }
        loadedRemote.current = true;
        setSyncState('synced');
      } catch (_) {
        if (!cancelled) setSyncState('local');
      }
    })();

    return () => {
      cancelled = true;
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [email]);

  useEffect(() => {
    applyPreferencesToDocument(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!email || !loadedRemote.current) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (preferences.autoTheme) applyPreferencesToDocument(preferences);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [email, preferences]);

  const updatePreference = useCallback(
    (key, value) => {
      setPreferences((prev) => {
        const next = normalizePreferences({ ...prev, [key]: value });
        if (email) saveStoredPreferences(email, next);
        scheduleSync(next);
        return next;
      });
    },
    [email, scheduleSync]
  );

  const updatePreferences = useCallback(
    (patch) => {
      setPreferences((prev) => {
        const next = normalizePreferences({ ...prev, ...patch });
        if (email) saveStoredPreferences(email, next);
        scheduleSync(next);
        return next;
      });
    },
    [email, scheduleSync]
  );

  const resetPreferences = useCallback(() => {
    const next = normalizePreferences({ ...DEFAULT_PREFERENCES, themeId: 'institutional' });
    setPreferences(next);
    applyPreferencesToDocument(next);
    if (email) {
      saveStoredPreferences(email, next);
      scheduleSync(next);
    }
  }, [email, scheduleSync]);

  const syncNow = useCallback(async () => {
    await syncToServer(preferences);
  }, [preferences, syncToServer]);

  const resolved = useMemo(() => resolvePreferences(preferences), [preferences]);

  const value = useMemo(
    () => ({
      preferences,
      resolved,
      syncState,
      updatePreference,
      updatePreferences,
      resetPreferences,
      syncNow,
    }),
    [preferences, resolved, syncState, updatePreference, updatePreferences, resetPreferences, syncNow]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error('useAppPreferences debe usarse dentro de AppPreferencesProvider');
  }
  return ctx;
}
