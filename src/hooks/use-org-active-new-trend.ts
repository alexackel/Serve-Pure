import { useQuery } from '@tanstack/react-query';

import { fetchOrgActiveNewTrend } from '@/data/analytics';

export function useOrgActiveNewTrend(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-active-new-trend', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgActiveNewTrend({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
