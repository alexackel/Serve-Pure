import { useCallback, useMemo, useState, type Dispatch } from 'react';
import { StyleSheet } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { EventCard } from '@/components/cards';
import { FilterSheet, FindPillRow } from '@/components/find';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRegistrations } from '@/context/registrations-context';
import { MOCK_EVENTS } from '@/data/mock-events';
import { useFindFilters, type FindFiltersAction } from '@/hooks/use-find-filters';
import { useUserLocation } from '@/hooks/use-user-location';
import {
  AVAILABILITY_OPTIONS,
  DATE_OPTIONS,
  DEFAULT_FIND_FILTERS,
  DEFAULT_SORT,
  DISTANCE_OPTIONS,
  DURATION_OPTIONS,
  RECURRENCE_OPTIONS,
  SORT_OPTIONS,
  applyFindFilters,
  buildFindPillDescriptors,
  excludePastEvents,
  getCategoryOptions,
  sortEvents,
  type FindFiltersState,
  type FindPillKey,
} from '@/utils/find-filters';

type SheetConfig = {
  title: string;
  mode: 'single' | 'multi';
  options: readonly { key: string; label: string }[];
  selected: string | Set<string>;
  defaultValue: string | Set<string>;
  onApply: (selected: string | Set<string>) => void;
};

// Screen-specific: wires each pill to the reducer action that owns its facet.
// Kept local to this file rather than extracted, since its only job is
// closing over `dispatch`.
function getSheetConfig(
  key: FindPillKey,
  state: FindFiltersState,
  categoryOptions: string[],
  dispatch: Dispatch<FindFiltersAction>,
): SheetConfig {
  switch (key) {
    case 'sort':
      return {
        title: 'Sort by',
        mode: 'single',
        options: SORT_OPTIONS,
        selected: state.sort,
        defaultValue: DEFAULT_SORT,
        onApply: (value) => dispatch({ type: 'set-sort', sort: value as (typeof SORT_OPTIONS)[number]['key'] }),
      };
    case 'distance':
      return {
        title: 'Distance',
        mode: 'single',
        options: DISTANCE_OPTIONS,
        selected: state.filters.distance,
        defaultValue: DEFAULT_FIND_FILTERS.distance,
        onApply: (value) => dispatch({ type: 'set-distance', distance: value as (typeof DISTANCE_OPTIONS)[number]['key'] }),
      };
    case 'date':
      return {
        title: 'Date',
        mode: 'single',
        options: DATE_OPTIONS,
        selected: state.filters.date,
        defaultValue: DEFAULT_FIND_FILTERS.date,
        onApply: (value) => dispatch({ type: 'set-date', date: value as (typeof DATE_OPTIONS)[number]['key'] }),
      };
    case 'duration':
      return {
        title: 'Duration',
        mode: 'single',
        options: DURATION_OPTIONS,
        selected: state.filters.duration,
        defaultValue: DEFAULT_FIND_FILTERS.duration,
        onApply: (value) => dispatch({ type: 'set-duration', duration: value as (typeof DURATION_OPTIONS)[number]['key'] }),
      };
    case 'category':
      return {
        title: 'Category',
        mode: 'multi',
        options: categoryOptions.map((category) => ({ key: category, label: category })),
        selected: state.filters.categories,
        defaultValue: new Set<string>(),
        onApply: (value) => dispatch({ type: 'set-categories', categories: value as Set<string> }),
      };
    case 'availability':
      return {
        title: 'Availability',
        mode: 'single',
        options: AVAILABILITY_OPTIONS,
        selected: state.filters.availability,
        defaultValue: DEFAULT_FIND_FILTERS.availability,
        onApply: (value) => dispatch({ type: 'set-availability', availability: value as (typeof AVAILABILITY_OPTIONS)[number]['key'] }),
      };
    case 'recurring':
      return {
        title: 'Recurring',
        mode: 'single',
        options: RECURRENCE_OPTIONS,
        selected: state.filters.recurrence,
        defaultValue: DEFAULT_FIND_FILTERS.recurrence,
        onApply: (value) => dispatch({ type: 'set-recurrence', recurrence: value as (typeof RECURRENCE_OPTIONS)[number]['key'] }),
      };
  }
}

export default function FindScreen() {
  const [searchValue, setSearchValue] = useState('');
  const { isRegistered } = useRegistrations();
  const userLocation = useUserLocation();
  const { state, dispatch, isDefault } = useFindFilters();
  const [activeSheet, setActiveSheet] = useState<FindPillKey | null>(null);
  // Keeps rendering the last-opened pill's sheet content while it slides out,
  // instead of unmounting it (which would cut the exit animation short).
  const [lastSheetKey, setLastSheetKey] = useState<FindPillKey>('sort');
  if (activeSheet && activeSheet !== lastSheetKey) {
    setLastSheetKey(activeSheet);
  }

  useFocusEffect(
    useCallback(() => {
      return () => setSearchValue('');
    }, []),
  );

  const now = useMemo(() => new Date(), []);
  const upcomingEvents = useMemo(() => excludePastEvents(MOCK_EVENTS, now), [now]);
  const categoryOptions = useMemo(() => getCategoryOptions(upcomingEvents), [upcomingEvents]);
  const pills = useMemo(() => buildFindPillDescriptors(state), [state]);

  const filteredEvents = useMemo(
    () => applyFindFilters(upcomingEvents, state.filters, userLocation),
    [upcomingEvents, state.filters, userLocation],
  );
  const visibleEvents = useMemo(
    () => sortEvents(filteredEvents, state.sort, userLocation),
    [filteredEvents, state.sort, userLocation],
  );

  const sheetConfig = getSheetConfig(lastSheetKey, state, categoryOptions, dispatch);

  return (
    <ScreenScrollView>
      <ThemedText type="h1" style={styles.pageTitle}>
        Find
      </ThemedText>
      <SearchBar
        placeholder="Search events"
        value={searchValue}
        onChangeText={setSearchValue}
        containerStyle={styles.searchBar}
      />
      <FindPillRow
        pills={pills}
        onPressPill={setActiveSheet}
        showClearAll={!isDefault}
        onClearAll={() => {
          dispatch({ type: 'clear-all' });
          setActiveSheet(null);
        }}
      />
      <ThemedView style={styles.list}>
        {visibleEvents.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.emptyState}>
            No events match your filters.
          </ThemedText>
        ) : (
          visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              {...event}
              status={isRegistered(event.id) ? 'registered' : event.status}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
            />
          ))
        )}
      </ThemedView>

      <FilterSheet
        visible={activeSheet !== null}
        title={sheetConfig.title}
        mode={sheetConfig.mode}
        options={sheetConfig.options}
        selected={sheetConfig.selected}
        defaultValue={sheetConfig.defaultValue}
        onApply={sheetConfig.onApply}
        onDismiss={() => setActiveSheet(null)}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginBottom: Spacing.three,
  },
  searchBar: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  emptyState: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
});
