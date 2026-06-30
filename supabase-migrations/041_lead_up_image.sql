-- Migration 041: optional image for a lead-up gathering.
-- Admin-uploaded in the Lead-Up Gatherings manager; rendered on the member
-- /schedule "Before We Gather" cards. Stored in a public `lead-up-images` bucket.

ALTER TABLE lead_up_events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Public storage bucket (mirrors `group-badges` / `schedule-icons`). Run this,
-- or create it manually in the Supabase dashboard (Storage → New bucket →
-- name "lead-up-images", Public = on).
insert into storage.buckets (id, name, public)
values ('lead-up-images', 'lead-up-images', true)
on conflict (id) do nothing;

-- Public read access (URLs are returned as public links to members).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'lead-up-images public read'
  ) then
    create policy "lead-up-images public read"
      on storage.objects for select
      using (bucket_id = 'lead-up-images');
  end if;
end $$;
