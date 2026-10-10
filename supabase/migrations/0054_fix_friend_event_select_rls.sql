/*
  Fixes "Volunteer with Friends" posting always failing with "new row
  violates row-level security policy for table events" (42501).

  Root cause: events_select_friend_event (0053) delegates entirely to
  private.fn_can_see_friend_event, which re-queries public.events by id.
  When Postgres evaluates the SELECT policy for an INSERT ... RETURNING in
  the SAME statement (which PostgREST always does, since the client calls
  .insert().select()), that re-query runs before the command counter has
  advanced, so it can't see the row the very statement is still inserting —
  the function returns null/false for the row's own creator, and the insert
  is rejected as if the new row were invisible.

  Fix: check the row's own created_by column directly first (no subquery,
  so no self-visibility problem) and only fall back to
  fn_can_see_friend_event for followers/group members viewing someone
  else's already-committed post.
*/

drop policy if exists events_select_friend_event on public.events;
create policy events_select_friend_event on public.events for select using (
  is_friend_event and (created_by = auth.uid() or private.fn_can_see_friend_event(id, auth.uid()))
);

/*
  Second, related bug found in the same end-to-end pass: the friend-event
  card is supposed to show the poster's name (0053 plan: "organization =
  event.creatorName ?? 'A friend'"), fed by the embedded
  `profiles!created_by(full_name)` relationship in EVENT_SELECT
  (src/data/events.ts). But no profiles SELECT policy let a mere follower
  read the poster's profiles row, so that embed always came back null and
  the card silently fell back to "A friend" for every viewer. Scoped to
  exactly the friend-event case (not a general "followers can see your
  profile" policy, which would expose phone/birthdate/etc. too broadly).
*/
create policy profiles_select_friend_event_poster on public.profiles for select using (
  exists (
    select 1 from public.events e
    where e.created_by = profiles.id
      and e.is_friend_event
      and private.fn_can_see_friend_event(e.id, auth.uid())
  )
);
