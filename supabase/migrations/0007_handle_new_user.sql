-- Auto-create a public.profiles row whenever someone signs up via Supabase Auth.
-- profiles.full_name/.email are NOT NULL with no defaults, so without this,
-- every signup would leave an orphaned auth.users row with no matching profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, birthdate)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'birthdate', '')::date
  );
  return new;
end;
$$;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();
