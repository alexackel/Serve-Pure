import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { EventCard, RecordCard, StatCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { type HistoryRecord, useHistory } from '@/context/history-context';
import { useRegistrations } from '@/context/registrations-context';
import { MOCK_EVENTS } from '@/data/mock-events';
import { useTheme } from '@/hooks/use-theme';
import { endOfDay, formatDateInput, formatShortDate, parseDateInput, parseRecordDate, startOfDay } from '@/utils/dates';

const TIME_RANGES = ['All Time', 'Last 365 Days', 'Last 30 Days', 'Last 7 Days'] as const;

const ALL_TIME_LABEL = 'All Time';
const CUSTOM_RANGE_LABEL = 'Custom Range';

type TimeRangeKey = (typeof TIME_RANGES)[number] | typeof CUSTOM_RANGE_LABEL;

const RANGE_DAYS: Record<Exclude<(typeof TIME_RANGES)[number], typeof ALL_TIME_LABEL>, number> = {
  'Last 365 Days': 365,
  'Last 30 Days': 30,
  'Last 7 Days': 7,
};

const YOU_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof YOU_TABS)[number]['key'];

const HISTORY_FILTERS = [
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'self-reported', label: 'Self-Reported' },
  { key: 'no-show', label: 'No-Show' },
  { key: 'appealed', label: 'Appealed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

type HistoryFilterKey = (typeof HISTORY_FILTERS)[number]['key'];

const ALL_HISTORY_FILTERS = new Set<HistoryFilterKey>(HISTORY_FILTERS.map((filter) => filter.key));

type CustomRange = { start: Date; end: Date };

function filterRecordsByRange(records: HistoryRecord[], range: TimeRangeKey, customRange: CustomRange | null) {
  if (range === ALL_TIME_LABEL) {
    return records;
  }

  const now = new Date();

  if (range === CUSTOM_RANGE_LABEL) {
    if (!customRange) {
      return records;
    }

    const start = startOfDay(customRange.start);
    const end = endOfDay(customRange.end);

    return records.filter((record) => {
      const recordDate = parseRecordDate(record.date, now);
      return recordDate >= start && recordDate <= end;
    });
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);

  return records.filter((record) => parseRecordDate(record.date, now) >= cutoff);
}

function sumHours(records: HistoryRecord[]) {
  return records.reduce((sum, record) => sum + (record.hours ?? 0), 0);
}

function sumHoursByStatus(records: HistoryRecord[], status: HistoryFilterKey) {
  return sumHours(records.filter((record) => record.status === status));
}

function TimeRangeSelector({
  selected,
  onSelect,
  customRange,
  onApplyCustomRange,
}: {
  selected: TimeRangeKey;
  onSelect: (range: TimeRangeKey) => void;
  customRange: CustomRange | null;
  onApplyCustomRange: (range: CustomRange) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [startText, setStartText] = useState(customRange ? formatDateInput(customRange.start) : '');
  const [endText, setEndText] = useState(customRange ? formatDateInput(customRange.end) : '');
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const close = () => {
    setExpanded(false);
    setShowCustom(false);
    setError(null);
  };

  const applyCustomRange = () => {
    const start = parseDateInput(startText);
    const end = parseDateInput(endText);

    if (!start || !end) {
      setError('Enter valid dates as MM/DD/YYYY.');
      return;
    }

    if (start > end) {
      setError('Start date must be before end date.');
      return;
    }

    onApplyCustomRange({ start, end });
    onSelect(CUSTOM_RANGE_LABEL);
    close();
  };

  const buttonLabel =
    selected === CUSTOM_RANGE_LABEL && customRange
      ? `${formatShortDate(customRange.start)} – ${formatShortDate(customRange.end)}`
      : selected;

  return (
    <View style={styles.rangeContainer}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={[styles.rangeButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="bodyBold">{buttonLabel}</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      </Pressable>

      {expanded && (
        <ThemedView style={[CardShadow, styles.rangeOptions, { borderColor: theme.border }]}>
          {TIME_RANGES.map((range) => (
            <Pressable
              key={range}
              onPress={() => {
                onSelect(range);
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
            <ThemedText type="body" themeColor={showCustom || selected === CUSTOM_RANGE_LABEL ? 'primary' : 'text'}>
              {CUSTOM_RANGE_LABEL}
            </ThemedText>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={showCustom || selected === CUSTOM_RANGE_LABEL ? theme.primary : theme.textSecondary}
            />
          </Pressable>

          {showCustom && (
            <View style={styles.customRange}>
              <View style={[styles.customField, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Start date
                </ThemedText>
                <TextInput
                  value={startText}
                  onChangeText={setStartText}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.customInput, { color: theme.text }]}
                />
              </View>
              <View style={[styles.customField, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  End date
                </ThemedText>
                <TextInput
                  value={endText}
                  onChangeText={setEndText}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.customInput, { color: theme.text }]}
                />
              </View>

              {error && (
                <ThemedText type="caption" themeColor="error">
                  {error}
                </ThemedText>
              )}

              <Pressable onPress={applyCustomRange} style={[styles.applyButton, { backgroundColor: theme.primary }]}>
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
        const dotColor =
          filter.key === 'verified'
            ? theme.success
            : filter.key === 'pending' || filter.key === 'self-reported'
              ? theme.warning
              : theme.error;

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

function HistoryTab({ records }: { records: HistoryRecord[] }) {
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

  const visibleRecords = records.filter((record) => activeFilters.has(record.status));

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Your Volunteer History</ThemedText>
      <HistoryFilterChips active={activeFilters} onToggle={toggleFilter} />
      <ThemedView style={styles.list}>
        {visibleRecords.map(({ id, ...record }) => (
          <RecordCard key={id} {...record} />
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
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(TIME_RANGES[0]);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const { records: historyRecords, reliabilityScore } = useHistory();
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('upcoming');
    }, []),
  );

  const rangeRecords = filterRecordsByRange(historyRecords, timeRange, customRange);
  const totalHours = sumHours(rangeRecords);
  const verifiedHours = sumHoursByStatus(rangeRecords, 'verified');
  const pendingHours = sumHoursByStatus(rangeRecords, 'pending');
  const selfReportedHours = sumHoursByStatus(rangeRecords, 'self-reported');

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText type="h1" style={styles.pageTitle}>
          You
        </ThemedText>
        <View style={styles.reliabilityBadge}>
          <Ionicons name="star" size={16} color={theme.warning} />
          <ThemedText type="bodyBold">{reliabilityScore.toFixed(1)}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Reliability
          </ThemedText>
        </View>
      </View>

      <ThemedView style={styles.statsSection}>
        <TimeRangeSelector
          selected={timeRange}
          onSelect={setTimeRange}
          customRange={customRange}
          onApplyCustomRange={setCustomRange}
        />

        <StatCard
          label="Total Hours"
          value={totalHours}
          icon="ribbon-outline"
          accentColor="primary"
          variant="headline"
        />
        <ThemedView style={styles.statGrid}>
          <StatCard label="Verified" value={verifiedHours} icon="checkmark-circle-outline" accentColor="success" />
          <StatCard label="Pending" value={pendingHours} icon="hourglass-outline" accentColor="warning" />
          <StatCard
            label="Self-Reported"
            value={selfReportedHours}
            icon="create-outline"
            accentColor="warning"
          />
        </ThemedView>

        <ExportHistoryButton />
      </ThemedView>

      <SegmentedTabs tabs={YOU_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'upcoming' && <UpcomingTab />}
      {activeTab === 'history' && <HistoryTab records={rangeRecords} />}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  pageTitle: {
    marginBottom: 0,
  },
  reliabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
    gap: Spacing.one,
  },
  customInput: {
    padding: 0,
    fontSize: Platform.OS === 'web' ? 16 : 14,
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
