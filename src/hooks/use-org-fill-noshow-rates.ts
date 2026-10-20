import { useQuery } from '@tanstack/react-query';

import { fetchOrgFillNoShowRates } from '@/data/analytics';

export function useOrgFillNoShowRates(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-fill-noshow-rates', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgFillNoShowRates({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
