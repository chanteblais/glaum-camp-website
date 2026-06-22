-- Public storage bucket for admin-added "File upload" application fields.
-- Mirrors the existing `avatars` bucket setup. Run this, or create the bucket
-- manually in the Supabase dashboard (Storage → New bucket → name
-- "application-files", Public = on).

insert into storage.buckets (id, name, public)
values ('application-files', 'application-files', true)
on conflict (id) do nothing;

-- Public read access (URLs are returned to applicants/admins as public links).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'application-files public read'
  ) then
    create policy "application-files public read"
      on storage.objects for select
      using (bucket_id = 'application-files');
  end if;
end $$;
