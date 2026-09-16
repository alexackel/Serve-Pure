-- Registrations

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status registration_status not null default 'pending_confirmation',
  registered_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references public.profiles(id),
  cancelled_by_type cancelled_by_type,
  cancellation_reason text,
  penalized boolean not null default false,
  unique (event_id, user_id)
);
create index idx_registrations_user_recent on public.registrations(user_id, registered_at desc);
create index idx_registrations_event on public.registrations(event_id);

-- Self-dealing block, minor/guardian check, and 48-hour auto-confirm rule.
create or replace function public.fn_registrations_before_insert() returns trigger
language plpgsql as $$
declare
  v_event record;
  v_birthdate date;
begin
  select created_by, start_at into v_event from public.events where id = new.event_id;

  -- Self-dealing guard (the brief's hard-block rule): the account that created
  -- an event can never register as a volunteer for that same event.
  if v_event.created_by = new.user_id then
    raise exception 'self_dealing_violation: event creator cannot register for their own event'
      using errcode = '23514';
  end if;

  -- Minor/guardian guard: a minor must have at least one guardian on file.
  select birthdate into v_birthdate from public.profiles where id = new.user_id;
  if public.fn_is_minor(v_birthdate) and not exists (
    select 1 from public.guardians g where g.user_id = new.user_id
  ) then
    raise exception 'user % is a minor with no guardian on file; guardian info required to register', new.user_id;
  end if;

  -- 48-hour auto-confirm rule.
  if v_event.start_at - now() <= interval '48 hours' then
    new.status := 'confirmed';
    new.confirmed_at := now();
  end if;

  return new;
end;
$$;
create trigger trg_registrations_before_insert
before insert on public.registrations
for each row execute function public.fn_registrations_before_insert();

-- Same self-dealing guard on update, so a client can't reassign a registration to dodge it.
create or replace function public.fn_registrations_before_update() returns trigger
language plpgsql as $$
declare
  v_created_by uuid;
begin
  select created_by into v_created_by from public.events where id = new.event_id;
  if v_created_by = new.user_id then
    raise exception 'self_dealing_violation: event creator cannot register for their own event'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_registrations_before_update
before update of user_id, event_id on public.registrations
for each row execute function public.fn_registrations_before_update();

-- Cancellation penalty: 24+ hrs before = no penalty; within 24h = penalty;
-- org-initiated cancellation = never a penalty.
create or replace function public.fn_registration_cancel() returns trigger
language plpgsql as $$
declare
  v_start timestamptz;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := now();
    select start_at into v_start from public.events where id = new.event_id;
    if new.cancelled_by_type = 'organizer' then
      new.penalized := false;
    elsif v_start - now() >= interval '24 hours' then
      new.penalized := false;
    else
      new.penalized := true;
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_registration_cancel
before update of status on public.registrations
for each row execute function public.fn_registration_cancel();

-- Keep events.registered_count / events.status ('available' | 'full') in sync.
create or replace function public.fn_sync_event_registered_count() returns trigger
language plpgsql as $$
declare
  v_event_id uuid := coalesce(new.event_id, old.event_id);
  v_count int;
begin
  select count(*) into v_count from public.registrations
  where event_id = v_event_id and status <> 'cancelled';

  update public.events e
  set registered_count = v_count,
      status = case
        when e.status = 'cancelled' then 'cancelled'
        when v_count >= coalesce(e.capacity, 2147483647) then 'full'
        else 'available'
      end
  where e.id = v_event_id;
  return null;
end;
$$;
create trigger trg_sync_event_registered_count
after insert or update of status or delete on public.registrations
for each row execute function public.fn_sync_event_registered_count();

-- Guardian notifications (registration now exists, so this can reference it).

create table public.guardian_notifications (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  channel guardian_notify_channel not null,
  status guardian_notify_status not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_guardian_notif_registration on public.guardian_notifications(registration_id);

-- Attendance records: the consolidated canonical table for event-sourced
-- attendance AND self-reported hours (distinguished by `source`).

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  source attendance_source not null,
  status verification_status not null default 'pending',
  activity_title text,      -- self-reported entries with no event
  activity_org_name text,   -- free-text org name for self-reported, pre-link
  hours_claimed numeric(5,2),
  hours_awarded numeric(5,2),
  verified_by uuid references public.profiles(id),
  verified_by_role verifier_role,
  verified_at timestamptz,
  linked_by uuid references public.profiles(id),  -- org staff who converted a self-report into a real event
  linked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'platform_registration' and registration_id is not null)
    or (source = 'self_reported' and registration_id is null)
  ),
  check (hours_claimed is null or hours_claimed >= 0),
  check (hours_awarded is null or hours_awarded >= 0)
);
create unique index uq_attendance_registration on public.attendance_records(registration_id) where registration_id is not null;
create index idx_attendance_user_recent on public.attendance_records(user_id, created_at desc);
create index idx_attendance_org on public.attendance_records(org_id);
create index idx_attendance_event on public.attendance_records(event_id);
create index idx_attendance_status on public.attendance_records(status);

