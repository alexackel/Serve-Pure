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
export async function createSelfReport(userId: string, input: CreateSelfReportInput): Promise<void> {
  const { error } = await supabase.from('attendance_records').insert({
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
  });

  if (error) throw error;
}

// Relies on the attendance_delete_self_report RLS policy (migration 0030),
// scoped to the reporting user's own still-pending rows — deletes 0 rows
// (no error) if it's already been acted on, which history-context.tsx's
// status mapping already keeps out of reach of any "delete" UI anyway.
export async function deleteSelfReport(id: string): Promise<void> {
  const { error } = await supabase.from('attendance_records').delete().eq('id', id);
  if (error) throw error;
}
