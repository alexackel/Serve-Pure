-- Aggregating notification inbox: a like/comment/mention on an activity the
-- recipient hasn't yet SEEN bumps one row ("Sam and 4 others...") instead of
-- inserting a duplicate, via the same partial-unique-index ON CONFLICT
-- upsert pattern as admin_review_flags (0037). "seen" (bulk, on inbox open)
-- is the aggregation reset; "read" (per-row, on tap) is a separate flag.

create type notification_type as enum ('like', 'comment', 'mention');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  actor_ids uuid[] not null default '{}',
  latest_actor_id uuid not null,
  seen boolean not null default false,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_notifications_aggregate on public.notifications(recipient_id, type, attendance_record_id) where seen = false;
create index idx_notifications_recipient on public.notifications(recipient_id, updated_at desc);

alter table public.notifications enable row level security;
create policy notifications_select_self on public.notifications for select using (recipient_id = auth.uid());
create policy notifications_update_self on public.notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
-- Column-scoped grant: a client may flip seen/read/read_at on their own rows
-- but can't rewrite which activity/actor a notification points to.
revoke update on public.notifications from authenticated;
grant update (seen, read, read_at) on public.notifications to authenticated;
-- No insert/delete grants at all: trigger-only, same as admin_review_flags.

-- Called only from trigger context below; security definer since it writes
-- to `notifications`, which has no client insert grant (0009 pattern).
create or replace function public.fn_upsert_notification(
  p_recipient uuid, p_type notification_type, p_record_id uuid, p_comment_id uuid, p_actor uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient = p_actor then return; end if;
  insert into public.notifications (recipient_id, type, attendance_record_id, comment_id, actor_ids, latest_actor_id)
  values (p_recipient, p_type, p_record_id, p_comment_id, array[p_actor], p_actor)
  on conflict (recipient_id, type, attendance_record_id) where seen = false
  do update set
    actor_ids = case when p_actor = any(notifications.actor_ids) then notifications.actor_ids
                     else array_append(notifications.actor_ids, p_actor) end,
    latest_actor_id = p_actor,
    comment_id = coalesce(p_comment_id, notifications.comment_id),
    updated_at = now();
end;
$$;
revoke execute on function public.fn_upsert_notification(uuid, notification_type, uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.fn_notify_on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.attendance_records where id = new.attendance_record_id;
  perform public.fn_upsert_notification(v_owner, 'like', new.attendance_record_id, null, new.user_id);
  return new;
end;
$$;
create trigger trg_notify_on_like after insert on public.likes
for each row execute function public.fn_notify_on_like();
revoke execute on function public.fn_notify_on_like() from public, anon, authenticated;

create or replace function public.fn_notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_recipient uuid; v_mentioned uuid;
begin
  -- Owner + everyone who already commented ("X also commented on...").
  for v_recipient in (
    select user_id from public.attendance_records where id = new.attendance_record_id and user_id <> new.user_id
    union
    select distinct user_id from public.comments
    where attendance_record_id = new.attendance_record_id and user_id <> new.user_id and id <> new.id
  ) loop
    perform public.fn_upsert_notification(v_recipient, 'comment', new.attendance_record_id, new.id, new.user_id);
  end loop;

  foreach v_mentioned in array new.mentioned_user_ids loop
    perform public.fn_upsert_notification(v_mentioned, 'mention', new.attendance_record_id, new.id, new.user_id);
  end loop;
  return new;
end;
$$;
create trigger trg_notify_on_comment after insert on public.comments
for each row execute function public.fn_notify_on_comment();
revoke execute on function public.fn_notify_on_comment() from public, anon, authenticated;

-- is_own_activity lets the client pick "commented on your activity" vs
-- "also commented on an activity you commented on" wording for the same
-- 'comment' type row, without a separate notification_type for each.
create or replace function public.get_notifications(p_limit int default 50, p_offset int default 0)
returns table(
  id uuid, type notification_type, attendance_record_id uuid, comment_id uuid,
  latest_actor_name text, other_actor_count int, activity_title text, is_own_activity boolean,
  seen boolean, read boolean, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select n.id, n.type, n.attendance_record_id, n.comment_id,
         p.full_name, greatest(array_length(n.actor_ids, 1) - 1, 0),
         coalesce(ar.activity_title, ar.activity_org_name, 'an activity'),
         ar.user_id = n.recipient_id,
         n.seen, n.read, n.created_at, n.updated_at
  from public.notifications n
  join public.profiles p on p.id = n.latest_actor_id
  join public.attendance_records ar on ar.id = n.attendance_record_id
  where n.recipient_id = auth.uid()
  order by n.updated_at desc
  limit p_limit offset p_offset;
$$;
revoke execute on function public.get_notifications(int, int) from public, anon;
grant execute on function public.get_notifications(int, int) to authenticated;
