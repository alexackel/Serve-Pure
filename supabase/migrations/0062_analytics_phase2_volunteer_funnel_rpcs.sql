-- Org Analytics Phase 2 (part 1 of 2): active-vs-new trend, recruitment
-- funnel, new-vs-returning split.
--
-- Same SECURITY DEFINER shape as 0060/0061: private.fn_is_org_admin()/
-- private.fn_is_app_admin() guard, `set search_path = public`, revoked from
-- public/anon, granted to authenticated only.
--
-- "New" volunteer definition (get_org_active_new_trend, get_org_new_returning_split):
-- a volunteer is new in a bucket/range when their all-time-first VERIFIED OR
-- PARTIAL activity with this org falls inside it. This mirrors get_org_roster's
-- first_active_date/first_in_range precedent (0061), but is deliberately
-- scoped to verified/partial only (not "any activity" like the roster's New
-- tag) so it matches this function's own "active volunteer" definition,
-- which is the same verified/partial scoping get_org_analytics_kpis uses for
-- current_active_volunteers.
--
-- Every identifier below is qualified with a table alias or drawn from a
-- declared variable on purpose: this function's RETURNS TABLE names become
-- in-scope identifiers for the whole plpgsql body, so a bare reference to a
-- same-named column is ambiguous (42702) even inside a CTE (see 0061's
-- comment on the same bug, caught post-deploy last time).

create or replace function public.get_org_active_new_trend(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  bucket_start date,
  bucket_granularity text,
  new_volunteers int,
  returning_volunteers int
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
  with activity as (
    select
      ar.user_id,
      coalesce(e.start_at::date, ar.created_at::date) as activity_date
    from public.attendance_records ar
    left join public.events e on e.id = ar.event_id
    where ar.org_id = p_org_id
      and (p_event_id is null or ar.event_id = p_event_id)
      and ar.status in ('verified', 'partial')
  ),
  first_touch as (
    select a.user_id, min(a.activity_date) as first_active_date
    from activity a
    group by a.user_id
  ),
  buckets as (
    select
      a.user_id,
      date_trunc(v_granularity, a.activity_date)::date as bucket_start,
      date_trunc(v_granularity, ft.first_active_date)::date as first_bucket
    from activity a
    join first_touch ft on ft.user_id = a.user_id
    where a.activity_date between p_range_start and p_range_end
    group by a.user_id, date_trunc(v_granularity, a.activity_date)::date, date_trunc(v_granularity, ft.first_active_date)::date
  )
  select
    b.bucket_start,
    v_granularity,
    count(*) filter (where b.bucket_start = b.first_bucket)::int,
    count(*) filter (where b.bucket_start <> b.first_bucket)::int
  from buckets b
  group by b.bucket_start
  order by b.bucket_start;
end;
$$;

revoke execute on function public.get_org_active_new_trend(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_active_new_trend(uuid, date, date, uuid) to authenticated;

create or replace function public.get_org_new_returning_split(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  new_volunteers int,
  returning_volunteers int
)
language plpgsql security definer set search_path = public as $$
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  return query
  with activity as (
    select
      ar.user_id,
      coalesce(e.start_at::date, ar.created_at::date) as activity_date
    from public.attendance_records ar
    left join public.events e on e.id = ar.event_id
    where ar.org_id = p_org_id
      and (p_event_id is null or ar.event_id = p_event_id)
      and ar.status in ('verified', 'partial')
  ),
  per_volunteer as (
    select
      a.user_id,
      min(a.activity_date) as first_active_date,
      bool_or(a.activity_date between p_range_start and p_range_end) as active_in_range
    from activity a
    group by a.user_id
  )
  select
    count(*) filter (where pv.active_in_range and pv.first_active_date between p_range_start and p_range_end)::int,
    count(*) filter (where pv.active_in_range and pv.first_active_date < p_range_start)::int
  from per_volunteer pv;
end;
$$;

revoke execute on function public.get_org_new_returning_split(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_new_returning_split(uuid, date, date, uuid) to authenticated;

-- Recruitment funnel: cohort = registrations whose registered_at falls in
-- the selected range (the "Signed Up" stage), tracked forward regardless of
-- whether their outcome resolved after range end. Stages are registration
-- counts, not distinct-volunteer counts, since a volunteer can register for
-- several events in one range and each is its own funnel entry. No-show
-- isn't a stage here (it's a failure branch, not forward progress) — it's
-- covered by get_org_fill_noshow_rates instead.
create or replace function public.get_org_recruitment_funnel(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  stage text,
  stage_order int,
  volunteer_count int
)
language plpgsql security definer set search_path = public as $$
declare
  v_signed_up int;
  v_attended int;
  v_verified int;
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  select
    count(*),
    count(*) filter (where ar.status in ('pending', 'verified', 'partial')),
    count(*) filter (where ar.status in ('verified', 'partial'))
  into v_signed_up, v_attended, v_verified
  from public.registrations r
  join public.events e on e.id = r.event_id
  left join public.attendance_records ar on ar.registration_id = r.id
  where e.org_id = p_org_id
    and (p_event_id is null or r.event_id = p_event_id)
    and r.registered_at::date between p_range_start and p_range_end;

  return query
  select 'Signed up'::text, 1, v_signed_up
  union all
  select 'Attended'::text, 2, v_attended
  union all
  select 'Verified'::text, 3, v_verified;
end;
$$;

revoke execute on function public.get_org_recruitment_funnel(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_recruitment_funnel(uuid, date, date, uuid) to authenticated;
