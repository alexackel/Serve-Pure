import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useFocusEffect } from 'expo-router';
import { useTabTrigger } from 'expo-router/ui';

import { EventCard, VerificationBadge } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { type HistoryStatus } from '@/context/history-context';
import { type NewEventDraft, useOrgHistory } from '@/context/org-history-context';
import { useOrganization } from '@/context/organization-context';
import type { EventDetail } from '@/data/mock-events';
import type { OrgHistoryRecord } from '@/data/mock-org-history';
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
  event?: EventDetail;
  records: OrgHistoryRecord[];
};

function buildEventGroups(records: OrgHistoryRecord[], events: EventDetail[]): EventGroup[] {
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
        event: events.find((event) => event.id === record.eventId),
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

function VolunteerAvatar() {
  const theme = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
      <Ionicons name="person" size={18} color={theme.primary} />
    </View>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <ThemedText type="caption" themeColor="textSecondary">
        {text}
      </ThemedText>
    </View>
  );
}

function EventPicker({ events, onSelect }: { events: EventDetail[]; onSelect: (event: EventDetail) => void }) {
  const theme = useTheme();

  if (events.length === 0) {
    return (
      <View style={[styles.panel, { borderColor: theme.border }]}>
        <ThemedText type="caption" themeColor="textSecondary">
          You haven&apos;t posted any events yet — try Create New Event instead.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { borderColor: theme.border }]}>
      <ThemedText type="label" themeColor="textSecondary">
        Link these hours to:
      </ThemedText>
      {events.map((event) => (
        <Pressable
          key={event.id}
          onPress={() => onSelect(event)}
          style={[styles.pickerRow, { borderColor: theme.border }]}>
          <View style={styles.pickerRowInfo}>
            <ThemedText type="bodyBold" numberOfLines={1}>
              {event.title}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {event.date}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </Pressable>
      ))}
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border },
          multiline && styles.inputMultiline,
        ]}
      />
    </View>
  );
}

