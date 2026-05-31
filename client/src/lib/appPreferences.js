import {
  CONTRATOS_LIST_COLUMNS,
  EMPLEADOS_LIST_COLUMNS,
  defaultVisibleColumnIds,
  normalizeVisibleColumns,
} from './columnDefinitions';

export const PREFS_VERSION = 2;
export const PREFS_STORAGE_PREFIX = 'app_preferences_v1';
export const LAST_SECTION_PREFIX = 'app_last_section_v1';

export const DEFAULT_PREFERENCES = {
  themeId: 'institutional',
  fontFamily: 'system',
  fontSize: 'medium',
  borderRadius: 'sharp',
  backgroundColor: '',
  textColor: '',
  surfaceColor: '',
  accentColor: '',
  mutedTextColor: '',
  sidebarTone: 'dark',
  sidebarWidth: 'normal',
  uiScale: 'compact',
  autoTheme: false,
  compactMode: false,
  reduceMotion: false,
  highContrast: false,
  defaultModule: '',
  rememberSection: true,
  sidebarCollapsed: false,
  pinSubmenus: false,
  dateFormat: 'dmy',
  timeFormat: '24',
  visibleColumns: {
    contratos: defaultVisibleColumnIds(CONTRATOS_LIST_COLUMNS),
    empleados: defaultVisibleColumnIds(EMPLEADOS_LIST_COLUMNS),
  },
  language: 'es',
  confirmBeforeDelete: true,
  lineHeight: 'normal',
  underlineLinks: false,
  largeClickTargets: false,
};

export const THEME_PRESETS = {
  institutional: {
    id: 'institutional',
    label: 'Institucional AEPG',
    description: 'Gris corporativo con acentos rojos (predeterminado)',
    swatch: ['#b8b8b8', '#1c1c1c', '#b91c1c'],
    vars: {
      '--dashboard-bg': '#b8b8b8',
      '--dashboard-surface': '#d6d6d6',
      '--dashboard-border': '#9f9f9f',
      '--dashboard-text': '#0f172a',
      '--dashboard-muted': '#30363d',
      '--brand-red': '#b91c1c',
      '--brand-red-deep': '#7f1d1d',
      '--brand-red-rgb': '185, 28, 28',
      '--ui-primary': '#007bff',
      '--ui-primary-deep': '#0069d9',
      '--ui-primary-rgb': '0, 123, 255',
    },
  },
  light: {
    id: 'light',
    label: 'Claro',
    description: 'Fondo claro y contraste suave',
    swatch: ['#f1f5f9', '#ffffff', '#2563eb'],
    vars: {
      '--dashboard-bg': '#eef2f7',
      '--dashboard-surface': '#ffffff',
      '--dashboard-border': '#cbd5e1',
      '--dashboard-text': '#0f172a',
      '--dashboard-muted': '#475569',
      '--brand-red': '#dc2626',
      '--brand-red-deep': '#991b1b',
      '--brand-red-rgb': '220, 38, 38',
      '--ui-primary': '#2563eb',
      '--ui-primary-deep': '#1d4ed8',
      '--ui-primary-rgb': '37, 99, 235',
    },
  },
  dark: {
    id: 'dark',
    label: 'Oscuro',
    description: 'Modo oscuro para entornos con poca luz',
    swatch: ['#0f172a', '#1e293b', '#38bdf8'],
    vars: {
      '--dashboard-bg': '#0f172a',
      '--dashboard-surface': '#1e293b',
      '--dashboard-border': '#334155',
      '--dashboard-text': '#e2e8f0',
      '--dashboard-muted': '#94a3b8',
      '--brand-red': '#f87171',
      '--brand-red-deep': '#ef4444',
      '--brand-red-rgb': '248, 113, 113',
      '--ui-primary': '#38bdf8',
      '--ui-primary-deep': '#0ea5e9',
      '--ui-primary-rgb': '56, 189, 248',
    },
  },
  ocean: {
    id: 'ocean',
    label: 'Océano',
    description: 'Azules fríos y superficies claras',
    swatch: ['#dbeafe', '#eff6ff', '#0284c7'],
    vars: {
      '--dashboard-bg': '#dbeafe',
      '--dashboard-surface': '#eff6ff',
      '--dashboard-border': '#93c5fd',
      '--dashboard-text': '#0c4a6e',
      '--dashboard-muted': '#0369a1',
      '--brand-red': '#0284c7',
      '--brand-red-deep': '#0369a1',
      '--brand-red-rgb': '2, 132, 199',
      '--ui-primary': '#0284c7',
      '--ui-primary-deep': '#0369a1',
      '--ui-primary-rgb': '2, 132, 199',
    },
  },
  forest: {
    id: 'forest',
    label: 'Bosque',
    description: 'Verdes suaves inspirados en el sector agropecuario',
    swatch: ['#dcfce7', '#f0fdf4', '#15803d'],
    vars: {
      '--dashboard-bg': '#dcfce7',
      '--dashboard-surface': '#f0fdf4',
      '--dashboard-border': '#86efac',
      '--dashboard-text': '#14532d',
      '--dashboard-muted': '#166534',
      '--brand-red': '#15803d',
      '--brand-red-deep': '#166534',
      '--brand-red-rgb': '21, 128, 61',
      '--ui-primary': '#15803d',
      '--ui-primary-deep': '#166534',
      '--ui-primary-rgb': '21, 128, 61',
    },
  },
};

