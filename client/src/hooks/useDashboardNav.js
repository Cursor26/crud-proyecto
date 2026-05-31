import { useEffect } from 'react';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getInitialModuleKey, saveLastSection } from '../lib/appPreferences';

const SIDEBAR_RRHH_KEYS = new Set([
  'empleados', 'bajas-empleados', 'reporte-personal', 'cambios-cargo', 'reporte-consolidado',
  'vacaciones', 'turnos-trabajo', 'grupos-trabajo', 'sanciones', 'reconocimientos', 'jubilaciones',
  'asistencias', 'certificaciones', 'cursos', 'evalcapacitacion', 'evaluaciones', 'objetivos',
  'salarios', 'segseguridad', 'seguridad', 'cargos', 'departamentos', 'cert-medicos', 'eval-medicas',
]);
const SIDEBAR_CONTRATOS_KEYS = new Set([
  'contratos-resumen', 'contratos-lista', 'contratos-vencimientos', 'contratos-renovaciones',
  'contratos-reportes', 'contratos-archivo',
]);
const SIDEBAR_PROD_KEYS = new Set(['sacrificio', 'matadero', 'leche', 'produccion-historico']);

function getDefaultKeyForRol(rol) {
  if (rol === 'admin') return 'usuarios';
  if (rol === 'contratacion') return 'contratos-resumen';
  if (rol === 'rrhh') return 'empleados';
  if (rol === 'estadistica' || rol === 'produccion') return 'sacrificio';
  if (rol === 'director') return 'produccion-historico';
  return '';
}

export function sidebarOpenForKey(key, pinSubmenus) {
  if (pinSubmenus) return 'all';
  if (SIDEBAR_RRHH_KEYS.has(key)) return 'rrhh';
  if (SIDEBAR_CONTRATOS_KEYS.has(key)) return 'contratos';
  if (SIDEBAR_PROD_KEYS.has(key)) return 'prod';
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
    preferences.defaultModule,
    preferences.rememberSection,
    preferences.pinSubmenus,
    preferences,
    allowedKeys,
    setKey,
    setSidebarMenuOpen,
  ]);

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
