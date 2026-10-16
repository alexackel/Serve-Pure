-- Org Analytics Phase 1: org-level settings + volunteer contact-export consent.

alter table public.organizations
  add column volunteer_hour_rate numeric(6,2) not null default 36.14
  check (volunteer_hour_rate > 0);
comment on column public.organizations.volunteer_hour_rate is
  'Dollar value assigned to one verified volunteer hour for this org''s impact reporting. Defaults to the 2025 Independent Sector national rate; org admins can override it.';
-- Covered by the existing organizations_update_admins policy (0006) — no RLS change needed.

alter table public.profiles
  add column contact_export_consent boolean not null default false;
comment on column public.profiles.contact_export_consent is
  'Volunteer opt-in, set from Settings: may an organization include this person''s contact info in a roster CSV export? Defaults to false. For a minor, true still causes export to substitute the guardian''s contact, never the minor''s own (see get_org_roster_export).';
-- Covered by the existing profiles_update_self policy (0006, unrestricted by column) — no RLS change needed.
