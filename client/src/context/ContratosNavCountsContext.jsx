import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ContratosNavCountsContext = createContext({
  rechazados: 0,
  verificar: 0,
  pendientes: 0,
  setNavCounts: () => {},
});

export function ContratosNavCountsProvider({ children }) {
  const [counts, setCounts] = useState({
    rechazados: 0,
    verificar: 0,
    pendientes: 0,
  });

  const setNavCounts = useCallback((partial) => {
    setCounts((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(
    () => ({
      rechazados: counts.rechazados,
      verificar: counts.verificar,
      pendientes: counts.pendientes,
      setNavCounts,
    }),
    [counts, setNavCounts]
  );

  return (
    <ContratosNavCountsContext.Provider value={value}>
      {children}
    </ContratosNavCountsContext.Provider>
  );
}

export function useContratosNavCounts() {
  return useContext(ContratosNavCountsContext);
}

export function contratosSidebarBadgeCount(sectionId, counts) {
  if (sectionId === 'rechazados') return Number(counts?.rechazados) || 0;
  if (sectionId === 'verificar') return Number(counts?.verificar) || 0;
  if (sectionId === 'pendientes') return Number(counts?.pendientes) || 0;
  return 0;
}
