/*
  Path-verification test data. Paste into the Supabase SQL editor and run once
  (idempotent — safe to re-run, it skips/reuses anything it already made).
  Run AFTER 0019_admin_invite_policies.sql through 0022_block_org_admin_self_registration.sql,
  and after (or independently of — this file creates jordan/avery itself if
  they don't already exist) supabase/seed/2026-09-16_debug_session.sql.

  Builds enough fixtures to exercise every path in PRODUCT_BRIEF1.md and the
  current schema, including several states no mock-data file ever modeled
  (partial hours, rejected self-reports, the full appeal chain, org/group
  multi-admin, subgroup independence, an event-level cancellation cascade,
  and the new org-admin self-dealing block). Regression scenarios that are
  SUPPOSED to be rejected (self-dealing, minor-without-guardian, verification
  precedence) are wrapped in a nested BEGIN/EXCEPTION block (PL/pgSQL's
  savepoint-equivalent) so a passing run commits nothing bad and a failing
  run (i.e. the guard rail didn't fire) raises loudly instead of silently
  seeding corrupt data.

  This runs as the SQL editor's superuser role, not through a real app
  session — so it writes org_admins/group_admins directly (bypassing RLS
  entirely, same as the debug-session seed already does), regardless of the
  0019 policy. That policy is for the real "existing admin invites another
  admin" app-level path, not needed here.
*/

create extension if not exists pgcrypto;

do $$
declare
  -- Accounts
  v_jordan uuid; v_avery uuid;  -- reused/created from the debug-session seed
  v_morgan uuid; v_riley uuid; v_casey uuid; v_taylor uuid;
  v_sydney uuid; v_drew uuid; v_harper uuid; v_quinn uuid; v_admin uuid;

  -- Orgs / groups
  v_org_river uuid; v_org_new uuid;
  v_group_regional uuid; v_group_westside uuid;

  -- Events
  v_evt_riverside uuid; v_evt_workshop uuid; v_evt_cancelled uuid;
  v_evt_verified_past uuid; v_evt_pending_past uuid;
  v_evt_noshow_escalated uuid; v_evt_noshow_overturned uuid; v_evt_partial uuid;
  v_evt_cancel24plus uuid; v_evt_cancel24within uuid; v_evt_precedence uuid;
  v_evt_casual_selfdeal uuid; v_evt_casual_verify uuid;
  v_evt_nn1 uuid; v_evt_nn2 uuid;

  -- Scratch
  v_reg uuid; v_att uuid; v_appeal uuid;
