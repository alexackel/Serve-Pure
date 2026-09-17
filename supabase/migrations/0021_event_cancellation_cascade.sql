/*
  Gap: events_update_owner RLS (0006_rls_policies.sql) already lets an
  organizer/org admin set events.status = 'cancelled' directly — nothing
  blocks that write today — but nothing cascades it. fn_sync_event_registered_count
  (0004, fixed by 0009/0010) only PRESERVES 'cancelled' status once set, it
  never sets it, and nothing else reacts to the transition: registrations stay
  active, fn_registration_cancel's "org-initiated = never a penalty" branch
  never fires, and linked attendance_records are left 'pending' forever
  pointing at a dead event.

  Fix: cascade the event-level cancellation into its own registrations. This
  deliberately does NOT duplicate fn_registration_cancel's penalty logic or
  trg_sync_attendance_on_cancel's attendance-sync logic — both already fire
  per-row off this same UPDATE (they're defined "before/after update of status
  on registrations"), so bulk-updating registrations.status here is enough to
  drive them exactly as if each volunteer had been individually,
  organizer-cancelled.
*/

create or replace function public.fn_cascade_event_cancellation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.registrations
    set status = 'cancelled',
        cancelled_by_type = 'organizer',
        cancelled_by_user_id = new.created_by,
        cancellation_reason = coalesce(cancellation_reason, 'Event cancelled by organizer.')
    where event_id = new.id and status <> 'cancelled';
  end if;
  return new;
end;
$$;

create trigger trg_cascade_event_cancellation
after update of status on public.events
for each row execute function public.fn_cascade_event_cancellation();
