/*
  Account types, usernames, organization logins, and phone-based self-dealing
  checks.

  - Each login is either a personal account or an organization login.
  - Organization logins are signed up first with a business email and are
    managed by exactly one person (no shared logins).
  - Every login verifies its mobile by SMS. A verified phone is unique among
    personal logins, and separately unique among organization logins. A personal
    phone may equal an organization login's phone, so the manager's own number
    can be matched by the self-dealing check.
  - Self-dealing: a registration, review, or like is blocked when the actor's
    verified phone equals a verified phone on the event's creator or on one of
    the event organization's logins.
*/

-- 1. Columns -------------------------------------------------------------------

alter table public.profiles
  add column account_type text not null default 'personal'
    check (account_type in ('personal', 'organization')),
  add column username text,
  add column username_changed_at timestamptz,
  add column phone_verified_at timestamptz,
  add column school text,
  add column terms_accepted_at timestamptz;

alter table public.organizations
  add column facebook_url text,
  add column ein text,
  add column is_501c3 boolean not null default false,
  add column manager_name text,
  add column manager_title text;

-- Usernames are stored lowercase; uniqueness is case-insensitive via the lowered index.
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index profiles_username_unique on public.profiles(lower(username))
  where username is not null;

-- Phone: unique per account type, among verified numbers only.
create unique index profiles_phone_verified_personal_unique
  on public.profiles(phone)
  where phone_verified_at is not null and account_type = 'personal';

create unique index profiles_phone_verified_organization_unique
  on public.profiles(phone)
  where phone_verified_at is not null and account_type = 'organization';

-- 2. Username helpers ----------------------------------------------------------

create or replace function private.fn_username_reserved(p_username text) returns boolean
language sql immutable as $$
  select lower(p_username) = any (array[
    'admin', 'administrator', 'support', 'help', 'root', 'staff', 'official',
    'serve', 'servepure', 'volunteer', 'organization', 'org', 'api', 'null', 'undefined'
  ]);
$$;

-- Read-only, used by the sign-up form for live availability.
create or replace function public.check_username_available(p_username text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if p_username is null or p_username !~ '^[a-z0-9_]{3,20}$' or private.fn_username_reserved(p_username) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where lower(username) = lower(p_username));
end;
$$;
-- Callable before sign-up, so signed-out visitors can check availability live.
-- Rate-limit this endpoint in the Supabase dashboard.
revoke execute on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to anon, authenticated;

-- Changing a username is allowed once every 30 days.
create or replace function public.set_username(p_username text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_last timestamptz;
begin
  select username_changed_at into v_last from public.profiles where id = auth.uid();
  if v_last is not null and v_last > now() - interval '30 days' then
    raise exception 'username_change_too_soon' using errcode = '23514';
  end if;
  if not public.check_username_available(lower(p_username)) then
    raise exception 'username_unavailable' using errcode = '23505';
  end if;
  update public.profiles
  set username = lower(p_username), username_changed_at = now()
  where id = auth.uid();
end;
$$;
revoke execute on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;

-- 3. Sign-up: profile and (for organization logins) the organization row ------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_type text := coalesce(new.raw_user_meta_data->>'account_type', 'personal');
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, full_name, email, birthdate, account_type, username, school, terms_accepted_at)
  values (
    new.id,
    v_name,
    new.email,
    nullif(new.raw_user_meta_data->>'birthdate', '')::date,
    v_type,
    lower(nullif(new.raw_user_meta_data->>'username', '')),
    nullif(new.raw_user_meta_data->>'school', ''),
    nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz
  );

  -- Organization login: create the organization row the manager signed up for.
  -- fn_org_auto_admin (0002) makes this login its admin.
  if v_type = 'organization' then
    if nullif(new.raw_user_meta_data->>'birthdate', '') is null
       or (nullif(new.raw_user_meta_data->>'birthdate', '')::date) > (current_date - interval '18 years')::date then
      raise exception 'organization_manager_must_be_18' using errcode = '23514';
    end if;
    insert into public.organizations (
      name, org_type, website, facebook_url, contact_email, address,
      ein, is_501c3, manager_name, manager_title, created_by
    ) values (
      nullif(new.raw_user_meta_data->>'organization_name', ''),
      nullif(new.raw_user_meta_data->>'organization_type', ''),
      nullif(new.raw_user_meta_data->>'website', ''),
      nullif(new.raw_user_meta_data->>'facebook_url', ''),
      new.email,
      nullif(new.raw_user_meta_data->>'address', ''),
      nullif(new.raw_user_meta_data->>'ein', ''),
      coalesce((new.raw_user_meta_data->>'is_501c3')::boolean, false),
      nullif(new.raw_user_meta_data->>'manager_name', ''),
      nullif(new.raw_user_meta_data->>'manager_title', ''),
      new.id
    );
  end if;
  return new;
end;
$$;

-- 4. Verified phone sync (after SMS confirmation) -------------------------------

