/*
  A group admin who is also the submitter's guardian (or the submitter
  themselves, though that path is now closed off everywhere else) is
  correctly hard-blocked from reviewing by trg_block_group_review_self_dealing
  (0035) — but today they only find out by hitting Approve/Deny and getting a
  raw Postgres exception, with no way to move on to the next item. RLS on
  guardians (0006) only allows user_id = auth.uid() / app-admin /
  event-organizer reads, so the client can't precompute this itself — it has
  to ask the server.

  Refactors the trigger's two checks (self-submission, guardian email/phone
  match) into a shared, read-only predicate so the trigger and this new
  proactive check can't drift apart.
*/

create or replace function private.fn_group_review_self_dealing_reason(
  p_attendance_record_id uuid,
  p_reviewer uuid
) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_submitter uuid;
  v_reviewer_email text;
  v_reviewer_phone text;
begin
  select user_id into v_submitter from public.attendance_records where id = p_attendance_record_id;

  if p_reviewer = v_submitter then
    return 'self_dealing_violation: group admin cannot review their own self-reported submission';
  end if;

  select email, phone into v_reviewer_email, v_reviewer_phone from public.profiles where id = p_reviewer;

  if exists (
    select 1 from public.guardians g
    where g.user_id = v_submitter
      and ((v_reviewer_email is not null and g.email = v_reviewer_email)
        or (v_reviewer_phone is not null and g.phone = v_reviewer_phone))
  ) then
    return 'self_dealing_violation: group admin cannot review a submission from a volunteer they are a registered guardian for';
  end if;

  return null;
end;
$$;
revoke execute on function private.fn_group_review_self_dealing_reason(uuid, uuid) from public, anon, authenticated;
grant execute on function private.fn_group_review_self_dealing_reason(uuid, uuid) to authenticated;

-- Thin wrapper now: same trigger, same signature, same errcode, body
-- delegates to the shared predicate above.
create or replace function public.fn_block_group_review_self_dealing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
begin
  v_reason := private.fn_group_review_self_dealing_reason(new.attendance_record_id, new.reviewed_by);
  if v_reason is not null then
    raise exception '%', v_reason using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Read-only, proactive check the review screen calls before offering
-- Approve/Deny. Fails OPEN ("no conflict") when the report group doesn't
-- exist or the caller isn't even a group admin for it — those are
-- review_group_report's rejections to make, not this check's concern.
create or replace function public.can_review_group_report(p_report_group_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_group_id uuid;
  v_attendance_record_id uuid;
begin
  select group_id, attendance_record_id into v_group_id, v_attendance_record_id
  from public.attendance_report_groups where id = p_report_group_id;

  if v_group_id is null then
    return true;
  end if;
  if not private.fn_is_group_admin(v_group_id) then
    return true;
  end if;

  return private.fn_group_review_self_dealing_reason(v_attendance_record_id, auth.uid()) is null;
end;
$$;
revoke execute on function public.can_review_group_report(uuid) from public, anon;
grant execute on function public.can_review_group_report(uuid) to authenticated;
