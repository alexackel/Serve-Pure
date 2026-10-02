-- Feed + people-discovery RPCs backing the Home tab, replacing its mock
-- SAMPLE_ACTIVITY/SAMPLE_SUGGESTED_FRIENDS data.

create or replace function public.get_activity_feed(p_limit int default 20, p_offset int default 0)
returns table(
  id uuid, user_id uuid, full_name text, identity_verified boolean,
  activity_title text, activity_org_name text, category text,
  hours_claimed numeric, hours_awarded numeric, photo_url text, visibility activity_visibility,
  like_count int, comment_count int, viewer_has_liked boolean, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select ar.id, ar.user_id, p.full_name, p.identity_verified,
           ar.activity_title, ar.activity_org_name, ar.category,
           ar.hours_claimed, ar.hours_awarded, ar.photo_url, ar.visibility,
           ar.like_count, ar.comment_count,
           exists(select 1 from public.likes l where l.attendance_record_id = ar.id and l.user_id = auth.uid()),
           ar.created_at
    from public.attendance_records ar join public.profiles p on p.id = ar.user_id
    where private.fn_can_see_activity(ar.id, auth.uid())
      and not private.fn_is_blocked(auth.uid(), ar.user_id)
      -- "Friends Activity" is other people's activity — the viewer's own
      -- completed activities already surface on their own You tab.
      and ar.user_id <> auth.uid()
    order by ar.created_at desc
    limit p_limit offset p_offset;
end;
$$;
revoke execute on function public.get_activity_feed(int, int) from public, anon;
grant execute on function public.get_activity_feed(int, int) to authenticated;

create or replace function public.get_suggested_people(p_limit int default 5)
returns table(user_id uuid, full_name text, identity_verified boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.identity_verified
  from public.profiles p
  where p.id <> auth.uid()
    and not private.fn_is_follower(auth.uid(), p.id)
    and not private.fn_is_blocked(auth.uid(), p.id)
  order by p.created_at desc
  limit p_limit;
$$;
revoke execute on function public.get_suggested_people(int) from public, anon;
grant execute on function public.get_suggested_people(int) to authenticated;
