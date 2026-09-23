-- Community-submitted "Discovered" posts: a volunteer pointing others to an
-- off-platform organization/opportunity (own website is the registration
-- path, not this app). Reuses ai_org_category so the existing category-chip
-- filter on the Discovered tab can filter both AI-found orgs and these posts
-- with one shared option set. No generated `location` geography column —
-- unlike ai_discovered_orgs/searched_metros, nothing server-side ever runs a
-- PostGIS radius query against this table; the merged Discovered list is
-- always fetched in full and distance-sorted client-side, same as events
-- already are via applyMaxRadius.
create table public.discovered_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  name text not null,
  description text,
  category ai_org_category not null,
  address text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  website text not null,
  contact_email text,
  contact_phone text,
  photo_url text,
  flagged_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (flagged_count >= 0),
  check ((latitude is null) = (longitude is null))
);

create index idx_discovered_posts_created_by on public.discovered_posts(created_by);
create index idx_discovered_posts_category on public.discovered_posts(category);

alter table public.discovered_posts enable row level security;

create policy discovered_posts_select_all on public.discovered_posts for select using (true);
create policy discovered_posts_insert_own on public.discovered_posts for insert with check (created_by = auth.uid());
-- Unrestricted by status/time, unlike attendance_delete_self_report's
-- pending-only rule (0030) — a Discovered post has no review workflow acting
-- on it that a later delete could disrupt, so the submitter can remove it
-- any time.
create policy discovered_posts_delete_own on public.discovered_posts for delete using (created_by = auth.uid());
-- No update policy: the only mutation besides insert/delete is flagging,
-- done via the security-definer functions below (run as owner, bypass RLS),
-- matching the ai_discovered_orgs precedent of having no raw update path.

create or replace function public.fn_flag_discovered_post(p_post_id uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.discovered_posts set flagged_count = flagged_count + 1 where id = p_post_id;
$$;

create or replace function public.fn_unflag_discovered_post(p_post_id uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.discovered_posts set flagged_count = greatest(flagged_count - 1, 0) where id = p_post_id;
$$;

revoke execute on function public.fn_flag_discovered_post(uuid) from public, anon;
revoke execute on function public.fn_unflag_discovered_post(uuid) from public, anon;
grant execute on function public.fn_flag_discovered_post(uuid) to authenticated;
grant execute on function public.fn_unflag_discovered_post(uuid) to authenticated;
