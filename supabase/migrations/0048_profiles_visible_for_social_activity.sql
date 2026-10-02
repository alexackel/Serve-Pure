-- The social feature (0041-0046) never gave `profiles` its own visibility
-- policy: get_activity_feed/get_activity_comments/get_activity_likers are
-- all security definer, so they join profiles regardless of RLS, but
-- activity/[id]/comments.tsx's header does a plain client-side
-- `profiles!user_id(...)` embed, which runs as the viewer and hits real
-- profiles RLS — so an activity owner you don't already share an
-- event/group/registration with (none of the existing profiles_select_*
-- policies) rendered as "Unknown" even though fn_can_see_activity already
-- allowed you to see the activity row itself. Caught live: Devon viewing
-- Sam's post via a mention notification saw "Unknown" instead of "Sam
-- Delgado".

create policy profiles_select_social_activity_owner on public.profiles for select using (
  exists (
    select 1 from public.attendance_records ar
    where ar.user_id = profiles.id and private.fn_can_see_activity(ar.id, auth.uid())
  )
);
