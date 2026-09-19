import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { formatShortDate } from '@/utils/dates';

export type HistoryStatus =
  | 'verified'
  | 'pending'
  | 'self-uploaded'
  | 'admin-approved'
  | 'no-show'
  | 'appealed'
  | 'cancelled';

export type HistoryRecord = {
  id: string;
  organization: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
  category?: string;
  photoUrl?: string;
  likes?: number;
  note?: string;
};

const ATTENDANCE_SELECT =
  'id, source, status, activity_org_name, hours_claimed, hours_awarded, verified_by_role, category, photo_url, created_at, events(start_at, organizations(name))';

type AttendanceSource = 'platform_registration' | 'self_reported';
type AttendanceStatus = 'pending' | 'verified' | 'partial' | 'no_show' | 'appealed' | 'rejected' | 'cancelled';

type AttendanceRow = {
  id: string;
  source: AttendanceSource;
  status: AttendanceStatus;
  activity_org_name: string | null;
  hours_claimed: number | null;
  hours_awarded: number | null;
  verified_by_role: string | null;
  category: string | null;
  photo_url: string | null;
  created_at: string;
  events: { start_at: string; organizations: { name: string } | null } | null;
};

// verification_status (DB) -> HistoryStatus (UI). A group-admin-verified row
// is surfaced as 'admin-approved' rather than plain 'verified' so Analytics/
// filter views can still break it out, matching the old mock behavior.
// 'rejected' (a declined self-report) has no distinct UI bucket — treated as
// 'no-show' since both mean "not credited."
function mapHistoryStatus(row: AttendanceRow): HistoryStatus {
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

function mapHistoryRecord(row: AttendanceRow): HistoryRecord {
  const organization = row.events?.organizations?.name ?? row.activity_org_name ?? 'Unknown organization';
  const status = mapHistoryStatus(row);
  const date = formatShortDate(new Date(row.events?.start_at ?? row.created_at));

  return {
    id: row.id,
    organization,
    date,
    status,
    hours: row.hours_awarded ?? row.hours_claimed ?? undefined,
    category: row.category ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    note: status === 'cancelled' ? `You cancelled your registration for ${organization}` : undefined,
  };
}

type HistoryContextValue = {
  records: HistoryRecord[];
  isLoading: boolean;
  reliabilityScore: number | null;
  refetch: () => void;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [reliabilityScore, setReliabilityScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Bumped by refetch() to re-run the effect below on demand (e.g. after
  // deleting a self-report) without calling a hoisted setState-containing
  // function directly from inside an effect body.
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session) {
        if (!cancelled) {
          setRecords([]);
          setReliabilityScore(null);
          setIsLoading(false);
        }
        return;
      }

      const [recordsResult, scoreResult] = await Promise.all([
        supabase
          .from('attendance_records')
          .select(ATTENDANCE_SELECT)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_reliability_score', { p_user_id: session.user.id }),
      ]);

      if (cancelled) return;

      if (recordsResult.error) {
        console.error('Failed to load history', recordsResult.error);
      } else {
        setRecords(((recordsResult.data ?? []) as unknown as AttendanceRow[]).map(mapHistoryRecord));
      }

      if (scoreResult.error) {
        console.error('Failed to load reliability score', scoreResult.error);
      } else {
        setReliabilityScore(scoreResult.data);
      }

      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session, reloadNonce]);

  const value = useMemo(
    () => ({ records, isLoading, reliabilityScore, refetch: () => setReloadNonce((n) => n + 1) }),
    [records, isLoading, reliabilityScore],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
