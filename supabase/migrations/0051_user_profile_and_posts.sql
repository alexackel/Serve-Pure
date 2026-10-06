-- Other-user profile screen: header (photo, name, verified) and a paged list of
-- that person's approved posts.
--
-- profiles is only readable by another user when they have a visible activity
-- (0048), so the header goes through a definer RPC that any signed-in user can
-- call. It exposes only name, photo, and verified badge, and returns nothing
-- when either side has blocked the other (fn_is_blocked is symmetric, 0041).

create or replace function public.get_user_profile(p_user_id uuid)
returns table(full_name text, avatar_url text, identity_verified boolean)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.avatar_url, p.identity_verified
  from public.profiles p
  where p.id = p_user_id
    and not private.fn_is_blocked(auth.uid(), p_user_id);
$$;
revoke execute on function public.get_user_profile(uuid) from public, anon;
grant execute on function public.get_user_profile(uuid) to authenticated;

-- Same columns as get_activity_feed (0050), filtered to one person. Only
-- approved posts ('verified' or 'partial') are returned, so pending, denied,
-- cancelled, and no-show records never appear on a profile. Visibility and
-- blocks go through fn_can_see_activity, as the feed does.
create or replace function public.get_user_activity(p_user_id uuid, p_limit int default 20, p_offset int default 0)
returns table(
  id uuid, user_id uuid, full_name text, identity_verified boolean,
  activity_title text, activity_org_name text, category text,
  hours_claimed numeric, hours_awarded numeric, photo_url text, visibility activity_visibility,
  like_count int, comment_count int, viewer_has_liked boolean, created_at timestamptz,
  notes text, city text
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select ar.id, ar.user_id, p.full_name, p.identity_verified,
           ar.activity_title, ar.activity_org_name, ar.category,
           ar.hours_claimed, ar.hours_awarded, ar.photo_url, ar.visibility,
           ar.like_count, ar.comment_count,
           exists(select 1 from public.likes l where l.attendance_record_id = ar.id and l.user_id = auth.uid()),
           ar.created_at,
           ar.notes, p.city
    from public.attendance_records ar join public.profiles p on p.id = ar.user_id
    where ar.user_id = p_user_id
      and ar.status in ('verified', 'partial')
      and private.fn_can_see_activity(ar.id, auth.uid())
      and not private.fn_is_blocked(auth.uid(), ar.user_id)
    order by ar.created_at desc
    limit p_limit offset p_offset;
end;
$$;
revoke execute on function public.get_user_activity(uuid, int, int) from public, anon;
grant execute on function public.get_user_activity(uuid, int, int) to authenticated;
