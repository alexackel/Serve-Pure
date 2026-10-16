-- Org Analytics Phase 1: KPI row + hours-over-time chart.
--
-- Both RPCs are SECURITY DEFINER, following get_reliability_score's (0005/0032)
-- exact shape: a private.fn_is_org_admin()/private.fn_is_app_admin() guard at
-- the top, `raise exception` if unauthorized, `set search_path = public`
-- pinned, then revoked from public/anon and granted only to authenticated
-- (0032's "client RPCs: signed-in only" pattern).
--
-- Scoping convention: both filter attendance_records.org_id = p_org_id
-- directly (the same column org-history-context.tsx already reads from),
-- not via a join through events — so a self-reported entry that was never
-- linked to a platform event still counts. An activity's date is the linked
-- event's start_at when there is one, else attendance_records.created_at.
--
-- "Pending hours" estimate: a platform-registration row never carries
-- hours_claimed (org-history-context.tsx's own comment confirms it's only
-- ever set on self-reported rows — a registration gets a figure only at
-- verification time, via hours_awarded). Reporting pending hours as 0 for
-- every ordinary registration would be wrong, so a still-pending row's hours
-- are estimated from its linked event's scheduled duration when no explicit
-- claim exists; a self-reported row keeps using the volunteer's own claim.

-- Each RPC takes one *current* range and derives the immediately preceding,
-- equal-length *previous* range itself, returning both in one result — see
-- the Phase 1 plan for why (retention is inherently a two-period comparison,
-- so the function computes both windows regardless; returning both is then
-- free and keeps the comparable-prior-period math in one place).

create or replace function public.get_org_analytics_kpis(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  current_hours_verified numeric,
  current_hours_pending numeric,
  previous_hours_verified numeric,
  previous_hours_pending numeric,
  volunteer_hour_rate numeric,
  current_active_volunteers int,
  previous_active_volunteers int,
  retention_rate numeric,
  current_checked_in int,
  current_signed_up int,
  previous_checked_in int,
  previous_signed_up int,
  pending_verifications_count int
)
language plpgsql security definer set search_path = public as $$
declare
  v_days int := p_range_end - p_range_start;
  v_prev_end date := p_range_start - 1;
  v_prev_start date := v_prev_end - v_days;
  v_rate numeric;
  v_cur record;
  v_prev record;
  v_cur_reg record;
  v_prev_reg record;
  v_pending int;
  v_retained int;
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  select o.volunteer_hour_rate into v_rate from public.organizations o where o.id = p_org_id;

  select
    coalesce(sum(ar.hours_awarded) filter (where ar.status in ('verified', 'partial')), 0) as hours_verified,
    coalesce(sum(coalesce(ar.hours_claimed, extract(epoch from (e.end_at - e.start_at)) / 3600.0))
      filter (where ar.status = 'pending'), 0) as hours_pending,
    count(distinct ar.user_id) filter (where ar.status in ('verified', 'partial')) as active_volunteers
  into v_cur
  from public.attendance_records ar
  left join public.events e on e.id = ar.event_id
  where ar.org_id = p_org_id
    and (p_event_id is null or ar.event_id = p_event_id)
    and coalesce(e.start_at::date, ar.created_at::date) between p_range_start and p_range_end;

  select
    coalesce(sum(ar.hours_awarded) filter (where ar.status in ('verified', 'partial')), 0) as hours_verified,
    coalesce(sum(coalesce(ar.hours_claimed, extract(epoch from (e.end_at - e.start_at)) / 3600.0))
      filter (where ar.status = 'pending'), 0) as hours_pending,
    count(distinct ar.user_id) filter (where ar.status in ('verified', 'partial')) as active_volunteers
  into v_prev
  from public.attendance_records ar
  left join public.events e on e.id = ar.event_id
  where ar.org_id = p_org_id
    and (p_event_id is null or ar.event_id = p_event_id)
    and coalesce(e.start_at::date, ar.created_at::date) between v_prev_start and v_prev_end;

  -- Retention: how many of the *previous* period's active volunteers also
  -- show up active in the *current* period.
  select count(distinct ar.user_id) into v_retained
  from public.attendance_records ar
  left join public.events e on e.id = ar.event_id
  where ar.org_id = p_org_id
    and (p_event_id is null or ar.event_id = p_event_id)
    and ar.status in ('verified', 'partial')
    and coalesce(e.start_at::date, ar.created_at::date) between p_range_start and p_range_end
    and ar.user_id in (
      select distinct ar2.user_id
      from public.attendance_records ar2
      left join public.events e2 on e2.id = ar2.event_id
      where ar2.org_id = p_org_id
        and (p_event_id is null or ar2.event_id = p_event_id)
        and ar2.status in ('verified', 'partial')
        and coalesce(e2.start_at::date, ar2.created_at::date) between v_prev_start and v_prev_end
    );

  -- Attendance rate inputs: signed-up/checked-in are read off registrations
  -- (bucketed by the event's own start_at — a registration has no activity
  -- date of its own outside the event it's for).
  select
    count(*) filter (where r.status <> 'cancelled') as signed_up,
    count(*) filter (where r.status <> 'cancelled' and ar.status in ('verified', 'partial')) as checked_in
  into v_cur_reg
  from public.registrations r
  join public.events e on e.id = r.event_id
  left join public.attendance_records ar on ar.registration_id = r.id
  where e.org_id = p_org_id
    and (p_event_id is null or r.event_id = p_event_id)
    and e.start_at::date between p_range_start and p_range_end;

  select
    count(*) filter (where r.status <> 'cancelled') as signed_up,
    count(*) filter (where r.status <> 'cancelled' and ar.status in ('verified', 'partial')) as checked_in
  into v_prev_reg
  from public.registrations r
  join public.events e on e.id = r.event_id
  left join public.attendance_records ar on ar.registration_id = r.id
  where e.org_id = p_org_id
    and (p_event_id is null or r.event_id = p_event_id)
    and e.start_at::date between v_prev_start and v_prev_end;

  -- Pending Verifications is a backlog count, deliberately NOT scoped to the
  -- selected range — it's "what needs my attention right now."
  select count(*) into v_pending
  from public.attendance_records ar
  where ar.org_id = p_org_id
    and (p_event_id is null or ar.event_id = p_event_id)
    and ar.status = 'pending';

  return query select
    v_cur.hours_verified, v_cur.hours_pending,
    v_prev.hours_verified, v_prev.hours_pending,
    v_rate,
    v_cur.active_volunteers::int, v_prev.active_volunteers::int,
    case when v_prev.active_volunteers = 0 then null
         else round(v_retained::numeric / v_prev.active_volunteers * 100, 1) end,
    v_cur_reg.checked_in::int, v_cur_reg.signed_up::int,
    v_prev_reg.checked_in::int, v_prev_reg.signed_up::int,
    v_pending;
end;
$$;

revoke execute on function public.get_org_analytics_kpis(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_analytics_kpis(uuid, date, date, uuid) to authenticated;

-- Hours-over-time chart: the server picks day/week/month bucketing from the
-- range length and returns the chosen granularity on every row, so the
-- chart's axis formatter and screen-reader summary never re-derive the
-- threshold themselves.
create or replace function public.get_org_hours_trend(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  bucket_start date,
  bucket_granularity text,
  verified_hours numeric,
  pending_hours numeric
)
language plpgsql security definer set search_path = public as $$
declare
  v_granularity text := case
    when p_range_end - p_range_start <= 31 then 'day'
    when p_range_end - p_range_start <= 120 then 'week'
    else 'month'
  end;
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  return query
  select
    date_trunc(v_granularity, activity.activity_date)::date as bucket_start,
    v_granularity,
    coalesce(sum(activity.hours_awarded) filter (where activity.status in ('verified', 'partial')), 0),
    coalesce(sum(activity.pending_hours_estimate) filter (where activity.status = 'pending'), 0)
  from (
    select
      ar.status, ar.hours_awarded,
      coalesce(ar.hours_claimed, extract(epoch from (e.end_at - e.start_at)) / 3600.0) as pending_hours_estimate,
      coalesce(e.start_at::date, ar.created_at::date) as activity_date
    from public.attendance_records ar
    left join public.events e on e.id = ar.event_id
    where ar.org_id = p_org_id
      and (p_event_id is null or ar.event_id = p_event_id)
      and coalesce(e.start_at::date, ar.created_at::date) between p_range_start and p_range_end
  ) activity
  group by 1
  order by 1;
end;
$$;

revoke execute on function public.get_org_hours_trend(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_hours_trend(uuid, date, date, uuid) to authenticated;
