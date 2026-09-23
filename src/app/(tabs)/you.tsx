import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { AccountAvatarButton } from '@/components/account-avatar-button';
import { EventCard, RecordCard, StatCard } from '@/components/cards';
import { CreateFab } from '@/components/create-fab';
import { CreatePostSheet } from '@/components/create-post-sheet';
import { HistoryFilterChips } from '@/components/history-filter-chips';
import { PillIconButton } from '@/components/pill-icon-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { SwitchViewModeButton } from '@/components/switch-view-mode-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { type HistoryRecord, useHistory } from '@/context/history-context';
import { useRegistrations } from '@/context/registrations-context';
import { listMyIndividualEvents } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { deleteSelfReport } from '@/data/self-reports';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useToggleSet } from '@/hooks/use-toggle-set';
import {
  endOfDay,
  formatDateInput,
  formatShortDate,
  parseDateInput,
  parseEventDateTime,
  parseRecordDate,
  startOfDay,
} from '@/utils/dates';

const TIME_RANGES = ['All Time', 'Last 365 Days', 'Last 30 Days', 'Last 7 Days'] as const;

const ALL_TIME_LABEL = 'All Time';
const CUSTOM_RANGE_LABEL = 'Custom Range';

type TimeRangeKey = (typeof TIME_RANGES)[number] | typeof CUSTOM_RANGE_LABEL;

const RANGE_DAYS: Record<Exclude<(typeof TIME_RANGES)[number], typeof ALL_TIME_LABEL>, number> = {
  'Last 365 Days': 365,
  'Last 30 Days': 30,
  'Last 7 Days': 7,
};

// 'Past' only shows up once you've created at least one individual post —
// see hasCreatedPost in YouScreen. Everyone else keeps the plain
// Upcoming/History pair.
const YOU_TABS_ALL = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof YOU_TABS_ALL)[number]['key'];

const HISTORY_FILTERS = [
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'self-uploaded', label: 'Self-Uploaded' },
  { key: 'personal', label: 'Personal' },
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

// Admin-approved self-uploaded hours count toward Verified once a group admin
// signs off, even though the underlying record keeps its own status for audit
// views (e.g. the group Analytics chart) that still break it out separately.
function sumVerifiedHours(records: HistoryRecord[]) {
  return sumHours(records.filter((record) => record.status === 'verified' || record.status === 'admin-approved'));
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
  const { registrations } = useRegistrations();
  const upcomingEvents = registrations
    .filter((registration) => registration.status !== 'cancelled')
    .map((registration) => registration.event);

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

// Your own past casual posts — tapping one opens its roster, where
// event/[id]/volunteer/[volunteerId].tsx exposes Approve/Deny for a
// registrant once the event has ended.
function PastPostsTab({ posts }: { posts: EventDetail[] }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Past Posts</ThemedText>
      <ThemedView style={styles.list}>
        {posts.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary">
            None of your posts have happened yet.
          </ThemedText>
        ) : (
          posts.map((event) => (
            <EventCard
              key={event.id}
              {...event}
              time={event.startTime}
              status={event.status}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
            />
          ))
        )}
      </ThemedView>
    </ThemedView>
  );
}

function HistoryTab({ records, onDeleteRecord }: { records: HistoryRecord[]; onDeleteRecord: (id: string) => void }) {
  const [activeFilters, toggleFilter] = useToggleSet(ALL_HISTORY_FILTERS);

  const visibleRecords = records.filter((record) =>
    record.status === 'admin-approved' ? activeFilters.has('verified') : activeFilters.has(record.status),
  );

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Your Volunteer History</ThemedText>
      <HistoryFilterChips filters={HISTORY_FILTERS} active={activeFilters} onToggle={toggleFilter} />
      <ThemedView style={styles.list}>
        {visibleRecords.map(({ id, ...record }) => (
          <RecordCard
            key={id}
            {...record}
            onDelete={record.status === 'self-uploaded' ? () => onDeleteRecord(id) : undefined}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

export default function YouScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(TIME_RANGES[0]);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const { records: historyRecords, reliabilityScore, refetch: refetchHistory } = useHistory();
  const { session } = useSession();
  const theme = useTheme();
  const [identityVerified, setIdentityVerified] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [myPosts, setMyPosts] = useState<EventDetail[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!session) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('identity_verified')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Failed to load identity_verified', error);
      } else if (data) {
        setIdentityVerified(data.identity_verified);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function loadMyPosts() {
      if (!session) return;
      try {
        const posts = await listMyIndividualEvents(session.user.id);
        if (!cancelled) setMyPosts(posts);
      } catch (error) {
        console.error('Failed to load your posts', error);
      }
    }
    loadMyPosts();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('upcoming');
    }, []),
  );

  const rangeRecords = useMemo(
    () => filterRecordsByRange(historyRecords, timeRange, customRange),
    [historyRecords, timeRange, customRange],
  );
  const totalHours = useMemo(() => sumHours(rangeRecords), [rangeRecords]);
  const verifiedHours = useMemo(() => sumVerifiedHours(rangeRecords), [rangeRecords]);
  const pendingHours = useMemo(() => sumHoursByStatus(rangeRecords, 'pending'), [rangeRecords]);
  const selfUploadedHours = useMemo(() => sumHoursByStatus(rangeRecords, 'self-uploaded'), [rangeRecords]);

  const hasCreatedPost = myPosts.length > 0;
  const pastPosts = useMemo(() => {
    const now = new Date();
    return myPosts.filter((event) => parseEventDateTime(event.date, event.endTime ?? event.startTime, now) < now);
  }, [myPosts]);
  const youTabs = hasCreatedPost ? YOU_TABS_ALL : YOU_TABS_ALL.filter((tab) => tab.key !== 'past');

  return (
    <View style={styles.flex}>
      <ScreenScrollView containerStyle={styles.container}>
        <View style={styles.titleRow}>
          <View style={styles.identityRow}>
            <AccountAvatarButton size={32} />
            <ThemedText type="h1" style={styles.pageTitle}>
              You
            </ThemedText>
            {identityVerified && <VerifiedBadge />}
          </View>
          <View style={styles.reliabilityBadge}>
            <Ionicons name="star" size={16} color={theme.warning} />
            <ThemedText type="bodyBold">{reliabilityScore !== null ? reliabilityScore.toFixed(1) : '—'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Reliability
            </ThemedText>
          </View>
        </View>

        <SwitchViewModeButton target="organization" />

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
              label="Self-Uploaded"
              value={selfUploadedHours}
              icon="create-outline"
              accentColor="warning"
            />
          </ThemedView>

          <PillIconButton icon="download-outline" label="Export Verified Transcript" />
        </ThemedView>

        <SegmentedTabs tabs={youTabs} activeKey={activeTab} onChange={setActiveTab} />

        {activeTab === 'upcoming' && <UpcomingTab />}
        {activeTab === 'past' && <PastPostsTab posts={pastPosts} />}
        {activeTab === 'history' && (
          <HistoryTab
            records={rangeRecords}
            onDeleteRecord={(id) => {
              deleteSelfReport(id)
                .then(refetchHistory)
                .catch((error) => console.error('Failed to delete self-report', error));
            }}
          />
        )}
      </ScreenScrollView>

      <CreateFab onPress={() => setCreateSheetVisible(true)} />
      <CreatePostSheet
        visible={createSheetVisible}
        onDismiss={() => setCreateSheetVisible(false)}
        showSelfUpload
        showDiscoveredPost
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    gap: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
    marginBottom: Spacing.one,
  },
  pageTitle: {
    marginBottom: 0,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  list: {
    gap: Spacing.three,
  },
});
