import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';

import { useSession } from '@/context/auth-context';
import type { HistoryStatus } from '@/context/history-context';
import { supabase } from '@/lib/supabase';
import { formatShortDate } from '@/utils/dates';

export type Group = {
  id: string;
  name: string;
  memberCount: number;
  parentGroupId: string | null;
};

export type GroupMemberRecord = {
  id: string;
  eventTitle: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
  note?: string;
};

export type GroupMember = {
  id: string;
  fullName: string;
  verified: boolean;
  isAdmin: boolean;
  records: GroupMemberRecord[];
};

type MemberAttendanceStatus = 'pending' | 'verified' | 'partial' | 'no_show' | 'appealed' | 'rejected' | 'cancelled';

type MemberRow = { user_id: string; profiles: { full_name: string; identity_verified: boolean } | null };

type MemberRecordRow = {
  id: string;
  user_id: string;
  activity_title: string | null;
  status: MemberAttendanceStatus;
  hours_claimed: number | null;
  hours_awarded: number | null;
  source: 'platform_registration' | 'self_reported';
  notes: string | null;
  verified_by_role: string | null;
  created_at: string;
  events: { title: string; start_at: string } | null;
};

function mapMemberStatus(row: MemberRecordRow): HistoryStatus {
  switch (row.status) {
    case 'pending':
      return row.source === 'self_reported' ? 'self-uploaded' : 'pending';
    case 'verified':
    case 'partial':
      return row.verified_by_role === 'event_organizer'
        ? 'personal'
        : row.verified_by_role === 'group_admin'
          ? 'admin-approved'
          : 'verified';
    case 'no_show':
    case 'rejected':
      return 'no-show';
    case 'appealed':
      return 'appealed';
    case 'cancelled':
      return 'cancelled';
  }
}

function mapMemberRecord(row: MemberRecordRow): GroupMemberRecord {
  return {
    id: row.id,
    eventTitle: row.events?.title ?? row.activity_title ?? 'Self-reported activity',
    date: formatShortDate(new Date(row.events?.start_at ?? row.created_at)),
    status: mapMemberStatus(row),
    hours: row.hours_awarded ?? row.hours_claimed ?? undefined,
    note: row.notes ?? undefined,
  };
}

// A member's total hours is always derived from their records — never stored
// separately — so the leaderboard/detail totals can't drift out of sync with
// the itemized data that backs them.
export function sumMemberHours(member: GroupMember): number {
  return member.records.reduce((sum, record) => sum + (record.hours ?? 0), 0);
}

// Shared by the member-level and group-level hours breakdowns so the two
// screens can't compute status totals two different ways and drift apart.
export function sumHoursByStatusMap(records: GroupMemberRecord[]): Partial<Record<HistoryStatus, number>> {
  return records.reduce(
    (acc, record) => {
      acc[record.status] = (acc[record.status] ?? 0) + (record.hours ?? 0);
      return acc;
    },
    {} as Partial<Record<HistoryStatus, number>>,
  );
}

export type ReviewQueueItem = {
  reviewId: string;
  recordId: string;
  memberId: string;
  memberName: string;
  memberVerified: boolean;
  eventTitle: string;
  date: string;
  hours?: number;
  status: HistoryStatus;
};

export type ReviewDetail = {
  reviewId: string;
  recordId: string;
  groupId: string;
  memberName: string;
  memberVerified: boolean;
  activityTitle: string;
  activityOrgName: string | null;
  category: string | null;
  date: string;
  hoursClaimed: number;
  notes: string | null;
  photoUrl: string | null;
  orgContactEmail: string | null;
  orgContactPhone: string | null;
  reviewerConflict: boolean;
};

// Postgres errors from the review-group trigger (self-dealing block) surface
// as raw exception text — translate the one a group admin can actually hit
// into something readable, matching registrations-context.tsx's
// friendlyRegistrationError for the same errcode.
function friendlyGroupReviewError(error: PostgrestError): string {
  if (error.code === '23514' || error.message.includes('self_dealing_violation')) {
    return "You can't review this submission because you're the submitter or their registered guardian. Skip it for another admin to review.";
  }
  return error.message;
}

type GroupsContextValue = {
  groups: Group[];
  myGroupIds: string[];
  isLoading: boolean;
  createGroup: (name: string) => Promise<{ id: string | null; error: string | null }>;
  createSubgroup: (parentGroupId: string, name: string) => Promise<{ id: string | null; error: string | null }>;
  deleteGroup: (groupId: string) => Promise<{ error: string | null }>;
  removeMember: (groupId: string, memberId: string) => Promise<{ error: string | null }>;
  isAdmin: (groupId: string) => boolean;
  getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
  getGroupReviewQueue: (groupId: string) => Promise<ReviewQueueItem[]>;
  getReviewItem: (reviewId: string) => Promise<ReviewDetail | null>;
  approveReview: (reviewId: string) => Promise<{ error: string | null }>;
  denyReview: (reviewId: string, allowReupload: boolean, reason?: string) => Promise<{ error: string | null }>;
};

