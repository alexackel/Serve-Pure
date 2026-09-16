-- The mock UI's Members tab shows a ranked leaderboard (name + hours) of
-- every group member to any viewer, but 0006's RLS only let a GROUP ADMIN
-- see a member's attendance_records (attendance_select_group_admin) and only
-- let a member see their OWN group_members row (no policy let a regular
-- member see the rest of the roster or compute an accurate member count).
-- Widen both so any fellow member can see the roster/leaderboard, not just
-- admins — distinct from the reliability score (a separate 0-5 rating),
-- which the brief explicitly restricts to self/org-admin/group-admin/
-- app-admin and is unaffected here (get_reliability_score's own visibility
-- check, 0005, is untouched).

-- Is the caller a member of this specific group? (mirrors fn_is_group_admin)
create or replace function public.fn_is_group_member(p_group_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.left_at is null
  );
$$;

create policy group_members_select_fellow_member on public.group_members for select using (
  fn_is_group_member(group_id)
);

-- Does p_user_id share ANY group with the caller? attendance_records has no
-- group_id column of its own (hours aren't tied to a specific group), so
-- this checks across all of the caller's groups rather than one at a time.
create or replace function public.fn_shares_group(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = p_user_id and gm2.user_id = auth.uid()
      and gm1.left_at is null and gm2.left_at is null
  );
$$;

create policy attendance_select_group_member on public.attendance_records for select using (
  fn_shares_group(attendance_records.user_id)
);
