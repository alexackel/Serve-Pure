import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { EventCard, RecordCard, StatCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useRegistrations } from '@/context/registrations-context';
import { MOCK_EVENTS } from '@/data/mock-events';
import { useTheme } from '@/hooks/use-theme';

const STATS = {
  total: 58,
  verified: 34,
  pending: 8,
  selfReported: 16,
};

const HISTORY_RECORDS = [
  {
    organization: 'GreenFuture Coalition',
    hours: 3,
    date: 'Aug 24',
    status: 'verified' as const,
    hasPhoto: true,
    likes: 12,
  },
  {
    organization: 'Northside Food Bank',
    hours: 4,
    date: 'Aug 20',
    status: 'verified' as const,
    hasPhoto: false,
    likes: 6,
  },
  {
    organization: 'Central Public Library',
    hours: 2,
    date: 'Aug 18',
    status: 'pending' as const,
    hasPhoto: false,
    likes: 2,
  },
  {
    organization: 'Riverside Youth Center',
    hours: 5,
    date: 'Aug 12',
    status: 'self-reported' as const,
    hasPhoto: true,
    likes: 9,
  },
  {
    organization: 'Coastal Guardians',
    hours: 3,
    date: 'Aug 6',
    status: 'verified' as const,
    hasPhoto: true,
    likes: 15,
  },
  {
    organization: 'Maple Grove Senior Center',
    hours: 3,
    date: 'Jul 30',
    status: 'pending' as const,
    hasPhoto: false,
    likes: 1,
  },
  {
    organization: 'Blue Ridge Trail Alliance',
    hours: 4,
    date: 'Jul 22',
    status: 'self-reported' as const,
    hasPhoto: false,
    likes: 3,
  },
  {
    organization: 'Furry Friends Rescue',
    hours: 5,
    date: 'Jul 14',
    status: 'verified' as const,
    hasPhoto: true,
    likes: 18,
  },
];

const TIME_RANGES = ['All Time', 'This Year', 'This Month', 'This Week'];

const YOU_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof YOU_TABS)[number]['key'];

const HISTORY_FILTERS = [
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'self-reported', label: 'Self-Reported' },
] as const;

type HistoryFilterKey = (typeof HISTORY_FILTERS)[number]['key'];

const ALL_HISTORY_FILTERS = new Set<HistoryFilterKey>(HISTORY_FILTERS.map((filter) => filter.key));