const GroupsContext = createContext<GroupsContextValue | null>(null);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [adminGroupIds, setAdminGroupIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!session) {
      setGroups([]);
      setMyGroupIds([]);
      setAdminGroupIds(new Set());
      return;
    }

    const [groupsResult, memberRowsResult, adminRowsResult] = await Promise.all([
      supabase.from('groups').select('id, name, parent_group_id'),
      supabase.from('group_members').select('group_id, user_id').is('left_at', null),
      supabase.from('group_admins').select('group_id').eq('user_id', session.user.id),
    ]);

    if (groupsResult.error || memberRowsResult.error || adminRowsResult.error) {
      console.error('Failed to load groups', groupsResult.error ?? memberRowsResult.error ?? adminRowsResult.error);
      return;
    }

    const memberRows = memberRowsResult.data ?? [];
    const countByGroup = new Map<string, number>();
    for (const row of memberRows) {
      countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);
    }

    setGroups(
      (groupsResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        parentGroupId: row.parent_group_id,
        memberCount: countByGroup.get(row.id) ?? 0,
      })),
    );
    setMyGroupIds(memberRows.filter((row) => row.user_id === session.user.id).map((row) => row.group_id));
    setAdminGroupIds(new Set((adminRowsResult.data ?? []).map((row) => row.group_id)));
  }, [session]);

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

  const createGroup = useCallback(
    async (name: string) => {
      if (!session) return { id: null, error: 'You must be signed in.' };
      const { data, error } = await supabase.from('groups').insert({ name, created_by: session.user.id }).select('id').single();
      if (error) return { id: null, error: error.message };
      await refetch();
      return { id: data.id as string, error: null };
    },
    [session, refetch],
  );

  const createSubgroup = useCallback(
    async (parentGroupId: string, name: string) => {
      if (!session) return { id: null, error: 'You must be signed in.' };
      const { data, error } = await supabase
        .from('groups')
        .insert({ name, created_by: session.user.id, parent_group_id: parentGroupId })
        .select('id')
        .single();
      if (error) return { id: null, error: error.message };
      await refetch();
      return { id: data.id as string, error: null };
    },
    [session, refetch],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [refetch],
  );

  const removeMember = useCallback(
    async (groupId: string, memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({ left_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', memberId);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [refetch],
  );

  const isAdmin = useCallback((groupId: string) => adminGroupIds.has(groupId), [adminGroupIds]);

  const getGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    const [memberResult, adminResult] = await Promise.all([
      supabase.from('group_members').select('user_id, profiles(full_name, identity_verified)').eq('group_id', groupId).is('left_at', null),
      supabase.from('group_admins').select('user_id').eq('group_id', groupId),
    ]);

    if (memberResult.error) {
      console.error('Failed to load group members', memberResult.error);
      return [];
    }

    const members = (memberResult.data ?? []) as unknown as MemberRow[];
    const memberIds = members.map((row) => row.user_id);
    const memberAdminIds = new Set((adminResult.data ?? []).map((row) => row.user_id));
    if (memberIds.length === 0) return [];

    const { data: recordData, error: recordError } = await supabase
      .from('attendance_records')
      .select(
        'id, user_id, activity_title, status, hours_claimed, hours_awarded, source, notes, verified_by_role, created_at, events(title, start_at)',
      )
      .in('user_id', memberIds);

    if (recordError) {
      console.error('Failed to load member records', recordError);
    }

    const recordsByUser = new Map<string, GroupMemberRecord[]>();
    for (const row of (recordData ?? []) as unknown as MemberRecordRow[]) {
      const list = recordsByUser.get(row.user_id) ?? [];
      list.push(mapMemberRecord(row));
      recordsByUser.set(row.user_id, list);
    }

    return members.map((row) => ({
      id: row.user_id,
      fullName: row.profiles?.full_name ?? 'Unknown member',
      verified: row.profiles?.identity_verified ?? false,
      isAdmin: memberAdminIds.has(row.user_id),
      records: recordsByUser.get(row.user_id) ?? [],
    }));
  }, []);

  // Sourced from attendance_report_groups (0035) rather than
  // getGroupMembers' attendance_records list, so a group's queue only ever
  // shows submissions actually routed to IT — the whole point of explicit
  // multi-group routing. Oldest-entered-pending-state first, so a fresh
  // submission and a just-resubmitted one both queue up FIFO.
  const getGroupReviewQueue = useCallback(async (groupId: string): Promise<ReviewQueueItem[]> => {
    const { data, error } = await supabase
      .from('attendance_report_groups')
      .select(
        'id, status_updated_at, attendance_records(id, user_id, activity_title, hours_claimed, hours_awarded, created_at, profiles!user_id(full_name, identity_verified))',
      )
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('status_updated_at', { ascending: true });

    if (error) {
      console.error('Failed to load review queue', error);
      return [];
    }

    type QueueRow = {
      id: string;
      attendance_records: {
        id: string;
        user_id: string;
        activity_title: string | null;
        hours_claimed: number | null;
        hours_awarded: number | null;
        created_at: string;
        profiles: { full_name: string; identity_verified: boolean } | null;
      } | null;
    };

    return ((data ?? []) as unknown as QueueRow[])
      .filter((row): row is QueueRow & { attendance_records: NonNullable<QueueRow['attendance_records']> } => row.attendance_records !== null)
      .map((row) => ({
        reviewId: row.id,
        recordId: row.attendance_records.id,
        memberId: row.attendance_records.user_id,
        memberName: row.attendance_records.profiles?.full_name ?? 'Unknown member',
        memberVerified: row.attendance_records.profiles?.identity_verified ?? false,
        eventTitle: row.attendance_records.activity_title ?? 'Self-reported activity',
        date: formatShortDate(new Date(row.attendance_records.created_at)),
        hours: row.attendance_records.hours_awarded ?? row.attendance_records.hours_claimed ?? undefined,
        status: 'self-uploaded' as HistoryStatus,
      }));
  }, []);

  const getReviewItem = useCallback(async (reviewId: string): Promise<ReviewDetail | null> => {
    const [{ data, error }, conflictResult] = await Promise.all([
      supabase
        .from('attendance_report_groups')
        .select(
          'id, group_id, attendance_records(id, user_id, activity_title, activity_org_name, category, hours_claimed, notes, photo_url, created_at, org_contact_email, org_contact_phone, profiles!user_id(full_name, identity_verified))',
        )
        .eq('id', reviewId)
        .maybeSingle(),
      supabase.rpc('can_review_group_report', { p_report_group_id: reviewId }),
    ]);

    if (error) {
      console.error('Failed to load review item', error);
      return null;
    }
    if (!data || !data.attendance_records) return null;

    const record = data.attendance_records as unknown as {
      id: string;
      user_id: string;
      activity_title: string | null;
      activity_org_name: string | null;
      category: string | null;
      hours_claimed: number | null;
      notes: string | null;
      photo_url: string | null;
      created_at: string;
      org_contact_email: string | null;
      org_contact_phone: string | null;
      profiles: { full_name: string; identity_verified: boolean } | null;
    };

    return {
      reviewId: data.id,
      recordId: record.id,
      groupId: data.group_id,
      memberName: record.profiles?.full_name ?? 'Unknown member',
      memberVerified: record.profiles?.identity_verified ?? false,
      activityTitle: record.activity_title ?? 'Self-reported activity',
      activityOrgName: record.activity_org_name,
      category: record.category,
      date: formatShortDate(new Date(record.created_at)),
      hoursClaimed: record.hours_claimed ?? 0,
      notes: record.notes,
      photoUrl: record.photo_url,
      orgContactEmail: record.org_contact_email,
      orgContactPhone: record.org_contact_phone,
      // Fail open on this proactive check alone (treat an RPC error as "no
      // conflict") — the actual enforcement is still the DB trigger on
      // approve/deny, this only decides whether to offer those buttons.
      reviewerConflict: conflictResult.data === false,
    };
  }, []);

  // Both actions go through review_group_report (0036) — a security definer
  // RPC that does its own group-admin authorization check and is the only
  // path that can move attendance_report_groups.status (clients get no
  // UPDATE grant on the table itself), which is also where the self-dealing
  // hard block (0035) is enforced regardless of call path.
  const approveReview = useCallback(async (reviewId: string) => {
    const { error } = await supabase.rpc('review_group_report', {
      p_report_group_id: reviewId,
      p_decision: 'approved',
    });
    return { error: error ? friendlyGroupReviewError(error) : null };
  }, []);

  const denyReview = useCallback(async (reviewId: string, allowReupload: boolean, reason?: string) => {
    const { error } = await supabase.rpc('review_group_report', {
      p_report_group_id: reviewId,
      p_decision: 'denied',
      p_allow_reupload: allowReupload,
      p_reason: reason ?? null,
    });
    return { error: error ? friendlyGroupReviewError(error) : null };
  }, []);

  const value = useMemo(
    () => ({
      groups,
      myGroupIds,
      isLoading,
      createGroup,
      createSubgroup,
      deleteGroup,
      removeMember,
      isAdmin,
      getGroupMembers,
      getGroupReviewQueue,
      getReviewItem,
      approveReview,
      denyReview,
    }),
    [
      groups,
      myGroupIds,
      isLoading,
      createGroup,
      createSubgroup,
      deleteGroup,
      removeMember,
      isAdmin,
      getGroupMembers,
      getGroupReviewQueue,
      getReviewItem,
      approveReview,
      denyReview,
    ],
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
}
