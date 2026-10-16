-- Sibling to fn_is_minor (0001): buckets a birthdate into a coarse age range
-- so analytics RPCs can report age distribution on the roster without ever
-- returning an exact date of birth to the client.
create or replace function public.fn_age_bracket(p_birthdate date, p_as_of date default current_date)
returns text language sql immutable as $$
  select case
    when p_birthdate is null or p_birthdate > p_as_of then null
    when p_birthdate > (p_as_of - interval '18 years')::date then 'Under 18'
    when p_birthdate > (p_as_of - interval '25 years')::date then '18-24'
    when p_birthdate > (p_as_of - interval '35 years')::date then '25-34'
    when p_birthdate > (p_as_of - interval '45 years')::date then '35-44'
    when p_birthdate > (p_as_of - interval '55 years')::date then '45-54'
    else '55+'
  end;
$$;
alter function public.fn_age_bracket(date, date) set search_path = public;
-- Same default-grant treatment as fn_is_minor: no PII, safe to leave callable
-- by any signed-in or anon role — nothing revokes it.