begin
  -----------------------------------------------------------------------
  -- 1. Accounts
  -----------------------------------------------------------------------

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

  -- Minor, has a guardian on file — exercises 0020's notification trigger.
  select id into v_morgan from auth.users where email = 'seed.morgan@servepure.test';
  if v_morgan is null then
    v_morgan := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_morgan, 'authenticated', 'authenticated',
      'seed.morgan@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Morgan Ellis","birthdate":"2010-03-01"}',
      now(), now(), '', '', '', ''
    );
  end if;

  -- Minor, NO guardian on file — regression fixture for the existing block.
  select id into v_riley from auth.users where email = 'seed.riley@servepure.test';
  if v_riley is null then
    v_riley := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_riley, 'authenticated', 'authenticated',
      'seed.riley@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Riley Foster","birthdate":"2011-01-15"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_casey from auth.users where email = 'seed.casey@servepure.test';
  if v_casey is null then
    v_casey := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_casey, 'authenticated', 'authenticated',
      'seed.casey@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Casey Nguyen","birthdate":"1998-01-15"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_taylor from auth.users where email = 'seed.taylor@servepure.test';
  if v_taylor is null then
    v_taylor := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_taylor, 'authenticated', 'authenticated',
      'seed.taylor@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Taylor Brooks","birthdate":"1990-06-10"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_sydney from auth.users where email = 'seed.sydney@servepure.test';
  if v_sydney is null then
    v_sydney := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_sydney, 'authenticated', 'authenticated',
      'seed.sydney@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sydney Park","birthdate":"2000-04-12"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_drew from auth.users where email = 'seed.drew@servepure.test';
  if v_drew is null then
    v_drew := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_drew, 'authenticated', 'authenticated',
      'seed.drew@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Drew Whitfield","birthdate":"1999-12-01"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_harper from auth.users where email = 'seed.harper@servepure.test';
  if v_harper is null then
    v_harper := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_harper, 'authenticated', 'authenticated',
      'seed.harper@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Harper Diaz","birthdate":"1997-07-22"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_quinn from auth.users where email = 'seed.quinn@servepure.test';
  if v_quinn is null then
    v_quinn := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_quinn, 'authenticated', 'authenticated',
      'seed.quinn@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Quinn Alvarez","birthdate":"2002-02-02"}',
      now(), now(), '', '', '', ''
    );
  end if;

  -- App admin, for the app_admin-level appeal review below.
  select id into v_admin from auth.users where email = 'seed.admin@servepure.test';
  if v_admin is null then
    v_admin := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
      'seed.admin@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Alex Admin","birthdate":"1985-01-01"}',
      now(), now(), '', '', '', ''
    );
    update public.profiles set is_app_admin = true where id = v_admin;
  end if;

  -- Guardian for Morgan (email set, so 0020's channel expression resolves to 'email').
  insert into public.guardians (user_id, full_name, relationship, email, is_primary)
  select v_morgan, 'Pat Ellis', 'Parent', 'pat.ellis@example.test', true
  where not exists (select 1 from public.guardians where user_id = v_morgan);

  -----------------------------------------------------------------------
  -- 2. Organizations: one established (>=5 events, 2 admins), one new (<5, 1 admin)
  -----------------------------------------------------------------------

  select id into v_org_river from public.organizations where name = 'Seed: River Valley Volunteers';
  if v_org_river is null then
    insert into public.organizations (name, org_type, verification_status, created_by)
    values ('Seed: River Valley Volunteers', 'Nonprofit', 'verified', v_jordan)
    returning id into v_org_river;
    -- trg_org_auto_admin already added jordan; add avery as a second admin
    -- directly (0019 opens this path for a real app session; this seed
    -- still writes it directly since it has no session to act through).
    insert into public.org_admins (org_id, user_id, added_by) values (v_org_river, v_avery, v_jordan);
  end if;

  select id into v_org_new from public.organizations where name = 'Seed: New Neighbors Initiative';
  if v_org_new is null then
    insert into public.organizations (name, org_type, verification_status, created_by)
    values ('Seed: New Neighbors Initiative', 'Community Group', 'unverified', v_taylor)
    returning id into v_org_new;
  end if;

  -----------------------------------------------------------------------
  -- 3. Groups: a parent with a second admin, a subgroup with independent membership
  -----------------------------------------------------------------------

  select id into v_group_regional from public.groups where name = 'Seed: Regional Volunteer Network';
  if v_group_regional is null then
    insert into public.groups (created_by, name, description)
    values (v_taylor, 'Seed: Regional Volunteer Network', 'Seed parent group.')
    returning id into v_group_regional;
    insert into public.group_admins (group_id, user_id, added_by) values (v_group_regional, v_jordan, v_taylor);
    insert into public.group_members (group_id, user_id) values (v_group_regional, v_jordan);
    insert into public.group_members (group_id, user_id) values (v_group_regional, v_sydney);
    insert into public.group_members (group_id, user_id) values (v_group_regional, v_harper);
  end if;

  select id into v_group_westside from public.groups where name = 'Seed: Westside Chapter';
  if v_group_westside is null then
    insert into public.groups (created_by, name, description, parent_group_id)
    values (v_avery, 'Seed: Westside Chapter', 'Seed subgroup.', v_group_regional)
    returning id into v_group_westside;
    -- Quinn: subgroup-only — deliberately NOT added to the parent, so "no
    -- membership inheritance today" is an explicit fixture, not an assumption.
    insert into public.group_members (group_id, user_id) values (v_group_westside, v_quinn);
    -- Drew: joined both groups independently (shows membership isn't linked).
    insert into public.group_members (group_id, user_id) values (v_group_westside, v_drew);
    insert into public.group_members (group_id, user_id)
    select v_group_regional, v_drew
    where not exists (select 1 from public.group_members where group_id = v_group_regional and user_id = v_drew);
  end if;

  -- Sydney: a self-reported record with no event link, left 'pending' — a
  -- live fixture for a group admin (jordan/taylor) to approve via the
  -- Groups tab's member-record audit UI (exercises the hours_awarded fix).
  insert into public.attendance_records (user_id, source, status, activity_title, activity_org_name, hours_claimed)
  select v_sydney, 'self_reported', 'pending', 'Community Food Pantry Shift', 'Local Food Pantry (unaffiliated)', 2.5
  where not exists (
    select 1 from public.attendance_records
    where user_id = v_sydney and source = 'self_reported' and activity_title = 'Community Food Pantry Shift'
  );

  -----------------------------------------------------------------------
  -- 4. River Valley Volunteers events (established org, 11 events total)
  -----------------------------------------------------------------------

  -- E1: available, uncapped — happy path + guardian-notification + both
  -- self-dealing regression fixtures (minor-no-guardian, org co-admin).
  select id into v_evt_riverside from public.events where title = 'Seed: Riverside Cleanup Day';
  if v_evt_riverside is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Riverside Cleanup Day', 'Seed event.', 'Environment',
            '1 Riverside Way, Testville', now() + interval '7 days', now() + interval '7 days 3 hours')
    returning id into v_evt_riverside;
  end if;

  -- Morgan (minor, has guardian) registers successfully — exercises 0020.
  insert into public.registrations (event_id, user_id)
  select v_evt_riverside, v_morgan
  where not exists (select 1 from public.registrations where event_id = v_evt_riverside and user_id = v_morgan);

  -- Riley (minor, NO guardian) attempts to register — must be blocked.
  begin
    insert into public.registrations (event_id, user_id) values (v_evt_riverside, v_riley);
    raise exception 'REGRESSION: Riley (minor, no guardian) was allowed to register — the guardian gate did not fire.';
  exception
    when others then
      if sqlerrm like '%minor with no guardian on file%' then
        raise notice 'OK: minor-without-guardian block fired for Riley.';
      else
        raise;
      end if;
  end;

  -- Avery (org co-admin, not the creator) attempts to register — must be
  -- blocked by 0022's broadened self-dealing rule.
  begin
    insert into public.registrations (event_id, user_id) values (v_evt_riverside, v_avery);
    raise exception 'REGRESSION: Avery (co-admin, not creator) was allowed to register for their own org''s event — 0022 did not fire.';
  exception
    when sqlstate '23514' then
      raise notice 'OK: org-admin self-dealing block fired for Avery.';
  end;

  -- E2: capacity 2, filled by Casey + Quinn — exercises the 'full' state.
  select id into v_evt_workshop from public.events where title = 'Seed: Full Capacity Workshop';
  if v_evt_workshop is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at, capacity)
    values (v_org_river, v_jordan, 'Seed: Full Capacity Workshop', 'Seed event.', 'Training',
            '2 Riverside Way, Testville', now() + interval '15 days', now() + interval '15 days 2 hours', 2)
    returning id into v_evt_workshop;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_workshop, v_casey
  where not exists (select 1 from public.registrations where event_id = v_evt_workshop and user_id = v_casey);
  insert into public.registrations (event_id, user_id)
  select v_evt_workshop, v_quinn
  where not exists (select 1 from public.registrations where event_id = v_evt_workshop and user_id = v_quinn);

  -- E3: upcoming, then cancelled by the organizer — exercises 0021's cascade.
  select id into v_evt_cancelled from public.events where title = 'Seed: Upcoming But Cancelled Cleanup';
  if v_evt_cancelled is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Upcoming But Cancelled Cleanup', 'Seed event.', 'Environment',
            '3 Riverside Way, Testville', now() + interval '20 days', now() + interval '20 days 3 hours')
    returning id into v_evt_cancelled;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_cancelled, v_sydney
  where not exists (select 1 from public.registrations where event_id = v_evt_cancelled and user_id = v_sydney);
  update public.events set status = 'cancelled' where id = v_evt_cancelled and status <> 'cancelled';

  -- E4: past, Drew attended, fully verified.
  select id into v_evt_verified_past from public.events where title = 'Seed: Past Cleanup — Fully Verified';
  if v_evt_verified_past is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Past Cleanup — Fully Verified', 'Seed event.', 'Environment',
            '4 Riverside Way, Testville', now() - interval '20 days', now() - interval '20 days' + interval '3 hours')
    returning id into v_evt_verified_past;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_verified_past, v_drew
  where not exists (select 1 from public.registrations where event_id = v_evt_verified_past and user_id = v_drew);
  select id into v_reg from public.registrations where event_id = v_evt_verified_past and user_id = v_drew;
  update public.attendance_records
  set status = 'verified', hours_awarded = 3.0, verified_by = v_jordan, verified_by_role = 'org_admin', verified_at = now()
  where registration_id = v_reg;

  -- E5: past, Harper attended, still pending verification — exercises the
  -- You screen's Pending tab and the reliability score's last-10 window.
  select id into v_evt_pending_past from public.events where title = 'Seed: Past Cleanup — Pending Verification';
  if v_evt_pending_past is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Past Cleanup — Pending Verification', 'Seed event.', 'Environment',
            '5 Riverside Way, Testville', now() - interval '15 days', now() - interval '15 days' + interval '3 hours')
    returning id into v_evt_pending_past;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_pending_past, v_harper
  where not exists (select 1 from public.registrations where event_id = v_evt_pending_past and user_id = v_harper);

  -- E6: past, Sydney no-show, appeal escalated to app-admin and upheld.
  select id into v_evt_noshow_escalated from public.events where title = 'Seed: Past Cleanup — No-Show (Escalated)';
  if v_evt_noshow_escalated is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Past Cleanup — No-Show (Escalated)', 'Seed event.', 'Environment',
            '6 Riverside Way, Testville', now() - interval '25 days', now() - interval '25 days' + interval '3 hours')
    returning id into v_evt_noshow_escalated;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_noshow_escalated, v_sydney
  where not exists (select 1 from public.registrations where event_id = v_evt_noshow_escalated and user_id = v_sydney);
  select id into v_reg from public.registrations where event_id = v_evt_noshow_escalated and user_id = v_sydney;
  select id into v_att from public.attendance_records where registration_id = v_reg;
  update public.attendance_records
  set status = 'no_show', verified_by = v_jordan, verified_by_role = 'org_admin', verified_at = now()
  where id = v_att;
  -- Directly write the appeal chain (not via resolve_appeal(), which
  -- requires auth.uid() = p_reviewer_id — impossible from this SQL-editor
  -- session with no real login) — mirrors exactly what resolve_appeal()
  -- itself would have written.
  select id into v_appeal from public.appeals where attendance_record_id = v_att;
  if v_appeal is null then
    insert into public.appeals (attendance_record_id, raised_by, reason, status)
    values (v_att, v_sydney, 'I was there — I just forgot to check in with the site lead.', 'open')
    returning id into v_appeal;
    insert into public.appeal_reviews (appeal_id, level, reviewer_id, decision, notes)
    values (v_appeal, 'organization', v_jordan, 'escalated', 'Not enough info on our end — escalating.');
    update public.appeals set status = 'escalated' where id = v_appeal;
    insert into public.appeal_reviews (appeal_id, level, reviewer_id, decision, notes)
    values (v_appeal, 'app_admin', v_admin, 'upheld', 'No corroborating check-in or photo evidence found.');
    update public.appeals set status = 'upheld', resolved_at = now() where id = v_appeal;
    update public.attendance_records set status = 'no_show' where id = v_att;
  end if;

  -- E7: past, Drew no-show, appeal overturned at the organization level.
  select id into v_evt_noshow_overturned from public.events where title = 'Seed: Past Cleanup — No-Show (Overturned)';
  if v_evt_noshow_overturned is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Past Cleanup — No-Show (Overturned)', 'Seed event.', 'Environment',
            '7 Riverside Way, Testville', now() - interval '22 days', now() - interval '22 days' + interval '3 hours')
    returning id into v_evt_noshow_overturned;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_noshow_overturned, v_drew
  where not exists (select 1 from public.registrations where event_id = v_evt_noshow_overturned and user_id = v_drew);
  select id into v_reg from public.registrations where event_id = v_evt_noshow_overturned and user_id = v_drew;
  select id into v_att from public.attendance_records where registration_id = v_reg;
  -- Unlike E6 (whose appeal is upheld, so the no-show mark is also the final
  -- state), E7's appeal is overturned — the initial no-show mark must only
  -- be applied once, guarded by the same "appeal doesn't exist yet" check
  -- as the appeal chain itself, or a second run would clobber the resolved
  -- 'verified' state back to 'no_show' with no appeal left to re-overturn it.
  select id into v_appeal from public.appeals where attendance_record_id = v_att;
  if v_appeal is null then
    update public.attendance_records
    set status = 'no_show', verified_by = v_jordan, verified_by_role = 'org_admin', verified_at = now()
    where id = v_att;
    insert into public.appeals (attendance_record_id, raised_by, reason, status)
    values (v_att, v_drew, 'The site lead marked the wrong volunteer — I was signed in the whole time.', 'open')
    returning id into v_appeal;
    insert into public.appeal_reviews (appeal_id, level, reviewer_id, decision, notes)
    values (v_appeal, 'organization', v_jordan, 'overturned', 'Confirmed via sign-in sheet — our mistake.');
    update public.appeals set status = 'overturned', resolved_at = now() where id = v_appeal;
    update public.attendance_records set status = 'verified', hours_awarded = 3.0 where id = v_att;
  end if;

  -- E8: past, Harper attended partial hours (no reliability penalty).
  select id into v_evt_partial from public.events where title = 'Seed: Past Cleanup — Partial Hours';
  if v_evt_partial is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Past Cleanup — Partial Hours', 'Seed event.', 'Environment',
            '8 Riverside Way, Testville', now() - interval '18 days', now() - interval '18 days' + interval '4 hours')
    returning id into v_evt_partial;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_partial, v_harper
  where not exists (select 1 from public.registrations where event_id = v_evt_partial and user_id = v_harper);
  select id into v_reg from public.registrations where event_id = v_evt_partial and user_id = v_harper;
  update public.attendance_records
  set status = 'partial', hours_awarded = 2.5, verified_by = v_jordan, verified_by_role = 'org_admin', verified_at = now()
  where registration_id = v_reg;

  -- E9: cancelled 24h+ before the event — no penalty.
  select id into v_evt_cancel24plus from public.events where title = 'Seed: Cancelled 24h+ Before';
  if v_evt_cancel24plus is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Cancelled 24h+ Before', 'Seed event.', 'Environment',
            '9 Riverside Way, Testville', now() + interval '10 days', now() + interval '10 days 2 hours')
    returning id into v_evt_cancel24plus;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_cancel24plus, v_sydney
  where not exists (select 1 from public.registrations where event_id = v_evt_cancel24plus and user_id = v_sydney);
  update public.registrations
  set status = 'cancelled', cancelled_by_type = 'volunteer', cancelled_by_user_id = v_sydney
  where event_id = v_evt_cancel24plus and user_id = v_sydney and status <> 'cancelled';

  -- E10: cancelled within 24h of the event — penalized.
  select id into v_evt_cancel24within from public.events where title = 'Seed: Cancelled Within 24h';
  if v_evt_cancel24within is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Cancelled Within 24h', 'Seed event.', 'Environment',
            '10 Riverside Way, Testville', now() + interval '10 hours', now() + interval '12 hours')
    returning id into v_evt_cancel24within;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_cancel24within, v_harper
  where not exists (select 1 from public.registrations where event_id = v_evt_cancel24within and user_id = v_harper);
  update public.registrations
  set status = 'cancelled', cancelled_by_type = 'volunteer', cancelled_by_user_id = v_harper
  where event_id = v_evt_cancel24within and user_id = v_harper and status <> 'cancelled';

  -- E11: org-verifies-then-group-tries-to-override — exercises verification precedence.
  select id into v_evt_precedence from public.events where title = 'Seed: Precedence Conflict Test';
  if v_evt_precedence is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_river, v_jordan, 'Seed: Precedence Conflict Test', 'Seed event.', 'Environment',
            '11 Riverside Way, Testville', now() - interval '12 days', now() - interval '12 days' + interval '3 hours')
    returning id into v_evt_precedence;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_precedence, v_sydney
  where not exists (select 1 from public.registrations where event_id = v_evt_precedence and user_id = v_sydney);
  select id into v_reg from public.registrations where event_id = v_evt_precedence and user_id = v_sydney;
  select id into v_att from public.attendance_records where registration_id = v_reg;
  update public.attendance_records
  set status = 'verified', hours_awarded = 3.0, verified_by = v_jordan, verified_by_role = 'org_admin', verified_at = now()
  where id = v_att and verified_by_role is distinct from 'org_admin';

  -- Taylor (a group admin of Regional Volunteer Network, which Sydney
  -- belongs to) attempts to override the org's verdict — must be blocked.
  begin
    update public.attendance_records
    set status = 'no_show', verified_by = v_taylor, verified_by_role = 'group_admin', verified_at = now()
    where id = v_att;
    raise exception 'REGRESSION: a group_admin was allowed to override an org_admin''s verification — precedence trigger did not fire.';
  exception
    when others then
      if sqlerrm like '%org verification%is final%' then
        raise notice 'OK: verification-precedence block fired for Taylor''s override attempt.';
      else
        raise;
      end if;
  end;

  -----------------------------------------------------------------------
  -- 5. Casual/individual events (org_id null, created by Casey)
  -----------------------------------------------------------------------

  select id into v_evt_casual_selfdeal from public.events where title = 'Seed: Casey''s Neighborhood Cleanup';
  if v_evt_casual_selfdeal is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at)
    values (v_casey, 'Seed: Casey''s Neighborhood Cleanup', 'Seed casual event.', 'Environment',
            '1 Casual Way, Testville', now() + interval '9 days', now() + interval '9 days 2 hours')
    returning id into v_evt_casual_selfdeal;
  end if;
  -- Casey (the creator) attempts to register for their own casual event.
  begin
    insert into public.registrations (event_id, user_id) values (v_evt_casual_selfdeal, v_casey);
    raise exception 'REGRESSION: Casey was allowed to register for their own casual event — 0018''s fix regressed.';
  exception
    when sqlstate '23514' then
      raise notice 'OK: self-dealing block fired for Casey''s own casual event.';
  end;

  -- Casual event where Casey (creator, no org) verifies Drew's attendance —
  -- proves the event_organizer RLS/enum plumbing works, even with no UI yet.
  select id into v_evt_casual_verify from public.events where title = 'Seed: Casey''s Trail Restoration';
  if v_evt_casual_verify is null then
    insert into public.events (created_by, title, description, category, address, start_at, end_at)
    values (v_casey, 'Seed: Casey''s Trail Restoration', 'Seed casual event.', 'Environment',
            '2 Casual Way, Testville', now() - interval '8 days', now() - interval '8 days' + interval '3 hours')
    returning id into v_evt_casual_verify;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_casual_verify, v_drew
  where not exists (select 1 from public.registrations where event_id = v_evt_casual_verify and user_id = v_drew);
  select id into v_reg from public.registrations where event_id = v_evt_casual_verify and user_id = v_drew;
  update public.attendance_records
  set status = 'verified', hours_awarded = 3.0, verified_by = v_casey, verified_by_role = 'event_organizer', verified_at = now()
  where registration_id = v_reg;

  -----------------------------------------------------------------------
  -- 6. Self-reported hours, rejected by an org admin
  -----------------------------------------------------------------------

  insert into public.attendance_records (user_id, org_id, source, status, activity_title, activity_org_name, hours_claimed, verified_by, verified_by_role, verified_at, notes)
  select v_harper, v_org_river, 'self_reported', 'rejected', 'Neighborhood Tutoring', 'Seed: River Valley Volunteers',
         3.5, v_jordan, 'org_admin', now(), 'No record of this activity on our calendar.'
  where not exists (
    select 1 from public.attendance_records
    where user_id = v_harper and source = 'self_reported' and activity_title = 'Neighborhood Tutoring'
  );

  -----------------------------------------------------------------------
  -- 7. New Neighbors Initiative (new org, <5 events)
  -----------------------------------------------------------------------

  select id into v_evt_nn1 from public.events where title = 'Seed: New Neighbors Welcome Mixer';
  if v_evt_nn1 is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_new, v_taylor, 'Seed: New Neighbors Welcome Mixer', 'Seed event.', 'Community',
            '1 New Neighbors Ln, Testville', now() + interval '5 days', now() + interval '5 days 2 hours')
    returning id into v_evt_nn1;
  end if;

  select id into v_evt_nn2 from public.events where title = 'Seed: New Neighbors Past Cleanup';
  if v_evt_nn2 is null then
    insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at)
    values (v_org_new, v_taylor, 'Seed: New Neighbors Past Cleanup', 'Seed event.', 'Community',
            '2 New Neighbors Ln, Testville', now() - interval '10 days', now() - interval '10 days' + interval '2 hours')
    returning id into v_evt_nn2;
  end if;
  insert into public.registrations (event_id, user_id)
  select v_evt_nn2, v_quinn
  where not exists (select 1 from public.registrations where event_id = v_evt_nn2 and user_id = v_quinn);
  select id into v_reg from public.registrations where event_id = v_evt_nn2 and user_id = v_quinn;
  update public.attendance_records
  set status = 'verified', hours_awarded = 2.0, verified_by = v_taylor, verified_by_role = 'org_admin', verified_at = now()
  where registration_id = v_reg;

end $$;
