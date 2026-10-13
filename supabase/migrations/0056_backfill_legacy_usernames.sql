-- Backfills profiles.username for every account that predates the usernames
-- rollout (0052 added the column with no backfill). Format: "firstname_lastname"
-- from full_name, lowercased and stripped to [a-z0-9] per side — underscore
-- instead of a dot so it satisfies the existing profiles_username_format
-- check (0052) without loosening that shared client/DB validation rule.
-- Collisions (two people with the same name, or a clash with an existing
-- username) get a numeric suffix, checked live against the table so each
-- newly-backfilled row is visible to the next iteration's uniqueness check.
do $$
declare
  rec record;
  v_name text;
  v_first text;
  v_last text;
  v_base text;
  v_candidate text;
  v_suffix int;
begin
  for rec in select id, full_name from public.profiles where username is null order by created_at loop
    v_name := regexp_replace(trim(rec.full_name), '\s+', ' ', 'g');
    v_first := regexp_replace(lower(split_part(v_name, ' ', 1)), '[^a-z0-9]', '', 'g');
    v_last := case when position(' ' in v_name) = 0 then ''
      else regexp_replace(lower(regexp_replace(v_name, '^.*\s', '')), '[^a-z0-9]', '', 'g') end;

    v_base := case
      when v_first = '' and v_last = '' then 'user' || replace(rec.id::text, '-', '')
      when v_last = '' or v_last = v_first then v_first
      else v_first || '_' || v_last
    end;
    if length(v_base) < 3 then v_base := rpad(v_base, 3, '0'); end if;
    if length(v_base) > 20 then v_base := left(v_base, 20); end if;

    v_candidate := v_base;
    v_suffix := 1;
    while exists (select 1 from public.profiles p where lower(p.username) = lower(v_candidate))
       or private.fn_username_reserved(v_candidate) loop
      v_suffix := v_suffix + 1;
      v_candidate := left(v_base, 20 - length(v_suffix::text)) || v_suffix::text;
    end loop;

    update public.profiles set username = v_candidate where id = rec.id;
  end loop;
end;
$$;
