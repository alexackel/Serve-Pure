-- Closes gaps found while wiring the app's mock contexts to real Supabase
-- queries: several tables the app needs to read/write had RLS never enabled
-- at all (default-open, not default-deny), organizations/groups had no
-- INSERT policy, groups had no DELETE policy, and resolve_appeal() had no
-- authorization check of its own.

-- org_admins: rows are only ever created by trg_org_auto_admin (0002).
alter table public.org_admins enable row level security;
create policy org_admins_select on public.org_admins for select using (
  user_id = auth.uid() or fn_is_org_admin(org_id) or fn_is_app_admin()
);

-- group_admins: rows are only ever created by trg_group_auto_admin (below).
alter table public.group_admins enable row level security;
create policy group_admins_select on public.group_admins for select using (
  user_id = auth.uid() or fn_is_group_admin(group_id) or fn_is_app_admin()
);

-- group_members: also needs insert/update so a volunteer can join a group
-- (or a group admin can add one) and leave (soft-delete via left_at).
alter table public.group_members enable row level security;
create policy group_members_select on public.group_members for select using (
  user_id = auth.uid() or fn_is_group_admin(group_id) or fn_is_app_admin()
);
create policy group_members_insert_self on public.group_members for insert with check (user_id = auth.uid());
create policy group_members_insert_admin on public.group_members for insert with check (fn_is_group_admin(group_id));
create policy group_members_update_self_or_admin on public.group_members for update using (
  user_id = auth.uid() or fn_is_group_admin(group_id)
);

alter table public.appeals enable row level security;
create policy appeals_select on public.appeals for select using (
  raised_by = auth.uid()
  or exists (
    select 1 from public.attendance_records ar
    where ar.id = attendance_record_id
      and (
        (ar.org_id is not null and fn_is_org_admin(ar.org_id))
        or (ar.event_id is not null and exists (
          select 1 from public.events e where e.id = ar.event_id and e.created_by = auth.uid()
        ))
      )
  )
  or fn_is_app_admin()
);
create policy appeals_insert_self on public.appeals for insert with check (
  raised_by = auth.uid()
  and exists (select 1 from public.attendance_records ar where ar.id = attendance_record_id and ar.user_id = auth.uid())
);
-- No update policy: appeals only ever change via resolve_appeal(), which is
-- rewritten below as SECURITY DEFINER so it bypasses RLS on this table.

alter table public.appeal_reviews enable row level security;
create policy appeal_reviews_select on public.appeal_reviews for select using (
  exists (select 1 from public.appeals a where a.id = appeal_id and a.raised_by = auth.uid())
  or reviewer_id = auth.uid()
  or fn_is_app_admin()
);
-- No insert policy: rows are only ever written by resolve_appeal() (SECURITY
-- DEFINER, below).

alter table public.guardian_notifications enable row level security;
create policy guardian_notifications_select on public.guardian_notifications for select using (
  exists (select 1 from public.guardians g where g.id = guardian_id and g.user_id = auth.uid())
  or exists (select 1 from public.registrations r where r.id = registration_id and r.user_id = auth.uid())
  or fn_is_app_admin()
);
-- No insert/update policy: nothing writes this table yet (guardian
-- notification delivery is unimplemented DB-side, tracked separately).

alter table public.attendance_verification_log enable row level security;
create policy attendance_verification_log_select on public.attendance_verification_log for select using (
  exists (
    select 1 from public.attendance_records ar
    where ar.id = attendance_record_id
      and (
        ar.user_id = auth.uid()
        or (ar.org_id is not null and fn_is_org_admin(ar.org_id))
        or (ar.event_id is not null and exists (
          select 1 from public.events e where e.id = ar.event_id and e.created_by = auth.uid()
        ))
      )
  )
  or fn_is_app_admin()
);
-- No insert policy: fn_log_verification_change runs as part of the same
-- update already permitted by an attendance_update_* policy.

-- organizations / groups: creation was previously impossible under RLS.
create policy organizations_insert_own on public.organizations for insert with check (created_by = auth.uid());
create policy groups_insert_own on public.groups for insert with check (created_by = auth.uid());

-- groups had no DELETE policy either — the app's "Delete Group" action would
-- silently affect zero rows under RLS instead of actually deleting.
create policy groups_delete_admin on public.groups for delete using (fn_is_group_admin(id) or fn_is_app_admin());

-- Mirrors fn_org_auto_admin/trg_org_auto_admin (0002): bootstraps the
-- creator into both group_admins and group_members in one trigger, so
-- createGroup stays a single insert round-trip from the client.
create or replace function public.fn_group_auto_admin() returns trigger
language plpgsql security definer as $$
begin
  if new.created_by is not null then
    insert into public.group_admins (group_id, user_id, added_by)
    values (new.id, new.created_by, new.created_by);
    insert into public.group_members (group_id, user_id)
    values (new.id, new.created_by);
  end if;
  return new;
end;
$$;
create trigger trg_group_auto_admin
after insert on public.groups
for each row execute function public.fn_group_auto_admin();

-- resolve_appeal() previously had no authorization check at all and was a
-- plain (invoker-rights) function with no RLS coverage on the tables it
-- writes. Rewritten as SECURITY DEFINER (same pattern as
-- get_reliability_score) with an explicit authorization check up front.
create or replace function public.resolve_appeal(
  p_appeal_id uuid, p_level appeal_review_level, p_reviewer_id uuid,
  p_decision appeal_review_decision, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_record_id uuid;
  v_org_id uuid;
  v_event_created_by uuid;
  v_authorized boolean;
begin
  if p_reviewer_id <> auth.uid() then
    raise exception 'p_reviewer_id must match the calling user';
  end if;

  select ar.id, ar.org_id, e.created_by
    into v_record_id, v_org_id, v_event_created_by
  from public.appeals a
  join public.attendance_records ar on ar.id = a.attendance_record_id
  left join public.events e on e.id = ar.event_id
  where a.id = p_appeal_id;

  if v_record_id is null then
    raise exception 'appeal % not found', p_appeal_id;
  end if;

  if p_level = 'organization' then
    v_authorized := (v_org_id is not null and public.fn_is_org_admin(v_org_id)) or v_event_created_by = auth.uid();
  elsif p_level = 'app_admin' then
    v_authorized := public.fn_is_app_admin();
  else
    v_authorized := false;
  end if;

  if not v_authorized then
    raise exception 'not authorized to review this appeal at level %', p_level;
  end if;

  insert into public.appeal_reviews (appeal_id, level, reviewer_id, decision, notes)
  values (p_appeal_id, p_level, p_reviewer_id, p_decision, p_notes);

  if p_decision = 'escalated' then
    update public.appeals set status = 'escalated' where id = p_appeal_id;
  elsif p_decision = 'upheld' then
    update public.appeals set status = 'upheld', resolved_at = now() where id = p_appeal_id;
    update public.attendance_records set status = 'no_show' where id = v_record_id;
  elsif p_decision = 'overturned' then
    update public.appeals set status = 'overturned', resolved_at = now() where id = p_appeal_id;
    update public.attendance_records set status = 'verified' where id = v_record_id;
  end if;
end;
$$;
