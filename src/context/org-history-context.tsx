import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import type { HistoryStatus } from '@/context/history-context';
import { useOrganization } from '@/context/organization-context';
import { listOrgEvents } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { supabase } from '@/lib/supabase';
import { formatShortDate, parseRecordDate } from '@/utils/dates';

export type NewEventDraft = {
  title: string;
  date: string;
  hours?: number;
  location: string;
  description?: string;
};

export type OrgHistoryRecord = {
  id: string;
  orgId: string;
  volunteerId: string;
  volunteerName: string;
  volunteerVerified: boolean;
  eventId: string | null;
  eventTitle: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
  note?: string;
};

const RECORD_SELECT =
  'id, org_id, user_id, event_id, activity_title, status, hours_claimed, hours_awarded, source, notes, created_at, profiles!user_id(full_name, identity_verified), events(title, start_at)';

type AttendanceStatus = 'pending' | 'verified' | 'partial' | 'no_show' | 'appealed' | 'rejected' | 'cancelled';

type RecordRow = {
  id: string;
  org_id: string;
  user_id: string;
  event_id: string | null;
  activity_title: string | null;
  status: AttendanceStatus;
  hours_claimed: number | null;
  hours_awarded: number | null;
  source: 'platform_registration' | 'self_reported';
  notes: string | null;
  created_at: string;
  profiles: { full_name: string; identity_verified: boolean } | null;
  events: { title: string; start_at: string } | null;
};

// Simpler than history-context's mapper: an org's own view has no need for
// the 'admin-approved' (group-admin) distinction.
function mapStatus(row: RecordRow): HistoryStatus {
  switch (row.status) {
    case 'pending':
      return row.source === 'self_reported' ? 'self-uploaded' : 'pending';
    case 'verified':
    case 'partial':
      return 'verified';
    case 'no_show':
    case 'rejected':
      return 'no-show';
    case 'appealed':
      return 'appealed';
    case 'cancelled':
      return 'cancelled';
  }
}

function mapRecord(row: RecordRow): OrgHistoryRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    volunteerId: row.user_id,
    volunteerName: row.profiles?.full_name ?? 'Unknown volunteer',
    volunteerVerified: row.profiles?.identity_verified ?? false,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? row.activity_title ?? 'Self-reported activity',
    date: formatShortDate(new Date(row.events?.start_at ?? row.created_at)),
    status: mapStatus(row),
    hours: row.hours_awarded ?? row.hours_claimed ?? undefined,
    note: row.notes ?? undefined,
  };
}

type OrgHistoryContextValue = {
  records: OrgHistoryRecord[];
  isLoading: boolean;
  getOrgEvents: (organizationId: string) => Promise<EventDetail[]>;
  approveRecord: (id: string) => Promise<{ error: string | null }>;
  rejectRecord: (id: string) => Promise<{ error: string | null }>;
  linkRecordToEvent: (id: string, eventId: string) => Promise<{ error: string | null }>;
  createEventFromRecord: (id: string, draft: NewEventDraft) => Promise<{ error: string | null }>;
};

const OrgHistoryContext = createContext<OrgHistoryContextValue | null>(null);

export function OrgHistoryProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { organizations, activeOrganization } = useOrganization();
  const [records, setRecords] = useState<OrgHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const adminOrgIds = useMemo(() => organizations.map((organization) => organization.id), [organizations]);
  const adminOrgIdsKey = adminOrgIds.join(',');

  const refetch = useCallback(async () => {
    if (!session || adminOrgIds.length === 0) {
      setRecords([]);
      return;
    }
    const { data, error } = await supabase
      .from('attendance_records')
      .select(RECORD_SELECT)
      .in('org_id', adminOrgIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load org history', error);
      return;
    }
    setRecords(((data ?? []) as unknown as RecordRow[]).map(mapRecord));
    // adminOrgIds is a fresh array each render; adminOrgIdsKey is its stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, adminOrgIdsKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await refetch();
      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refetch]);

  const getOrgEvents = useCallback((organizationId: string) => listOrgEvents(organizationId), []);

  const approveRecord = useCallback(
    async (id: string) => {
      if (!session) return { error: 'You must be signed in.' };

      // hours_awarded is never set on creation: self-reported rows only carry
      // hours_claimed (what the volunteer entered), and platform_registration
      // rows carry no hours at all until now. Approving must award something,
      // or a verified record silently displays no hours forever (visible as
      // "Verified ... for  hrs" in the volunteer's History).
      const { data: record, error: fetchError } = await supabase
        .from('attendance_records')
        .select('source, hours_claimed, events(start_at, end_at)')
        .eq('id', id)
        .single();
      if (fetchError) return { error: fetchError.message };

      const eventRow = record.events as unknown as { start_at: string; end_at: string } | null;
      const hoursAwarded =
        record.source === 'self_reported'
          ? record.hours_claimed
          : eventRow
            ? Math.round(((new Date(eventRow.end_at).getTime() - new Date(eventRow.start_at).getTime()) / (1000 * 60 * 60)) * 10) / 10
            : null;

      const { error } = await supabase
        .from('attendance_records')
        .update({
          status: 'verified',
          hours_awarded: hoursAwarded,
          verified_by: session.user.id,
          verified_by_role: 'org_admin',
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [session, refetch],
  );

  const rejectRecord = useCallback(
    async (id: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase
        .from('attendance_records')
        .update({ status: 'no_show', verified_by: session.user.id, verified_by_role: 'org_admin', verified_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [session, refetch],
  );

  const linkRecordToEvent = useCallback(
    async (id: string, eventId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase
        .from('attendance_records')
        .update({ event_id: eventId, status: 'verified', linked_by: session.user.id, linked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [session, refetch],
  );

  const createEventFromRecord = useCallback(
    async (id: string, draft: NewEventDraft) => {
      if (!session) return { error: 'You must be signed in.' };
      if (!activeOrganization) return { error: 'No active organization.' };

      const startDate = parseRecordDate(draft.date, new Date());
      if (Number.isNaN(startDate.getTime())) {
        return { error: 'Enter the date as e.g. "Aug 5".' };
      }
      startDate.setHours(9, 0, 0, 0);
      const endDate = new Date(startDate.getTime() + (draft.hours ?? 1) * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('events')
        .insert({
          org_id: activeOrganization.id,
          created_by: session.user.id,
          title: draft.title,
          description: draft.description ?? null,
          address: draft.location,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
        })
        .select('id')
        .single();

      if (error) return { error: error.message };
      return linkRecordToEvent(id, data.id);
    },
    [session, activeOrganization, linkRecordToEvent],
  );

  const value = useMemo(
    () => ({ records, isLoading, getOrgEvents, approveRecord, rejectRecord, linkRecordToEvent, createEventFromRecord }),
    [records, isLoading, getOrgEvents, approveRecord, rejectRecord, linkRecordToEvent, createEventFromRecord],
  );

  return <OrgHistoryContext.Provider value={value}>{children}</OrgHistoryContext.Provider>;
}

export function useOrgHistory() {
  const context = useContext(OrgHistoryContext);
  if (!context) {
    throw new Error('useOrgHistory must be used within an OrgHistoryProvider');
  }
  return context;
}
