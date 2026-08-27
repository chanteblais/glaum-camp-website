-- Migration 072: Make the application-files bucket private (security review, 2026-08-27).
--
-- File-upload application answers can hold sensitive documents (whatever an
-- admin-added "File upload" question asks for), but the bucket was created
-- public (029): anyone holding an object URL could read it, no login required.
-- Access now goes through GET /api/apply/file?path=… — owner-or-admin check,
-- then a redirect to a short-lived signed URL — so the bucket must stop
-- serving objects publicly.
--
-- Older applications store the bucket's original public URL in their answers;
-- the apply + admin views rewrite those to the authorized route at render time
-- (lib/application-files.ts), so no stored data needs rewriting.
--
-- DEPLOY ORDER: apply together with (or after) the code deploy — the code
-- change works against a still-public bucket, but applying this before the
-- deploy breaks existing file links until the new code is live.
--
-- Not destructive: no objects are deleted; existing public links simply stop
-- resolving (that is the point). Idempotent — safe to re-run.

update storage.buckets set public = false where id = 'application-files';

drop policy if exists "application-files public read" on storage.objects;
