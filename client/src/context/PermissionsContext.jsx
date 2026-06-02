import { createContext, useContext, useMemo, useCallback } from 'react';
import { canPermission, hasAnyPermission } from '../lib/rbacModules';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children, permisos = null, legacyCan = null }) {
  const can = useCallback(
    (module, action) => {
      if (permisos == null) {
        return legacyCan ? legacyCan(module, action) : true;
      }
      if (!hasAnyPermission(permisos)) {
        return legacyCan ? legacyCan(module, action) : true;
      }
      return canPermission(permisos, module, action);
    },
    [permisos, legacyCan]
  );

  const puedeEscribir = useMemo(() => {
    if (!permisos) return true;
    return Object.values(permisos).some(
      (m) => m?.create || m?.edit || m?.delete || m?.approve
    );
  }, [permisos]);

  const value = useMemo(
    () => ({ permisos, can, puedeEscribir }),
    [permisos, can, puedeEscribir]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    return {
      permisos: null,
      can: () => true,
      puedeEscribir: true,
    };
  }
  return ctx;
}
