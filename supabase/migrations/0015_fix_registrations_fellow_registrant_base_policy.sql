/*
  Bug found while live-testing 0014's fix: fetchRoster (event/[id].tsx) still
  only showed the viewer's own row, even after 0014 added
  profiles_select_fellow_registrant. That's because the base registrations
  table itself had no policy letting a fellow registrant see ANOTHER
  registrant's registrations row in the first place, only self/organizer/
  app-admin (0006_rls_policies.sql). PostgREST never got far enough to embed
  that row's profile, since the row itself was filtered out before the join.

  group_members already got this exact base-table fix in
  0012_group_leaderboard_visibility.sql (group_members_select_fellow_member);
  registrations never got the equivalent.
*/
create policy registrations_select_fellow_registrant on public.registrations for select using (
  fn_shares_event_registration(user_id)
);

/*
  More seed data: the History tab had nothing to show besides one pending
  row, so there was no way to check verified/self-uploaded/pending hours
  actually render right. Adds, idempotently, on top of
  2026-09-16_debug_session.sql:
   - a third seed event (kept pending, source platform_registration)
   - the Neighborhood Park Cleanup attendance record flipped to verified
   - one self-reported (pending) attendance record
  plus the already-seeded cancelled Event B registration, that's all four
  History statuses covered.
*/
do $$
declare
  v_real_user uuid;
  v_fake1 uuid;
  v_fake2 uuid;
  v_event_a uuid;
  v_event_c uuid;
begin
  select id into v_real_user from public.profiles
  where email not like 'seed.%@servepure.test'
  order by created_at asc limit 1;

  select id into v_fake1 from auth.users where email = 'seed.jordan@servepure.test';
  select id into v_fake2 from auth.users where email = 'seed.avery@servepure.test';
  select id into v_event_a from public.events where title = 'Seed: Neighborhood Park Cleanup';

  if v_real_user is null or v_fake1 is null or v_fake2 is null or v_event_a is null then
    raise exception 'Seed accounts/events not found. Run 2026-09-16_debug_session.sql first.';
  end if;

  /* Third event: real user registered, left pending (platform_registration). */
  select id into v_event_c from public.events where title = 'Seed: Library Book Sorting';
  if v_event_c is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at, capacity)
    values (
      v_fake2, 'Seed: Library Book Sorting',
      'Debug-session seed event. Sort and shelve donated books.',
      'Education', '789 Test Library Ln, Testville',
      now() + interval '20 days', now() + interval '20 days 2 hours', 8
    ) returning id into v_event_c;
  end if;

  insert into public.registrations (event_id, user_id)
  select v_event_c, v_real_user
  where not exists (select 1 from public.registrations where event_id = v_event_c and user_id = v_real_user);

  /* Verify the real user's Neighborhood Park Cleanup attendance record. */
  update public.attendance_records
  set status = 'verified', hours_awarded = 3, verified_by = v_fake1,
      verified_by_role = 'event_organizer', verified_at = now()
  where event_id = v_event_a and user_id = v_real_user and source = 'platform_registration' and status = 'pending';

  /* One self-reported (pending) entry, to cover the "self-uploaded" bucket. */
  insert into public.attendance_records (user_id, source, status, activity_title, activity_org_name, hours_claimed)
  select v_real_user, 'self_reported', 'pending', 'Seed: Beach Cleanup', 'Coastal Volunteers Co-op', 4
  where not exists (
    select 1 from public.attendance_records
    where user_id = v_real_user and source = 'self_reported' and activity_title = 'Seed: Beach Cleanup'
  );
end $$;