function CreateEventForm({
  record,
  onCreate,
  onCancel,
}: {
  record: OrgHistoryRecord;
  onCreate: (draft: NewEventDraft) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(record.eventTitle);
  const [date, setDate] = useState(record.date);
  const [hours, setHours] = useState(record.hours !== undefined ? String(record.hours) : '');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim() || !date.trim() || !location.trim()) {
      setError('Title, date, and location are required.');
      return;
    }

    const parsedHours = hours.trim() ? Number(hours) : undefined;
    if (hours.trim() && (Number.isNaN(parsedHours) || (parsedHours as number) < 0)) {
      setError('Enter a valid number of hours.');
      return;
    }

    onCreate({
      title: title.trim(),
      date: date.trim(),
      hours: parsedHours,
      location: location.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <View style={[styles.panel, { borderColor: theme.border }]}>
      <ThemedText type="label" themeColor="textSecondary">
        New event details
      </ThemedText>
      <FormField label="Title" value={title} onChangeText={setTitle} />
      <FormField label="Date" value={date} onChangeText={setDate} placeholder="e.g. Aug 5" />
      <FormField label="Hours" value={hours} onChangeText={setHours} placeholder="Optional" keyboardType="numeric" />
      <FormField label="Location" value={location} onChangeText={setLocation} placeholder="Required" />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        multiline
      />
      {error && (
        <ThemedText type="caption" themeColor="error">
          {error}
        </ThemedText>
      )}
      <View style={styles.panelActions}>
        <Pressable onPress={onCancel} style={[styles.actionButton, { borderColor: theme.border }]}>
          <ThemedText type="bodyBold">Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          style={[styles.actionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            Create &amp; Verify
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function SelfUploadedActions({
  record,
  orgEvents,
  onApprove,
  onReject,
  onLinkToEvent,
  onCreateEvent,
}: {
  record: OrgHistoryRecord;
  orgEvents: EventDetail[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLinkToEvent: (id: string, event: EventDetail) => void;
  onCreateEvent: (id: string, draft: NewEventDraft) => void;
}) {
  const theme = useTheme();
  const [panel, setPanel] = useState<'none' | 'add' | 'create'>('none');
  const closePanel = () => setPanel('none');

  return (
    <View style={styles.selfUploadedActions}>
      <View style={styles.primaryActionsRow}>
        <Pressable
          onPress={() => setPanel(panel === 'add' ? 'none' : 'add')}
          style={[styles.actionButtonSmall, { borderColor: panel === 'add' ? theme.primary : theme.border }]}>
          <ThemedText type="label" themeColor={panel === 'add' ? 'primary' : 'text'}>
            Add to Event
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setPanel(panel === 'create' ? 'none' : 'create')}
          style={[styles.actionButtonSmall, { borderColor: panel === 'create' ? theme.primary : theme.border }]}>
          <ThemedText type="label" themeColor={panel === 'create' ? 'primary' : 'text'}>
            Create New Event
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => onApprove(record.id)}
          style={[styles.actionButtonSmall, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          <ThemedText type="label" themeColor="background">
            Approve
          </ThemedText>
        </Pressable>
      </View>

      <Pressable onPress={() => onReject(record.id)} hitSlop={4} style={styles.rejectLink}>
        <ThemedText type="label" themeColor="error">
          Reject report
        </ThemedText>
      </Pressable>

      {panel === 'add' && (
        <EventPicker
          events={orgEvents}
          onSelect={(event) => {
            onLinkToEvent(record.id, event);
            closePanel();
          }}
        />
      )}
      {panel === 'create' && (
        <CreateEventForm
          record={record}
          onCancel={closePanel}
          onCreate={(draft) => {
            onCreateEvent(record.id, draft);
            closePanel();
          }}
        />
      )}
    </View>
  );
}

function ApprovalCard({
  record,
  event,
  orgEvents,
  onApprove,
  onReject,
  onLinkToEvent,
  onCreateEvent,
}: {
  record: OrgHistoryRecord;
  event?: EventDetail;
  orgEvents: EventDetail[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLinkToEvent: (id: string, event: EventDetail) => void;
  onCreateEvent: (id: string, draft: NewEventDraft) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.approveCard, CardShadow]}>
      <View style={styles.approveHeader}>
        <VolunteerAvatar />
        <View style={styles.approveHeaderInfo}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {record.volunteerName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {record.date}
            {record.hours !== undefined ? ` · ${record.hours} hrs` : ''}
          </ThemedText>
        </View>
        <VerificationBadge status={record.status} />
      </View>

      <View style={styles.eventDetails}>
        <ThemedText type="bodyBold">{event ? event.title : record.eventTitle}</ThemedText>
        {event ? (
          <View style={styles.metaList}>
            <MetaRow
              icon="calendar-outline"
              text={event.startTime ? `${event.date} · ${event.startTime}` : event.date}
            />
            <MetaRow icon="location-outline" text={event.location} />
            {event.hours !== undefined && <MetaRow icon="time-outline" text={`${event.hours} hrs`} />}
          </View>
        ) : (
          <View style={styles.metaList}>
            <MetaRow icon="calendar-outline" text={record.date} />
            <MetaRow icon="alert-circle-outline" text="Not linked to one of your posted events" />
          </View>
        )}
        {record.note && (
          <View style={[styles.noteBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.noteText}>
              {record.note}
            </ThemedText>
          </View>
        )}
      </View>

      {record.status === 'self-uploaded' ? (
        <SelfUploadedActions
          record={record}
          orgEvents={orgEvents}
          onApprove={onApprove}
          onReject={onReject}
          onLinkToEvent={onLinkToEvent}
          onCreateEvent={onCreateEvent}
        />
      ) : (
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
      )}
    </ThemedView>
  );
}

function ApproveTab({
  records,
  orgEvents,
  onApprove,
  onReject,
  onLinkToEvent,
  onCreateEvent,
}: {
  records: OrgHistoryRecord[];
  orgEvents: EventDetail[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLinkToEvent: (id: string, event: EventDetail) => void;
  onCreateEvent: (id: string, draft: NewEventDraft) => void;
}) {
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
            <ApprovalCard
              key={record.id}
              record={record}
              event={orgEvents.find((event) => event.id === record.eventId)}
              orgEvents={orgEvents}
              onApprove={onApprove}
              onReject={onReject}
              onLinkToEvent={onLinkToEvent}
              onCreateEvent={onCreateEvent}
            />
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

function HistoryTab({ records, events }: { records: OrgHistoryRecord[]; events: EventDetail[] }) {
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

  const groups = buildEventGroups(records, events);

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
  const { activeOrganization } = useOrganization();
  const { records, getOrgEvents, approveRecord, rejectRecord, linkRecordToEvent, createEventFromRecord } =
    useOrgHistory();

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('approve');
    }, []),
  );

  const orgEvents = getOrgEvents(activeOrganization.id);

  const handleCreateEvent = (id: string, draft: NewEventDraft) => createEventFromRecord(id, activeOrganization, draft);

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText type="h1" style={styles.pageTitle}>
          {activeOrganization.name}
        </ThemedText>
      </View>

      <SwitchToPersonalButton />

      <SegmentedTabs tabs={ORG_YOU_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'approve' && (
        <ApproveTab
          records={records}
          orgEvents={orgEvents}
          onApprove={approveRecord}
          onReject={rejectRecord}
          onLinkToEvent={linkRecordToEvent}
          onCreateEvent={handleCreateEvent}
        />
      )}
      {activeTab === 'history' && <HistoryTab records={records} events={orgEvents} />}
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
    alignSelf: 'flex-start',
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  approveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  approveHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    gap: Spacing.one,
  },
  metaList: {
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
  noteText: {
    flex: 1,
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
  selfUploadedActions: {
    gap: Spacing.two,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButtonSmall: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  rejectLink: {
    alignSelf: 'flex-start',
  },
  panel: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  pickerRowInfo: {
    flex: 1,
    gap: 2,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  panelActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
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
