/*
  Removing a group member (group_members.left_at soft-delete) today leaves
  any still-pending attendance_report_groups row for that group untouched —
  getGroupReviewQueue and the member-detail Uploaded tab both filter purely
  on status='pending', so a removed member's report keeps reappearing
  forever. Cascades the removal the same way fn_cascade_event_cancellation
  (0021) cascades an event's own status change into its registrations: one
  bulk UPDATE on the downstream table, letting that table's own
  AFTER-UPDATE-OF-status triggers (logging, sync, collusion signals — all
  already firing today for the deny path) drive the rest exactly as if an
  admin had denied it.

  reviewed_by is explicitly nulled, not left alone, so this reads as a
  system-initiated transition: trg_block_group_review_self_dealing's WHEN
  clause requires new.reviewed_by IS NOT NULL, and an awaiting_resubmission
  row already has a stale reviewed_by from its prior deny — leaving it set
  here would spuriously re-run the self-dealing check against that old
  reviewer. Nulling it also keeps trg_detect_admin_collusion_signals silent
  (its WHEN clause requires reviewed_by IS NOT NULL too), so this is never
  miscounted as an admin review action.

  Reuses denied_final rather than adding a new status: ALTER TYPE ... ADD
  VALUE can't be referenced in the same transaction, and this migration is
  pasted as one script into the Supabase SQL editor. It also means
  fn_log_group_review_change and fn_sync_attendance_from_group_reviews
  handle it for free with no changes — the record flips to 'rejected' once
  nothing else is open/approved, same as a normal terminal denial.

  Must be SECURITY DEFINER: removeMember performs the group_members update
  directly under the calling admin's own `authenticated` session, and 0036
  already revoked UPDATE on attendance_report_groups from authenticated
  entirely (a hard privilege revoke, not just an RLS gap), so a non-definer
  trigger body would fail with permission denied.

  Known accepted quirk: fn_sync_attendance_from_group_reviews will set
  attendance_records.verified_by = null (since reviewed_by is null) but
  verified_by_role = 'group_admin' for a record rejected this way — slightly
  inconsistent metadata, intentionally not worth touching that shared
  trigger (also used by the normal deny path) for this edge case.
*/

create or replace function public.fn_cascade_group_member_removal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.attendance_report_groups arg
  set status = 'denied_final',
      reason = 'Member removed from group',
      allow_reupload = null,
      reviewed_by = null,
      reviewed_at = now(),
      status_updated_at = now()
  from public.attendance_records ar
  where arg.attendance_record_id = ar.id
    and ar.user_id = new.user_id
    and arg.group_id = new.group_id
    and arg.status in ('pending', 'awaiting_resubmission');
  return new;
end;
$$;
revoke execute on function public.fn_cascade_group_member_removal() from public, anon, authenticated;

create trigger trg_cascade_group_member_removal
after update of left_at on public.group_members
for each row when (new.left_at is not null and old.left_at is null)
execute function public.fn_cascade_group_member_removal();
