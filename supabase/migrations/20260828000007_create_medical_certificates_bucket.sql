insert into storage.buckets (id, name, public)
values ('medical-certificates', 'medical-certificates', true);

create policy "Allow authenticated uploads to medical-certificates"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'medical-certificates' );

create policy "Allow authenticated reads from medical-certificates"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'medical-certificates' );
