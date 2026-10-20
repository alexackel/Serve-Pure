import { useQuery } from '@tanstack/react-query';

import { fetchOrgTopEvents } from '@/data/analytics';

export function useOrgTopEvents(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-top-events', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgTopEvents({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
