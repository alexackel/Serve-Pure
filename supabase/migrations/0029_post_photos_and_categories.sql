-- Self-uploaded activities gain a free-text category (matches events.category)
-- and an optional proof photo; events gain an optional photo, shown on the
-- event detail screen in place of the map placeholder when present.
alter table public.attendance_records
  add column category text,
  add column photo_url text;

alter table public.events
  add column photo_url text;

-- Single bucket for both event photos and self-report proof photos. Public
-- read (no existing photo-privacy precedent in this schema); writes are
-- restricted to the uploading user via a path-prefix check, so a client must
-- upload to `{auth.uid()}/...`.
insert into storage.buckets (id, name, public)
  values ('post-photos', 'post-photos', true)
  on conflict (id) do nothing;

create policy "post-photos public read" on storage.objects
  for select using (bucket_id = 'post-photos');

create policy "post-photos owner insert" on storage.objects
  for insert with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "post-photos owner delete" on storage.objects
  for delete using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);