function TimeRangeSelector() {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(TIME_RANGES[0]);
  const [showCustom, setShowCustom] = useState(false);
  const theme = useTheme();

  const close = () => {
    setExpanded(false);
    setShowCustom(false);
  };

  return (
    <View style={styles.rangeContainer}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={[styles.rangeButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="bodyBold">{selected}</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      </Pressable>

      {expanded && (
        <ThemedView style={[CardShadow, styles.rangeOptions, { borderColor: theme.border }]}>
          {TIME_RANGES.map((range) => (
            <Pressable
              key={range}
              onPress={() => {
                setSelected(range);
                close();
              }}
              style={styles.rangeOption}>
              <ThemedText type="body" themeColor={range === selected ? 'primary' : 'text'}>
                {range}
              </ThemedText>
              {range === selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
            </Pressable>
          ))}

          <View style={[styles.rangeDivider, { backgroundColor: theme.border }]} />

          <Pressable onPress={() => setShowCustom((current) => !current)} style={styles.rangeOption}>
            <ThemedText type="body" themeColor={showCustom || selected === 'Custom Range' ? 'primary' : 'text'}>
              Custom Range
            </ThemedText>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={showCustom || selected === 'Custom Range' ? theme.primary : theme.textSecondary}
            />
          </Pressable>

          {showCustom && (
            <View style={styles.customRange}>
              <View style={[styles.customField, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Start date
                </ThemedText>
              </View>
              <View style={[styles.customField, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  End date
                </ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  setSelected('Custom Range');
                  close();
                }}
                style={[styles.applyButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="bodyBold" themeColor="background">
                  Apply
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>
      )}
    </View>
  );
}

function UpcomingTab() {
  const { isRegistered } = useRegistrations();
  const upcomingEvents = MOCK_EVENTS.filter((event) => isRegistered(event.id));

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Upcoming Events</ThemedText>
      <ThemedView style={styles.list}>
        {upcomingEvents.map((event) => (
          <EventCard
            key={event.id}
            {...event}
            time={event.startTime}
            status="registered"
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function HistoryFilterChips({
  active,
  onToggle,
}: {
  active: Set<HistoryFilterKey>;
  onToggle: (key: HistoryFilterKey) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.filterRow}>
      {HISTORY_FILTERS.map((filter) => {
        const isActive = active.has(filter.key);
        const dotColor = filter.key === 'verified' ? theme.success : theme.warning;

        return (
          <Pressable
            key={filter.key}
            onPress={() => onToggle(filter.key)}
            style={[
              styles.filterChip,
              { borderColor: isActive ? theme.primary : theme.border },
              isActive && { backgroundColor: theme.primaryTint },
            ]}>
            <View style={[styles.filterDot, { backgroundColor: dotColor }]} />
            <ThemedText type="label" themeColor={isActive ? 'primary' : 'textSecondary'}>
              {filter.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function HistoryTab() {
  const [activeFilters, setActiveFilters] = useState<Set<HistoryFilterKey>>(ALL_HISTORY_FILTERS);

  const toggleFilter = (key: HistoryFilterKey) => {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visibleRecords = HISTORY_RECORDS.filter((record) => activeFilters.has(record.status));

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Your Volunteer History</ThemedText>
      <HistoryFilterChips active={activeFilters} onToggle={toggleFilter} />
      <ThemedView style={styles.list}>
        {visibleRecords.map((record) => (
          <RecordCard key={`${record.organization}-${record.date}`} {...record} />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function ExportHistoryButton() {
  const theme = useTheme();

  return (
    <Pressable style={[styles.exportButton, { borderColor: theme.border }]}>
      <Ionicons name="download-outline" size={14} color={theme.text} />
      <ThemedText type="label">Export History</ThemedText>
    </Pressable>
  );
}

export default function YouScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('upcoming');
    }, []),
  );

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <ThemedText type="h1" style={styles.pageTitle}>
        You
      </ThemedText>

      <ThemedView style={styles.statsSection}>
        <TimeRangeSelector />

        <StatCard
          label="Total Hours"
          value={STATS.total}
          icon="ribbon-outline"
          accentColor="primary"
          variant="headline"
        />
        <ThemedView style={styles.statGrid}>
          <StatCard label="Verified" value={STATS.verified} icon="checkmark-circle-outline" accentColor="success" />
          <StatCard label="Pending" value={STATS.pending} icon="hourglass-outline" accentColor="warning" />
          <StatCard label="Self-Reported" value={STATS.selfReported} icon="create-outline" accentColor="warning" />
        </ThemedView>

        <ExportHistoryButton />
      </ThemedView>

      <SegmentedTabs tabs={YOU_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'upcoming' && <UpcomingTab />}
      {activeTab === 'history' && <HistoryTab />}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  pageTitle: {
    marginBottom: Spacing.one,
  },
  statsSection: {
    gap: Spacing.three,
    position: 'relative',
    zIndex: 20,
  },
  rangeContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    zIndex: 20,
  },
  rangeButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
  rangeOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: Spacing.one,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    minWidth: 220,
    zIndex: 20,
    elevation: 8,
  },
  rangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  rangeDivider: {
    height: 1,
    marginVertical: Spacing.one,
    marginHorizontal: Spacing.three,
  },
  customRange: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  customField: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  applyButton: {
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  section: {
    gap: Spacing.three,
  },
  exportButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  list: {
    gap: Spacing.three,
  },
});
