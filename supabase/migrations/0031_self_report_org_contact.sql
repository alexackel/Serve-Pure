-- Optional contact info for the organization a self-reported activity was
-- done through, so it can be reached later to verify the hours. Self-reports
-- aren't linked to any on-platform org (event_id/registration_id are null),
-- so this is free-text supplied by the volunteer, not a foreign key.
alter table public.attendance_records
  add column org_contact_email text,
  add column org_contact_phone text;
