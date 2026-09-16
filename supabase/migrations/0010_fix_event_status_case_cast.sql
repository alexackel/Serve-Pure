-- fn_sync_event_registered_count's CASE expression assigns plain string
-- literals to events.status (event_lifecycle_status). A single literal
-- assignment gets an implicit cast in plpgsql, but Postgres resolves a
-- multi-branch CASE's own type first — with only text literals as branches,
-- it infers `text`, then fails assigning that to the enum column. Cast the
-- whole CASE result explicitly. Logic is otherwise unchanged from 0004.
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
      status = (case
        when e.status = 'cancelled' then 'cancelled'
        when v_count >= coalesce(e.capacity, 2147483647) then 'full'
        else 'available'
      end)::event_lifecycle_status
  where e.id = v_event_id;
  return null;
end;
$$;
