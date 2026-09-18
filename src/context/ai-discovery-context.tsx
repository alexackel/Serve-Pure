import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { discoverAiOrgs, reportAiOrg, unreportAiOrg, type AiDiscoveredOrg } from '@/data/ai-orgs';
import { useUserLocation } from '@/hooks/use-user-location';

export type AiDiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error';

type AiDiscoveryContextValue = {
  orgs: AiDiscoveredOrg[];
  status: AiDiscoveryStatus;
  metroId: string | null;
  refetch: () => void;
  reportedIds: Set<string>;
  reportOrg: (orgId: string) => Promise<void>;
  unreportOrg: (orgId: string) => Promise<void>;
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
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
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

  // Keeps each org's flaggedCount in sync locally on report/undo, since
  // there's no refetch to pick up the server-side count (see refetch above
  // — orgs are fetched once per app session, on purpose, to keep the
  // discover-ai-orgs edge function's Brave/Haiku/Mapbox calls near-$0).
  // Floored at 0 defensively, though fn_unflag_ai_org already floors server-side.
  const adjustFlaggedCount = useCallback((orgId: string, delta: number) => {
    setOrgs((prev) =>
      prev.map((org) => (org.id === orgId ? { ...org, flaggedCount: Math.max(org.flaggedCount + delta, 0) } : org)),
    );
  }, []);

  // Optimistic add, rolled back on failure — shared by the AI Discovered
  // card list and the org detail screen so both reflect the same "did I
  // report this" state instantly.
  const reportOrg = useCallback(
    (orgId: string) => {
      setReportedIds((prev) => {
        if (prev.has(orgId)) return prev;
        const next = new Set(prev);
        next.add(orgId);
        return next;
      });
      adjustFlaggedCount(orgId, 1);
      return reportAiOrg(orgId).catch((error) => {
        setReportedIds((prev) => {
          const next = new Set(prev);
          next.delete(orgId);
          return next;
        });
        adjustFlaggedCount(orgId, -1);
        throw error;
      });
    },
    [adjustFlaggedCount],
  );

  // Undoes a report from the Reported Posts screen — same optimistic/
  // rollback shape as reportOrg, in the opposite direction.
  const unreportOrg = useCallback(
    (orgId: string) => {
      setReportedIds((prev) => {
        if (!prev.has(orgId)) return prev;
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
      adjustFlaggedCount(orgId, -1);
      return unreportAiOrg(orgId).catch((error) => {
        setReportedIds((prev) => {
          const next = new Set(prev);
          next.add(orgId);
          return next;
        });
        adjustFlaggedCount(orgId, 1);
        throw error;
      });
    },
    [adjustFlaggedCount],
  );

  const value = useMemo(
    () => ({ orgs, status, metroId, refetch, reportedIds, reportOrg, unreportOrg }),
    [orgs, status, metroId, refetch, reportedIds, reportOrg, unreportOrg],
  );

  return <AiDiscoveryContext.Provider value={value}>{children}</AiDiscoveryContext.Provider>;
}

export function useAiDiscovery() {
  const context = useContext(AiDiscoveryContext);
  if (!context) {
    throw new Error('useAiDiscovery must be used within an AiDiscoveryProvider');
  }
  return context;
}
