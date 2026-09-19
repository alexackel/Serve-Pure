-- The reporting volunteer can delete their own self-report, but only while
-- it's still pending — once a group admin/org has acted on it, it's part of
-- the record and shouldn't disappear out from under that review.
create policy attendance_delete_self_report on public.attendance_records
  for delete using (user_id = auth.uid() and source = 'self_reported' and status = 'pending');
