/*
  Soft-signal collusion detection: detect and persist only — there is no App
  Administrator UI anywhere in the app yet, so nothing reviews these today.
  Same pattern as the AI-discovered-org "Report incorrect info" flag counter
  (0028): a soft signal for future moderation tooling, not an enforcement
  mechanism. Thresholds below are proposed starting constants, not derived
  from any product requirement — easy to retune once real usage exists.

  Two independent partial unique indexes (rather than one index over
  coalesce(submitter_id, <sentinel>)) so each signal's own ON CONFLICT target
  stays a plain, readable column list.
*/

create type review_flag_reason as enum ('repeat_approver_same_submitter', 'no_denials_small_group');

create table public.admin_review_flags (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  submitter_id uuid references public.profiles(id) on delete cascade,
  reason review_flag_reason not null,
  detail jsonb,
  detected_at timestamptz not null default now()
);
create unique index uq_review_flags_submitter on public.admin_review_flags(group_id, admin_id, submitter_id, reason)
  where submitter_id is not null;
create unique index uq_review_flags_group on public.admin_review_flags(group_id, admin_id, reason)
  where submitter_id is null;

alter table public.admin_review_flags enable row level security;
create policy admin_review_flags_select_app_admin on public.admin_review_flags for select using (private.fn_is_app_admin());
-- No insert/update/delete grant to any client role: trigger-only. This
-- policy just makes the table already queryable the moment a review UI for
-- it eventually gets built.

create or replace function public.fn_detect_admin_collusion_signals() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_submitter uuid;
  v_admin_approvals_of_submitter int;
  v_admin_total_approvals int;
  v_admin_total_reviews int;
  v_admin_total_denials int;
  v_group_member_count int;
begin
  if new.new_status = 'approved' then
    select user_id into v_submitter from public.attendance_records where id = new.attendance_record_id;

    select count(*) into v_admin_total_approvals from public.attendance_group_review_log
    where group_id = new.group_id and reviewed_by = new.reviewed_by and new_status = 'approved';

    select count(*) into v_admin_approvals_of_submitter from public.attendance_group_review_log l
    join public.attendance_records ar on ar.id = l.attendance_record_id
    where l.group_id = new.group_id and l.reviewed_by = new.reviewed_by and l.new_status = 'approved' and ar.user_id = v_submitter;

    if v_admin_approvals_of_submitter >= 3
       and v_admin_approvals_of_submitter::numeric / greatest(v_admin_total_approvals, 1) >= 0.5 then
      insert into public.admin_review_flags (group_id, admin_id, submitter_id, reason, detail)
      values (
        new.group_id, new.reviewed_by, v_submitter, 'repeat_approver_same_submitter',
        jsonb_build_object('approved_count', v_admin_approvals_of_submitter, 'admin_total_approvals', v_admin_total_approvals)
      )
      on conflict (group_id, admin_id, submitter_id, reason) where submitter_id is not null
      do update set detail = excluded.detail, detected_at = now();
    end if;
  end if;

  if new.new_status in ('approved', 'denied_final', 'awaiting_resubmission') then
    select count(*) into v_admin_total_reviews from public.attendance_group_review_log
    where group_id = new.group_id and reviewed_by = new.reviewed_by
      and new_status in ('approved', 'denied_final', 'awaiting_resubmission');

    select count(*) into v_admin_total_denials from public.attendance_group_review_log
    where group_id = new.group_id and reviewed_by = new.reviewed_by
      and new_status in ('denied_final', 'awaiting_resubmission');

    select count(*) into v_group_member_count from public.group_members
    where group_id = new.group_id and left_at is null;

    if v_admin_total_reviews >= 5 and v_admin_total_denials = 0 and v_group_member_count <= 5 then
      insert into public.admin_review_flags (group_id, admin_id, submitter_id, reason, detail)
      values (
        new.group_id, new.reviewed_by, null, 'no_denials_small_group',
        jsonb_build_object('total_reviews', v_admin_total_reviews, 'group_member_count', v_group_member_count)
      )
      on conflict (group_id, admin_id, reason) where submitter_id is null
      do update set detail = excluded.detail, detected_at = now();
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function public.fn_detect_admin_collusion_signals() from public, anon, authenticated;
create trigger trg_detect_admin_collusion_signals
after insert on public.attendance_group_review_log
for each row when (new.reviewed_by is not null)
execute function public.fn_detect_admin_collusion_signals();
