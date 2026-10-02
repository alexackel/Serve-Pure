-- Follows and blocks: the social graph backing the activity feed's
-- visibility gate (0042) and the likes/comments feature (0043/0044).

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (follower_id <> followee_id),
  unique (follower_id, followee_id)
);
create index idx_follows_followee on public.follows(followee_id);
create index idx_follows_follower on public.follows(follower_id);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);
create index idx_blocks_blocked on public.blocks(blocked_id);

-- Pure boolean predicates, explicit args (never auth.uid() internally) so
-- they're directly testable from the SQL editor and safe as security
-- definer — same reasoning as fn_is_org_admin/fn_is_app_admin (0023/0024):
-- bypassing RLS inside them leaks only a boolean, never row data.
create or replace function private.fn_is_blocked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create or replace function private.fn_is_follower(p_follower uuid, p_followee uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.follows where follower_id = p_follower and followee_id = p_followee);
$$;

alter table public.follows enable row level security;
create policy follows_select_self on public.follows for select
  using (follower_id = auth.uid() or followee_id = auth.uid());
create policy follows_select_app_admin on public.follows for select using (private.fn_is_app_admin());
create policy follows_insert_self on public.follows for insert with check (follower_id = auth.uid());
create policy follows_delete_self on public.follows for delete using (follower_id = auth.uid());

alter table public.blocks enable row level security;
create policy blocks_select_self on public.blocks for select using (blocker_id = auth.uid());
create policy blocks_select_app_admin on public.blocks for select using (private.fn_is_app_admin());
create policy blocks_insert_self on public.blocks for insert with check (blocker_id = auth.uid());
create policy blocks_delete_self on public.blocks for delete using (blocker_id = auth.uid());

-- Hard block, BEFORE-trigger shape (not a CHECK — needs a cross-table
-- lookup), mirroring fn_registrations_before_insert's self-dealing guard.
-- Only calls an already-security-definer predicate and inspects NEW, so no
-- security definer needed here itself.
create or replace function public.fn_block_follow_when_blocked() returns trigger
language plpgsql set search_path = public as $$
begin
  if private.fn_is_blocked(new.follower_id, new.followee_id) then
    raise exception 'blocked_relationship: cannot follow a user you are blocked by or have blocked'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_block_follow_when_blocked
before insert on public.follows
for each row execute function public.fn_block_follow_when_blocked();
revoke execute on function public.fn_block_follow_when_blocked() from public, anon, authenticated;

-- Cross-table write (deletes from `follows`, a table the blocker may have no
-- matching delete-policy row for in the reverse direction) by a plain client
-- role → needs security definer, per the bug class 0009 already fixed once
-- (fn_sync_event_registered_count et al. silently failing under RLS).
create or replace function public.fn_cascade_unfollow_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;
create trigger trg_cascade_unfollow_on_block
after insert on public.blocks
for each row execute function public.fn_cascade_unfollow_on_block();
revoke execute on function public.fn_cascade_unfollow_on_block() from public, anon, authenticated;
