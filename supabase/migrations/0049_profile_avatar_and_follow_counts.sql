-- Profile photo + follower/following counts for the You page header.

alter table public.profiles add column avatar_url text;

-- profiles_update_self (0006) lets a user update any column of their own row.
-- Narrow the client's UPDATE privilege to avatar_url so name, email, birthdate,
-- identity_verified, and is_app_admin stay server-controlled. Column grants add
-- to table grants, so the table-level privilege is revoked first. No migration
-- or trigger updates profiles as the calling user, so nothing else depends on it.
revoke update on public.profiles from authenticated;
grant update (avatar_url) on public.profiles to authenticated;

-- Counts only: who follows whom stays behind follows_select_self (0041). The
-- definer bypasses that RLS to count rows, but returns nothing but two integers.
create or replace function public.get_follow_counts(p_user_id uuid)
returns table(followers int, following int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.follows where followee_id = p_user_id),
    (select count(*)::int from public.follows where follower_id = p_user_id);
$$;
revoke execute on function public.get_follow_counts(uuid) from public, anon;
grant execute on function public.get_follow_counts(uuid) to authenticated;
