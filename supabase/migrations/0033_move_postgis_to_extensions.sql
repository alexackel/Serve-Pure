/*
  Moves PostGIS out of the API-exposed public schema into `extensions`.
  Clears the Security Advisor ERROR (public.spatial_ref_sys without RLS —
  a Supabase-owned table we can't alter, reachable via PostgREST with anon
  grants) plus the extension_in_public and st_estimatedextent warnings.

  PostGIS isn't relocatable, so this drops and recreates it. The CASCADE only
  takes the three generated `location` columns and their gist indexes; all
  three are computed from lat/lng columns that stay put, so no data is lost.

  BEFORE RUNNING, dry-run in the SQL Editor and check the NOTICE output lists
  only those 3 columns + 3 indexes:
    begin; drop extension postgis cascade; rollback;
*/

begin;

drop extension postgis cascade;
create extension postgis schema extensions;

alter table public.events add column location extensions.geography(point, 4326)
  generated always as (
    case when latitude is not null and longitude is not null
    then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography end
  ) stored;
create index idx_events_location on public.events using gist (location);

alter table public.searched_metros add column location extensions.geography(point, 4326)
  generated always as (
    extensions.st_setsrid(extensions.st_makepoint(center_lng, center_lat), 4326)::extensions.geography
  ) stored;
create index idx_searched_metros_location on public.searched_metros using gist (location);

alter table public.ai_discovered_orgs add column location extensions.geography(point, 4326)
  generated always as (
    case when lat is not null and lng is not null
    then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography end
  ) stored;
create index idx_ai_discovered_orgs_location on public.ai_discovered_orgs using gist (location);

-- Same body as 0025; search_path now pinned and includes extensions so
-- st_dwithin / st_makepoint / the <-> operator keep resolving.
create or replace function public.fn_find_metro_for_point(p_lat numeric, p_lng numeric)
returns uuid language sql stable set search_path = public, extensions as $$
  select id from public.searched_metros
  where st_dwithin(
    location,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    radius_miles * 1609.34
  )
  order by location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit 1;
$$;

commit;
