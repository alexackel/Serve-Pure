import { useCallback, useEffect, useMemo, useState, type Dispatch } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { AiOrgCard, AiOrgCardSkeleton, EventCard } from '@/components/cards';
import { CreateFab } from '@/components/create-fab';
import { CreatePostSheet } from '@/components/create-post-sheet';
import { CategoryChipRow, FilterSheet, FindPillRow } from '@/components/find';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SearchBar } from '@/components/search-bar';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useAiDiscovery } from '@/context/ai-discovery-context';
import { useOrganization } from '@/context/organization-context';
import { useRegistrations } from '@/context/registrations-context';
import type { AiOrgCategory } from '@/data/ai-orgs';
import type { EventDetail } from '@/data/mock-events';
import { listEvents } from '@/data/events';
import { useFindFilters, type FindFiltersAction } from '@/hooks/use-find-filters';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { AI_ORG_CATEGORY_OPTIONS, sortAiOrgsByDistance } from '@/utils/ai-orgs';
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
  applyMaxRadius,
  buildFindPillDescriptors,
  excludePastEvents,
  getCategoryOptions,
  sortEvents,
  type FindFiltersState,
  type FindPillKey,
} from '@/utils/find-filters';

type FindTabKey = 'events' | 'ai-discovered';

const FIND_TABS: readonly { key: FindTabKey; label: string }[] = [
  { key: 'events', label: 'Events' },
  { key: 'ai-discovered', label: 'AI Discovered' },
];

type AiCategoryKey = AiOrgCategory | 'all';

const AI_CATEGORY_CHIPS: readonly { key: AiCategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  ...AI_ORG_CATEGORY_OPTIONS,
];

