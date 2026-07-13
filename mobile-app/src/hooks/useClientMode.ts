import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ClientModeContextValue {
  isConsultantMode: boolean;
  toggleMode: () => void;
  activeClient: string | null;
  setActiveClient: (client: string | null) => void;
}

export const ClientModeContext = createContext<ClientModeContextValue>({
  isConsultantMode: false,
  toggleMode: () => {},
  activeClient: null,
  setActiveClient: () => {},
});

export function useClientMode(): ClientModeContextValue {
  return useContext(ClientModeContext);
}

export function useClientModeState(): ClientModeContextValue {
  const [isConsultantMode, setIsConsultantMode] = useState(false);
  const [activeClient, setActiveClient] = useState<string | null>(null);

  const toggleMode = useCallback(() => {
    setIsConsultantMode((prev) => {
      if (prev) {
        // Switching back to business mode — clear client
        setActiveClient(null);
      }
      return !prev;
    });
  }, []);

  return { isConsultantMode, toggleMode, activeClient, setActiveClient };
}
