import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export type ViewMode = 'personal' | 'organization';

export type Organization = { id: string; name: string };

/** @deprecated use Organization — kept as an alias until org-history-context drops this import. */
export type MockOrganization = Organization;

type OrganizationContextValue = {
  viewMode: ViewMode;
  organizations: Organization[];
  activeOrganization: Organization | null;
  isLoading: boolean;
  switchToPersonal: () => void;
  switchToOrganization: (organizationId: string) => void;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

type OrgAdminRow = { organizations: Organization | null };

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>('personal');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session) {
        if (!cancelled) {
          setOrganizations([]);
          setIsLoading(false);
        }
        return;
      }

      // "Organizations I admin" is the only org<->user relationship in this
      // schema — there's no separate general-membership concept.
      const { data, error } = await supabase.from('org_admins').select('organizations(id, name)').eq('user_id', session.user.id);

      if (cancelled) return;
      if (error) {
        console.error('Failed to load organizations', error);
      } else {
        const orgs = ((data ?? []) as unknown as OrgAdminRow[])
          .map((row) => row.organizations)
          .filter((org): org is Organization => org !== null);
        setOrganizations(orgs);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const switchToPersonal = useCallback(() => setViewMode('personal'), []);

  const switchToOrganization = useCallback((organizationId: string) => {
    setActiveOrganizationId(organizationId);
    setViewMode('organization');
  }, []);

  // Unlike the mock version, a user can admin zero organizations — no
  // "Create Organization" flow exists yet, so activeOrganization can be null.
  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? organizations[0] ?? null,
    [organizations, activeOrganizationId],
  );

  const value = useMemo(
    () => ({ viewMode, organizations, activeOrganization, isLoading, switchToPersonal, switchToOrganization }),
    [viewMode, organizations, activeOrganization, isLoading, switchToPersonal, switchToOrganization],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
