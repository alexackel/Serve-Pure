create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,  -- null = individual/casual event
  created_by uuid not null references public.profiles(id),
  title text not null,
  description text,
  category text,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer,
  min_age smallint,
  requirements jsonb not null default '{}'::jsonb,  -- {skills:[], physical:"", what_to_bring:[]}
  contact_email text,
  contact_phone text,
  website text,
  is_recurring boolean not null default false,
  recurrence_rule jsonb,
  status event_lifecycle_status not null default 'available',
  registered_count integer not null default 0,  -- maintained cache, see trg_sync_event_registered_count
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (capacity is null or capacity > 0),
  check (registered_count >= 0),
  check (min_age is null or min_age >= 0)
);
create index idx_events_org on public.events(org_id);
create index idx_events_created_by on public.events(created_by);
create index idx_events_status on public.events(status);
create index idx_events_start_at on public.events(start_at);

-- Optional radius-search column (requires postgis, enabled in 0001).
alter table public.events add column location geography(point, 4326)
  generated always as (
    case when latitude is not null and longitude is not null
    then st_setsrid(st_makepoint(longitude, latitude), 4326)::geography end
  ) stored;
create index idx_events_location on public.events using gist (location);

-- An org-attributed event can only be created by one of that org's admins.
create or replace function public.fn_check_event_creator() returns trigger
language plpgsql as $$
begin
  if new.org_id is not null and not exists (
    select 1 from public.org_admins oa
    where oa.org_id = new.org_id and oa.user_id = new.created_by
  ) then
    raise exception 'creator % is not an admin of organization %', new.created_by, new.org_id;
  end if;
  return new;
end;
$$;
create trigger trg_check_event_creator
before insert or update of org_id, created_by on public.events
for each row execute function public.fn_check_event_creator();
