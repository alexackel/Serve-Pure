-- Several AFTER triggers from 0004 write to a table OTHER than the one the
-- triggering statement targets (registrations -> events / attendance_records,
-- attendance_records -> attendance_verification_log). Because none of them
-- were SECURITY DEFINER, Postgres evaluated their internal writes under RLS
-- as the ORIGINAL caller — so a plain volunteer registering for someone
-- else's event (the common case) got "new row violates row-level security
-- policy" the moment trg_create_attendance_record tried to insert a
-- platform_registration row, since attendance_insert_self_report only
-- allows source = 'self_reported'. Same underlying problem would have hit
-- fn_sync_event_registered_count (no events_update policy matches a
-- non-admin volunteer) and fn_sync_attendance_on_cancel /
-- fn_log_verification_change (no attendance_update_self /
-- attendance_verification_log insert policy exists for a volunteer at all).
-- Fix: mark all four SECURITY DEFINER, matching the pattern already used for
-- fn_org_auto_admin / fn_group_auto_admin / get_reliability_score /
-- resolve_appeal. Trigger logic is unchanged.

create or replace function public.fn_sync_event_registered_count() returns trigger
language plpgsql security definer set search_path = public as $$
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

create or replace function public.fn_create_attendance_record() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.attendance_records (user_id, registration_id, event_id, org_id, source, status)
  select new.user_id, new.id, new.event_id, e.org_id, 'platform_registration', 'pending'
  from public.events e where e.id = new.event_id;
  return new;
end;
$$;

create or replace function public.fn_sync_attendance_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.attendance_records
    set status = 'cancelled', updated_at = now()
    where registration_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create or replace function public.fn_log_verification_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.attendance_verification_log
    (attendance_record_id, previous_status, new_status, changed_by, changed_by_role, note)
  values (new.id, old.status, new.status, new.verified_by, new.verified_by_role, new.notes);
  return new;
end;
$$;
