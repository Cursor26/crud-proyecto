import { useEffect } from 'react';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getInitialModuleKey, saveLastSection } from '../lib/appPreferences';

const SIDEBAR_CONTRATOS_KEYS = new Set([
  'contratos-resumen', 'contratos-lista', 'contratos-rechazados', 'contratos-verificar', 'contratos-pendientes',
  'contratos-vencimientos',
  'contratos-renovaciones', 'contratos-correo', 'contratos-reportes', 'contratos-archivo', 'contratos-tipos',
  'contratos-auditoria',
]);

function getDefaultKeyForRol(rol) {
  if (rol === 'admin') return 'usuarios';
  if (rol === 'contratacion') return 'contratos-resumen';
  if (rol === 'director') return 'contratos-resumen';
  if (rol === 'abogado') return 'contratos-resumen';
  return '';
}

export function sidebarOpenForKey(key, pinSubmenus) {
  if (pinSubmenus) return 'all';
  if (SIDEBAR_CONTRATOS_KEYS.has(key)) return 'contratos';
  return null;
}

export function NavPrefsInitializer({ user, allowedKeys, setKey, setSidebarMenuOpen }) {
  const { preferences } = useAppPreferences();

  useEffect(() => {
    if (!user?.rol) return;
    const initial = getInitialModuleKey(
      preferences,
      user.rol,
      allowedKeys,
      getDefaultKeyForRol(user.rol),
      user.email
    );
    setKey(initial);
    setSidebarMenuOpen(sidebarOpenForKey(initial, preferences.pinSubmenus));
  }, [
    user?.email,
    user?.rol,
    allowedKeys,
    setKey,
    setSidebarMenuOpen,
  ]);

  return null;
}

/** Abre o cierra submenús al cambiar «Mantener submenús…» o la sección activa. */
export function PinSubmenusSync({ navKey, setSidebarMenuOpen }) {
  const { preferences } = useAppPreferences();

  useEffect(() => {
    if (preferences.pinSubmenus) {
      setSidebarMenuOpen('all');
      return;
    }
    setSidebarMenuOpen(sidebarOpenForKey(navKey, false));
  }, [preferences.pinSubmenus, navKey, setSidebarMenuOpen]);

  return null;
}

export function useDashboardNavHandlers({ user, setKey, setSidebarMenuOpen, baseNavSelect }) {
  const { preferences } = useAppPreferences();

  const handleNavSelect = (selectedKey) => {
    setKey(selectedKey);
    if (preferences.rememberSection && user?.email) {
      saveLastSection(user.email, selectedKey);
    }
    if (preferences.pinSubmenus) {
      setSidebarMenuOpen('all');
    } else {
      baseNavSelect(selectedKey);
    }
  };

  const dropdownShow = (menu, sidebarMenuOpen) =>
    preferences.pinSubmenus || sidebarMenuOpen === 'all' || sidebarMenuOpen === menu;

  return { handleNavSelect, dropdownShow, preferences };
}
