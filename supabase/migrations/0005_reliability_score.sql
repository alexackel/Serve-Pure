-- Reliability score = only the volunteer's 10 most recent registered events.
-- Computed on read (indexed LIMIT 10 scan) rather than denormalized, so there's
-- no rolling column to keep in sync across every mutation point (registration,
-- cancellation, attendance marking, appeal resolution).
create or replace function public.fn_reliability_score(p_user_id uuid)
returns table(score numeric, sample_size integer)
language sql stable as $$
  with last10 as (
    select r.id, r.status as reg_status, r.penalized, ar.status as att_status
    from public.registrations r
    left join public.attendance_records ar on ar.registration_id = r.id
    where r.user_id = p_user_id
    order by r.registered_at desc
    limit 10
  ), scored as (
    select case
      when reg_status = 'cancelled' and penalized then 0
      when att_status in ('no_show', 'appealed') then 0
      else 1
    end as points
    from last10
  )
  select
    case when count(*) = 0 then null else round((sum(points)::numeric / count(*)) * 5, 2) end,
    count(*)::int
  from scored;
$$;

-- Visibility: only the volunteer themselves, an org they've registered with,
-- or a group admin of a group they're in — never public/friends. Enforced via
-- a SECURITY DEFINER wrapper since the protected object is a computed
-- aggregate, not a row that plain RLS can gate.
create or replace function public.get_reliability_score(p_user_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_allowed boolean;
  v_score numeric;
begin
  v_allowed :=
    auth.uid() = p_user_id
    or exists (
      select 1 from public.registrations r join public.events e on e.id = r.event_id
      where r.user_id = p_user_id and public.fn_is_org_admin(e.org_id)
    )
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = p_user_id and public.fn_is_group_admin(gm.group_id)
    )
    or public.fn_is_app_admin();

  if not v_allowed then
    raise exception 'not authorized to view this reliability score';
  end if;

  select score into v_score from public.fn_reliability_score(p_user_id);
  return v_score;
end;
$$;
