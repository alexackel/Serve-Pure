/*
  RLS for the new per-group review tables, and the two RPCs that mutate them.

  Group admins no longer update attendance_records directly for self-reported
  review (that was the confirmed gap in attendance_update_group_admin,
  0006:73-77 — it never excluded reviewer = submitter). Every review action
  now goes through review_group_report(), and every resubmission through
  resubmit_self_report() — both security definer, both doing their own
  authorization check inside, mirroring resolve_appeal()'s shape (0004,
  redefined 0032). Client roles get no UPDATE grant on attendance_report_groups
  at all, so the hard-block trigger in 0035 is the only path to a status
  change and can't be bypassed by calling .update() directly.
*/

alter table public.attendance_report_groups enable row level security;

create policy report_groups_select_submitter on public.attendance_report_groups for select using (
  exists (select 1 from public.attendance_records ar where ar.id = attendance_record_id and ar.user_id = auth.uid())
);
create policy report_groups_select_group_admin on public.attendance_report_groups for select using (
  private.fn_is_group_admin(group_id)
);
create policy report_groups_select_app_admin on public.attendance_report_groups for select using (
  private.fn_is_app_admin()
);
create policy report_groups_insert_submitter on public.attendance_report_groups for insert with check (
  private.fn_is_group_member(group_id)
  and exists (
    select 1 from public.attendance_records ar
    where ar.id = attendance_record_id and ar.user_id = auth.uid() and ar.source = 'self_reported'
  )
);
revoke update, delete on public.attendance_report_groups from authenticated;

alter table public.attendance_group_review_log enable row level security;
create policy group_review_log_select_submitter on public.attendance_group_review_log for select using (
  exists (select 1 from public.attendance_records ar where ar.id = attendance_record_id and ar.user_id = auth.uid())
);
create policy group_review_log_select_group_admin on public.attendance_group_review_log for select using (
  private.fn_is_group_admin(group_id)
);
create policy group_review_log_select_app_admin on public.attendance_group_review_log for select using (
  private.fn_is_app_admin()
);
-- No insert/update/delete grants: trigger-only, exactly like attendance_verification_log.

-- The confirmed gap: group admins stop updating attendance_records directly,
-- so this policy is both dead code and the exact bug surface. The other
-- attendance_records UPDATE policies (org/event-organizer/app-admin) are
-- untouched — this is scoped to the group-admin/self-reported path only.
drop policy if exists attendance_update_group_admin on public.attendance_records;

create or replace function public.review_group_report(
  p_report_group_id uuid,
  p_decision group_review_decision,
  p_allow_reupload boolean default null,
  p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_group_id uuid;
  v_status group_review_status;
  v_new_status group_review_status;
begin
  select group_id, status into v_group_id, v_status
  from public.attendance_report_groups where id = p_report_group_id for update;

  if v_group_id is null then
    raise exception 'report group % not found', p_report_group_id;
  end if;
  if not private.fn_is_group_admin(v_group_id) then
    raise exception 'not authorized to review this group''s reports';
  end if;
  if v_status not in ('pending', 'awaiting_resubmission') then
    raise exception 'this item has already been resolved for this group';
  end if;
  if p_decision = 'denied' and p_allow_reupload is null then
    raise exception 'allow_reupload must be specified when denying';
  end if;

  v_new_status := case
    when p_decision = 'approved' then 'approved'::group_review_status
    when p_allow_reupload then 'awaiting_resubmission'::group_review_status
    else 'denied_final'::group_review_status
  end;

  update public.attendance_report_groups
  set status = v_new_status,
      allow_reupload = case when p_decision = 'denied' then p_allow_reupload else null end,
      reason = case when p_decision = 'denied' then p_reason else null end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      status_updated_at = now()
  where id = p_report_group_id;
end;
$$;
revoke execute on function public.review_group_report(uuid, group_review_decision, boolean, text) from public, anon;
grant execute on function public.review_group_report(uuid, group_review_decision, boolean, text) to authenticated;

-- Resubmission reopens only groups still in play (pending, or awaiting this
-- exact resubmission) — a group that already approved, or denied without
-- allowing a re-upload, is untouched, matching the confirmed product
-- decision exactly (Group A denies+reupload, Group B denies-fully -> after
-- resubmit, only Group A gets the update back; Group B's denial stands).
create or replace function public.resubmit_self_report(
  p_record_id uuid,
  p_activity_title text,
  p_activity_org_name text,
  p_category text,
  p_activity_date timestamptz,
  p_hours_claimed numeric,
  p_notes text,
  p_photo_url text,
  p_org_contact_email text,
  p_org_contact_phone text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_eligible_count int;
begin
  select user_id into v_owner from public.attendance_records where id = p_record_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized to resubmit this report';
  end if;

  select count(*) into v_eligible_count from public.attendance_report_groups
  where attendance_record_id = p_record_id and status in ('pending', 'awaiting_resubmission');
  if v_eligible_count = 0 then
    raise exception 'no groups are eligible for resubmission on this report';
  end if;

  update public.attendance_records set
    activity_title = p_activity_title,
    activity_org_name = p_activity_org_name,
    category = p_category,
    created_at = p_activity_date,
    hours_claimed = p_hours_claimed,
    notes = p_notes,
    photo_url = p_photo_url,
    org_contact_email = p_org_contact_email,
    org_contact_phone = p_org_contact_phone,
    updated_at = now()
  where id = p_record_id;

  update public.attendance_report_groups
  set status = 'pending',
      cycle = cycle + 1,
      allow_reupload = null,
      reason = null,
      reviewed_by = null,
      reviewed_at = null,
      status_updated_at = now()
  where attendance_record_id = p_record_id and status in ('pending', 'awaiting_resubmission');
end;
$$;
revoke execute on function public.resubmit_self_report(uuid, text, text, text, timestamptz, numeric, text, text, text, text) from public, anon;
grant execute on function public.resubmit_self_report(uuid, text, text, text, timestamptz, numeric, text, text, text, text) to authenticated;
