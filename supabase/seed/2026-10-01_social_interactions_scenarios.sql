/*
  Three dedicated accounts for a full social-feature interaction test pass
  (follows, likes, comments, @mentions in both comments and self-uploads,
  notifications, blocking, visibility). Paste into the Supabase SQL editor
  and run once — idempotent, safe to re-run.

  Separate from the existing seed.jordan/seed.casey/seed.riley/seed.taylor/
  seed.avery/seed.morgan/seed.quinn/seed.drew/seed.harper/seed.sydney/
  seed.admin accounts already in this project from earlier, unrelated seed
  scripts (confirmed live 2026-10-01 — seed.avery and seed.morgan in
  particular already carry their own attendance_records history), so this
  pass doesn't perturb any of their state.

  All three accounts: password `seed-test-password`, pre-confirmed. No
  follows/likes/comments/activities are pre-seeded here — every interaction
  in the test pass is driven live through the app, signing in as each
  account in turn, so the resulting DB state is a product of the real code
  paths rather than hand-inserted rows.

  Accounts:
    seed.sam@servepure.test    Sam Delgado    (identity_verified = true,
                                                exercises the verified badge)
    seed.devon@servepure.test  Devon Walsh
    seed.robin@servepure.test  Robin Ortiz
*/

create extension if not exists pgcrypto;

do $$
declare
  v_sam uuid;
  v_devon uuid;
  v_robin uuid;
begin
  select id into v_sam from auth.users where email = 'seed.sam@servepure.test';
  if v_sam is null then
    v_sam := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_sam, 'authenticated', 'authenticated',
      'seed.sam@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sam Delgado","birthdate":"2006-02-10"}',
      now(), now(), '', '', '', ''
    );
    update public.profiles set identity_verified = true where id = v_sam;
  end if;

  select id into v_devon from auth.users where email = 'seed.devon@servepure.test';
  if v_devon is null then
    v_devon := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_devon, 'authenticated', 'authenticated',
      'seed.devon@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Devon Walsh","birthdate":"2007-07-22"}',
      now(), now(), '', '', '', ''
    );
  end if;

  select id into v_robin from auth.users where email = 'seed.robin@servepure.test';
  if v_robin is null then
    v_robin := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_robin, 'authenticated', 'authenticated',
      'seed.robin@servepure.test', crypt('seed-test-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Robin Ortiz","birthdate":"2008-11-05"}',
      now(), now(), '', '', '', ''
    );
  end if;
end $$;
