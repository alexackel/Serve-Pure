/*
  Follow-up to 0023: that migration fixed fn_is_org_admin/fn_is_group_admin/
  fn_is_org_admin_of, but a live re-verification pass (with timing) after
  0023 was applied showed the underlying slowness/timeouts were only
  PARTIALLY fixed:

    rpc fn_is_org_admin() called directly:               185ms   fast
    org_admins filtered to caller's own row:              120ms   fast
    org_admins UNFILTERED (organization-context.tsx shape): 22316ms  TIMEOUT (57014)
    groups UNFILTERED (groups-context.tsx shape):          10553ms  TIMEOUT (57014)
    group_admins filtered to caller's own row:             141ms   fast

  The pattern is consistent: any query that needs to evaluate policy quals
  for rows OTHER than the caller's own is still catastrophically slow, even
  though fn_is_org_admin itself is now provably fast in isolation. The one
  remaining non-SECURITY-DEFINER function left in this family is
  fn_is_app_admin() (0002) — and it's used as one OR-branch in nearly every
  affected policy (profiles_select_app_admin, org_admins_select,
  group_admins_select, groups_select_members_admins, group_members_select,
  attendance_select_org/group_admin, etc.), almost always alongside OTHER
  row-dependent SECURITY DEFINER functions in the same OR expression
  (fn_shares_event_registration(profiles.id), fn_shares_group(profiles.id)).
  With profiles now holding 13 seed accounts (vs. essentially none before
  this pass), evaluating fn_is_app_admin() for the non-matching rows in a
  scan re-triggers profiles' own RLS chain, which includes fn_is_app_admin()
  again — the same self-referential recursion class as 0023 fixed for
  fn_is_org_admin/fn_is_group_admin, just on the profiles table instead of
  org_admins/group_admins, and only large enough to matter once real seed
  data existed.

  Same fix, same safety reasoning as 0023: fn_is_app_admin is a pure boolean
  check (no row data returned), so making it SECURITY DEFINER doesn't expose
  anything a caller couldn't already learn from the true/false answer itself.
*/

create or replace function public.fn_is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_app_admin);
$$;
