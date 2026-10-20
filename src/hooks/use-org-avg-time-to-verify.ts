import { useQuery } from '@tanstack/react-query';

import { fetchOrgAvgTimeToVerify } from '@/data/analytics';

export function useOrgAvgTimeToVerify(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-avg-time-to-verify', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgAvgTimeToVerify({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
