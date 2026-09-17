/*
  Debug-session test data. Paste into the Supabase SQL editor and run once
  (it's idempotent, safe to run again, it skips anything it already made).
  Run AFTER 0014_fix_registration_rejoin_and_visibility.sql.

  Creates 2 fake accounts (there's only one real signed-up account to test
  with), a couple of events, and a group, wired up to exercise every bug
  fixed today:
   - a CANCELLED registration for the real user, to verify re-registering
     no longer shows "You're already registered"
   - fellow registrants/group members on events/groups the real user is also
     on, to verify the roster/member-list RLS fix
   - one fake user verified, one not, to verify the badge fix
   - an event with min_age/requirements populated, to verify the
     Requirements section fix
   - a group with a non-creator admin, to verify the admin-badge fix
*/

create extension if not exists pgcrypto;

do $$
declare
  v_real_user uuid;
  v_fake1 uuid;
  v_fake2 uuid;
  v_event_a uuid;
  v_event_b uuid;
  v_group uuid;
begin
  select id into v_real_user from public.profiles
  where email not like 'seed.%@servepure.test'
  order by created_at asc limit 1;

  if v_real_user is null then
    raise exception 'No real profile found. Sign up in the app first, then re-run this seed.';
  end if;

  /* Fake account 1: Jordan Rivera (identity_verified = true) */
  select id into v_fake1 from auth.users where email = 'seed.jordan@servepure.test';
  if v_fake1 is null then
    v_fake1 := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_fake1, 'authenticated', 'authenticated',
      'seed.jordan@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Jordan Rivera","birthdate":"2007-03-14"}',
      now(), now(), '', '', '', ''
    );
    update public.profiles set identity_verified = true where id = v_fake1;
  end if;

  /* Fake account 2: Avery Chen (left unverified) */
  select id into v_fake2 from auth.users where email = 'seed.avery@servepure.test';
  if v_fake2 is null then
    v_fake2 := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_fake2, 'authenticated', 'authenticated',
      'seed.avery@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Avery Chen","birthdate":"2003-11-02"}',
      now(), now(), '', '', '', ''
    );
  end if;

  /* Event A: created by Jordan, has requirements/min_age populated. */
  select id into v_event_a from public.events where title = 'Seed: Neighborhood Park Cleanup';
  if v_event_a is null then
    insert into public.events (
      created_by, title, description, category, address, start_at, end_at,
      capacity, min_age, requirements
    ) values (
      v_fake1, 'Seed: Neighborhood Park Cleanup',
      'Debug-session seed event. Pick up litter and mulch flower beds.',
      'Environment', '123 Test Park Ave, Testville',
      now() + interval '14 days', now() + interval '14 days 3 hours',
      10, 13,
      '{"skills": ["First Aid", "Teamwork"], "physical": "Light lifting", "what_to_bring": ["Water bottle", "Gloves"]}'::jsonb
    ) returning id into v_event_a;
  end if;

  /*
    Event B: created by Avery, no requirements. This is the "cancel then
    re-register" event for the real user.
  */
  select id into v_event_b from public.events where title = 'Seed: Animal Shelter Supply Sort';
  if v_event_b is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at, capacity)
    values (
      v_fake2, 'Seed: Animal Shelter Supply Sort',
      'Debug-session seed event. Sort donated supplies.',
      'Animals', '456 Test Shelter Rd, Testville',
      now() + interval '10 days', now() + interval '10 days 2 hours', 5
    ) returning id into v_event_b;
  end if;

  /* Real user + Avery both actively registered on Event A (roster visibility test). */
  insert into public.registrations (event_id, user_id)
  select v_event_a, v_real_user
  where not exists (select 1 from public.registrations where event_id = v_event_a and user_id = v_real_user)
  on conflict do nothing;

  insert into public.registrations (event_id, user_id)
  select v_event_a, v_fake2
  where not exists (select 1 from public.registrations where event_id = v_event_a and user_id = v_fake2)
  on conflict do nothing;

  /* Jordan actively registered on Event B (roster visibility test). */
  insert into public.registrations (event_id, user_id)
  select v_event_b, v_fake1
  where not exists (select 1 from public.registrations where event_id = v_event_b and user_id = v_fake1)
  on conflict do nothing;

  /*
    Real user registered then cancelled on Event B. This is the row that
    reproduced "You're already registered" before 0014's fix. Only seed the
    cancel if there's no existing (active or cancelled) row yet, so re-running
    this script after you've already re-registered doesn't cancel you again.
  */
  if not exists (select 1 from public.registrations where event_id = v_event_b and user_id = v_real_user) then
    insert into public.registrations (event_id, user_id) values (v_event_b, v_real_user);
    update public.registrations set status = 'cancelled', cancelled_by_type = 'volunteer', cancelled_by_user_id = v_real_user
    where event_id = v_event_b and user_id = v_real_user;
  end if;

  /*
    Group: created by Jordan (auto-admin+member via trg_group_auto_admin),
    Avery added as a second admin, real user added as a plain member.
  */
  select id into v_group from public.groups where name = 'Seed: Test Volunteer Squad';
  if v_group is null then
    insert into public.groups (created_by, name, description)
    values (v_fake1, 'Seed: Test Volunteer Squad', 'Debug-session seed group.')
    returning id into v_group;

    insert into public.group_admins (group_id, user_id, added_by) values (v_group, v_fake2, v_fake1);
    insert into public.group_members (group_id, user_id) values (v_group, v_fake2);
    insert into public.group_members (group_id, user_id) values (v_group, v_real_user);
  end if;
end $$;
