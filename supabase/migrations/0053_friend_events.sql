/*
  "Volunteer with Friends" — a casual event (org_id still null, same as any
  individual/casual post from 0003) that's explicitly social: restricted to
  the poster's friends (followers) and whichever of their groups they choose
  to share it with, and exempt from the reliability-score cancellation
  penalty, since joining is a favor to a friend rather than a commitment to
  a verifying organization. Nobody on the platform can verify attendance for
  these (there's no real org admin to do it), so after the event passes each
  joiner is prompted in the app to self-confirm via the existing Self Upload
  path instead — see src/components/friend-event-followup-modal.tsx.
*/

alter table public.events
  add column org_name text,              -- free-text org name, parallel to attendance_records.activity_org_name
  add column is_friend_event boolean not null default false;

alter table public.registrations
  add column friend_followup_resolved_at timestamptz;  -- set by the registrant once they've answered the post-event prompt

-- Which of the poster's groups a friend-event was also shared to (in
-- addition to their followers, who can always see it). Mirrors
-- attendance_report_groups' (event, group) shape, 0035.
create table public.event_shared_groups (
  event_id uuid not null references public.events(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, group_id)
);
create index idx_event_shared_groups_group on public.event_shared_groups(group_id);

-- Visibility predicate for a friend event. Security definer, same shape and
-- reasoning as private.fn_can_see_activity (0042): called from this table's
-- own RLS policy below, so without security definer it would recurse into
-- events'/event_shared_groups' own RLS.
create or replace function private.fn_can_see_friend_event(p_event_id uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when e.created_by = p_viewer then true
    when private.fn_is_blocked(e.created_by, p_viewer) then false
    when private.fn_is_follower(p_viewer, e.created_by) then true
    when exists (
      select 1 from public.event_shared_groups esg
      where esg.event_id = e.id and private.fn_is_group_member(esg.group_id)
    ) then true
    else false
  end
  from public.events e where e.id = p_event_id;
$$;

alter table public.event_shared_groups enable row level security;
create policy event_shared_groups_select on public.event_shared_groups for select using (
  exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  or private.fn_is_group_member(group_id)
);
create policy event_shared_groups_insert_creator on public.event_shared_groups for insert with check (
  exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  and private.fn_is_group_member(group_id)
);
create policy event_shared_groups_delete_creator on public.event_shared_groups for delete using (
  exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
);
revoke update on public.event_shared_groups from authenticated;

-- events_select_all (0006) is `using (true)` — a permissive policy that
-- would OR right past any new restrictive one — so it has to be narrowed
-- directly rather than just adding an extra policy alongside it.
drop policy events_select_all on public.events;
create policy events_select_public on public.events for select using (not is_friend_event);
create policy events_select_friend_event on public.events for select using (
  is_friend_event and private.fn_can_see_friend_event(id, auth.uid())
);

-- Extend the self-dealing/minor-guardian/auto-confirm trigger (0004, last
-- redefined 0052) with a friend-event visibility check: someone who was
-- never shown the post (not a follower, not in a shared group, not the
-- creator) can't register for it just by guessing its event id.
create or replace function public.fn_registrations_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare
  v_event record;
  v_birthdate date;
begin
  select created_by, org_id, start_at, is_friend_event into v_event from public.events where id = new.event_id;

  -- Self-dealing guard: the creator, any admin of the posting organization, or
  -- anyone sharing a verified phone with them, cannot register for the event.
  if private.fn_is_event_operator_conflict(new.user_id, new.event_id) then
    raise exception 'self_dealing_violation: event creator or their organization''s admins cannot register for this event'
      using errcode = '23514';
  end if;

  if v_event.is_friend_event and not private.fn_can_see_friend_event(new.event_id, new.user_id) then
    raise exception 'not_visible: cannot register for a friend event you cannot see'
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

-- Cancellation penalty (0004, search_path hardened 0032): a friend event can
-- never penalize a cancellation, regardless of timing — joining was a favor
-- to a friend, not a commitment to a verifying organization.
create or replace function public.fn_registration_cancel() returns trigger
language plpgsql set search_path = public as $$
declare
  v_start timestamptz;
  v_is_friend_event boolean;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := now();
    select start_at, is_friend_event into v_start, v_is_friend_event from public.events where id = new.event_id;
    if v_is_friend_event then
      new.penalized := false;
    elsif new.cancelled_by_type = 'organizer' then
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
