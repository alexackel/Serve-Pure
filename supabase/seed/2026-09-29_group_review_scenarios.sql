/*
  Test data for multi-group self-reported hours review (0035-0037). Paste
  into the Supabase SQL editor and run once — idempotent, safe to re-run.

  You (the real signed-in account) become admin of both seed groups
  automatically (fn_group_auto_admin fires on the group inserts below), so
  every reviewer-side scenario can be driven straight from the app under
  your own account. Only the resubmit step needs a second session, signed in
  as seed.jordan@servepure.test / seed-test-password.

  Scenarios, and how to verify each one in the app:

  1. Normal single-group approve: open "Seed: Review Group A" -> Uploaded ->
     "Seed: Solo Approve" from Jordan -> Approve. Your admin queue empties;
     Jordan's own history (sign in as Jordan) shows it Verified.

  2. Split decision: "Seed: Split Decision" is pending in BOTH Group A and
     Group B. Approve it from Group A's queue, then deny it (no re-upload)
     from Group B's queue. Expect: Jordan's history shows Verified overall;
     Group B's Uploaded tab never lists it as one Group B approved.

  3. Deny with re-upload -> resubmit -> re-approve: "Seed: Needs Update" is
     pending in both groups. Deny it in Group A with re-upload = Yes, then
     deny it in Group B with re-upload = No. Sign in as Jordan, open You ->
     History -> "Needs Update" filter, tap the record, resubmit unchanged.
     Back on your own account, confirm ONLY Group A's queue shows it again
     (Group B's denial is untouched) — then approve it in Group A.

  4. Deny without re-upload, terminal: "Seed: Denied For Good" is pending in
     Group A only. Deny it with re-upload = No. Sign in as Jordan: it should
     show as "Denied" in History with no edit affordance, not "Needs Update".

  5. Self-dealing hard block (guardian-by-proxy), now with Skip (0039):
     seed.riley is a minor member of Group A whose guardian contact info
     matches your own account's email. "Seed: Riley's Cleanup" is Riley's
     self-report to Group A. Opening it in Group A's queue should now show
     an explanatory panel and a single Skip button instead of Approve/Deny
     (no raw self_dealing_violation error). Press Skip — expect it to land
     on a different pending Group A item, not loop back to Riley's; confirm
     Riley's row is still `status = 'pending'` afterward. Re-entering the
     queue later (fresh screen mount) will show Riley's item again since the
     skip is session-only, by design — re-checking is cheap and the conflict
     never changes. (The direct case — your own account both submitting and
     reviewing — can no longer happen at all: self-upload now excludes any
     group you administer from the selection list, and migration 0038
     blocks it at the database layer too, so there's nothing left to seed
     for that path.)

  6. Soft-flag detection: five more of Jordan's self-reports to Group A
     ("Seed: Flag Test 1".."5") are pre-resolved as approved-by-you directly
     in this script (not through the app), so both admin_review_flags rows
     already exist after running this seed — no interactive step needed.
     Verify with:
       select * from admin_review_flags where group_id = (
         select id from groups where name = 'Seed: Review Group A'
       );
     Expect one 'repeat_approver_same_submitter' row (Jordan, 5/5 of your
     approvals) and one 'no_denials_small_group' row (5 reviews, 0 denials,
     3-member group).

  7. Member-removal cascade (0040): "Seed: Removal Cleanup" is a pending
     self-report from Jordan to Group B only (kept out of Group A so it
     doesn't perturb scenario 6's flag counts). In the app, as the real
     account, remove Jordan from Group B (member detail -> Remove member).
     Expect the item to disappear immediately from Group B's Uploaded queue
     and from Jordan's member-detail Uploaded tab. Verify with:
       select status, reason, reviewed_by, allow_reupload
       from attendance_report_groups
       where attendance_record_id = (
         select id from attendance_records where activity_title = 'Seed: Removal Cleanup'
       );
     Expect status = 'denied_final', reason = 'Member removed from group',
     reviewed_by is null, allow_reupload is null — and a matching row in
     attendance_group_review_log with reviewed_by null. Since no group ever
     approved it, attendance_records.status should now be 'rejected'.
     Confirm no new admin_review_flags row was created by this (the trigger
     only fires with reviewed_by is not null).
*/

create extension if not exists pgcrypto;

do $$
declare
  v_real_user uuid;
  v_real_email text;
  v_jordan uuid;
  v_riley uuid;
  v_group_a uuid;
  v_group_b uuid;
  v_record uuid;
  v_i int;
