import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFocusEffect } from 'expo-router';
import { useTabTrigger } from 'expo-router/ui';

import { EventCard, OrgHistoryRow, VerificationBadge } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { type HistoryStatus } from '@/context/history-context';
import { useOrganization } from '@/context/organization-context';
import { MOCK_EVENTS } from '@/data/mock-events';
import { MOCK_ORG_HISTORY, type OrgHistoryRecord } from '@/data/mock-org-history';
import { useTheme } from '@/hooks/use-theme';
import { parseEventDateTime } from '@/utils/dates';

const ORG_YOU_TABS = [
  { key: 'approve', label: 'Approve' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof ORG_YOU_TABS)[number]['key'];

const HISTORY_FILTERS = [
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'no-show', label: 'No-Show' },
] as const;

type HistoryFilterKey = (typeof HISTORY_FILTERS)[number]['key'];

const ALL_HISTORY_FILTERS = new Set<HistoryFilterKey>(HISTORY_FILTERS.map((filter) => filter.key));

// History only ever shows resolved attendance outcomes — self-uploaded hours
// stay in Approve until reviewed, at which point they become one of these.
const HISTORY_VISIBLE_STATUSES = new Set<HistoryStatus>(['verified', 'pending', 'no-show']);

const NEEDS_ACTION_STATUSES = new Set<HistoryStatus>(['pending', 'self-uploaded']);

type EventGroup = {
  eventId: string;
  eventTitle: string;
  event?: (typeof MOCK_EVENTS)[number];
  records: OrgHistoryRecord[];
};

function buildEventGroups(records: OrgHistoryRecord[]): EventGroup[] {
  const groups = new Map<string, EventGroup>();

  for (const record of records) {
    if (!HISTORY_VISIBLE_STATUSES.has(record.status)) {
      continue;
    }
    const existing = groups.get(record.eventId);
    if (existing) {
      existing.records.push(record);
    } else {
      groups.set(record.eventId, {
        eventId: record.eventId,
        eventTitle: record.eventTitle,
        event: MOCK_EVENTS.find((event) => event.id === record.eventId),
        records: [record],
      });
    }
  }

  const now = new Date();
  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.event ? parseEventDateTime(a.event.date, a.event.startTime, now).getTime() : 0;
    const bTime = b.event ? parseEventDateTime(b.event.date, b.event.startTime, now).getTime() : 0;
    return bTime - aTime;
  });
}

function SwitchToPersonalButton() {
  const theme = useTheme();
  const { switchToPersonal } = useOrganization();
  const { switchTab } = useTabTrigger({ name: 'you', href: '/you' });

  const handlePress = () => {
    switchToPersonal();
    switchTab('you', {});
  };

  return (
    <Pressable onPress={handlePress} style={[styles.switchButton, { borderColor: theme.border }]}>
      <Ionicons name="swap-horizontal" size={14} color={theme.text} />
      <ThemedText type="label">Personal</ThemedText>
    </Pressable>
  );
}

function ApproveTab({
  records,
  onApprove,
  onReject,
}: {
  records: OrgHistoryRecord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const theme = useTheme();
  const pending = records.filter((record) => NEEDS_ACTION_STATUSES.has(record.status));

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Pending Approvals</ThemedText>
      {pending.length === 0 ? (
        <ThemedText type="body" themeColor="textSecondary">
          No pending approvals.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {pending.map((record) => (
            <ThemedView key={record.id} type="backgroundElement" style={styles.approveCard}>
              <OrgHistoryRow
                volunteerName={record.volunteerName}
                eventTitle={record.eventTitle}
                date={record.date}
                hours={record.hours}
                status={record.status}
              />
              <View style={styles.approveActions}>
                <Pressable
                  onPress={() => onReject(record.id)}
                  style={[styles.actionButton, { borderColor: theme.border }]}>
                  <ThemedText type="bodyBold">Reject</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => onApprove(record.id)}
                  style={[styles.actionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  <ThemedText type="bodyBold" themeColor="background">
                    Approve
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))}
        </ThemedView>
      )}
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
        const dotColor = filter.key === 'verified' ? theme.success : filter.key === 'pending' ? theme.warning : theme.error;

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

function RosterRow({ volunteerName, hours, status }: { volunteerName: string; hours?: number; status: HistoryStatus }) {
  return (
    <ThemedView type="backgroundElement" style={styles.rosterRow}>
      <ThemedText type="bodyBold" style={styles.rosterName} numberOfLines={1}>
        {volunteerName}
      </ThemedText>
      {hours !== undefined && (
        <ThemedText type="caption" themeColor="textSecondary">
          {hours} hrs
        </ThemedText>
      )}
      <VerificationBadge status={status} size="sm" />
    </ThemedView>
  );
}

function HistoryTab({ records }: { records: OrgHistoryRecord[] }) {
  const [activeFilters, setActiveFilters] = useState<Set<HistoryFilterKey>>(ALL_HISTORY_FILTERS);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

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

  const groups = buildEventGroups(records);

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Historical Events</ThemedText>
      <HistoryFilterChips active={activeFilters} onToggle={toggleFilter} />
      {groups.length === 0 ? (
        <ThemedText type="body" themeColor="textSecondary">
          No historical events yet.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {groups.map((group) => {
            const visibleRecords = group.records.filter((record) =>
              activeFilters.has(record.status as HistoryFilterKey),
            );
            if (visibleRecords.length === 0) {
              return null;
            }
            const expanded = expandedEventId === group.eventId;
            const toggleExpanded = () => setExpandedEventId(expanded ? null : group.eventId);

            return (
              <View key={group.eventId} style={styles.eventGroup}>
                {group.event ? (
                  <EventCard {...group.event} time={group.event.startTime} onPress={toggleExpanded} />
                ) : (
                  <Pressable onPress={toggleExpanded} style={styles.fallbackEventCard}>
                    <ThemedText type="h3">{group.eventTitle}</ThemedText>
                  </Pressable>
                )}
                {expanded && (
                  <ThemedView style={styles.rosterList}>
                    {visibleRecords.map((record) => (
                      <RosterRow
                        key={record.id}
                        volunteerName={record.volunteerName}
                        hours={record.hours}
                        status={record.status}
                      />
                    ))}
                  </ThemedView>
                )}
              </View>
            );
          })}
        </ThemedView>
      )}
    </ThemedView>
  );
}

export default function OrgYouScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('approve');
  const [records, setRecords] = useState<OrgHistoryRecord[]>(MOCK_ORG_HISTORY);
  const { activeOrganization } = useOrganization();

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('approve');
    }, []),
  );

  const updateStatus = (id: string, status: HistoryStatus) => {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, status } : record)));
  };

  const handleApprove = (id: string) => updateStatus(id, 'verified');

  const handleReject = (id: string) => updateStatus(id, 'no-show');

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText type="h1" style={styles.pageTitle}>
          {activeOrganization.name}
        </ThemedText>
        <SwitchToPersonalButton />
      </View>

      <SegmentedTabs tabs={ORG_YOU_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'approve' && <ApproveTab records={records} onApprove={handleApprove} onReject={handleReject} />}
      {activeTab === 'history' && <HistoryTab records={records} />}
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
    flexWrap: 'wrap',
    rowGap: Spacing.two,
    marginBottom: Spacing.one,
    gap: Spacing.two,
  },
  pageTitle: {
    marginBottom: 0,
    flexShrink: 1,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  approveCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  approveActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
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
  eventGroup: {
    gap: Spacing.two,
  },
  fallbackEventCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
  },
  rosterList: {
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rosterName: {
    flex: 1,
  },
});
