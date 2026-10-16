import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchOrgRoster } from '@/data/analytics';
import type { RosterSortBy, RosterSortDir, RosterTag } from '@/types/analytics';

export type UseOrgRosterParams = {
  orgId: string | null;
  start: Date;
  end: Date;
  eventId: string | null;
  search: string;
  tagFilter: RosterTag | null;
  sortBy: RosterSortBy;
  sortDir: RosterSortDir;
  page: number;
  pageSize: number;
};

export function useOrgRoster({ orgId, start, end, eventId, search, tagFilter, sortBy, sortDir, page, pageSize }: UseOrgRosterParams) {
  return useQuery({
    queryKey: ['org-roster', orgId, start.getTime(), end.getTime(), eventId, search, tagFilter, sortBy, sortDir, page, pageSize],
    queryFn: () =>
      fetchOrgRoster({
        orgId: orgId as string,
        start,
        end,
        eventId,
        search,
        tagFilter,
        sortBy,
        sortDir,
        page,
        pageSize,
      }),
    enabled: orgId !== null,
    // Keeps the current page's rows on screen while the next page loads,
    // instead of flashing the skeleton on every sort/filter/page change.
    placeholderData: keepPreviousData,
  });
}
