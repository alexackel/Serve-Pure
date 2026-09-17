/*
  Gap: guardian_notifications (0004_registrations_attendance.sql) has
  SELECT-only RLS (guardian_notifications_select, 0008_close_migration_gaps.sql),
  whose own comment admits nothing writes this table yet. The brief's "guardian
  auto-notified on event registration" rule is unimplemented DB-side — only the
  registration-time BLOCK (fn_registrations_before_insert requiring a guardian
  on file for a minor) exists; the notify half doesn't.

  This only queues the notification row DB-side, same as fn_create_attendance_record
  eagerly creates a canonical attendance row (0004) — actually sending email/SMS
  needs a real delivery integration (Edge Function + provider), which is
  out of scope here.
*/

create or replace function public.fn_notify_guardians_on_registration() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_birthdate date;
begin
  select birthdate into v_birthdate from public.profiles where id = new.user_id;

  if public.fn_is_minor(v_birthdate) then
    insert into public.guardian_notifications (registration_id, guardian_id, channel, status)
    select
      new.id,
      g.id,
      (case when g.email is not null then 'email' else 'sms' end)::guardian_notify_channel,
      'queued'
    from public.guardians g
    where g.user_id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger trg_notify_guardians_on_registration
after insert on public.registrations
for each row execute function public.fn_notify_guardians_on_registration();