-- A canonical attendance_records row is created eagerly, the moment a
-- registration is inserted, so there's always exactly one row to update.
create or replace function public.fn_create_attendance_record() returns trigger
language plpgsql as $$
begin
  insert into public.attendance_records (user_id, registration_id, event_id, org_id, source, status)
  select new.user_id, new.id, new.event_id, e.org_id, 'platform_registration', 'pending'
  from public.events e where e.id = new.event_id;
  return new;
end;
$$;
create trigger trg_create_attendance_record
after insert on public.registrations
for each row execute function public.fn_create_attendance_record();

create or replace function public.fn_sync_attendance_on_cancel() returns trigger
language plpgsql as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.attendance_records
    set status = 'cancelled', updated_at = now()
    where registration_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
create trigger trg_sync_attendance_on_cancel
after update of status on public.registrations
for each row execute function public.fn_sync_attendance_on_cancel();

-- Verification precedence (org over group) + audit log.

create table public.attendance_verification_log (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  previous_status verification_status,
  new_status verification_status not null,
  changed_by uuid references public.profiles(id),
  changed_by_role verifier_role,
  note text,
  changed_at timestamptz not null default now()
);
create index idx_attendance_log_record on public.attendance_verification_log(attendance_record_id);

create or replace function public.fn_enforce_verification_precedence() returns trigger
language plpgsql as $$
begin
  if old.verified_by_role = 'org_admin' and new.verified_by_role = 'group_admin' then
    raise exception 'org verification (record %) is final and cannot be superseded by a group admin', old.id;
  end if;
  return new;
end;
$$;
create trigger trg_verification_precedence
before update of status, verified_by_role on public.attendance_records
for each row
when (new.status is distinct from old.status or new.verified_by_role is distinct from old.verified_by_role)
execute function public.fn_enforce_verification_precedence();

create or replace function public.fn_log_verification_change() returns trigger
language plpgsql as $$
begin
  insert into public.attendance_verification_log
    (attendance_record_id, previous_status, new_status, changed_by, changed_by_role, note)
  values (new.id, old.status, new.status, new.verified_by, new.verified_by_role, new.notes);
  return new;
end;
$$;
create trigger trg_log_verification_change
after update of status on public.attendance_records
for each row when (new.status is distinct from old.status)
execute function public.fn_log_verification_change();

-- Appeals: a volunteer disputes a no-show; escalates from organization review
-- to app-admin review if rejected.

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  status appeal_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index idx_appeals_record on public.appeals(attendance_record_id);
create unique index uq_appeals_one_open_per_record
  on public.appeals(attendance_record_id) where status in ('open', 'escalated');

create table public.appeal_reviews (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid not null references public.appeals(id) on delete cascade,
  level appeal_review_level not null,
  reviewer_id uuid references public.profiles(id),
  decision appeal_review_decision not null,
  notes text,
  reviewed_at timestamptz not null default now()
);
create index idx_appeal_reviews_appeal on public.appeal_reviews(appeal_id);

-- Resolve an appeal atomically: logs the review step and, if the decision is
-- final (not 'escalated'), flips the underlying attendance record's status.
create or replace function public.resolve_appeal(
  p_appeal_id uuid, p_level appeal_review_level, p_reviewer_id uuid,
  p_decision appeal_review_decision, p_notes text
) returns void language plpgsql as $$
declare
  v_record_id uuid;
begin
  select attendance_record_id into v_record_id from public.appeals where id = p_appeal_id;

  insert into public.appeal_reviews (appeal_id, level, reviewer_id, decision, notes)
  values (p_appeal_id, p_level, p_reviewer_id, p_decision, p_notes);

  if p_decision = 'escalated' then
    update public.appeals set status = 'escalated' where id = p_appeal_id;
  elsif p_decision = 'upheld' then
    update public.appeals set status = 'upheld', resolved_at = now() where id = p_appeal_id;
    update public.attendance_records set status = 'no_show' where id = v_record_id;
  elsif p_decision = 'overturned' then
    update public.appeals set status = 'overturned', resolved_at = now() where id = p_appeal_id;
    update public.attendance_records set status = 'verified' where id = v_record_id;
  end if;
end;
$$;
