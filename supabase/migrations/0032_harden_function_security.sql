/*
  Security Advisor cleanup (2026-09-22 lint run). No destructive operations.

  1. Trigger-only SECURITY DEFINER functions were callable as RPCs by anon/
     authenticated (/rest/v1/rpc/...). Triggers never check EXECUTE when they
     fire, so revoking it from client roles changes nothing about behavior.

  2. RLS helper functions (fn_is_*, fn_shares_*) move to a `private` schema
     that PostgREST does not expose. Policies reference functions by OID, so
     every existing policy keeps working untouched. EXECUTE stays granted, so
     policy evaluation as anon/authenticated still succeeds.
     NOTE for future migrations: new policies/functions must call these as
     private.fn_is_org_admin(...) etc — they no longer exist in public.
     The four functions whose bodies call them by qualified name are
     redefined below with only `public.` -> `private.` changed.

  3. Pins search_path on every function the linter flagged as mutable.

  4. Client-facing RPCs (flag/unflag AI org, reliability score, appeal
     resolution) stay callable by signed-in users — each does its own
     authorization — but are no longer callable while signed out.

  5. Drops the broad SELECT policy on the public post-photos bucket: public
     bucket object URLs don't need it, and it let clients list every file.
*/

-- 1. Trigger functions: not callable as RPCs -------------------------------
revoke execute on function public.fn_cascade_event_cancellation() from public, anon, authenticated;
revoke execute on function public.fn_create_attendance_record() from public, anon, authenticated;
revoke execute on function public.fn_group_auto_admin() from public, anon, authenticated;
revoke execute on function public.fn_log_verification_change() from public, anon, authenticated;
revoke execute on function public.fn_notify_guardians_on_registration() from public, anon, authenticated;
revoke execute on function public.fn_org_auto_admin() from public, anon, authenticated;
revoke execute on function public.fn_sync_attendance_on_cancel() from public, anon, authenticated;
revoke execute on function public.fn_sync_event_registered_count() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. RLS helpers -> private schema -----------------------------------------
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.fn_is_app_admin() set schema private;
alter function public.fn_is_org_admin(uuid) set schema private;
alter function public.fn_is_org_admin_of(uuid, uuid) set schema private;
alter function public.fn_is_group_admin(uuid) set schema private;
alter function public.fn_is_group_member(uuid) set schema private;
alter function public.fn_shares_group(uuid) set schema private;
alter function public.fn_shares_event_registration(uuid) set schema private;

-- Callers that reference the helpers by qualified name (bodies otherwise
-- identical to their latest definitions: 0005, 0016, 0022, 0022).
create or replace function public.get_reliability_score(p_user_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_allowed boolean;
  v_score numeric;
begin
  v_allowed :=
    auth.uid() = p_user_id
    or exists (
      select 1 from public.registrations r join public.events e on e.id = r.event_id
      where r.user_id = p_user_id and private.fn_is_org_admin(e.org_id)
    )
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = p_user_id and private.fn_is_group_admin(gm.group_id)
    )
    or private.fn_is_app_admin();

  if not v_allowed then
    raise exception 'not authorized to view this reliability score';
  end if;

  select score into v_score from public.fn_reliability_score(p_user_id);
  return v_score;
end;
$$;

