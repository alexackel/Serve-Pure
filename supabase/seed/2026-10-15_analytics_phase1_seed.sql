/*
  Org Analytics Phase 1 seed data. Paste into the Supabase SQL editor and run
  once — it's idempotent (every insert is guarded by a lookup first), safe to
  re-run. Run AFTER 0061_analytics_roster_rpcs.sql.

  Runs against the real, already-verified "GreenFuture Coalition" org — never
  creates a second org. Populates:
   - ~300 fake volunteers (seed.analytics_volunteer001..300@servepure.test),
     mixed birthdates (a minor subset), mixed contact_export_consent, some
     with a school on file, some with none
   - guardians for the minor subset
   - ~40 events spread across the trailing 12 months
   - registrations distributed unevenly across 4 cohorts (top/repeat/
     one-and-done/lapsed), so the roster's New/Repeat/Top 10%/Lapsed tags and
     the KPI row's retention/attendance-rate math all have real variety to
     show
   - attendance_records resolved to a verified/partial/no_show/appealed mix
     for anything tied to an event 14+ days old, leaving the most recent two
     weeks' worth 'pending' (a believable approval backlog)
   - 2 groups with a handful of members, so the roster's group column isn't
     always empty

  Never touches organizations.volunteer_hour_rate unless it's still at the
  column default, so a real admin's customization is never clobbered.
*/

create extension if not exists pgcrypto;

do $$
declare
  v_org_id uuid;
  v_admin_id uuid;
  v_volunteer_id uuid;
  v_event_id uuid;
  v_group1_id uuid;
  v_group2_id uuid;
  v_event_ids uuid[];
  n int;
  i int;
  v_email text;
  v_full_name text;
  v_birthdate date;
  v_school text;
  v_cohort int;
  v_num_events int;
  first_names text[] := array[
    'Ava','Liam','Olivia','Noah','Emma','Ethan','Sophia','Mason','Isabella','Lucas',
    'Mia','James','Amelia','Benjamin','Harper','Elijah','Evelyn','Logan','Abigail','Alexander',
    'Charlotte','Daniel','Luna','Henry','Camila','Jack','Aria','Owen','Scarlett','Wyatt'
  ];
  last_names text[] := array[
    'Garcia','Smith','Johnson','Brown','Davis','Martinez','Lopez','Wilson','Anderson','Taylor',
    'Thomas','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Clark'
  ];
  schools text[] := array[
    'Lincoln High School','Riverside High School','Central Community College','Oakwood Middle School'
  ];