begin
  select id, email into v_real_user, v_real_email from public.profiles
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

  /* Fake account: Riley Kim — a minor, guardian contact matches YOUR email */
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
      '{"full_name":"Riley Kim","birthdate":"2010-05-01"}',
      now(), now(), '', '', '', ''
    );
  end if;

  insert into public.guardians (user_id, full_name, relationship, email)
  select v_riley, 'Seed Guardian (you)', 'parent', v_real_email
  where not exists (select 1 from public.guardians where user_id = v_riley and email = v_real_email);

  -----------------------------------------------------------------------
  -- Groups: you become admin+member of both automatically (fn_group_auto_admin)
  -----------------------------------------------------------------------

  select id into v_group_a from public.groups where name = 'Seed: Review Group A' and created_by = v_real_user;
  if v_group_a is null then
    insert into public.groups (name, description, created_by)
    values ('Seed: Review Group A', 'Seed group for multi-group hours review testing.', v_real_user)
    returning id into v_group_a;
  end if;

  select id into v_group_b from public.groups where name = 'Seed: Review Group B' and created_by = v_real_user;
  if v_group_b is null then
    insert into public.groups (name, description, created_by)
    values ('Seed: Review Group B', 'Second seed group, for split-decision testing.', v_real_user)
    returning id into v_group_b;
  end if;

  insert into public.group_members (group_id, user_id)
  select v_group_a, v_jordan where not exists (select 1 from public.group_members where group_id = v_group_a and user_id = v_jordan);
  insert into public.group_members (group_id, user_id)
  select v_group_b, v_jordan where not exists (select 1 from public.group_members where group_id = v_group_b and user_id = v_jordan);
  insert into public.group_members (group_id, user_id)
  select v_group_a, v_riley where not exists (select 1 from public.group_members where group_id = v_group_a and user_id = v_riley);

  -----------------------------------------------------------------------
  -- 1. Normal single-group approve
  -----------------------------------------------------------------------

  select id into v_record from public.attendance_records where user_id = v_jordan and activity_title = 'Seed: Solo Approve';
  if v_record is null then
    insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
    values (v_jordan, 'self_reported', 'pending', 'Seed: Solo Approve', 2, now() - interval '3 days')
    returning id into v_record;
    insert into public.attendance_report_groups (attendance_record_id, group_id) values (v_record, v_group_a);
  end if;

  -----------------------------------------------------------------------
  -- 2. Split decision (pending in both groups)
  -----------------------------------------------------------------------

  select id into v_record from public.attendance_records where user_id = v_jordan and activity_title = 'Seed: Split Decision';
  if v_record is null then
    insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
    values (v_jordan, 'self_reported', 'pending', 'Seed: Split Decision', 3, now() - interval '2 days')
    returning id into v_record;
    insert into public.attendance_report_groups (attendance_record_id, group_id) values (v_record, v_group_a), (v_record, v_group_b);
  end if;

  -----------------------------------------------------------------------
  -- 3. Deny with re-upload allowed in one group, denied-final in the other
  -----------------------------------------------------------------------

  select id into v_record from public.attendance_records where user_id = v_jordan and activity_title = 'Seed: Needs Update';
  if v_record is null then
    insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
    values (v_jordan, 'self_reported', 'pending', 'Seed: Needs Update', 1.5, now() - interval '1 day')
    returning id into v_record;
    insert into public.attendance_report_groups (attendance_record_id, group_id) values (v_record, v_group_a), (v_record, v_group_b);
  end if;

  -----------------------------------------------------------------------
  -- 4. Deny without re-upload — terminal
  -----------------------------------------------------------------------

  select id into v_record from public.attendance_records where user_id = v_jordan and activity_title = 'Seed: Denied For Good';
  if v_record is null then
    insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
    values (v_jordan, 'self_reported', 'pending', 'Seed: Denied For Good', 1, now() - interval '7 days')
    returning id into v_record;
    insert into public.attendance_report_groups (attendance_record_id, group_id) values (v_record, v_group_a);
  end if;

  -----------------------------------------------------------------------
  -- 5. Self-dealing hard block: guardian-by-proxy
  -----------------------------------------------------------------------

  select id into v_record from public.attendance_records where user_id = v_riley and activity_title = 'Seed: Riley''s Cleanup';
  if v_record is null then
    insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
    values (v_riley, 'self_reported', 'pending', 'Seed: Riley''s Cleanup', 2, now() - interval '1 day')
    returning id into v_record;
    insert into public.attendance_report_groups (attendance_record_id, group_id) values (v_record, v_group_a);
  end if;

  -----------------------------------------------------------------------
  -- 6. Soft-flag detection: 5 pre-resolved approvals of Jordan, by you,
  --    in the 3-member Group A — pushes both signals past their threshold
  --    without needing any interactive step.
  -----------------------------------------------------------------------

  for v_i in 1..5 loop
    select id into v_record from public.attendance_records
    where user_id = v_jordan and activity_title = 'Seed: Flag Test ' || v_i;

    if v_record is null then
      insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
      values (v_jordan, 'self_reported', 'pending', 'Seed: Flag Test ' || v_i, 1, now() - interval '10 days' + (v_i || ' hours')::interval)
      returning id into v_record;

      insert into public.attendance_report_groups (attendance_record_id, group_id, status, reviewed_by, reviewed_at, status_updated_at)
      values (v_record, v_group_a, 'pending', null, null, now());

      -- Drive it through an UPDATE (not a direct insert-as-approved) so the
      -- logging/sync/collusion-detection triggers all fire exactly as they
      -- would for a real review_group_report() call.
      update public.attendance_report_groups
      set status = 'approved', reviewed_by = v_real_user, reviewed_at = now(), status_updated_at = now()
      where attendance_record_id = v_record and group_id = v_group_a;
    end if;
  end loop;

  -----------------------------------------------------------------------
  -- 7. Member-removal cascade: a pending report to Group B only, so
  --    removing Jordan from Group B in the app has something to clean up
  --    without touching scenario 6's Group A flag counts.
  -----------------------------------------------------------------------

  select id into v_record from public.attendance_records where user_id = v_jordan and activity_title = 'Seed: Removal Cleanup';
  if v_record is null then
    insert into public.attendance_records (user_id, source, status, activity_title, hours_claimed, created_at)
    values (v_jordan, 'self_reported', 'pending', 'Seed: Removal Cleanup', 1, now() - interval '2 hours')
    returning id into v_record;
    insert into public.attendance_report_groups (attendance_record_id, group_id) values (v_record, v_group_b);
  end if;

end $$;
