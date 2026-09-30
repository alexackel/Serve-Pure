/*
  A volunteer routing their own self-report to a group they administer is a
  dead end, not just a conflict of interest: trg_block_group_review_self_dealing
  (0035) already refuses to let them ever approve it, and in a single-admin
  group nobody else can either, so it would sit pending forever. The
  self-upload UI now filters these groups out of the selection list; this is
  the DB-level backstop for anything that bypasses the UI (a direct API call,
  or admin status changing between page load and submit), matching how every
  other self-dealing rule in this app is enforced at the database layer.

  No custom trigger/exception needed here — like the existing
  attendance_insert_self_report policy, an INSERT-time rejection doesn't need
  a friendly message; the review-time hard block is what needs one, since
  that's the path a legitimate, non-adversarial admin can actually hit.
*/

alter policy report_groups_insert_submitter on public.attendance_report_groups
  with check (
    private.fn_is_group_member(group_id)
    and not private.fn_is_group_admin(group_id)
    and exists (
      select 1 from public.attendance_records ar
      where ar.id = attendance_record_id and ar.user_id = auth.uid() and ar.source = 'self_reported'
    )
  );
