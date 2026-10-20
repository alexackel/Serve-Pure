import { useQuery } from '@tanstack/react-query';

import { fetchOrgRecruitmentFunnel } from '@/data/analytics';

export function useOrgRecruitmentFunnel(orgId: string | null, start: Date, end: Date, eventId: string | null) {
  return useQuery({
    queryKey: ['org-recruitment-funnel', orgId, start.getTime(), end.getTime(), eventId],
    queryFn: () => fetchOrgRecruitmentFunnel({ orgId: orgId as string, start, end, eventId }),
    enabled: orgId !== null,
  });
}
