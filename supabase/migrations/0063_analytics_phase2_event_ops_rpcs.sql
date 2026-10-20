-- Org Analytics Phase 2 (part 2 of 2): top events, fill/no-show rate,
-- average time to verify. Same SECURITY DEFINER/admin-guard shape as 0060-0062.

create or replace function public.get_org_top_events(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null,
  p_limit int default 10
) returns table (
  event_id uuid,
  title text,
  start_at timestamptz,
  verified_hours numeric,
  attendee_count int,
  capacity int
)
language plpgsql security definer set search_path = public as $$
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  return query
  select
    e.id,
    e.title,
    e.start_at,
    coalesce(sum(ar.hours_awarded) filter (where ar.status in ('verified', 'partial')), 0),
    count(distinct ar.user_id) filter (where ar.status in ('verified', 'partial'))::int,
    e.capacity
  from public.events e
  left join public.attendance_records ar on ar.event_id = e.id and ar.org_id = p_org_id
  where e.org_id = p_org_id
    and (p_event_id is null or e.id = p_event_id)
    and e.start_at::date between p_range_start and p_range_end
  group by e.id, e.title, e.start_at, e.capacity
  order by coalesce(sum(ar.hours_awarded) filter (where ar.status in ('verified', 'partial')), 0) desc
  limit p_limit;
end;
$$;

revoke execute on function public.get_org_top_events(uuid, date, date, uuid, int) from public, anon;
grant execute on function public.get_org_top_events(uuid, date, date, uuid, int) to authenticated;

-- Fill rate: avg(least(registered_count / capacity, 1.0)) over events with a
-- capacity set, scoped to the range — events.registered_count is the
-- existing trigger-maintained cache (fn_sync_event_registered_count, 0004),
-- reused rather than re-counting registrations. No-show rate: no_show
-- attendance records over (no_show + verified + partial), i.e. of
-- registrations whose outcome is known, scoped the same way
-- get_org_hours_trend scopes activity (org_id direct, event date with a
-- created_at fallback for self-reported rows).
create or replace function public.get_org_fill_noshow_rates(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  fill_rate numeric,
  no_show_rate numeric,
  events_with_capacity int,
  events_total int
)
language plpgsql security definer set search_path = public as $$
declare
  v_fill_rate numeric;
  v_no_show_rate numeric;
  v_events_with_capacity int;
  v_events_total int;
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  select
    round(avg(least(e.registered_count::numeric / e.capacity, 1.0)) * 100, 1),
    count(*)
  into v_fill_rate, v_events_with_capacity
  from public.events e
  where e.org_id = p_org_id
    and (p_event_id is null or e.id = p_event_id)
    and e.start_at::date between p_range_start and p_range_end
    and e.capacity is not null and e.capacity > 0;

  select count(*) into v_events_total
  from public.events e
  where e.org_id = p_org_id
    and (p_event_id is null or e.id = p_event_id)
    and e.start_at::date between p_range_start and p_range_end;

  select
    round(
      (count(*) filter (where ar.status = 'no_show')::numeric
        / nullif(count(*) filter (where ar.status in ('no_show', 'verified', 'partial')), 0)) * 100,
      1
    )
  into v_no_show_rate
  from public.attendance_records ar
  left join public.events e on e.id = ar.event_id
  where ar.org_id = p_org_id
    and (p_event_id is null or ar.event_id = p_event_id)
    and coalesce(e.start_at::date, ar.created_at::date) between p_range_start and p_range_end;

  return query select v_fill_rate, v_no_show_rate, v_events_with_capacity, v_events_total;
end;
$$;

revoke execute on function public.get_org_fill_noshow_rates(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_fill_noshow_rates(uuid, date, date, uuid) to authenticated;

-- Average hours between an event ending and the org verifying it, for
-- events linked to a registration (self-reported rows have no event end
-- time to diff against, so they're structurally excluded by the inner join).
create or replace function public.get_org_avg_time_to_verify(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  avg_hours_to_verify numeric,
  sample_size int
)
language plpgsql security definer set search_path = public as $$
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view analytics for this organization';
  end if;

  return query
  select
    round(avg(extract(epoch from (ar.verified_at - e.end_at)) / 3600.0), 1),
    count(*)::int
  from public.attendance_records ar
  join public.events e on e.id = ar.event_id
  where ar.org_id = p_org_id
    and (p_event_id is null or ar.event_id = p_event_id)
    and ar.status in ('verified', 'partial')
    and ar.verified_at is not null
    and ar.verified_at::date between p_range_start and p_range_end;
end;
$$;

revoke execute on function public.get_org_avg_time_to_verify(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_avg_time_to_verify(uuid, date, date, uuid) to authenticated;
