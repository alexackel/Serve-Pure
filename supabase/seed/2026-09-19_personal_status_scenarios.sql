/*
  Test data for the new "Personal" history status (creator approve/deny on an
  individual/casual post's registrants). Paste into the Supabase SQL editor
  and run once — idempotent, safe to re-run.

  Run after 0031_self_report_org_contact.sql. Independent of the other seed
  files in this folder, but reuses their seed.jordan/seed.avery fake accounts
  by email if they already exist, rather than duplicating them.

  Two scenarios:

  1. You (the real signed-in account) are the CREATOR of two past casual
     events, each with one fake volunteer still 'pending'. Open Find (they
     sort near the top by start_at ascending, since past events aren't
     auto-marked 'completed') -> tap into "...(Approve Me)" or
     "...(Deny Me)" -> expand Registered Volunteers -> tap the volunteer ->
     Approve/Deny should appear (event/[id]/volunteer/[volunteerId].tsx).
     Approving should show a "Personal" badge in that flow, and once you
     check your own You tab, nothing changes there (you're the creator, not
     the volunteer, on these two).

  2. A fake account (seed.jordan) is the creator of a third past casual
     event, and YOU are the pending volunteer on it — it should show as
     "Pending" in your own You tab > History right now. To see it flip to
     "Personal" (approve) or "No-Show" (deny), sign into the app as
     seed.jordan@servepure.test / seed-test-password in a second
     session/incognito window and act on it from that event's roster.
*/

create extension if not exists pgcrypto;

do $$
declare
  v_real_user uuid;
  v_jordan uuid;
  v_avery uuid;
  v_evt_approve_me uuid;
  v_evt_deny_me uuid;
  v_evt_jordans_cleanup uuid;
begin
  select id into v_real_user from public.profiles
  where email not like 'seed.%@servepure.test'
  order by created_at asc limit 1;

  if v_real_user is null then
    raise exception 'No real profile found. Sign up in the app first, then re-run this seed.';
  end if;

  /* Fake account: Jordan Rivera (reused from the other seed files if present) */
  select id into v_jordan from auth.users where email = 'seed.jordan@servepure.test';
  if v_jordan is null then
    v_jordan := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_jordan, 'authenticated', 'authenticated',
      'seed.jordan@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Jordan Rivera","birthdate":"2007-03-14"}',
      now(), now(), '', '', '', ''
    );
    update public.profiles set identity_verified = true where id = v_jordan;
  end if;

  /* Fake account: Avery Chen (reused from the other seed files if present) */
  select id into v_avery from auth.users where email = 'seed.avery@servepure.test';
  if v_avery is null then
    v_avery := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_avery, 'authenticated', 'authenticated',
      'seed.avery@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Avery Chen","birthdate":"2003-11-02"}',
      now(), now(), '', '', '', ''
    );
  end if;

  -----------------------------------------------------------------------
  -- 1. Your own casual events, each with one fake volunteer pending
  -----------------------------------------------------------------------

  select id into v_evt_approve_me from public.events where title = 'Seed: Personal Status — Approve Me' and created_by = v_real_user;
  if v_evt_approve_me is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at)
    values (v_real_user, 'Seed: Personal Status — Approve Me', 'Seed casual event — approve Jordan''s attendance.',
            'Environment', '1 Personal Test Way, Testville', now() - interval '5 days', now() - interval '5 days' + interval '2 hours')
    returning id into v_evt_approve_me;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_approve_me, v_jordan
  where not exists (select 1 from public.registrations where event_id = v_evt_approve_me and user_id = v_jordan);

  select id into v_evt_deny_me from public.events where title = 'Seed: Personal Status — Deny Me' and created_by = v_real_user;
  if v_evt_deny_me is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at)
    values (v_real_user, 'Seed: Personal Status — Deny Me', 'Seed casual event — deny Avery''s attendance.',
            'Environment', '2 Personal Test Way, Testville', now() - interval '6 days', now() - interval '6 days' + interval '2 hours')
    returning id into v_evt_deny_me;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_deny_me, v_avery
  where not exists (select 1 from public.registrations where event_id = v_evt_deny_me and user_id = v_avery);

  -----------------------------------------------------------------------
  -- 2. A fake user's casual event, with you as the pending volunteer
  -----------------------------------------------------------------------

  select id into v_evt_jordans_cleanup from public.events where title = 'Seed: Personal Status — Jordan''s Cleanup';
  if v_evt_jordans_cleanup is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at)
    values (v_jordan, 'Seed: Personal Status — Jordan''s Cleanup', 'Seed casual event — sign in as Jordan to approve/deny you.',
            'Environment', '3 Personal Test Way, Testville', now() - interval '4 days', now() - interval '4 days' + interval '2 hours')
    returning id into v_evt_jordans_cleanup;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_jordans_cleanup, v_real_user
  where not exists (select 1 from public.registrations where event_id = v_evt_jordans_cleanup and user_id = v_real_user);

end $$;
