alter table public.profiles enable row level security;
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_select_app_admin on public.profiles for select using (fn_is_app_admin());
create policy profiles_select_event_roster on public.profiles for select using (
  exists (
    select 1 from public.registrations r join public.events e on e.id = r.event_id
    where r.user_id = profiles.id and (e.created_by = auth.uid() or fn_is_org_admin(e.org_id))
  )
);
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

alter table public.guardians enable row level security;
create policy guardians_select_self on public.guardians for select using (user_id = auth.uid());
create policy guardians_select_app_admin on public.guardians for select using (fn_is_app_admin());
create policy guardians_select_event_organizer on public.guardians for select using (
  exists (
    select 1 from public.registrations r join public.events e on e.id = r.event_id
    where r.user_id = guardians.user_id and (e.created_by = auth.uid() or fn_is_org_admin(e.org_id))
  )
); -- organizers/org admins for events the minor registered for can see guardian contact
create policy guardians_insert_self on public.guardians for insert with check (user_id = auth.uid());
create policy guardians_update_self on public.guardians for update using (user_id = auth.uid());

alter table public.organizations enable row level security;
create policy organizations_select_all on public.organizations for select using (true); -- public directory
create policy organizations_update_admins on public.organizations for update
  using (fn_is_org_admin(id) or fn_is_app_admin());

alter table public.events enable row level security;
create policy events_select_all on public.events for select using (true); -- public discovery
create policy events_insert_own on public.events for insert with check (created_by = auth.uid());
create policy events_update_owner on public.events for update
  using (created_by = auth.uid() or fn_is_org_admin(org_id));

alter table public.registrations enable row level security;
create policy registrations_select_self on public.registrations for select using (user_id = auth.uid());
create policy registrations_select_organizer on public.registrations for select using (
  exists (select 1 from public.events e where e.id = event_id
          and (e.created_by = auth.uid() or fn_is_org_admin(e.org_id)))
);
create policy registrations_select_app_admin on public.registrations for select using (fn_is_app_admin());
create policy registrations_insert_self on public.registrations for insert with check (user_id = auth.uid());
create policy registrations_update_self on public.registrations for update using (user_id = auth.uid());
create policy registrations_update_organizer on public.registrations for update using (
  exists (select 1 from public.events e where e.id = event_id
          and (e.created_by = auth.uid() or fn_is_org_admin(e.org_id)))
);

alter table public.attendance_records enable row level security;
create policy attendance_select_self on public.attendance_records for select using (user_id = auth.uid());
create policy attendance_select_org on public.attendance_records for select using (
  org_id is not null and fn_is_org_admin(org_id)
);
create policy attendance_select_event_organizer on public.attendance_records for select using (
  event_id is not null and exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
);
create policy attendance_select_group_admin on public.attendance_records for select using (
  exists (select 1 from public.group_members gm
          where gm.user_id = attendance_records.user_id and fn_is_group_admin(gm.group_id))
);
create policy attendance_select_app_admin on public.attendance_records for select using (fn_is_app_admin());

create policy attendance_insert_self_report on public.attendance_records for insert with check (
  user_id = auth.uid() and source = 'self_reported'
); -- platform_registration rows are only ever inserted by trg_create_attendance_record

create policy attendance_update_org on public.attendance_records for update using (
  org_id is not null and fn_is_org_admin(org_id)
);
create policy attendance_update_event_organizer on public.attendance_records for update using (
  event_id is not null and exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
);
create policy attendance_update_group_admin on public.attendance_records for update using (
  source = 'self_reported'
  and exists (select 1 from public.group_members gm
              where gm.user_id = attendance_records.user_id and fn_is_group_admin(gm.group_id))
); -- scoped to self-reported rows only — a group admin can never touch a platform-registration record's status
create policy attendance_update_app_admin on public.attendance_records for update using (fn_is_app_admin());

alter table public.groups enable row level security;
create policy groups_select_members_admins on public.groups for select using (
  exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
  or fn_is_group_admin(id) or fn_is_app_admin()
);
create policy groups_update_admins on public.groups for update using (fn_is_group_admin(id) or fn_is_app_admin());
