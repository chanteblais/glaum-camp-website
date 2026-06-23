-- Migration 034: Group badge images
-- Optional per-group badge image (e.g. Setup / Teardown / Decor patches) that
-- renders on the member profile, scattered beside the role badge.
-- Admin-uploaded in Admin → Groups; stored in a public `group-badges` bucket.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS badge_image TEXT;

-- Public storage bucket for the badge images. Mirrors the `avatars` /
-- `application-files` setup. Run this, or create the bucket manually in the
-- Supabase dashboard (Storage → New bucket → name "group-badges", Public = on).
insert into storage.buckets (id, name, public)
values ('group-badges', 'group-badges', true)
on conflict (id) do nothing;

-- Public read access (URLs are returned as public links to members).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'group-badges public read'
  ) then
    create policy "group-badges public read"
      on storage.objects for select
      using (bucket_id = 'group-badges');
  end if;
end $$;