create or replace function public.resolve_appeal(
  p_appeal_id uuid, p_level appeal_review_level, p_reviewer_id uuid,
  p_decision appeal_review_decision, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_record_id uuid;
  v_org_id uuid;
  v_event_created_by uuid;
  v_authorized boolean;
begin
  if p_reviewer_id <> auth.uid() then
    raise exception 'p_reviewer_id must match the calling user';
  end if;

  select ar.id, ar.org_id, e.created_by
    into v_record_id, v_org_id, v_event_created_by
  from public.appeals a
  join public.attendance_records ar on ar.id = a.attendance_record_id
  left join public.events e on e.id = ar.event_id
  where a.id = p_appeal_id;

  if v_record_id is null then
    raise exception 'appeal % not found', p_appeal_id;
  end if;

  if p_level = 'organization' then
    v_authorized := (v_org_id is not null and private.fn_is_org_admin(v_org_id)) or v_event_created_by = auth.uid();
  elsif p_level = 'app_admin' then
    v_authorized := private.fn_is_app_admin();
  else
    v_authorized := false;
  end if;

  if not v_authorized then
    raise exception 'not authorized to review this appeal at level %', p_level;
  end if;

  insert into public.appeal_reviews (appeal_id, level, reviewer_id, decision, notes)
  values (p_appeal_id, p_level, p_reviewer_id, p_decision, p_notes);

  if p_decision = 'escalated' then
    update public.appeals set status = 'escalated' where id = p_appeal_id;
  elsif p_decision = 'upheld' then
    update public.appeals set status = 'upheld', resolved_at = now() where id = p_appeal_id;
    update public.attendance_records set status = 'no_show' where id = v_record_id;
  elsif p_decision = 'overturned' then
    update public.appeals set status = 'overturned', resolved_at = now() where id = p_appeal_id;
    update public.attendance_records ar
    set status = 'verified',
        hours_awarded = coalesce(ar.hours_awarded, round((extract(epoch from (e.end_at - e.start_at)) / 3600.0)::numeric, 1))
    from public.events e
    where ar.id = v_record_id and ar.event_id = e.id;
  end if;
end;
$$;

create or replace function public.fn_registrations_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare
  v_event record;
  v_birthdate date;
begin
  select created_by, org_id, start_at into v_event from public.events where id = new.event_id;

  -- Self-dealing guard (the brief's hard-block rule, broadened to cover any
  -- admin of the posting organization, not just the literal creator): the
  -- account that created an event, or any co-admin of the org that posted it,
  -- can never register as a volunteer for that same event.
  if v_event.created_by = new.user_id
     or (v_event.org_id is not null and private.fn_is_org_admin_of(v_event.org_id, new.user_id)) then
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
  v_created_by uuid;
  v_org_id uuid;
  v_start timestamptz;
begin
  select created_by, org_id into v_created_by, v_org_id from public.events where id = new.event_id;
  if v_created_by = new.user_id
     or (v_org_id is not null and private.fn_is_org_admin_of(v_org_id, new.user_id)) then
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

-- 3. Pin search_path on the remaining flagged functions -----------------------
alter function public.fn_is_minor(date, date) set search_path = public;
alter function public.fn_reliability_score(uuid) set search_path = public;
alter function public.fn_check_event_creator() set search_path = public;
alter function public.fn_registration_cancel() set search_path = public;
alter function public.fn_enforce_verification_precedence() set search_path = public;
alter function public.fn_sync_attendance_on_revive() set search_path = public;
alter function public.fn_group_auto_admin() set search_path = public;
alter function public.fn_org_auto_admin() set search_path = public;

-- 4. Client RPCs: signed-in only --------------------------------------------
revoke execute on function public.fn_flag_ai_org(uuid) from public, anon;
revoke execute on function public.fn_unflag_ai_org(uuid) from public, anon;
revoke execute on function public.get_reliability_score(uuid) from public, anon;
revoke execute on function public.resolve_appeal(uuid, appeal_review_level, uuid, appeal_review_decision, text) from public, anon;
grant execute on function public.fn_flag_ai_org(uuid) to authenticated;
grant execute on function public.fn_unflag_ai_org(uuid) to authenticated;
grant execute on function public.get_reliability_score(uuid) to authenticated;
grant execute on function public.resolve_appeal(uuid, appeal_review_level, uuid, appeal_review_decision, text) to authenticated;

-- 5. Storage: stop bucket listing -----------------------------------------------
drop policy if exists "post-photos public read" on storage.objects;
