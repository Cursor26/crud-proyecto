import { createContext, useContext } from 'react';

const PuedeEscribirContext = createContext({ puedeEscribir: true });

export function PuedeEscribirProvider({ children, puedeEscribir = true }) {
  return <PuedeEscribirContext.Provider value={{ puedeEscribir }}>{children}</PuedeEscribirContext.Provider>;
}

export function usePuedeEscribir() {
  return useContext(PuedeEscribirContext).puedeEscribir !== false;
}
