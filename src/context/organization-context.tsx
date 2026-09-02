import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ViewMode = 'personal' | 'organization';

export type MockOrganization = {
  id: string;
  name: string;
};

// Single seed org for now — matches the existing 'GreenFuture Coalition' events
// in mock-events.ts. Shaped as a list since one account can administer multiple
// organizations per the product brief, even though only one exists today.
const MOCK_ORGANIZATIONS: MockOrganization[] = [{ id: 'greenfuture-coalition', name: 'GreenFuture Coalition' }];

type OrganizationContextValue = {
  viewMode: ViewMode;
  organizations: MockOrganization[];
  activeOrganization: MockOrganization;
  switchToPersonal: () => void;
  switchToOrganization: (organizationId: string) => void;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('personal');
  const [activeOrganizationId, setActiveOrganizationId] = useState(MOCK_ORGANIZATIONS[0].id);

  const switchToPersonal = useCallback(() => setViewMode('personal'), []);

  const switchToOrganization = useCallback((organizationId: string) => {
    setActiveOrganizationId(organizationId);
    setViewMode('organization');
  }, []);

  const activeOrganization =
    MOCK_ORGANIZATIONS.find((organization) => organization.id === activeOrganizationId) ?? MOCK_ORGANIZATIONS[0];

  const value = useMemo(
    () => ({
      viewMode,
      organizations: MOCK_ORGANIZATIONS,
      activeOrganization,
      switchToPersonal,
      switchToOrganization,
    }),
    [viewMode, activeOrganization, switchToPersonal, switchToOrganization],
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
