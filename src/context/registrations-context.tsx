import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const SEEDED_REGISTERED_EVENT_IDS = ['riverside-park-cleanup', 'senior-center-tech-help'];

type RegistrationsContextValue = {
  isRegistered: (eventId: string) => boolean;
  register: (eventId: string) => void;
  unregister: (eventId: string) => void;
};

const RegistrationsContext = createContext<RegistrationsContextValue | null>(null);

export function RegistrationsProvider({ children }: { children: ReactNode }) {
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(() => new Set(SEEDED_REGISTERED_EVENT_IDS));

  const register = useCallback((eventId: string) => {
    setRegisteredIds((current) => new Set(current).add(eventId));
  }, []);

  const unregister = useCallback((eventId: string) => {
    setRegisteredIds((current) => {
      const next = new Set(current);
      next.delete(eventId);
      return next;
    });
  }, []);

  const isRegistered = useCallback((eventId: string) => registeredIds.has(eventId), [registeredIds]);

  const value = useMemo(() => ({ isRegistered, register, unregister }), [isRegistered, register, unregister]);

  return <RegistrationsContext.Provider value={value}>{children}</RegistrationsContext.Provider>;
}

export function useRegistrations() {
  const context = useContext(RegistrationsContext);
  if (!context) {
    throw new Error('useRegistrations must be used within a RegistrationsProvider');
  }
  return context;
}
