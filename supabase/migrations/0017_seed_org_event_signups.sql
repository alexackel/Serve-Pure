/*
  Seeds sign-ups on your real GreenFuture Coalition events (not the synthetic
  individual test events from the earlier debug seed) so the Approve/History
  flow can be checked against real organizer data. Registers the two fake
  test accounts (seed.jordan@servepure.test, seed.avery@servepure.test) on
  events that currently have 0 volunteers. Idempotent: safe to run again.
*/
do $$
declare
  v_fake1 uuid;
  v_fake2 uuid;
  v_event_trail uuid;
  v_event_riverside uuid;
begin
  select id into v_fake1 from auth.users where email = 'seed.jordan@servepure.test';
  select id into v_fake2 from auth.users where email = 'seed.avery@servepure.test';

  if v_fake1 is null or v_fake2 is null then
    raise exception 'Seed accounts not found. Run 2026-09-16_debug_session.sql first.';
  end if;

  select e.id into v_event_trail
  from public.events e join public.organizations o on o.id = e.org_id
  where o.name = 'GreenFuture Coalition' and e.title = 'Same-Week Trail Repair';

  select e.id into v_event_riverside
  from public.events e join public.organizations o on o.id = e.org_id
  where o.name = 'GreenFuture Coalition' and e.title = 'Riverside Park Cleanup';

  if v_event_trail is not null then
    insert into public.registrations (event_id, user_id)
    select v_event_trail, v_fake1
    where not exists (select 1 from public.registrations where event_id = v_event_trail and user_id = v_fake1);
  end if;

  if v_event_riverside is not null then
    insert into public.registrations (event_id, user_id)
    select v_event_riverside, v_fake2
    where not exists (select 1 from public.registrations where event_id = v_event_riverside and user_id = v_fake2);
  end if;
end $$;