create or replace function private.fn_sync_verified_phone() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_type text;
begin
  if new.phone_confirmed_at is not null and old.phone_confirmed_at is null and new.phone is not null then
    select account_type into v_type from public.profiles where id = new.id;

    if exists (
      select 1 from public.profiles
      where phone = new.phone and phone_verified_at is not null
        and account_type = v_type and id <> new.id
    ) then
      raise exception 'phone_already_registered' using errcode = '23505';
    end if;

    update public.profiles
    set phone = new.phone, phone_verified_at = new.phone_confirmed_at
    where id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function private.fn_sync_verified_phone() from public, anon, authenticated;

-- Trigger from the previous revision of this file, recreated for safety.
drop trigger if exists trg_sync_verified_phone on auth.users;
create trigger trg_sync_verified_phone
after update of phone_confirmed_at on auth.users
for each row execute function private.fn_sync_verified_phone();

-- 5. Phone-match self-dealing check -----------------------------------------------

-- True when the actor is the event's creator, an admin of its organization, or
-- shares a verified phone with either of them.
create or replace function private.fn_is_event_operator_conflict(p_user uuid, p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with operators as (
    select e.created_by as user_id from public.events e where e.id = p_event_id
    union
    select oa.user_id from public.org_admins oa
    join public.events e on e.org_id = oa.org_id
    where e.id = p_event_id
  )
  select
    exists (select 1 from operators o where o.user_id = p_user)
    or exists (
      select 1
      from public.profiles reg
      join public.profiles op on op.phone = reg.phone
      join operators o on o.user_id = op.id
      where reg.id = p_user
        and reg.phone_verified_at is not null
        and op.phone_verified_at is not null
        and op.id <> reg.id
    );
$$;
revoke execute on function private.fn_is_event_operator_conflict(uuid, uuid) from public, anon;
grant execute on function private.fn_is_event_operator_conflict(uuid, uuid) to authenticated;

-- 6. Registration guards (insert and update) -------------------------------------

create or replace function public.fn_registrations_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare
  v_event record;
  v_birthdate date;
begin
  select created_by, org_id, start_at into v_event from public.events where id = new.event_id;

  -- Self-dealing guard: the creator, any admin of the posting organization, or
  -- anyone sharing a verified phone with them, cannot register for the event.
  if private.fn_is_event_operator_conflict(new.user_id, new.event_id) then
    raise exception 'self_dealing_violation: event creator or their organization''s admins cannot register for this event'
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

create or replace function public.fn_registrations_before_update() returns trigger
language plpgsql set search_path = public as $$
declare
  v_start timestamptz;
begin
  if private.fn_is_event_operator_conflict(new.user_id, new.event_id) then
    raise exception 'self_dealing_violation: event creator or their organization''s admins cannot register for this event'
      using errcode = '23514';
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    new.cancelled_at := null;
    new.cancelled_by_user_id := null;
    new.cancelled_by_type := null;
    new.cancellation_reason := null;
    new.penalized := false;

    select start_at into v_start from public.events where id = new.event_id;
    if v_start - now() <= interval '48 hours' then
      new.status := 'confirmed';
      new.confirmed_at := now();
    else
      new.status := 'pending_confirmation';
      new.confirmed_at := null;
    end if;
  end if;

  return new;
end;
$$;

-- 7. Group review guard (shared predicate used by trigger and can_review_group_report)

create or replace function private.fn_group_review_self_dealing_reason(
  p_attendance_record_id uuid,
  p_reviewer uuid
) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_submitter uuid;
  v_reviewer_email text;
  v_reviewer_phone text;
begin
  select user_id into v_submitter from public.attendance_records where id = p_attendance_record_id;

  if p_reviewer = v_submitter or exists (
    select 1
    from public.profiles a
    join public.profiles b on b.phone = a.phone
    where a.id = p_reviewer and b.id = v_submitter
      and a.phone_verified_at is not null and b.phone_verified_at is not null
  ) then
    return 'self_dealing_violation: group admin cannot review their own self-reported submission (or one from a login sharing their verified phone)';
  end if;

  select email, phone into v_reviewer_email, v_reviewer_phone from public.profiles where id = p_reviewer;

  if exists (
    select 1 from public.guardians g
    where g.user_id = v_submitter
      and ((v_reviewer_email is not null and g.email = v_reviewer_email)
        or (v_reviewer_phone is not null and g.phone = v_reviewer_phone))
  ) then
    return 'self_dealing_violation: group admin cannot review a submission from a volunteer they are a registered guardian for';
  end if;

  return null;
end;
$$;

-- 8. Like guard ---------------------------------------------------------------------

create or replace function public.fn_block_self_like() returns trigger
language plpgsql set search_path = public as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.attendance_records where id = new.attendance_record_id;
  if new.user_id = v_owner or exists (
    select 1
    from public.profiles liker
    join public.profiles owner on owner.phone = liker.phone
    where liker.id = new.user_id and owner.id = v_owner
      and liker.phone_verified_at is not null and owner.phone_verified_at is not null
  ) then
    raise exception 'self_dealing_violation: cannot like your own activity (or one from a login sharing your verified phone)'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