begin
  select id into v_org_id from public.organizations where name = 'GreenFuture Coalition';
  if v_org_id is null then
    raise exception 'GreenFuture Coalition not found. This seed only runs against that real, already-verified org — aborting.';
  end if;

  select user_id into v_admin_id from public.org_admins where org_id = v_org_id limit 1;
  if v_admin_id is null then
    raise exception 'GreenFuture Coalition has no admin on file — aborting.';
  end if;

  -- 300 fake volunteers ------------------------------------------------------
  for n in 1..300 loop
    v_email := 'seed.analytics_volunteer' || lpad(n::text, 3, '0') || '@servepure.test';

    select id into v_volunteer_id from auth.users where email = v_email;
    if v_volunteer_id is null then
      v_full_name := first_names[1 + (n % array_length(first_names, 1))] || ' ' || last_names[1 + (n % array_length(last_names, 1))];

      -- ~10% minors (age 13-17); the rest spread 18-67 so every age_bracket
      -- shows up in the roster.
      if n % 10 = 0 then
        v_birthdate := (current_date - ((13 + (n % 5)) || ' years')::interval)::date;
      else
        v_birthdate := (current_date - ((18 + (n % 50)) || ' years')::interval)::date;
      end if;

      v_school := case
        when n % 10 = 0 then schools[1 + (n % 2)]
        when n % 4 = 0 then schools[3 + (n % 2)]
        else null
      end;

      v_volunteer_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_volunteer_id, 'authenticated', 'authenticated',
        v_email, crypt('seed-test-password', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', v_full_name, 'birthdate', v_birthdate),
        now(), now(), '', '', '', ''
      );

      -- handle_new_user() creates the profiles row from raw_user_meta_data;
      -- school/consent aren't collected at signup, so set them directly.
      update public.profiles
      set school = v_school,
          contact_export_consent = (n % 5 <> 0) -- ~80% consent
      where id = v_volunteer_id;

      if public.fn_is_minor(v_birthdate) then
        insert into public.guardians (user_id, full_name, relationship, phone, email, is_primary)
        values (
          v_volunteer_id, 'Guardian of ' || v_full_name, 'parent',
          '555-0' || lpad((100 + n)::text, 3, '0'),
          'seed.guardian' || lpad(n::text, 3, '0') || '@servepure.test',
          true
        );
      end if;
    end if;
  end loop;

  -- ~40 events spread across the trailing 12 months --------------------------
  for n in 1..40 loop
    declare
      v_title text := 'Seed: GreenFuture Event ' || lpad(n::text, 2, '0');
      v_start timestamptz;
      v_hours numeric;
    begin
      select id into v_event_id from public.events where title = v_title and org_id = v_org_id;
      if v_event_id is null then
        -- n=1 is oldest (~360 days ago), n=40 is most recent — roughly one
        -- event every 9 days across the year.
        v_start := now() - ((40 - n) * interval '9 days') - ((n % 5) * interval '1 hour');
        v_hours := 2 + (n % 4);
        insert into public.events (org_id, created_by, title, description, category, address, start_at, end_at, capacity)
        values (
          v_org_id, v_admin_id, v_title,
          'Seed data for the org Analytics dashboard.',
          (array['Environment', 'Education', 'Seniors', 'Food'])[1 + (n % 4)],
          '100 Seed St, Testville',
          v_start, v_start + (v_hours * interval '1 hour'),
          20
        ) returning id into v_event_id;
      end if;
    end;
  end loop;

  select array_agg(id order by start_at) into v_event_ids
  from public.events where org_id = v_org_id and title like 'Seed: GreenFuture Event %';

  -- Registrations, distributed unevenly across 4 cohorts ----------------------
  -- 0 = top (15-24 events, feeds Top 10%/Repeat), 1 = repeat (2-5 events),
  -- 2 = one-and-done (exactly 1, feeds New once it's inside the selected
  -- range), 3 = lapsed (1-2 events, all from the oldest third of the year).
  for n in 1..300 loop
    select id into v_volunteer_id from auth.users
    where email = 'seed.analytics_volunteer' || lpad(n::text, 3, '0') || '@servepure.test';
    continue when v_volunteer_id is null;

    v_cohort := n % 4;

    v_num_events := case v_cohort
      when 0 then 15 + (n % 10)
      when 1 then 2 + (n % 4)
      when 2 then 1
      else 1 + (n % 2)
    end;

    for i in 1..v_num_events loop
      if v_cohort = 3 then
        v_event_id := v_event_ids[1 + ((n + i) % (array_length(v_event_ids, 1) / 3))];
      else
        v_event_id := v_event_ids[1 + ((n * 7 + i * 13) % array_length(v_event_ids, 1))];
      end if;

      if not exists (select 1 from public.registrations where event_id = v_event_id and user_id = v_volunteer_id) then
        insert into public.registrations (event_id, user_id) values (v_event_id, v_volunteer_id);
      end if;
    end loop;
  end loop;

  -- Resolve attendance for anything tied to an event 14+ days old, leaving
  -- the most recent two weeks 'pending' (a believable approval backlog for
  -- the Pending Verifications KPI). Split deterministically by a hash of the
  -- row's own id, so re-running this script never flips an already-resolved
  -- row: 70% verified, 10% partial, 15% no_show, 5% appealed.
  update public.attendance_records ar
  set status = (case
        when mod(abs(hashtext(ar.id::text)), 20) < 14 then 'verified'
        when mod(abs(hashtext(ar.id::text)), 20) < 16 then 'partial'
        when mod(abs(hashtext(ar.id::text)), 20) < 19 then 'no_show'
        else 'appealed'
      end)::verification_status,
      hours_awarded = case
        when mod(abs(hashtext(ar.id::text)), 20) < 14
          then round((extract(epoch from (e.end_at - e.start_at)) / 3600.0)::numeric, 1)
        when mod(abs(hashtext(ar.id::text)), 20) < 16
          then round((extract(epoch from (e.end_at - e.start_at)) / 3600.0 / 2)::numeric, 1)
        else null
      end,
      verified_by = v_admin_id,
      verified_by_role = 'org_admin',
      verified_at = e.end_at + interval '2 days'
  from public.events e
  where ar.event_id = e.id
    and e.org_id = v_org_id
    and e.title like 'Seed: GreenFuture Event %'
    and ar.status = 'pending'
    and e.start_at < now() - interval '14 days';

  -- 2 groups with a handful of members, so the roster's group column has
  -- non-null data for a subset (most volunteers stay group-less).
  select id into v_group1_id from public.groups where name = 'Seed: GreenFuture Youth Corps';
  if v_group1_id is null then
    select id into v_volunteer_id from auth.users where email = 'seed.analytics_volunteer001@servepure.test';
    insert into public.groups (created_by, name, description)
    values (v_volunteer_id, 'Seed: GreenFuture Youth Corps', 'Analytics seed group.')
    returning id into v_group1_id;

    for n in 1..30 loop
      select id into v_volunteer_id from auth.users
      where email = 'seed.analytics_volunteer' || lpad(n::text, 3, '0') || '@servepure.test';
      if v_volunteer_id is not null and not exists (
        select 1 from public.group_members where group_id = v_group1_id and user_id = v_volunteer_id
      ) then
        insert into public.group_members (group_id, user_id) values (v_group1_id, v_volunteer_id);
      end if;
    end loop;
  end if;

  select id into v_group2_id from public.groups where name = 'Seed: GreenFuture Alumni Network';
  if v_group2_id is null then
    select id into v_volunteer_id from auth.users where email = 'seed.analytics_volunteer002@servepure.test';
    insert into public.groups (created_by, name, description)
    values (v_volunteer_id, 'Seed: GreenFuture Alumni Network', 'Analytics seed group.')
    returning id into v_group2_id;

    for n in 31..50 loop
      select id into v_volunteer_id from auth.users
      where email = 'seed.analytics_volunteer' || lpad(n::text, 3, '0') || '@servepure.test';
      if v_volunteer_id is not null and not exists (
        select 1 from public.group_members where group_id = v_group2_id and user_id = v_volunteer_id
      ) then
        insert into public.group_members (group_id, user_id) values (v_group2_id, v_volunteer_id);
      end if;
    end loop;
  end if;
end $$;
