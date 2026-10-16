import { useQuery } from '@tanstack/react-query';

import { fetchOrgEventOptions } from '@/data/analytics';

export function useOrgEventOptions(orgId: string | null) {
  return useQuery({
    queryKey: ['org-event-options', orgId],
    queryFn: () => fetchOrgEventOptions(orgId as string),
    enabled: orgId !== null,
    staleTime: 5 * 60_000,
  });
}
