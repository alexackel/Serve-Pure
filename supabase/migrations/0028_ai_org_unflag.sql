-- Lets a volunteer undo their own "Report incorrect info" from the Reported
-- Posts screen. Mirrors fn_flag_ai_org (0025 migration): security definer so
-- the client never needs a raw update policy, floored at 0 since
-- flagged_count has no per-user tracking (a blind counter, not a join
-- table) — an undo simply can't go negative even if counts have shifted
-- from other reports since this client last read them.
create or replace function public.fn_unflag_ai_org(p_org_id uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.ai_discovered_orgs set flagged_count = greatest(flagged_count - 1, 0) where id = p_org_id;
$$;
