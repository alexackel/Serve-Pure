-- Likes: one per (activity, user), RPC-only writes (no direct client
-- insert/delete grant on the table at all).

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (attendance_record_id, user_id)
);
create index idx_likes_record on public.likes(attendance_record_id, created_at);
create index idx_likes_user on public.likes(user_id);

alter table public.likes enable row level security;
create policy likes_select_visible on public.likes for select
  using (private.fn_can_see_activity(attendance_record_id, auth.uid()));
-- No insert/update/delete policy at all: toggle_like (below) is the only
-- write path, same shape as attendance_report_groups (0036) — its security
-- definer insert/delete bypasses RLS as the table owner regardless.

create or replace function public.fn_block_self_like() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.user_id = (select user_id from public.attendance_records where id = new.attendance_record_id) then
    raise exception 'self_dealing_violation: cannot like your own activity' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_block_self_like
before insert on public.likes
for each row execute function public.fn_block_self_like();
revoke execute on function public.fn_block_self_like() from public, anon, authenticated;

-- Cross-table counter write (attendance_records, owned by someone other than
-- the liker) → security definer, per the 0009 bug-fix pattern.
create or replace function public.fn_sync_attendance_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_record_id uuid := coalesce(new.attendance_record_id, old.attendance_record_id);
begin
  update public.attendance_records
  set like_count = (select count(*) from public.likes where attendance_record_id = v_record_id)
  where id = v_record_id;
  return null;
end;
$$;
create trigger trg_sync_attendance_like_count
after insert or delete on public.likes
for each row execute function public.fn_sync_attendance_like_count();
revoke execute on function public.fn_sync_attendance_like_count() from public, anon, authenticated;

create or replace function public.toggle_like(p_record_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_existing uuid;
begin
  select user_id into v_owner from public.attendance_records where id = p_record_id;
  if v_owner is null then raise exception 'activity not found'; end if;
  if not private.fn_can_see_activity(p_record_id, auth.uid()) then
    raise exception 'not authorized to like this activity';
  end if;
  if v_owner = auth.uid() then
    raise exception 'self_dealing_violation: cannot like your own activity' using errcode = '23514';
  end if;

  select id into v_existing from public.likes where attendance_record_id = p_record_id and user_id = auth.uid();
  if v_existing is not null then
    delete from public.likes where id = v_existing;
    return false;
  else
    insert into public.likes (attendance_record_id, user_id) values (p_record_id, auth.uid());
    return true;
  end if;
end;
$$;
revoke execute on function public.toggle_like(uuid) from public, anon;
grant execute on function public.toggle_like(uuid) to authenticated;

-- Paginated likers list, followed-first ordering, blocked users excluded.
create or replace function public.get_activity_likers(p_record_id uuid, p_limit int default 20, p_offset int default 0)
returns table(user_id uuid, full_name text, liked_at timestamptz, is_following boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.fn_can_see_activity(p_record_id, auth.uid()) then
    raise exception 'not authorized to view likes for this activity';
  end if;
  return query
    select l.user_id, p.full_name, l.created_at, private.fn_is_follower(auth.uid(), l.user_id)
    from public.likes l join public.profiles p on p.id = l.user_id
    where l.attendance_record_id = p_record_id
      and not private.fn_is_blocked(auth.uid(), l.user_id)
    order by private.fn_is_follower(auth.uid(), l.user_id) desc, l.created_at asc
    limit p_limit offset p_offset;
end;
$$;
revoke execute on function public.get_activity_likers(uuid, int, int) from public, anon;
grant execute on function public.get_activity_likers(uuid, int, int) to authenticated;
