-- Comments: flat list, oldest-first, direct client insert gated by RLS
-- (unlike likes, no RPC wrapper needed — closer to how registrations work).
-- @mentions use a structured `@[Full Name](uuid)` token in `body`, written
-- by the client's mention picker; mentioned_user_ids is always re-derived
-- from that text server-side (never trusted from the client — see below).

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_comments_record on public.comments(attendance_record_id, created_at);

alter table public.comments enable row level security;
create policy comments_select_visible on public.comments for select
  using (private.fn_can_see_activity(attendance_record_id, auth.uid())
         and not private.fn_is_blocked(auth.uid(), user_id));
create policy comments_insert_self on public.comments for insert
  with check (user_id = auth.uid() and private.fn_can_see_activity(attendance_record_id, auth.uid()));
create policy comments_delete_author_or_owner on public.comments for delete
  using (user_id = auth.uid()
         or exists (select 1 from public.attendance_records ar where ar.id = attendance_record_id and ar.user_id = auth.uid()));
-- No UPDATE policy/grant: no edit feature requested.

-- Re-derives mentioned_user_ids FROM BODY, ignoring whatever the client
-- sent — a client-trusted id array would let anyone attach every
-- visibility-eligible user's id to a comment and spam-notify them without
-- actually @-tagging them in the text. Then drops self-mentions and anyone
-- who can't actually see the activity (defense in depth for "Only Me
-- activities can't receive any interactions", extended to mentions).
create or replace function public.fn_comments_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare v_raw_ids uuid[];
begin
  select coalesce(array_agg(distinct (m[1])::uuid), '{}') into v_raw_ids
  from regexp_matches(new.body, '@\[[^\]]+\]\(([0-9a-fA-F-]{36})\)', 'g') as m;

  select coalesce(array_agg(uid), '{}') into new.mentioned_user_ids
  from unnest(v_raw_ids) as uid
  where uid <> new.user_id and private.fn_can_see_activity(new.attendance_record_id, uid);
  return new;
end;
$$;
create trigger trg_comments_before_insert
before insert on public.comments
for each row execute function public.fn_comments_before_insert();
revoke execute on function public.fn_comments_before_insert() from public, anon, authenticated;

-- Cross-table counter write → security definer, per the 0009 bug-fix pattern
-- (the commenter isn't the attendance_records owner).
create or replace function public.fn_sync_attendance_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_record_id uuid := coalesce(new.attendance_record_id, old.attendance_record_id);
begin
  update public.attendance_records
  set comment_count = (select count(*) from public.comments where attendance_record_id = v_record_id)
  where id = v_record_id;
  return null;
end;
$$;
create trigger trg_sync_attendance_comment_count
after insert or delete on public.comments
for each row execute function public.fn_sync_attendance_comment_count();
revoke execute on function public.fn_sync_attendance_comment_count() from public, anon, authenticated;

create or replace function public.get_activity_comments(p_record_id uuid, p_limit int default 50, p_offset int default 0)
returns table(id uuid, user_id uuid, full_name text, body text, mentioned_user_ids uuid[], created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.fn_can_see_activity(p_record_id, auth.uid()) then
    raise exception 'not authorized to view comments for this activity';
  end if;
  return query
    select c.id, c.user_id, p.full_name, c.body, c.mentioned_user_ids, c.created_at
    from public.comments c join public.profiles p on p.id = c.user_id
    where c.attendance_record_id = p_record_id
      and not private.fn_is_blocked(auth.uid(), c.user_id)
    order by c.created_at asc
    limit p_limit offset p_offset;
end;
$$;
revoke execute on function public.get_activity_comments(uuid, int, int) from public, anon;
grant execute on function public.get_activity_comments(uuid, int, int) to authenticated;

-- Mention typeahead audience: owner + (everyone, if the activity is public |
-- the owner's followers, if it's followers-only) — matches who could ever
-- actually see the thread.
create or replace function public.get_mentionable_users(p_record_id uuid, p_query text default '')
returns table(user_id uuid, full_name text)
language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_visibility activity_visibility;
begin
  -- Table aliased and columns qualified: this function's OUT parameter is
  -- itself named user_id (returns table(user_id uuid, ...)), which plpgsql
  -- exposes as an in-scope variable, so a bare `user_id` here is ambiguous
  -- between that OUT param and the table column.
  select ar.user_id, ar.visibility into v_owner, v_visibility
  from public.attendance_records ar where ar.id = p_record_id;
  if v_owner is null or not private.fn_can_see_activity(p_record_id, auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
    select p.id, p.full_name from public.profiles p
    where p.full_name ilike '%' || p_query || '%'
      and not private.fn_is_blocked(auth.uid(), p.id)
      and (p.id = v_owner or v_visibility = 'everyone' or private.fn_is_follower(p.id, v_owner))
    order by p.full_name
    limit 20;
end;
$$;
revoke execute on function public.get_mentionable_users(uuid, text) from public, anon;
grant execute on function public.get_mentionable_users(uuid, text) to authenticated;
