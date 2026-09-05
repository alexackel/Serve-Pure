import { useMemo, useReducer, type Dispatch } from 'react';

import {
  DEFAULT_FIND_FILTERS_STATE,
  isFindFiltersDefault,
  type AvailabilityKey,
  type DateKey,
  type DistanceKey,
  type DurationKey,
  type FindFiltersState,
  type RecurrenceKey,
  type SortKey,
} from '@/utils/find-filters';

export type FindFiltersAction =
  | { type: 'set-sort'; sort: SortKey }
  | { type: 'set-distance'; distance: DistanceKey }
  | { type: 'set-date'; date: DateKey }
  | { type: 'set-duration'; duration: DurationKey }
  | { type: 'set-categories'; categories: Set<string> }
  | { type: 'set-availability'; availability: AvailabilityKey }
  | { type: 'set-recurrence'; recurrence: RecurrenceKey }
  | { type: 'clear-all' };

function reducer(state: FindFiltersState, action: FindFiltersAction): FindFiltersState {
  switch (action.type) {
    case 'set-sort':
      return { ...state, sort: action.sort };
    case 'set-distance':
      return { ...state, filters: { ...state.filters, distance: action.distance } };
    case 'set-date':
      return { ...state, filters: { ...state.filters, date: action.date } };
    case 'set-duration':
      return { ...state, filters: { ...state.filters, duration: action.duration } };
    case 'set-categories':
      return { ...state, filters: { ...state.filters, categories: action.categories } };
    case 'set-availability':
      return { ...state, filters: { ...state.filters, availability: action.availability } };
    case 'set-recurrence':
      return { ...state, filters: { ...state.filters, recurrence: action.recurrence } };
    case 'clear-all':
      return DEFAULT_FIND_FILTERS_STATE;
  }
}

export function useFindFilters(): { state: FindFiltersState; dispatch: Dispatch<FindFiltersAction>; isDefault: boolean } {
  const [state, dispatch] = useReducer(reducer, DEFAULT_FIND_FILTERS_STATE);
  const isDefault = useMemo(() => isFindFiltersDefault(state), [state]);

  return { state, dispatch, isDefault };
}
