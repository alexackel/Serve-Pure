/*
  Multi-group self-reported hours review.

  Today a self-report is only ever implicitly visible to "any group the
  submitter belongs to" (fn_shares_group, 0012) with exactly one global
  status on attendance_records. There's no way to route a submission to a
  specific subset of the volunteer's groups, and no per-group outcome — one
  group approving and another denying the same submission isn't
  representable. This adds an explicit per-group review track.

  Append-only-by-decision design: attendance_report_groups holds the CURRENT
  state per (record, group) and is mutated across resubmission cycles (so a
  volunteer's own "what's the status" query stays a single-row lookup), while
  attendance_group_review_log (mirroring attendance_verification_log, 0004)
  keeps the full history of every decision — needed both for the
  resubmission semantics (a group that denied-without-reupload must never be
  reopened) and for the anti-collusion statistics added in 0037.
*/

create type group_review_status as enum ('pending', 'approved', 'awaiting_resubmission', 'denied_final');
create type group_review_decision as enum ('approved', 'denied');

create table public.attendance_report_groups (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  status group_review_status not null default 'pending',
  cycle int not null default 1,
  allow_reupload boolean,
  reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (attendance_record_id, group_id)
);
create index idx_report_groups_record on public.attendance_report_groups(attendance_record_id);
create index idx_report_groups_queue on public.attendance_report_groups(group_id, status, status_updated_at);

create table public.attendance_group_review_log (
  id uuid primary key default gen_random_uuid(),
  report_group_id uuid not null references public.attendance_report_groups(id) on delete cascade,
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  cycle int not null,
  previous_status group_review_status,
  new_status group_review_status not null,
  allow_reupload boolean,
  reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz not null default now()
);
create index idx_group_review_log_record on public.attendance_group_review_log(attendance_record_id);
create index idx_group_review_log_admin on public.attendance_group_review_log(group_id, reviewed_by);

-- Every status change on attendance_report_groups gets an immutable log row.
create or replace function public.fn_log_group_review_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.attendance_group_review_log
    (report_group_id, attendance_record_id, group_id, cycle, previous_status, new_status, allow_reupload, reason, reviewed_by, reviewed_at)
  values
    (new.id, new.attendance_record_id, new.group_id, new.cycle, old.status, new.status, new.allow_reupload, new.reason, new.reviewed_by, coalesce(new.reviewed_at, now()));
  return new;
end;
$$;
revoke execute on function public.fn_log_group_review_change() from public, anon, authenticated;
create trigger trg_log_group_review_change
after update of status on public.attendance_report_groups
for each row when (new.status is distinct from old.status)
execute function public.fn_log_group_review_change();

-- Derives attendance_records.status/hours_awarded/verified_by(_role) from the
-- aggregate of a record's report-group rows: any approval verifies the hours
-- exactly once (first approver wins, further approvals/denials don't move
-- it); once every group is resolved with none approving, it's rejected;
-- otherwise it stays pending (at least one group is still pending or
-- awaiting the volunteer's resubmission).
create or replace function public.fn_sync_attendance_from_group_reviews() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_any_approved boolean;
  v_still_open boolean;
begin
  v_any_approved := exists(
    select 1 from public.attendance_report_groups
    where attendance_record_id = new.attendance_record_id and status = 'approved'
  );

  if v_any_approved then
    update public.attendance_records
    set status = 'verified',
        hours_awarded = coalesce(hours_awarded, hours_claimed),
        verified_by = new.reviewed_by,
        verified_by_role = 'group_admin',
        verified_at = coalesce(verified_at, now())
    where id = new.attendance_record_id and status <> 'verified';
  else
    v_still_open := exists(
      select 1 from public.attendance_report_groups
      where attendance_record_id = new.attendance_record_id and status in ('pending', 'awaiting_resubmission')
    );
    if not v_still_open then
      update public.attendance_records
      set status = 'rejected', verified_by = new.reviewed_by, verified_by_role = 'group_admin', verified_at = now()
      where id = new.attendance_record_id and status <> 'rejected';
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function public.fn_sync_attendance_from_group_reviews() from public, anon, authenticated;
create trigger trg_sync_attendance_from_group_reviews
after update of status on public.attendance_report_groups
for each row when (new.status is distinct from old.status)
execute function public.fn_sync_attendance_from_group_reviews();

-- Self-dealing-by-proxy hard block: a group admin can never review their own
-- submission (closes the gap in attendance_update_group_admin, 0006:73-77,
-- which never excluded reviewer = submitter), or a submission from a
-- volunteer they're a registered guardian for. Guardians aren't linked to a
-- real platform account (0002's guardians table is free-text contact info),
-- so the guardian case is matched by comparing the reviewer's own account
-- email/phone against the submitter's guardian contact records.
create or replace function public.fn_block_group_review_self_dealing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_submitter uuid;
  v_reviewer_email text;
  v_reviewer_phone text;
begin
  select user_id into v_submitter from public.attendance_records where id = new.attendance_record_id;

  if new.reviewed_by = v_submitter then
    raise exception 'self_dealing_violation: group admin cannot review their own self-reported submission'
      using errcode = '23514';
  end if;

  select email, phone into v_reviewer_email, v_reviewer_phone from public.profiles where id = new.reviewed_by;

  if exists (
    select 1 from public.guardians g
    where g.user_id = v_submitter
      and ((v_reviewer_email is not null and g.email = v_reviewer_email)
        or (v_reviewer_phone is not null and g.phone = v_reviewer_phone))
  ) then
    raise exception 'self_dealing_violation: group admin cannot review a submission from a volunteer they are a registered guardian for'
      using errcode = '23514';
  end if;

  return new;
end;
$$;
revoke execute on function public.fn_block_group_review_self_dealing() from public, anon, authenticated;
create trigger trg_block_group_review_self_dealing
before update of status on public.attendance_report_groups
for each row when (new.status is distinct from old.status and new.reviewed_by is not null)
execute function public.fn_block_group_review_self_dealing();

-- Backfill: every currently-pending self-report becomes invisible to every
-- group admin the moment review moves to attendance_report_groups-driven
-- routing, unless existing in-flight reports get a row per group the
-- submitter is already in (preserving today's implicit "any of my groups
-- can see it" visibility for data that predates explicit routing).
insert into public.attendance_report_groups (attendance_record_id, group_id)
select ar.id, gm.group_id
from public.attendance_records ar
join public.group_members gm on gm.user_id = ar.user_id and gm.left_at is null
where ar.source = 'self_reported' and ar.status = 'pending'
on conflict (attendance_record_id, group_id) do nothing;
