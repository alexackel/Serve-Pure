import { supabase } from '@/lib/supabase';
import type {
  AnalyticsEventOption,
  AnalyticsKpis,
  HoursTrendPoint,
  RosterExportRow,
  RosterPage,
  RosterRow,
  RosterSortBy,
  RosterSortDir,
  RosterTag,
} from '@/types/analytics';
import { formatISODate } from '@/utils/dates';

export type AnalyticsRangeParams = {
  orgId: string;
  start: Date;
  end: Date;
  eventId?: string | null;
};

type KpiRow = {
  current_hours_verified: number;
  current_hours_pending: number;
  previous_hours_verified: number;
  previous_hours_pending: number;
  volunteer_hour_rate: number;
  current_active_volunteers: number;
  previous_active_volunteers: number;
  retention_rate: number | null;
  current_checked_in: number;
  current_signed_up: number;
  previous_checked_in: number;
  previous_signed_up: number;
  pending_verifications_count: number;
};

function mapKpiRow(row: KpiRow): AnalyticsKpis {
  return {
    currentHoursVerified: row.current_hours_verified,
    currentHoursPending: row.current_hours_pending,
    previousHoursVerified: row.previous_hours_verified,
    previousHoursPending: row.previous_hours_pending,
    volunteerHourRate: row.volunteer_hour_rate,
    currentActiveVolunteers: row.current_active_volunteers,
    previousActiveVolunteers: row.previous_active_volunteers,
    retentionRate: row.retention_rate,
    currentCheckedIn: row.current_checked_in,
    currentSignedUp: row.current_signed_up,
    previousCheckedIn: row.previous_checked_in,
    previousSignedUp: row.previous_signed_up,
    pendingVerificationsCount: row.pending_verifications_count,
  };
}

export async function fetchOrgAnalyticsKpis({ orgId, start, end, eventId }: AnalyticsRangeParams): Promise<AnalyticsKpis> {
  const { data, error } = await supabase.rpc('get_org_analytics_kpis', {
    p_org_id: orgId,
    p_range_start: formatISODate(start),
    p_range_end: formatISODate(end),
    p_event_id: eventId ?? null,
  });
  if (error) throw error;
  const row = (data as KpiRow[] | null)?.[0];
  if (!row) throw new Error('No analytics data returned.');
  return mapKpiRow(row);
}

type HoursTrendRow = {
  bucket_start: string;
  bucket_granularity: HoursTrendPoint['bucketGranularity'];
  verified_hours: number;
  pending_hours: number;
};

export async function fetchOrgHoursTrend({ orgId, start, end, eventId }: AnalyticsRangeParams): Promise<HoursTrendPoint[]> {
  const { data, error } = await supabase.rpc('get_org_hours_trend', {
    p_org_id: orgId,
    p_range_start: formatISODate(start),
    p_range_end: formatISODate(end),
    p_event_id: eventId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as HoursTrendRow[]).map((row) => ({
    bucketStart: row.bucket_start,
    bucketGranularity: row.bucket_granularity,
    verifiedHours: row.verified_hours,
    pendingHours: row.pending_hours,
  }));
}

type RosterRpcRow = {
  user_id: string;
  full_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  age_bracket: string | null;
  school: string | null;
  group_names: string[] | null;
  first_active_date: string | null;
  last_active_date: string | null;
  verified_hours: number;
  pending_hours: number;
  events_attended: number;
  reliability_score: number | null;
  tags: string[] | null;
  total_count: number;
};

function mapRosterRow(row: RosterRpcRow): RosterRow {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    ageBracket: row.age_bracket,
    school: row.school,
    groupNames: row.group_names ?? [],
    firstActiveDate: row.first_active_date,
    lastActiveDate: row.last_active_date,
    verifiedHours: row.verified_hours,
    pendingHours: row.pending_hours,
    eventsAttended: row.events_attended,
    reliabilityScore: row.reliability_score,
    tags: (row.tags ?? []) as RosterTag[],
  };
}

export type RosterParams = AnalyticsRangeParams & {
  search?: string | null;
  tagFilter?: RosterTag | null;
  sortBy?: RosterSortBy;
  sortDir?: RosterSortDir;
  page?: number;
  pageSize?: number;
};

export async function fetchOrgRoster({
  orgId,
  start,
  end,
  eventId,
  search,
  tagFilter,
  sortBy = 'name',
  sortDir = 'asc',
  page = 0,
  pageSize = 50,
}: RosterParams): Promise<RosterPage> {
  const { data, error } = await supabase.rpc('get_org_roster', {
    p_org_id: orgId,
    p_range_start: formatISODate(start),
    p_range_end: formatISODate(end),
    p_event_id: eventId ?? null,
    p_search: search || null,
    p_tag_filter: tagFilter ?? null,
    p_sort_by: sortBy,
    p_sort_dir: sortDir,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  const rows = (data ?? []) as RosterRpcRow[];
  return { rows: rows.map(mapRosterRow), totalCount: rows[0]?.total_count ?? 0 };
}

type RosterExportRpcRow = {
  full_name: string;
  is_minor: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  age_bracket: string | null;
  school: string | null;
  group_names: string[] | null;
  first_active_date: string | null;
  last_active_date: string | null;
  verified_hours: number;
  pending_hours: number;
  events_attended: number;
  reliability_score: number | null;
  tags: string[] | null;
};

export async function fetchOrgRosterExport({ orgId, start, end, eventId }: AnalyticsRangeParams): Promise<RosterExportRow[]> {
  const { data, error } = await supabase.rpc('get_org_roster_export', {
    p_org_id: orgId,
    p_range_start: formatISODate(start),
    p_range_end: formatISODate(end),
    p_event_id: eventId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as RosterExportRpcRow[]).map((row) => ({
    fullName: row.full_name,
    isMinor: row.is_minor,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    ageBracket: row.age_bracket,
    school: row.school,
    groupNames: row.group_names ?? [],
    firstActiveDate: row.first_active_date,
    lastActiveDate: row.last_active_date,
    verifiedHours: row.verified_hours,
    pendingHours: row.pending_hours,
    eventsAttended: row.events_attended,
    reliabilityScore: row.reliability_score,
    tags: (row.tags ?? []) as RosterTag[],
  }));
}

export async function fetchOrgEventOptions(orgId: string): Promise<AnalyticsEventOption[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title')
    .eq('org_id', orgId)
    .order('start_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AnalyticsEventOption[];
}
