import { useQuery } from '@tanstack/react-query';

import { fetchOrgAnalyticsKpis } from '@/data/analytics';

export function useOrgAnalyticsKpis(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-analytics-kpis', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgAnalyticsKpis({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
