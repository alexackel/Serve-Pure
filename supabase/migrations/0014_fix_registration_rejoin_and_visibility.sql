/*
  Bug: re-registering for an event after cancelling always failed with
  "You're already registered for this event." registrations had a plain
  unique(event_id, user_id) constraint with no status filter, and
  unregister() soft-cancels (never deletes) a row, so a cancelled row
  permanently occupied that unique slot and any later insert hit 23505.
*/

alter table public.registrations drop constraint registrations_event_id_user_id_key;
create unique index uq_registrations_active on public.registrations(event_id, user_id) where status <> 'cancelled';

/*
  Revive a cancelled registration cleanly on update instead of leaving stale
  cancellation fields around, and re-apply the same 48h-before-start
  auto-confirm rule fn_registrations_before_insert applies on first insert.
*/
create or replace function public.fn_registrations_before_update() returns trigger
language plpgsql as $$
declare
  v_created_by uuid;
  v_start timestamptz;
begin
  select created_by into v_created_by from public.events where id = new.event_id;
  if v_created_by = new.user_id then
    raise exception 'self_dealing_violation: event creator cannot register for their own event'
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

/*
  Mirror of fn_sync_attendance_on_cancel: flip the linked attendance_records
  row back to 'pending' when a registration is revived, so it doesn't stay
  stuck showing a cancelled attendance record.
*/
create or replace function public.fn_sync_attendance_on_revive() returns trigger
language plpgsql as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.attendance_records
    set status = 'pending', updated_at = now()
    where registration_id = new.id and status = 'cancelled';
  end if;
  return new;
end;
$$;
create trigger trg_sync_attendance_on_revive
after update of status on public.registrations
for each row execute function public.fn_sync_attendance_on_revive();

/*
  Bug: fetchRoster (event/[id].tsx) and getGroupMembers (groups-context.tsx)
  both embed profiles!user_id(...)/profiles(...), which PostgREST turns into
  an inner join since those FK columns are NOT NULL. No RLS policy let a
  plain registrant/member see a fellow registrant's/member's profile, so
  every other person's row was silently dropped from both results, the
  same class of bug 0011 already fixed once for org reviewers.
*/

create or replace function public.fn_shares_event_registration(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.registrations r1
    join public.registrations r2 on r1.event_id = r2.event_id
    where r1.user_id = p_user_id and r2.user_id = auth.uid()
      and r1.status <> 'cancelled' and r2.status <> 'cancelled'
  );
$$;

create policy profiles_select_fellow_registrant on public.profiles for select using (
  fn_shares_event_registration(profiles.id)
);

/*
  fn_shares_group already exists (0012_group_leaderboard_visibility.sql) but
  was never given a matching profiles policy, so widening group_members'
  own visibility there didn't actually surface member names anywhere.
*/
create policy profiles_select_fellow_group_member on public.profiles for select using (
  fn_shares_group(profiles.id)
);

/*
  Bug: group_admins_select (0008) only allowed self/admin/app-admin, so a
  plain member's getGroupMembers() query for "who's an admin" always came
  back empty, and every member (including real admins) rendered as non-admin.
*/
create policy group_admins_select_fellow_member on public.group_admins for select using (
  fn_is_group_member(group_id)
);
