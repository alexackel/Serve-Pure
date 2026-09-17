import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { discoverAiOrgs, type AiDiscoveredOrg } from '@/data/ai-orgs';
import { useUserLocation } from '@/hooks/use-user-location';

export type AiDiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error';

type AiDiscoveryContextValue = {
  orgs: AiDiscoveredOrg[];
  status: AiDiscoveryStatus;
  metroId: string | null;
  refetch: () => void;
};

const AiDiscoveryContext = createContext<AiDiscoveryContextValue | null>(null);

// Kicks off the "check bucket -> search if needed" flow once per app
// session, as soon as the user is signed in and their location resolves —
// well before they'd ever tap the Find page's AI Discovered tab. That tab
// just reads this shared state instead of fetching on its own, so a cache
// hit costs it nothing and a fresh search is usually already done by the
// time they get there.
export function AiDiscoveryProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { latitude, longitude, loading: locationLoading } = useUserLocation();
  const [orgs, setOrgs] = useState<AiDiscoveredOrg[]>([]);
  const [status, setStatus] = useState<AiDiscoveryStatus>('idle');
  const [metroId, setMetroId] = useState<string | null>(null);
  const firedRef = useRef(false);

  const runDiscovery = useCallback((lat: number, lng: number) => {
    setStatus('loading');
    discoverAiOrgs(lat, lng)
      .then((result) => {
        setOrgs(result.orgs);
        setMetroId(result.metroId);
        setStatus('ready');
      })
      .catch((error) => {
        console.error('Failed to discover AI orgs', error);
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!session || locationLoading || latitude === null || longitude === null || firedRef.current) return;
    firedRef.current = true;
    runDiscovery(latitude, longitude);
  }, [session, locationLoading, latitude, longitude, runDiscovery]);

  const refetch = useCallback(() => {
    if (latitude === null || longitude === null) return;
    runDiscovery(latitude, longitude);
  }, [latitude, longitude, runDiscovery]);

  const value = useMemo(() => ({ orgs, status, metroId, refetch }), [orgs, status, metroId, refetch]);

  return <AiDiscoveryContext.Provider value={value}>{children}</AiDiscoveryContext.Provider>;
}

export function useAiDiscovery() {
  const context = useContext(AiDiscoveryContext);
  if (!context) {
    throw new Error('useAiDiscovery must be used within an AiDiscoveryProvider');
  }
  return context;
}
