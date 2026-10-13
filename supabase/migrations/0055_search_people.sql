-- People search backing the Home tab's friend-search bar. Same security
-- posture as get_suggested_people (0045) / get_followers (0050): profiles
-- RLS doesn't generally expose other users, so this is security definer.
-- Returns nothing for a blank query rather than dumping the table.
-- Organization logins have no volunteer identity (see 0052), so they're
-- excluded — there's nothing to "friend" there.
create or replace function public.search_people(p_query text, p_limit int default 20)
returns table(user_id uuid, full_name text, username text, avatar_url text, identity_verified boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if trim(p_query) = '' then
    return;
  end if;

  return query
    select p.id, p.full_name, p.username, p.avatar_url, p.identity_verified
    from public.profiles p
    where p.id <> auth.uid()
      and p.account_type = 'personal'
      and not private.fn_is_blocked(auth.uid(), p.id)
      and (p.full_name ilike '%' || p_query || '%' or p.username ilike '%' || p_query || '%')
    order by p.full_name
    limit p_limit;
end;
$$;
revoke execute on function public.search_people(text, int) from public, anon;
grant execute on function public.search_people(text, int) to authenticated;
