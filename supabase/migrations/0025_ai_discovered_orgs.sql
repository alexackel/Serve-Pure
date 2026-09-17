-- AI-powered volunteer org discovery ("AI Discovered" tab on Find).
-- Two tables: searched_metros (region "buckets" the discover-ai-orgs Edge
-- Function has already searched, so a metro area is only ever searched
-- once) and ai_discovered_orgs (the orgs found within a given bucket).
-- All writes to both tables happen from the Edge Function's service_role
-- client, which bypasses RLS entirely — the only client-facing mutation is
-- the flag-count RPC below.

create type ai_org_category as enum (
  'food', 'environment', 'youth', 'seniors', 'animals',
  'education', 'health', 'disaster_relief', 'other'
);

create type metro_search_status as enum ('idle', 'in_progress');

create table public.searched_metros (
  id uuid primary key default gen_random_uuid(),
  center_lat numeric(9,6) not null,
  center_lng numeric(9,6) not null,
  radius_miles numeric(5,1) not null default 17.5,
  search_status metro_search_status not null default 'idle',
  last_searched_at timestamptz,  -- set once a fresh search completes successfully
  last_active_at timestamptz not null default now(),  -- touched on every cache-hit reuse
  created_at timestamptz not null default now(),
  check (radius_miles > 0)
);

alter table public.searched_metros add column location geography(point, 4326)
  generated always as (st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) stored;
create index idx_searched_metros_location on public.searched_metros using gist (location);
create index idx_searched_metros_status on public.searched_metros(search_status);

create table public.ai_discovered_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat numeric(9,6),
  lng numeric(9,6),
  category ai_org_category not null default 'other',
  description text,
  source_url text,
  metro_id uuid not null references public.searched_metros(id) on delete cascade,
  discovered_at timestamptz not null default now(),
  flagged_count integer not null default 0,
  check (flagged_count >= 0),
  check ((lat is null) = (lng is null))
);
create index idx_ai_discovered_orgs_metro on public.ai_discovered_orgs(metro_id);
create index idx_ai_discovered_orgs_category on public.ai_discovered_orgs(category);

alter table public.ai_discovered_orgs add column location geography(point, 4326)
  generated always as (
    case when lat is not null and lng is not null
    then st_setsrid(st_makepoint(lng, lat), 4326)::geography end
  ) stored;
create index idx_ai_discovered_orgs_location on public.ai_discovered_orgs using gist (location);

-- searched_metros is never queried directly by a client — only the Edge
-- Function's service_role client touches it — so RLS is enabled with no
-- policies at all (deny-all for regular/anon/authenticated roles).
alter table public.searched_metros enable row level security;

alter table public.ai_discovered_orgs enable row level security;
create policy ai_discovered_orgs_select_all on public.ai_discovered_orgs for select using (true); -- public directory, same as organizations/events
-- No insert/update/delete policy for authenticated — all writes happen via
-- the Edge Function's service_role client. The one client-triggerable
-- mutation (flagging) goes through fn_flag_ai_org below, never a raw update.

-- Finds an existing search bucket that already covers the given point
-- (within that bucket's own radius_miles), so the Edge Function can decide
-- cache-hit vs. fresh-search without duplicating the distance math in JS.
create or replace function public.fn_find_metro_for_point(p_lat numeric, p_lng numeric)
returns uuid language sql stable as $$
  select id from public.searched_metros
  where st_dwithin(
    location,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    radius_miles * 1609.34
  )
  order by location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit 1;
$$;

-- The only client-writable mutation on ai_discovered_orgs: increments a
-- soft "reported as incorrect" counter. security definer so a client never
-- needs a raw update policy (which could otherwise let it overwrite name/
-- address/category etc, or race a read-then-write increment).
create or replace function public.fn_flag_ai_org(p_org_id uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.ai_discovered_orgs set flagged_count = flagged_count + 1 where id = p_org_id;
$$;
