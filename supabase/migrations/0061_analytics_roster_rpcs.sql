-- Org Analytics Phase 1: roster table + CSV export.
--
-- Same SECURITY DEFINER shape as 0060. Unlike the KPI/trend RPCs, most roster
-- columns (hours, events attended, tags, last-active) are deliberately
-- ALL-TIME for this org, not scoped to p_range_start/p_range_end — a roster
-- reads as a permanent record, same philosophy as the volunteer's own "You"
-- tab. The date range only gates the "New" tag (first-ever activity falling
-- inside the selected window) and nothing else.
--
-- get_org_roster_export is a separate, more restrictive function (not a flag
-- on get_org_roster) so the consent filter and the minor/guardian contact
-- substitution can never be accidentally bypassed by a client-supplied flag.
--
-- Same "pending hours" estimate as 0060: a still-pending platform-
-- registration row has no hours_claimed, so its hours are estimated from the
-- linked event's scheduled duration instead of reading as 0.

create or replace function public.get_org_roster(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null,
  p_search text default null,
  p_tag_filter text default null,
  p_sort_by text default 'name',
  p_sort_dir text default 'asc',
  p_page int default 0,
  p_page_size int default 50
) returns table (
  user_id uuid,
  full_name text,
  contact_email text,
  contact_phone text,
  age_bracket text,
  school text,
  group_names text[],
  first_active_date date,
  last_active_date date,
  verified_hours numeric,
  pending_hours numeric,
  events_attended int,
  reliability_score numeric,
  tags text[],
  total_count bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to view the roster for this organization';
  end if;
  if p_sort_by not in ('name', 'hours', 'last_active', 'reliability') then
    raise exception 'invalid p_sort_by: %', p_sort_by;
  end if;
  if p_sort_dir not in ('asc', 'desc') then
    raise exception 'invalid p_sort_dir: %', p_sort_dir;
  end if;

  return query
  with activity as (
    select
      ar.user_id, ar.status, ar.hours_awarded, ar.event_id,
      coalesce(ar.hours_claimed, extract(epoch from (e.end_at - e.start_at)) / 3600.0) as pending_hours_estimate,
      coalesce(e.start_at::date, ar.created_at::date) as activity_date
    from public.attendance_records ar
    left join public.events e on e.id = ar.event_id
    where ar.org_id = p_org_id
      and (p_event_id is null or ar.event_id = p_event_id)
  ),
  per_volunteer as (
    select
      a.user_id,
      min(a.activity_date) filter (where a.activity_date between p_range_start and p_range_end) as first_in_range,
      min(a.activity_date) as first_active_date,
      max(a.activity_date) as last_active_date,
      coalesce(sum(a.hours_awarded) filter (where a.status in ('verified', 'partial')), 0) as verified_hours,
      coalesce(sum(a.pending_hours_estimate) filter (where a.status = 'pending'), 0) as pending_hours,
      count(distinct a.event_id) filter (where a.status in ('verified', 'partial') and a.event_id is not null) as events_attended
    from activity a
    group by a.user_id
  ),
  -- Every identifier below is qualified with a table alias on purpose: this
  -- function's RETURNS TABLE names (user_id, verified_hours, full_name,
  -- school, tags, ...) become in-scope identifiers for the whole plpgsql
  -- body, so a bare reference to a same-named column is ambiguous (42702)
  -- even inside a CTE — not just in a literal SELECT ... INTO.
  ranked as (
    select pv2.user_id, percent_rank() over (order by pv2.verified_hours) as hours_percentile
    from per_volunteer pv2
    where pv2.verified_hours > 0
  ),
  enriched as (
    select
      pv.user_id,
      p.full_name,
      case when p.contact_export_consent then p.email end as contact_email,
      case when p.contact_export_consent then p.phone end as contact_phone,
      public.fn_age_bracket(p.birthdate) as age_bracket,
      p.school,
      coalesce((
        select array_agg(g.name order by g.name)
        from public.group_members gm
        join public.groups g on g.id = gm.group_id
        where gm.user_id = pv.user_id and gm.left_at is null
      ), '{}') as group_names,
      pv.first_active_date,
      pv.last_active_date,
      pv.verified_hours,
      pv.pending_hours,
      pv.events_attended,
      (select score from public.fn_reliability_score(pv.user_id)) as reliability_score,
      array_remove(array[
        case when public.fn_is_minor(p.birthdate) then 'Minor' end,
        case when pv.first_in_range is not null and pv.first_active_date = pv.first_in_range then 'New' end,
        case when pv.events_attended >= 2
             and not (pv.first_in_range is not null and pv.first_active_date = pv.first_in_range)
             then 'Repeat' end,
        case when r.hours_percentile >= 0.9 then 'Top 10%' end,
        case when pv.last_active_date is not null and (current_date - pv.last_active_date) > 90 then 'Lapsed 90+ days' end
      ], null) as tags
    from per_volunteer pv
    join public.profiles p on p.id = pv.user_id
    left join ranked r on r.user_id = pv.user_id
  ),
  filtered as (
    select *
    from enriched en
    where (p_search is null or p_search = '' or en.full_name ilike '%' || p_search || '%' or en.school ilike '%' || p_search || '%')
      and (p_tag_filter is null or p_tag_filter = any(en.tags))
  )
  select
    f.user_id, f.full_name, f.contact_email, f.contact_phone, f.age_bracket, f.school, f.group_names,
    f.first_active_date, f.last_active_date, f.verified_hours, f.pending_hours, f.events_attended::int,
    f.reliability_score, f.tags,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort_by = 'name' and p_sort_dir = 'asc' then f.full_name end asc,
    case when p_sort_by = 'name' and p_sort_dir = 'desc' then f.full_name end desc,
    case when p_sort_by = 'hours' and p_sort_dir = 'asc' then f.verified_hours end asc,
    case when p_sort_by = 'hours' and p_sort_dir = 'desc' then f.verified_hours end desc,
    case when p_sort_by = 'last_active' and p_sort_dir = 'asc' then f.last_active_date end asc,
    case when p_sort_by = 'last_active' and p_sort_dir = 'desc' then f.last_active_date end desc,
    case when p_sort_by = 'reliability' and p_sort_dir = 'asc' then f.reliability_score end asc,
    case when p_sort_by = 'reliability' and p_sort_dir = 'desc' then f.reliability_score end desc
  limit p_page_size offset p_page * p_page_size;
