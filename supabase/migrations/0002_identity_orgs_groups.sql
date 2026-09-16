-- Identity

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  birthdate date,
  identity_verified boolean not null default false,
  is_app_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  relationship text not null,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create index idx_guardians_user_id on public.guardians(user_id);
create unique index uq_guardians_one_primary on public.guardians(user_id) where is_primary;

-- Organizations

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text,
  verification_status org_verification_status not null default 'unverified',
  website text,
  contact_email text,
  contact_phone text,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_admins (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles(id),
  primary key (org_id, user_id)
);
create index idx_org_admins_user_id on public.org_admins(user_id);

create or replace function public.fn_org_auto_admin() returns trigger
language plpgsql security definer as $$
begin
  if new.created_by is not null then
    insert into public.org_admins (org_id, user_id, added_by)
    values (new.id, new.created_by, new.created_by);
  end if;
  return new;
end;
$$;
create trigger trg_org_auto_admin
after insert on public.organizations
for each row execute function public.fn_org_auto_admin();

-- Groups

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  parent_group_id uuid references public.groups(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (parent_group_id is distinct from id)
);
create index idx_groups_parent on public.groups(parent_group_id);

create table public.group_admins (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles(id),
  primary key (group_id, user_id)
);
create index idx_group_admins_user_id on public.group_admins(user_id);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (group_id, user_id)
);
create index idx_group_members_user_id on public.group_members(user_id);

-- Helper functions that depend on tables created above (see note in 0001).

create or replace function public.fn_is_org_admin(p_org_id uuid) returns boolean
language sql stable as $$
  select exists(select 1 from public.org_admins where org_id = p_org_id and user_id = auth.uid());
$$;

create or replace function public.fn_is_group_admin(p_group_id uuid) returns boolean
language sql stable as $$
  select exists(select 1 from public.group_admins where group_id = p_group_id and user_id = auth.uid());
$$;

create or replace function public.fn_is_app_admin() returns boolean
language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_app_admin);
$$;
