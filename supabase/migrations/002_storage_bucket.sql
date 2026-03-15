-- Create storage bucket for invoice PDFs
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload invoice PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to read their own PDFs
create policy "Users can read own invoice PDFs"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access (so PDF links work without auth)
create policy "Public can read invoice PDFs"
  on storage.objects for select
  using (bucket_id = 'invoices');
