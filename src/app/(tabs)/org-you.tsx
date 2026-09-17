import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useFocusEffect } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { EventCard, VerificationBadge } from '@/components/cards';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { HistoryFilterChips } from '@/components/history-filter-chips';
import { MetaRow } from '@/components/meta-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { SwitchViewModeButton } from '@/components/switch-view-mode-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { type HistoryStatus } from '@/context/history-context';
import { type NewEventDraft, type OrgHistoryRecord, useOrgHistory } from '@/context/org-history-context';
import { useOrganization } from '@/context/organization-context';
import type { EventDetail } from '@/data/mock-events';
import { useTheme } from '@/hooks/use-theme';
import { useToggleSet } from '@/hooks/use-toggle-set';
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
  isPast: boolean;
  records: OrgHistoryRecord[];
};

function buildEventGroups(records: OrgHistoryRecord[], events: EventDetail[]): EventGroup[] {
  const groups = new Map<string, EventGroup>();
  const now = new Date();

  for (const record of records) {
    if (!HISTORY_VISIBLE_STATUSES.has(record.status)) {
      continue;
    }
    // Unlinked self-reports have no eventId to share — each one forms its
    // own singleton group, keyed by its own record id instead.
    const groupKey = record.eventId ?? record.id;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.records.push(record);
    } else {
      const event = record.eventId ? events.find((event) => event.id === record.eventId) : undefined;
      // A record exists the moment someone registers, so this list also
      // includes upcoming events with a pending signup — only an event whose
      // end time has already passed should read as "Completed" rather than
      // "Available"/"Full".
      const isPast = event ? parseEventDateTime(event.date, event.endTime ?? event.startTime, now) < now : true;
      groups.set(groupKey, {
        eventId: groupKey,
        eventTitle: record.eventTitle,
        event,
        isPast,
        records: [record],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.event ? parseEventDateTime(a.event.date, a.event.startTime, now).getTime() : 0;
    const bTime = b.event ? parseEventDateTime(b.event.date, b.event.startTime, now).getTime() : 0;
    return bTime - aTime;
  });
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
      <ConfirmCancelRow
        confirmLabel="Create & Verify"
        onCancel={onCancel}
        onConfirm={handleCreate}
        style={styles.panelActions}
      />
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
  onLinkToEvent: (id: string, eventId: string) => void;
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
            onLinkToEvent(record.id, event.id);
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
  onLinkToEvent: (id: string, eventId: string) => void;
  onCreateEvent: (id: string, draft: NewEventDraft) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.approveCard, CardShadow]}>
      <View style={styles.approveHeader}>
        <Avatar size={40} icon="person" iconSize={18} />
        <View style={styles.approveHeaderInfo}>
          <View style={styles.nameRow}>
            <ThemedText type="bodyBold" numberOfLines={1}>
              {record.volunteerName}
            </ThemedText>
            {record.volunteerVerified && <VerifiedBadge size="sm" />}
          </View>
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
        <ConfirmCancelRow
          cancelLabel="Reject"
          confirmLabel="Approve"
          onCancel={() => onReject(record.id)}
          onConfirm={() => onApprove(record.id)}
        />
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
  onLinkToEvent: (id: string, eventId: string) => void;
  onCreateEvent: (id: string, draft: NewEventDraft) => void;
}) {
  const pending = records.filter((record) => NEEDS_ACTION_STATUSES.has(record.status));
  const eventsById = useMemo(() => new Map(orgEvents.map((event) => [event.id, event])), [orgEvents]);

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
              event={record.eventId ? eventsById.get(record.eventId) : undefined}
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

function RosterRow({
  volunteerName,
  volunteerVerified,
  hours,
  status,
}: {
  volunteerName: string;
  volunteerVerified: boolean;
  hours?: number;
  status: HistoryStatus;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.rosterRow}>
      <View style={styles.rosterNameRow}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {volunteerName}
        </ThemedText>
        {volunteerVerified && <VerifiedBadge size="sm" />}
      </View>
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
  const [activeFilters, toggleFilter] = useToggleSet(ALL_HISTORY_FILTERS);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const groups = useMemo(() => buildEventGroups(records, events), [records, events]);

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Historical Events</ThemedText>
      <HistoryFilterChips filters={HISTORY_FILTERS} active={activeFilters} onToggle={toggleFilter} />
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
                  <EventCard
                    {...group.event}
                    time={group.event.startTime}
                    status={group.isPast ? 'completed' : group.event.status}
                    onPress={toggleExpanded}
                  />
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
                        volunteerVerified={record.volunteerVerified}
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
  const [orgEvents, setOrgEvents] = useState<EventDetail[]>([]);

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('approve');
    }, []),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activeOrganization) {
        if (!cancelled) setOrgEvents([]);
        return;
      }
      try {
        const events = await getOrgEvents(activeOrganization.id);
        if (!cancelled) setOrgEvents(events);
      } catch (error) {
        console.error('Failed to load org events', error);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // Also refetches whenever `records` changes (e.g. after
    // createEventFromRecord posts a new event) so a just-created event shows
    // up without navigating away and back.
  }, [activeOrganization, getOrgEvents, records]);

  if (!activeOrganization) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <ThemedText type="h1" style={styles.pageTitle}>
          Organization
        </ThemedText>
        <SwitchViewModeButton target="personal" />
        <ThemedText type="body" themeColor="textSecondary">
          You don&apos;t admin any organizations yet.
        </ThemedText>
      </ScreenScrollView>
    );
  }

  const orgRecords = records.filter((record) => record.orgId === activeOrganization.id);

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText type="h1" style={styles.pageTitle}>
          {activeOrganization.name}
        </ThemedText>
      </View>

      <SwitchViewModeButton target="personal" />

      <SegmentedTabs tabs={ORG_YOU_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'approve' && (
        <ApproveTab
          records={orgRecords}
          orgEvents={orgEvents}
          onApprove={approveRecord}
          onReject={rejectRecord}
          onLinkToEvent={linkRecordToEvent}
          onCreateEvent={createEventFromRecord}
        />
      )}
      {activeTab === 'history' && <HistoryTab records={orgRecords} events={orgEvents} />}
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  eventDetails: {
    gap: Spacing.one,
  },
  metaList: {
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
  rosterNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
