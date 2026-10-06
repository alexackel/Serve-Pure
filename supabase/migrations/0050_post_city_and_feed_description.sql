-- Post cards show the volunteer's city and the activity's description.
--
-- city: profiles UPDATE is column-restricted to avatar_url (0049), so the
-- client can only write city if we grant that one column explicitly. Length
-- is capped so a stray paste can't bloat every feed row.
alter table public.profiles
  add column city text check (city is null or char_length(city) <= 80);

grant update (city) on public.profiles to authenticated;

-- get_activity_feed gains notes (the description) and the author's city.
-- RETURNS TABLE changed shape, so the old signature has to be dropped first.
drop function if exists public.get_activity_feed(int, int);

create function public.get_activity_feed(p_limit int default 20, p_offset int default 0)
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
