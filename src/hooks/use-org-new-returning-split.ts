import { useQuery } from '@tanstack/react-query';

import { fetchOrgNewReturningSplit } from '@/data/analytics';

export function useOrgNewReturningSplit(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-new-returning-split', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgNewReturningSplit({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
