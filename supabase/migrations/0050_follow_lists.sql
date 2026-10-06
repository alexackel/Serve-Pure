-- Paged follower / following lists for the You page's connections screen.
-- Counts stay in get_follow_counts (0049). These return people, so they're
-- security definer for the same reason get_suggested_people is (0045): profiles
-- RLS would otherwise hide other users' rows from the caller. Blocked pairs are
-- excluded in both directions, matching get_suggested_people.

create or replace function public.get_followers(p_user_id uuid, p_limit int default 20, p_offset int default 0)
returns table(user_id uuid, full_name text, avatar_url text, identity_verified boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.identity_verified
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.followee_id = p_user_id
    and not private.fn_is_blocked(auth.uid(), p.id)
  order by f.created_at desc
  limit p_limit offset p_offset;
$$;

create or replace function public.get_following(p_user_id uuid, p_limit int default 20, p_offset int default 0)
returns table(user_id uuid, full_name text, avatar_url text, identity_verified boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.identity_verified
  from public.follows f
  join public.profiles p on p.id = f.followee_id
  where f.follower_id = p_user_id
    and not private.fn_is_blocked(auth.uid(), p.id)
  order by f.created_at desc
  limit p_limit offset p_offset;
$$;

revoke execute on function public.get_followers(uuid, int, int) from public, anon;
revoke execute on function public.get_following(uuid, int, int) from public, anon;
grant execute on function public.get_followers(uuid, int, int) to authenticated;
grant execute on function public.get_following(uuid, int, int) to authenticated;