export const FONT_FAMILIES = {
  system: {
    id: 'system',
    label: 'Sistema',
    stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  humanist: {
    id: 'humanist',
    label: 'Humanista',
    stack: "'Segoe UI', 'Trebuchet MS', 'Lucida Sans Unicode', sans-serif",
  },
  classic: {
    id: 'classic',
    label: 'Clásica',
    stack: "Georgia, 'Times New Roman', Times, serif",
  },
  mono: {
    id: 'mono',
    label: 'Monoespaciada',
    stack: "Consolas, 'Courier New', Courier, monospace",
  },
};

export const FONT_SIZES = {
  small: { id: 'small', label: 'Pequeña', scale: 0.92 },
  medium: { id: 'medium', label: 'Mediana', scale: 1 },
  large: { id: 'large', label: 'Grande', scale: 1.08 },
};

export const BORDER_RADIUS_OPTIONS = {
  sharp: { id: 'sharp', label: 'Cuadrado', value: '0' },
  soft: { id: 'soft', label: 'Suave', value: '0.45rem' },
  round: { id: 'round', label: 'Redondeado', value: '0.85rem' },
};

export const SIDEBAR_TONES = {
  dark: { id: 'dark', label: 'Oscuro' },
  charcoal: { id: 'charcoal', label: 'Carbón' },
  brand: { id: 'brand', label: 'Institucional rojo' },
};

export const SIDEBAR_WIDTH_OPTIONS = {
  narrow: { id: 'narrow', label: 'Estrecho', width: '220px' },
  normal: { id: 'normal', label: 'Normal', width: '280px' },
  wide: { id: 'wide', label: 'Ancho', width: '320px' },
};

export const UI_SCALE_OPTIONS = {
  compact: { id: 'compact', label: 'Compacta (80%)', zoom: 0.8 },
  reduced: { id: 'reduced', label: 'Reducida (90%)', zoom: 0.9 },
  normal: { id: 'normal', label: 'Normal (100%)', zoom: 1 },
  large: { id: 'large', label: 'Grande (110%)', zoom: 1.1 },
};

export const LINE_HEIGHT_OPTIONS = {
  normal: { id: 'normal', label: 'Normal', value: 1.45 },
  relaxed: { id: 'relaxed', label: 'Amplio', value: 1.75 },
};

function normalizeEmail(email) {
  return String(email || 'guest').trim().toLowerCase() || 'guest';
}

function mutedTextFromHex(hex) {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!match) return '';
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, 0.72)`;
}

function hexToRgbParts(hex) {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function mergePreferences(raw) {
  const merged = { ...DEFAULT_PREFERENCES, ...(raw || {}) };
  merged.visibleColumns = {
    contratos: normalizeVisibleColumns(raw?.visibleColumns?.contratos, CONTRATOS_LIST_COLUMNS),
    empleados: normalizeVisibleColumns(raw?.visibleColumns?.empleados, EMPLEADOS_LIST_COLUMNS),
  };
  return merged;
}

export function normalizePreferences(prefs) {
  return mergePreferences(prefs);
}

export function mergePreferencesFromServer(local, remote) {
  if (!remote || typeof remote !== 'object') return mergePreferences(local);
  return mergePreferences({
    ...local,
    ...remote,
    visibleColumns: {
      ...mergePreferences(local).visibleColumns,
      ...(remote.visibleColumns || {}),
    },
  });
}

export function getPreferencesStorageKey(email) {
  return `${PREFS_STORAGE_PREFIX}_${normalizeEmail(email)}`;
}

export function getLastSectionKey(email) {
  return `${LAST_SECTION_PREFIX}_${normalizeEmail(email)}`;
}

export function loadStoredPreferences(email) {
  try {
    const raw = localStorage.getItem(getPreferencesStorageKey(email));
    if (!raw) return mergePreferences(null);
    return mergePreferences(JSON.parse(raw));
  } catch {
    return mergePreferences(null);
  }
}

export function saveStoredPreferences(email, prefs) {
  localStorage.setItem(getPreferencesStorageKey(email), JSON.stringify(mergePreferences(prefs)));
}

export function saveLastSection(email, sectionKey) {
  if (!sectionKey) return;
  localStorage.setItem(getLastSectionKey(email), sectionKey);
}

export function loadLastSection(email) {
  return localStorage.getItem(getLastSectionKey(email)) || '';
}

export function getSystemThemeId() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolvePreferences(prefs) {
  const merged = mergePreferences(prefs);
  let effectiveThemeId = merged.themeId;
  if (merged.autoTheme) {
    effectiveThemeId = getSystemThemeId();
  }
  const theme = THEME_PRESETS[effectiveThemeId] || THEME_PRESETS.institutional;
  const font = FONT_FAMILIES[merged.fontFamily] || FONT_FAMILIES.system;
  const fontSize = FONT_SIZES[merged.fontSize] || FONT_SIZES.medium;
  const radius = BORDER_RADIUS_OPTIONS[merged.borderRadius] || BORDER_RADIUS_OPTIONS.sharp;
  const sidebarWidth = SIDEBAR_WIDTH_OPTIONS[merged.sidebarWidth] || SIDEBAR_WIDTH_OPTIONS.normal;
  const uiScale = UI_SCALE_OPTIONS[merged.uiScale] || UI_SCALE_OPTIONS.compact;
  const lineHeight = LINE_HEIGHT_OPTIONS[merged.lineHeight] || LINE_HEIGHT_OPTIONS.normal;
  return {
    ...merged,
    effectiveThemeId,
    theme,
    font,
    fontSize,
    radius,
    sidebarWidth,
    uiScale,
    lineHeight,
  };
}

export function applyPreferencesToDocument(prefs) {
  const resolved = resolvePreferences(prefs);
  const root = document.documentElement;
  const body = document.body;

  Object.entries(resolved.theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  const setHex = (key, value) => {
    if (value && /^#[0-9a-fA-F]{6}$/.test(value)) root.style.setProperty(key, value);
  };

  setHex('--dashboard-bg', resolved.backgroundColor);
  setHex('--dashboard-surface', resolved.surfaceColor);
  setHex('--dashboard-text', resolved.textColor);
  setHex('--dashboard-muted', resolved.mutedTextColor);

  if (resolved.textColor && !resolved.mutedTextColor) {
    const muted = mutedTextFromHex(resolved.textColor);
    if (muted) root.style.setProperty('--dashboard-muted', muted);
  }

  if (resolved.accentColor) {
    setHex('--ui-primary', resolved.accentColor);
    const rgb = hexToRgbParts(resolved.accentColor);
    if (rgb) root.style.setProperty('--ui-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }

  root.style.setProperty('--app-font-family', resolved.font.stack);
  root.style.setProperty('--app-font-scale', String(resolved.fontSize.scale));
  root.style.setProperty('--app-line-height', String(resolved.lineHeight.value));
  root.style.setProperty('--btn-win11-radius', resolved.radius.value);
  root.style.setProperty('--app-card-radius', resolved.radius.value);
  root.style.setProperty('--dashboard-sidebar-width', resolved.sidebarWidth.width);
  root.style.setProperty('--dashboard-ui-zoom', String(resolved.uiScale.zoom));

  root.dataset.appTheme = resolved.effectiveThemeId;
  root.dataset.appSidebarTone = resolved.sidebarTone;
  root.dataset.appFontSize = resolved.fontSize.id;
  root.dataset.appBorderRadius = resolved.borderRadius;
  root.dataset.appUiScale = resolved.uiScale.id;
  root.lang = resolved.language === 'en' ? 'en' : 'es';

  body.classList.toggle('app-compact', Boolean(resolved.compactMode));
  body.classList.toggle('app-reduce-motion', Boolean(resolved.reduceMotion));
  body.classList.toggle('app-high-contrast', Boolean(resolved.highContrast));
  body.classList.toggle('app-underline-links', Boolean(resolved.underlineLinks));
  body.classList.toggle('app-large-click', Boolean(resolved.largeClickTargets));
  body.classList.toggle('app-sidebar-collapsed', Boolean(resolved.sidebarCollapsed));
  body.classList.toggle('app-pin-submenus', Boolean(resolved.pinSubmenus));
}

export function getStoredUserEmail() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.email || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function getInitialModuleKey(prefs, rol, allowedKeys, roleDefaultKey, email) {
  const merged = mergePreferences(prefs);
  if (merged.rememberSection && email) {
    const last = loadLastSection(email);
    if (last && allowedKeys.has(last)) return last;
  }
  if (merged.defaultModule && allowedKeys.has(merged.defaultModule)) return merged.defaultModule;
  return roleDefaultKey;
}

export function isColumnVisible(preferences, tableId, columnId) {
  const cols = preferences?.visibleColumns?.[tableId];
  if (!Array.isArray(cols)) return true;
  return cols.includes(columnId);
}

export function toggleColumnVisibility(preferences, tableId, columnId, definitions) {
  const current = normalizeVisibleColumns(preferences?.visibleColumns?.[tableId], definitions);
  const def = definitions.find((c) => c.id === columnId);
  if (def?.locked) return current;
  const next = current.includes(columnId)
    ? current.filter((id) => id !== columnId)
    : [...current, columnId];
  return normalizeVisibleColumns(next, definitions);
}

export { CONTRATOS_LIST_COLUMNS, EMPLEADOS_LIST_COLUMNS };
