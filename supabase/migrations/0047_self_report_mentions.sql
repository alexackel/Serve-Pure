-- @mentions in a self-uploaded activity's "notes" (description), mirroring
-- 0044's comment-mention pattern. Unlike comments, the attendance_records
-- row doesn't exist yet when this needs to run (it's a before-insert
-- trigger on the row itself), so the visibility predicate below is
-- fn_can_see_activity's own logic inlined against NEW rather than a lookup
-- by id.

alter table public.attendance_records add column mentioned_user_ids uuid[] not null default '{}';

create or replace function public.fn_attendance_records_before_insert_or_update() returns trigger
language plpgsql set search_path = public as $$
declare v_raw_ids uuid[];
begin
  select coalesce(array_agg(distinct (m[1])::uuid), '{}') into v_raw_ids
  from regexp_matches(coalesce(new.notes, ''), '@\[[^\]]+\]\(([0-9a-fA-F-]{36})\)', 'g') as m;

  select coalesce(array_agg(uid), '{}') into new.mentioned_user_ids
  from unnest(v_raw_ids) as uid
  where uid <> new.user_id
    and not private.fn_is_blocked(new.user_id, uid)
    and (case new.visibility
           when 'everyone' then true
           when 'followers' then private.fn_is_follower(uid, new.user_id)
           else false
         end);
  return new;
end;
$$;
create trigger trg_attendance_records_before_insert_or_update
before insert or update of notes on public.attendance_records
for each row execute function public.fn_attendance_records_before_insert_or_update();
revoke execute on function public.fn_attendance_records_before_insert_or_update() from public, anon, authenticated;

-- Notifies only uids newly added to mentioned_user_ids (empty old array on
-- insert), so unrelated updates (status changes, hours review, etc.) that
-- don't touch notes/mentions never re-notify.
create or replace function public.fn_notify_on_activity_mention() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old_ids uuid[] := case when tg_op = 'INSERT' then '{}' else coalesce(old.mentioned_user_ids, '{}') end;
  v_mentioned uuid;
begin
  foreach v_mentioned in array new.mentioned_user_ids loop
    if not (v_mentioned = any(v_old_ids)) then
      perform public.fn_upsert_notification(v_mentioned, 'mention', new.id, null, new.user_id);
    end if;
  end loop;
  return new;
end;
$$;
create trigger trg_notify_on_activity_mention
after insert or update on public.attendance_records
for each row execute function public.fn_notify_on_activity_mention();
revoke execute on function public.fn_notify_on_activity_mention() from public, anon, authenticated;

-- Mention typeahead audience at compose time, before any record (and thus
-- any visibility) exists yet: approximates the 'everyone' default a new
-- activity starts with. The trigger above is what actually enforces the
-- real rule once the record and its final visibility exist.
create or replace function public.get_mentionable_users_for_composer(p_query text default '')
returns table(user_id uuid, full_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select p.id, p.full_name from public.profiles p
    where p.full_name ilike '%' || p_query || '%'
      and p.id <> auth.uid()
      and not private.fn_is_blocked(auth.uid(), p.id)
    order by p.full_name
    limit 20;
end;
$$;
revoke execute on function public.get_mentionable_users_for_composer(text) from public, anon;
grant execute on function public.get_mentionable_users_for_composer(text) to authenticated;
