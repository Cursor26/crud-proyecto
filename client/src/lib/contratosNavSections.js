/** Orden unificado: menú lateral y pestañas superiores de Contratación */

export const CONTRATOS_MENU_SECTIONS = [

  { id: 'resumen', key: 'contratos-resumen', icon: 'bi-speedometer2', label: 'Resumen ejecutivo' },

  { id: 'contratos', key: 'contratos-lista', icon: 'bi-table', label: 'Contratos' },

  {
    id: 'rechazados',
    key: 'contratos-rechazados',
    icon: 'bi-shield-exclamation',
    label: 'Contratos rechazados',
  },

  {
    id: 'verificar',
    key: 'contratos-verificar',
    icon: 'bi-shield-check',
    label: 'Verificar contrato',
  },

  { id: 'pendientes', key: 'contratos-pendientes', icon: 'bi-check2-circle', label: 'Aprobar contrato' },

  { id: 'renovaciones', key: 'contratos-renovaciones', icon: 'bi-arrow-repeat', label: 'Renovaciones' },

  {

    id: 'correo',

    key: 'contratos-correo',

    icon: 'bi-envelope-at',

    label: 'Correo',

    requiresContratosEdit: true,

  },

  { id: 'reportes', key: 'contratos-reportes', icon: 'bi-bar-chart-line', label: 'Reportes' },

  { id: 'auditoria', key: 'contratos-auditoria', icon: 'bi-journal-text', label: 'Auditoría' },

  { id: 'archivo', key: 'contratos-archivo', icon: 'bi-archive', label: 'Archivo histórico' },

  { id: 'vencimientos', key: 'contratos-vencimientos', icon: 'bi-calendar2-week', label: 'Vencimientos', hiddenVisual: true },

];



export const CONTRATOS_TAB_SECTION_IDS = CONTRATOS_MENU_SECTIONS.filter((s) => s.id !== 'vencimientos').map(

  (s) => s.id

);



export const CONTRATOS_SECTION_TO_KEY = Object.fromEntries(

  CONTRATOS_MENU_SECTIONS.map((section) => [section.id, section.key])

);



export const CONTRATOS_KEY_TO_SECTION = Object.fromEntries([

  ...CONTRATOS_MENU_SECTIONS.map((section) => [section.key, section.id]),

  ['contratos', 'contratos'],

]);



export const CONTRATOS_SIDEBAR_NAV_ITEMS = CONTRATOS_MENU_SECTIONS.map(({ id, key, icon, label, hiddenVisual }) => ({

  eventKey: key,

  icon,

  label,

  hiddenVisual,

  sectionId: id,

}));



/** ¿El usuario puede abrir esta sección de Contratación? */

export function canAccessContratosSection(sectionId, canFn) {

  const section = CONTRATOS_MENU_SECTIONS.find((s) => s.id === sectionId);

  if (!section || !canFn('contratos', 'view')) return false;

  if (section.requiresContratosEdit) {
    return canFn('contratos', 'edit') || canFn('contratos', 'view');
  }

  return true;

}



export function filterContratosMenuSections(canFn) {

  return CONTRATOS_MENU_SECTIONS.filter((s) => canAccessContratosSection(s.id, canFn));

}



export function getContratosTabSectionIds(canFn) {

  return filterContratosMenuSections(canFn)

    .filter((s) => s.id !== 'vencimientos')

    .map((s) => s.id);

}



export function getContratosSidebarNavItems(canFn) {

  return filterContratosMenuSections(canFn)

    .filter((s) => !s.hiddenVisual)

    .map(({ id, key, icon, label, hiddenVisual }) => ({

      eventKey: key,

      icon,

      label,

      hiddenVisual,

      sectionId: id,

    }));

}



export function getContratosAllowedNavKeys(canFn) {

  const keys = new Set(['contratos']);

  getContratosSidebarNavItems(canFn).forEach((item) => keys.add(item.eventKey));

  return keys;

}



export function firstAllowedContratosSection(canFn) {

  const tabs = getContratosTabSectionIds(canFn);

  return tabs[0] || 'contratos';

}



export function contratosNavKeyAllowed(navKey, canFn) {

  if (!canFn('contratos', 'view')) return false;

  if (navKey === 'contratos') return true;

  const sectionId = CONTRATOS_KEY_TO_SECTION[navKey];

  if (!sectionId) return false;

  return canAccessContratosSection(sectionId, canFn);

}

/** Etiquetas estáticas para pestañas superiores (sin contadores). */
export const CONTRATOS_SECTION_LABELS = Object.fromEntries(
  CONTRATOS_MENU_SECTIONS.map((section) => [section.id, section.label])
);

/** Iconos Bootstrap (mismos que el menú lateral). */
export const CONTRATOS_SECTION_ICONS = Object.fromEntries(
  CONTRATOS_MENU_SECTIONS.map((section) => [section.id, section.icon])
);


