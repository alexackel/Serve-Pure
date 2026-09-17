/*
  User-requested broadening of the brief's self-dealing block. As implemented
  (0004, revised 0014), the rule only blocks the specific events.created_by
  account from registering for their own event. With 0019 making multi-admin
  orgs actually creatable, that leaves a loophole: Admin A creates an event
  under Org X, and Admin B (a co-admin of the same Org X, but not the event's
  creator) can still register for it — free verified hours for the
  organization's own admin team, the same "no real check" problem the brief's
  rule exists to prevent, just one hop removed from the literal creator.

  fn_is_org_admin(p_org_id) (0002) is hardcoded to auth.uid(), so it can't be
  reused here to check new.user_id (the registrant, who may not be the caller
  once an org-admin-driven registration flow exists) — add a
  parameterized variant.
*/

create or replace function public.fn_is_org_admin_of(p_org_id uuid, p_user_id uuid) returns boolean
language sql stable as $$
  select exists(select 1 from public.org_admins where org_id = p_org_id and user_id = p_user_id);
$$;

create or replace function public.fn_registrations_before_insert() returns trigger
language plpgsql as $$
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
     or (v_event.org_id is not null and public.fn_is_org_admin_of(v_event.org_id, new.user_id)) then
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
language plpgsql as $$
declare
  v_created_by uuid;
  v_org_id uuid;
  v_start timestamptz;
begin
  select created_by, org_id into v_created_by, v_org_id from public.events where id = new.event_id;
  if v_created_by = new.user_id
     or (v_org_id is not null and public.fn_is_org_admin_of(v_org_id, new.user_id)) then
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
