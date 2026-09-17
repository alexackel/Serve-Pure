/*
  Data repair for the bug fixed in org-history-context.tsx's approveRecord:
  approving a platform_registration attendance record set status='verified'
  but never set hours_awarded, so any record verified before this fix is
  stuck showing no hours (e.g. "Verified ... for  hrs" in History). Backfills
  those existing rows using their linked event's actual duration. Rows with
  hours already set, or with no linked event, are left untouched.
*/
update public.attendance_records ar
set hours_awarded = round((extract(epoch from (e.end_at - e.start_at)) / 3600.0)::numeric, 1)
from public.events e
where ar.event_id = e.id
  and ar.source = 'platform_registration'
  and ar.status in ('verified', 'partial')
  and ar.hours_awarded is null;

/*
  Same bug, dormant path: resolve_appeal()'s 'overturned' branch also flips
  status to 'verified' without ever setting hours_awarded. Not reachable from
  the app yet (no appeal-resolution UI calls this RPC today), but fixing it
  now so it doesn't reproduce this bug once that flow is built. Redefines the
  full function (copied from 0008_close_migration_gaps.sql) with only the
  overturned branch changed.
*/
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
    update public.attendance_records ar
    set status = 'verified',
        hours_awarded = coalesce(ar.hours_awarded, round((extract(epoch from (e.end_at - e.start_at)) / 3600.0)::numeric, 1))
    from public.events e
    where ar.id = v_record_id and ar.event_id = e.id;
  end if;
end;
$$;