// AI Discovered pane: reads the app-launch preload's shared state (see
// AiDiscoveryProvider) instead of fetching on its own, so a cache hit from
// that preload costs this screen nothing.
function AiDiscoveredPane() {
  const { orgs, status, reportedIds } = useAiDiscovery();
  const userLocation = useUserLocation();
  const theme = useTheme();
  const [categoryFilter, setCategoryFilter] = useState<AiCategoryKey>('all');

  const filteredOrgs = useMemo(
    () => (categoryFilter === 'all' ? orgs : orgs.filter((org) => org.category === categoryFilter)),
    [orgs, categoryFilter],
  );
  const sortedOrgs = useMemo(() => sortAiOrgsByDistance(filteredOrgs, userLocation), [filteredOrgs, userLocation]);
  const mainOrgs = useMemo(() => sortedOrgs.filter((org) => !reportedIds.has(org.id)), [sortedOrgs, reportedIds]);
  const hasReportedOrgs = reportedIds.size > 0;

  return (
    <>
      <CategoryChipRow chips={AI_CATEGORY_CHIPS} activeKey={categoryFilter} onChange={setCategoryFilter} />
      <ThemedView style={styles.list}>
        {status === 'loading' && orgs.length === 0 ? (
          <>
            <AiOrgCardSkeleton />
            <AiOrgCardSkeleton />
            <AiOrgCardSkeleton />
          </>
        ) : status === 'error' && orgs.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.emptyState}>
            Couldn&apos;t load AI-discovered organizations. Try again later.
          </ThemedText>
        ) : mainOrgs.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.emptyState}>
            No AI-discovered organizations match your filters.
          </ThemedText>
        ) : (
          mainOrgs.map((org) => (
            <AiOrgCard
              key={org.id}
              name={org.name}
              address={org.address}
              category={org.category}
              description={org.description}
              distanceMiles={org.distanceMiles}
              onPress={() => router.push({ pathname: '/ai-org/[id]', params: { id: org.id } })}
            />
          ))
        )}
      </ThemedView>

      {hasReportedOrgs && (
        <Pressable
          onPress={() => router.push('/ai-org/reported')}
          style={[styles.reportedTab, { borderColor: theme.border }]}>
          <Ionicons name="flag-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="bodyBold" themeColor="textSecondary">
            Reported Posts
          </ThemedText>
        </Pressable>
      )}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.braveAttribution}>
        POWERED BY BRAVE
      </ThemedText>
    </>
  );
}

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
  const { viewMode } = useOrganization();
  const [activeTab, setActiveTab] = useState<FindTabKey>('events');
  const { state, dispatch, isDefault } = useFindFilters();
  const [activeSheet, setActiveSheet] = useState<FindPillKey | null>(null);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  // Keeps rendering the last-opened pill's sheet content while it slides out,
  // instead of unmounting it (which would cut the exit animation short).
  const [lastSheetKey, setLastSheetKey] = useState<FindPillKey>('sort');
  if (activeSheet && activeSheet !== lastSheetKey) {
    setLastSheetKey(activeSheet);
  }

  const [events, setEvents] = useState<EventDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetchEvents = useCallback(() => {
    listEvents()
      .then(setEvents)
      .catch((error) => console.error('Failed to load events', error))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refetchEvents();
  }, [refetchEvents]);

  // Also refetches on every return to this tab, so newly-created/registered
  // events reflect an up-to-date registered_count without a manual pull.
  useFocusEffect(
    useCallback(() => {
      refetchEvents();
      return () => setSearchValue('');
    }, [refetchEvents]),
  );

  const now = useMemo(() => new Date(), []);
  const upcomingEvents = useMemo(() => excludePastEvents(events, now), [events, now]);
  // Applied before category derivation too, same as excludePastEvents above
  // — a mandatory baseline rule, not a user-adjustable facet, so the
  // Category sheet never offers a chip the volunteer could never actually
  // select from the (radius-capped) list underneath.
  const nearbyEvents = useMemo(() => applyMaxRadius(upcomingEvents, userLocation), [upcomingEvents, userLocation]);
  const categoryOptions = useMemo(() => getCategoryOptions(nearbyEvents), [nearbyEvents]);
  const pills = useMemo(() => buildFindPillDescriptors(state), [state]);

  const filteredEvents = useMemo(
    () => applyFindFilters(nearbyEvents, state.filters, userLocation),
    [nearbyEvents, state.filters, userLocation],
  );
  const visibleEvents = useMemo(
    () => sortEvents(filteredEvents, state.sort, userLocation),
    [filteredEvents, state.sort, userLocation],
  );

  const sheetConfig = getSheetConfig(lastSheetKey, state, categoryOptions, dispatch);
  // Org/Organizer context keeps Find exactly as it is today — no segmented
  // control, no AI Discovered pane, since discovering third-party orgs
  // isn't relevant to managing your own.
  const showEventsPane = viewMode !== 'personal' || activeTab === 'events';
  const showAiPane = viewMode === 'personal' && activeTab === 'ai-discovered';

  return (
    <View style={styles.flex}>
      <ScreenScrollView>
        <ThemedText type="h1" style={styles.pageTitle}>
          Find
        </ThemedText>
        {viewMode === 'personal' && (
          <ThemedView style={styles.segmentedTabs}>
            <SegmentedTabs tabs={FIND_TABS} activeKey={activeTab} onChange={setActiveTab} />
          </ThemedView>
        )}
        {showEventsPane && (
          <>
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
              {isLoading ? (
                <ThemedText type="body" themeColor="textSecondary" style={styles.emptyState}>
                  Loading events…
                </ThemedText>
              ) : visibleEvents.length === 0 ? (
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
          </>
        )}

        {showAiPane && <AiDiscoveredPane />}

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

      <CreateFab onPress={() => setCreateSheetVisible(true)} />
      <CreatePostSheet
        visible={createSheetVisible}
        onDismiss={() => setCreateSheetVisible(false)}
        showSelfUpload={viewMode === 'personal'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pageTitle: {
    marginBottom: Spacing.three,
  },
  segmentedTabs: {
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
  reportedTab: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    marginTop: Spacing.three,
  },
  braveAttribution: {
    textAlign: 'center',
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
});
