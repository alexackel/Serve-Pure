-- Extensions
create extension if not exists pgcrypto;
create extension if not exists postgis; -- optional, enables radius search on events

-- Enums

create type org_verification_status as enum (
  'unverified', 'pending_review', 'verified', 'rejected', 'suspended'
);

create type event_lifecycle_status as enum (
  'available', 'full', 'cancelled', 'completed'
);
-- Capacity/lifecycle ONLY. Per-user status lives on registrations/attendance_records.

create type registration_status as enum (
  'pending_confirmation', 'confirmed', 'cancelled'
);

create type cancelled_by_type as enum ('volunteer', 'organizer', 'system');

create type attendance_source as enum ('platform_registration', 'self_reported');

create type verification_status as enum (
  'pending', 'verified', 'partial', 'no_show', 'appealed', 'rejected', 'cancelled'
);
-- pending = "Completed / Pending Verification" from the brief.
-- rejected = a self-report a verifier declines (distinct from no_show, which only
-- applies to a real registration someone didn't show up for).

create type verifier_role as enum ('event_organizer', 'org_admin', 'group_admin', 'app_admin');

create type appeal_status as enum ('open', 'escalated', 'upheld', 'overturned');
create type appeal_review_level as enum ('organization', 'app_admin');
create type appeal_review_decision as enum ('upheld', 'overturned', 'escalated');

create type guardian_notify_channel as enum ('email', 'sms');
create type guardian_notify_status as enum ('queued', 'sent', 'failed');

-- Helper functions with no table dependency (used by triggers/policies later).
-- fn_is_org_admin / fn_is_group_admin / fn_is_app_admin are created at the end of
-- 0002_identity_orgs_groups.sql instead, since `language sql` functions are
-- parsed against the catalog at CREATE time and would fail here — the tables
-- they query (org_admins, group_admins, profiles) don't exist yet in this file.

create or replace function public.fn_is_minor(p_birthdate date, p_as_of date default current_date)
returns boolean language sql immutable as $$
  select p_birthdate is not null and p_birthdate > (p_as_of - interval '18 years')::date;
$$;
