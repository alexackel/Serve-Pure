import { supabase } from '@/lib/supabase';

export type CreateSelfReportInput = {
  activityTitle: string;
  activityOrgName?: string;
  category?: string;
  date: string;
  hoursClaimed: number;
  notes?: string;
  photoUrl?: string;
  // Contact info for the organization the volunteer says they worked
  // through — optional, purely to help someone reach out and verify the
  // hours later (self-reports aren't linked to any on-platform org).
  orgContactEmail?: string;
  orgContactPhone?: string;
  // Which of the volunteer's groups to route this to for independent
  // review — each gets its own attendance_report_groups row (0035). May be
  // empty: a volunteer in no group behaves exactly as before this feature.
  groupIds: string[];
};

// attendance_records' check constraint requires registration_id and event_id
// to both be null when source = 'self_reported' — this is a standalone
// activity, not linked to any on-platform event or registration.
//
// There's no dedicated "activity date" column on this table, only created_at
// (client-settable, no trigger forces it) — history-context.tsx already
// falls back to created_at as a self-reported record's display date when
// there's no linked event, so setting it to the volunteer-entered date here
// (rather than the submission time) is what makes that date correct.
//
// Two sequential writes (insert the record, then the group routing rows),
// not atomic — a dropped connection between them could leave a group-less
// orphan row. Accepted as a known edge case for now, matching the codebase's
// existing tolerance of non-atomic multi-step client writes (e.g.
// groups-context.tsx's createGroup); worth an RPC wrapper later if it proves
// to matter in practice.
export async function createSelfReport(userId: string, input: CreateSelfReportInput): Promise<void> {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      user_id: userId,
      source: 'self_reported',
      registration_id: null,
      event_id: null,
      status: 'pending',
      activity_title: input.activityTitle,
      activity_org_name: input.activityOrgName ?? null,
      category: input.category ?? null,
      hours_claimed: input.hoursClaimed,
      notes: input.notes ?? null,
      photo_url: input.photoUrl ?? null,
      org_contact_email: input.orgContactEmail ?? null,
      org_contact_phone: input.orgContactPhone ?? null,
      created_at: input.date,
    })
    .select('id')
    .single();

  if (error) throw error;

  if (input.groupIds.length > 0) {
    const { error: groupError } = await supabase
      .from('attendance_report_groups')
      .insert(input.groupIds.map((groupId) => ({ attendance_record_id: data.id, group_id: groupId })));
    if (groupError) throw groupError;
  }
}

// Relies on the attendance_delete_self_report RLS policy (migration 0030),
// scoped to the reporting user's own still-pending rows — deletes 0 rows
// (no error) if it's already been acted on, which history-context.tsx's
// status mapping already keeps out of reach of any "delete" UI anyway.
export async function deleteSelfReport(id: string): Promise<void> {
  const { error } = await supabase.from('attendance_records').delete().eq('id', id);
  if (error) throw error;
}

export type SelfReportGroupStatus = {
  groupId: string;
  groupName: string;
  status: 'pending' | 'approved' | 'awaiting_resubmission' | 'denied_final';
  reason: string | null;
};

export type SelfReportForEdit = {
  id: string;
  activityTitle: string;
  activityOrgName: string | null;
  category: string | null;
  date: string; // ISO — the volunteer-entered activity date, stored on created_at.
  hoursClaimed: number;
  notes: string | null;
  photoUrl: string | null;
  orgContactEmail: string | null;
  orgContactPhone: string | null;
  groups: SelfReportGroupStatus[];
};

// Only meaningful for a record with at least one group in
// 'awaiting_resubmission' — used to prefill the self-upload form in edit
// mode and to show which groups will (and won't) see the update.
export async function getSelfReportForEdit(id: string): Promise<SelfReportForEdit | null> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(
      'id, activity_title, activity_org_name, category, created_at, hours_claimed, notes, photo_url, org_contact_email, org_contact_phone, attendance_report_groups(group_id, status, reason, groups(name))',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type ReportGroupRow = { group_id: string; status: SelfReportGroupStatus['status']; reason: string | null; groups: { name: string } | null };

  return {
    id: data.id,
    activityTitle: data.activity_title ?? '',
    activityOrgName: data.activity_org_name,
    category: data.category,
    date: data.created_at,
    hoursClaimed: data.hours_claimed ?? 0,
    notes: data.notes,
    photoUrl: data.photo_url,
    orgContactEmail: data.org_contact_email,
    orgContactPhone: data.org_contact_phone,
    groups: ((data.attendance_report_groups ?? []) as unknown as ReportGroupRow[]).map((row) => ({
      groupId: row.group_id,
      groupName: row.groups?.name ?? 'Unknown group',
      status: row.status,
      reason: row.reason,
    })),
  };
}

export type ResubmitSelfReportInput = {
  recordId: string;
  activityTitle: string;
  activityOrgName?: string;
  category?: string;
  date: string;
  hoursClaimed: number;
  notes?: string;
  photoUrl?: string;
  orgContactEmail?: string;
  orgContactPhone?: string;
};

// Reopens only the groups still eligible (pending, or awaiting this exact
// resubmission) — a group that already approved, or denied without
// allowing a re-upload, is left untouched. See resubmit_self_report (0036).
export async function resubmitSelfReport(input: ResubmitSelfReportInput): Promise<void> {
  const { error } = await supabase.rpc('resubmit_self_report', {
    p_record_id: input.recordId,
    p_activity_title: input.activityTitle,
    p_activity_org_name: input.activityOrgName ?? null,
    p_category: input.category ?? null,
    p_activity_date: input.date,
    p_hours_claimed: input.hoursClaimed,
    p_notes: input.notes ?? null,
    p_photo_url: input.photoUrl ?? null,
    p_org_contact_email: input.orgContactEmail ?? null,
    p_org_contact_phone: input.orgContactPhone ?? null,
  });
  if (error) throw error;
}
