-- Per-activity visibility gate (Everyone / Followers / Only Me) for
-- attendance_records, plus the denormalized like/comment counters that
-- 0043/0044 maintain.

create type activity_visibility as enum ('everyone', 'followers', 'only_me');

alter table public.attendance_records
  add column visibility activity_visibility not null default 'everyone',
  add column like_count int not null default 0,
  add column comment_count int not null default 0;

-- Core visibility predicate. Explicit viewer arg, security definer: this is
-- called from an RLS policy on attendance_records itself (below), so without
-- security definer it would recurse into attendance_records' own RLS and
-- either infinite-loop or silently see nothing — the same recursion class
-- fixed for admin checks in 0023/0024.
create or replace function private.fn_can_see_activity(p_record_id uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when ar.user_id = p_viewer then true
    when private.fn_is_blocked(ar.user_id, p_viewer) then false
    when ar.visibility = 'only_me' then false
    when ar.visibility = 'everyone' then true
    when ar.visibility = 'followers' then private.fn_is_follower(p_viewer, ar.user_id)
    else false
  end
  from public.attendance_records ar where ar.id = p_record_id;
$$;

-- Additive OR alongside the existing admin/self policies in 0006 — doesn't
-- touch them, just opens up feed-style visibility on top.
create policy attendance_select_social on public.attendance_records for select
  using (private.fn_can_see_activity(id, auth.uid()));

-- No self-UPDATE RLS policy exists on attendance_records today (0006 only
-- grants org/event-organizer/group-admin/app-admin). Opening one would need a
-- column-guard trigger to stop a client rewriting status/hours_awarded too;
-- a narrow RPC touching only visibility is simpler and matches
-- review_group_report's "RPC is the only mutation path" convention.
create or replace function public.set_activity_visibility(p_record_id uuid, p_visibility activity_visibility)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.attendance_records where id = p_record_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized to change visibility on this activity';
  end if;
  update public.attendance_records set visibility = p_visibility, updated_at = now() where id = p_record_id;
end;
$$;
revoke execute on function public.set_activity_visibility(uuid, activity_visibility) from public, anon;
grant execute on function public.set_activity_visibility(uuid, activity_visibility) to authenticated;
