/*
  Data repair: "Community Garden Planting" has a registration where the
  registrant is also the event's creator (events.created_by = registrations.
  user_id) — exactly what the self-dealing rule (fn_registrations_before_insert,
  0004) exists to block. The insert-side check is sound (verified by re-reading
  it), so this is pre-existing bad data, not a live hole. It had also already
  been verified for hours (the bug fixed in 0016), meaning it was paying out
  exactly the "free verified hours with no real check" the brief's rule is
  meant to prevent.

  Cancels any such registration (cancelled_by_type = 'organizer' so the
  cancellation-penalty trigger, fn_registration_cancel, never dings the
  volunteer's reliability score for a correction that isn't their fault), and
  explicitly cancels its linked attendance record — trg_sync_attendance_on_cancel
  only auto-cancels a 'pending' record, and this one is already 'verified', so
  it needs an explicit reset here.

  Cancelling also fires trg_sync_event_registered_count (existing trigger,
  unchanged) same as it would from the app, which recomputes registered_count
  and flips the event's status back to 'available' if it's no longer at
  capacity — the mechanism behind the "Full" badge not clearing.
*/
update public.registrations r
set status = 'cancelled',
    cancelled_by_type = 'organizer',
    cancelled_by_user_id = e.created_by,
    cancellation_reason = 'Data repair: self-dealing violation (event creator was registered as a volunteer for their own event).'
from public.events e
where r.event_id = e.id
  and r.user_id = e.created_by
  and r.status <> 'cancelled';

update public.attendance_records ar
set status = 'cancelled', updated_at = now()
from public.registrations r
join public.events e on e.id = r.event_id
where ar.registration_id = r.id
  and r.user_id = e.created_by
  and ar.status <> 'cancelled';
