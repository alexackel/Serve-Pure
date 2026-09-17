/*
  Gap: org_admins/group_admins are SELECT-only (0008_close_migration_gaps.sql).
  The brief requires "one organization can have multiple admins" / group admins
  are likewise many-to-many, and the schema already supports it (composite PK,
  no uniqueness blocker) — but there was no INSERT path for an EXISTING admin
  to add another. Only the one-time auto-admin trigger (fn_org_auto_admin /
  fn_group_auto_admin) ever wrote these tables, on creation only.

  No RETURNING trap here (unlike 0013's group-create bug): the inserting admin
  already satisfies org_admins_select/group_admins_select (0008) before the
  insert, since they're already an admin of that org/group, so the new row
  passes the post-insert SELECT recheck immediately.
*/

create policy org_admins_insert_admin on public.org_admins for insert with check (
  fn_is_org_admin(org_id)
);

create policy group_admins_insert_admin on public.group_admins for insert with check (
  fn_is_group_admin(group_id)
);
