import { useQuery } from '@tanstack/react-query';

import { fetchOrgHoursTrend } from '@/data/analytics';

export function useOrgHoursTrend(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-hours-trend', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgHoursTrend({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
