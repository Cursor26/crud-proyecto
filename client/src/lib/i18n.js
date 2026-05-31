const STRINGS = {
  es: {
    configTitle: 'Configuración de la aplicación',
    configButton: 'Configuración',
    logout: 'Cerrar sesión',
    welcome: 'Bienvenido',
    users: 'Usuarios',
    mailSystem: 'Correo del sistema',
    contracts: 'Contratación',
    hr: 'Rec. Humanos',
    stats: 'Estadística',
    readOnly: 'Modo solo consulta: podés revisar la información; no podés crear, editar ni eliminar registros.',
    savePrefs: 'Guardar en servidor',
    prefsSynced: 'Preferencias sincronizadas',
    prefsSyncError: 'No se pudieron sincronizar las preferencias',
  },
  en: {
    configTitle: 'Application settings',
    configButton: 'Settings',
    logout: 'Sign out',
    welcome: 'Welcome',
    users: 'Users',
    mailSystem: 'System mail',
    contracts: 'Contracts',
    hr: 'Human Resources',
    stats: 'Statistics',
    readOnly: 'Read-only mode: you can view information but cannot create, edit or delete records.',
    savePrefs: 'Save to server',
    prefsSynced: 'Preferences synced',
    prefsSyncError: 'Could not sync preferences',
  },
};

export function t(lang, key) {
  const code = lang === 'en' ? 'en' : 'es';
  return STRINGS[code][key] || STRINGS.es[key] || key;
}

export const LANGUAGE_OPTIONS = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
];
