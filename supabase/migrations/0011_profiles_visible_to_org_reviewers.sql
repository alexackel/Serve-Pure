-- Found while testing the org-history Approve flow: attendance_records.user_id
-- is NOT NULL, so PostgREST embeds `profiles!user_id(...)` as an INNER join.
-- With no RLS policy letting an org admin see a self-reporting volunteer's
-- profile (profiles_select_event_roster only covers volunteers registered to
-- one of the org's events, which a self-report never is), that inner join
-- silently dropped the whole attendance_records row from the result set —
-- the row was selectable on its own, but the join filtered it out.
create policy profiles_select_attendance_org on public.profiles for select using (
  exists (
    select 1 from public.attendance_records ar
    where ar.user_id = profiles.id and ar.org_id is not null and fn_is_org_admin(ar.org_id)
  )
);
