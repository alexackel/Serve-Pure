import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
      return row.verified_by_role === 'group_admin' ? 'admin-approved' : 'verified';
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
  approveMemberRecord: (groupId: string, memberId: string, recordId: string) => Promise<{ error: string | null }>;
  rejectMemberRecord: (groupId: string, memberId: string, recordId: string) => Promise<{ error: string | null }>;
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

  const approveMemberRecord = useCallback(
    async (_groupId: string, _memberId: string, recordId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase
        .from('attendance_records')
        .update({ status: 'verified', verified_by: session.user.id, verified_by_role: 'group_admin', verified_at: new Date().toISOString() })
        .eq('id', recordId);
      return { error: error ? error.message : null };
    },
    [session],
  );

  const rejectMemberRecord = useCallback(
    async (_groupId: string, _memberId: string, recordId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase
        .from('attendance_records')
        .update({ status: 'no_show', verified_by: session.user.id, verified_by_role: 'group_admin', verified_at: new Date().toISOString() })
        .eq('id', recordId);
      return { error: error ? error.message : null };
    },
    [session],
  );

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
      approveMemberRecord,
      rejectMemberRecord,
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
      approveMemberRecord,
      rejectMemberRecord,
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
