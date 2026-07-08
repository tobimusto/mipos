-- Create a new bucket for product images
insert into storage.buckets (id, name, public)
values ('product_images', 'product_images', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket
-- Allow public access to read images
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'product_images' );

-- Allow authenticated users to upload images
create policy "Allow Auth Insert"
on storage.objects for insert
with check (
  bucket_id = 'product_images' 
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to update their images
create policy "Allow Auth Update"
on storage.objects for update
using (
  bucket_id = 'product_images' 
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to delete images
create policy "Allow Auth Delete"
on storage.objects for delete
using (
  bucket_id = 'product_images' 
  and auth.role() = 'authenticated'
);
