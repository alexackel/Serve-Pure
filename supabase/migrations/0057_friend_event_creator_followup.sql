-- The post-event "did you make it / add a photo & groups" prompt
-- (friend-event-followup-modal.tsx) was keyed entirely off a registration row
-- (registrations.friend_followup_resolved_at, 0053), so it never surfaced for
-- a friend event's own creator — they can never register for their own event
-- (the self-dealing block, also 0053), so no registration row ever exists for
-- them to hang a "resolved" flag off of. This mirrors that same flag onto the
-- event itself so the creator gets the same one-time prompt.
alter table public.events add column creator_followup_resolved_at timestamptz;

-- No new RLS policy needed: events_update_owner (0006_rls_policies.sql)
-- already lets `created_by = auth.uid()` update their own event row, the same
-- way the client already updates registrations.friend_followup_resolved_at
-- directly for the registrant side of this flow.
