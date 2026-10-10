# Verify migration 0052

Run each block in the Supabase SQL editor. Each block is a separate statement, so each result appears on its own tab.

## 1. New columns (expect 11 rows)

```sql
select table_name, column_name from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'profiles' and column_name in ('account_type','username','username_changed_at','phone_verified_at','school','terms_accepted_at'))
  or (table_name = 'organizations' and column_name in ('facebook_url','ein','is_501c3','manager_name','manager_title')));
```

## 2. Indexes (expect the 3 new profiles_* indexes, and no profiles_phone_verified_unique)

```sql
select indexname from pg_indexes where tablename = 'profiles' and indexname like 'profiles_%';
```

## 3. Old design removed (expect three NULLs)

```sql
select to_regclass('private.account_persons') as account_persons,
       to_regprocedure('private.fn_person_of(uuid)') as fn_person_of,
       to_regprocedure('private.fn_link_new_profile_person()') as link_trigger_fn;
```

## 4. Functions present (expect 9 rows)

```sql
select proname from pg_proc
where proname in ('check_username_available','set_username','handle_new_user','fn_sync_verified_phone',
  'fn_is_event_operator_conflict','fn_registrations_before_insert','fn_registrations_before_update',
  'fn_block_self_like','fn_group_review_self_dealing_reason');
```

## 5. Triggers (expect the auth.users triggers and the registration and like triggers)

```sql
select tgname, tgrelid::regclass as on_table from pg_trigger
where not tgisinternal and (tgname like 'trg_handle_new_user%' or tgname like 'trg_sync_verified_phone%'
  or tgname like 'trg_registrations%' or tgname like 'trg_block_self_like%');
```

## 6a. Reserved word (expect false)

```sql
select public.check_username_available('admin');
```

## 6b. Free name (expect true)

```sql
select public.check_username_available('riverside_food_2026');
```

## 7. Grants (expect true for both)

```sql
select has_function_privilege('anon', 'public.check_username_available(text)', 'execute') as anon_can_check,
       has_function_privilege('authenticated', 'private.fn_is_event_operator_conflict(uuid,uuid)', 'execute') as auth_can_guard;
```

If any section doesn't match its "expect" note, send me the result.