end;
$$;

revoke execute on function public.get_org_roster(uuid, date, date, uuid, text, text, text, text, int, int) from public, anon;
grant execute on function public.get_org_roster(uuid, date, date, uuid, text, text, text, text, int, int) to authenticated;

create or replace function public.get_org_roster_export(
  p_org_id uuid,
  p_range_start date,
  p_range_end date,
  p_event_id uuid default null
) returns table (
  full_name text,
  is_minor boolean,
  contact_email text,
  contact_phone text,
  age_bracket text,
  school text,
  group_names text[],
  first_active_date date,
  last_active_date date,
  verified_hours numeric,
  pending_hours numeric,
  events_attended int,
  reliability_score numeric,
  tags text[]
)
language plpgsql security definer set search_path = public as $$
begin
  if not (private.fn_is_org_admin(p_org_id) or private.fn_is_app_admin()) then
    raise exception 'not authorized to export the roster for this organization';
  end if;

  return query
  with activity as (
    select
      ar.user_id, ar.status, ar.hours_awarded, ar.event_id,
      coalesce(ar.hours_claimed, extract(epoch from (e.end_at - e.start_at)) / 3600.0) as pending_hours_estimate,
      coalesce(e.start_at::date, ar.created_at::date) as activity_date
    from public.attendance_records ar
    left join public.events e on e.id = ar.event_id
    where ar.org_id = p_org_id
      and (p_event_id is null or ar.event_id = p_event_id)
  ),
  per_volunteer as (
    select
      a.user_id,
      min(a.activity_date) filter (where a.activity_date between p_range_start and p_range_end) as first_in_range,
      min(a.activity_date) as first_active_date,
      max(a.activity_date) as last_active_date,
      coalesce(sum(a.hours_awarded) filter (where a.status in ('verified', 'partial')), 0) as verified_hours,
      coalesce(sum(a.pending_hours_estimate) filter (where a.status = 'pending'), 0) as pending_hours,
      count(distinct a.event_id) filter (where a.status in ('verified', 'partial') and a.event_id is not null) as events_attended
    from activity a
    group by a.user_id
  ),
  -- verified_hours is this function's RETURNS TABLE name too, so the same
  -- qualify-everything rule applies here (see get_org_roster above).
  ranked as (
    select pv2.user_id, percent_rank() over (order by pv2.verified_hours) as hours_percentile
    from per_volunteer pv2
    where pv2.verified_hours > 0
  ),
  -- Only volunteers who've consented are in scope at all — never partially
  -- redacted, structurally excluded from the result set.
  consenting as (
    select pv.*, p.full_name, p.school, p.birthdate,
           public.fn_is_minor(p.birthdate) as is_minor,
           p.email as own_email, p.phone as own_phone
    from per_volunteer pv
    join public.profiles p on p.id = pv.user_id
    where p.contact_export_consent
  )
  select
    c.full_name,
    c.is_minor,
    case when c.is_minor then g.email else c.own_email end,
    case when c.is_minor then g.phone else c.own_phone end,
    public.fn_age_bracket(c.birthdate),
    c.school,
    coalesce((
      select array_agg(gr.name order by gr.name)
      from public.group_members gm
      join public.groups gr on gr.id = gm.group_id
      where gm.user_id = c.user_id and gm.left_at is null
    ), '{}'),
    c.first_active_date,
    c.last_active_date,
    c.verified_hours,
    c.pending_hours,
    c.events_attended::int,
    (select score from public.fn_reliability_score(c.user_id)),
    array_remove(array[
      case when c.is_minor then 'Minor' end,
      case when c.first_in_range is not null and c.first_active_date = c.first_in_range then 'New' end,
      case when c.events_attended >= 2
           and not (c.first_in_range is not null and c.first_active_date = c.first_in_range)
           then 'Repeat' end,
      case when r.hours_percentile >= 0.9 then 'Top 10%' end,
      case when c.last_active_date is not null and (current_date - c.last_active_date) > 90 then 'Lapsed 90+ days' end
    ], null)
  from consenting c
  left join ranked r on r.user_id = c.user_id
  -- Minor's own contact never appears in the export — a guardian row is
  -- substituted instead, and only when c.is_minor (the lateral subquery
  -- returns nothing at all for an adult).
  left join lateral (
    select email, phone from public.guardians
    where user_id = c.user_id and c.is_minor
    order by is_primary desc
    limit 1
  ) g on true
  order by c.full_name;
end;
$$;

revoke execute on function public.get_org_roster_export(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_org_roster_export(uuid, date, date, uuid) to authenticated;
