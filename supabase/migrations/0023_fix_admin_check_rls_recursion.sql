/*
  Bug found during path verification (2026-09-17): the Groups tab timed out
  entirely for a real signed-in org/group admin — `select id,name,parent_group_id
  from groups` returned Postgres error 57014 "canceling statement due to
  statement timeout" (and, under a smaller/faster-to-blow-up shape, the
  org_admins insert-policy check from 0019 returned 54001 "stack depth limit
  exceeded" for the same underlying reason).

  Root cause: fn_is_org_admin(p_org_id) and fn_is_group_admin(p_group_id)
  (0002_identity_orgs_groups.sql) are plain `language sql stable` functions,
  NOT security definer, so their internal lookup against org_admins/
  group_admins runs under the CALLING user's own RLS — which for org_admins/
  group_admins is itself gated by policies that call fn_is_org_admin/
  fn_is_group_admin again (org_admins_select, group_admins_select, both
  0008; groups_select_members_admins, 0006; group_members_select, 0008;
  attendance_select_group_admin, 0006; and the new org_admins_insert_admin/
  group_admins_insert_admin from 0019). This is the same class of bug 0009
  already documented and fixed once ("SECURITY DEFINER for anything that
  needs to bypass RLS on cross-table checks") — just not yet applied to
  these two helper functions, because until this pass's seed data added
  enough real admin/member rows, the self-referential recursion never grew
  large enough to matter (a handful of rows resolves via a cheap index-scan
  short-circuit; a small-but-bigger table pushes Postgres toward a seq scan
  that evaluates the recursive qual for rows it shouldn't need to).

  fn_is_group_member, fn_shares_group (0012), and fn_shares_event_registration
  (0014) already learned this lesson and are SECURITY DEFINER — this
  migration brings fn_is_org_admin and fn_is_group_admin in line with them.
  Also applying it to fn_is_org_admin_of (0022): not currently reachable by
  this bug (it's always called with p_user_id = the inserting caller, which
  short-circuits registrations_insert_self's ... er, org_admins_select's own
  `user_id = auth.uid()` clause before recursing), but it has the exact same
  shape and would become vulnerable the moment it's ever called with a
  p_user_id other than the caller — fixing it now for consistency/defense in
  depth, not because it's been observed to fail.

  Safe to make these SECURITY DEFINER: they are pure boolean membership
  checks (return true/false only, gated by explicit id parameters or
  auth.uid()), never returning arbitrary row data, so bypassing RLS inside
  them doesn't leak anything a caller couldn't already learn by being told
  "yes you're an admin" / "no you're not" — same reasoning already applied
  to get_reliability_score's SECURITY DEFINER wrapper (0005).
*/

create or replace function public.fn_is_org_admin(p_org_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.org_admins where org_id = p_org_id and user_id = auth.uid());
$$;

create or replace function public.fn_is_group_admin(p_group_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.group_admins where group_id = p_group_id and user_id = auth.uid());
$$;

create or replace function public.fn_is_org_admin_of(p_org_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.org_admins where org_id = p_org_id and user_id = p_user_id);
$$;
