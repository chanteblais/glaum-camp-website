-- 060: Backfill canonical members rows for applications that have none.
--
-- QA sweep 2026-07-03 found 4 APPROVED applications (submitted June 27–30,
-- during the profile-source-of-truth migration window) with no members row.
-- getApprovedMember() gates every member-only surface on members.status, so
-- these campers are locked out of /participate, /schedule, /members and /roles
-- until this runs. Their clerk_user_ids were verified present in the PROD
-- Clerk instance (the 059 remap covered them) — only the members rows are
-- missing.
--
-- Generic on purpose: inserts a members row for ANY application (any status)
-- that has neither a clerk_user_id nor an email match in members, so the same
-- gap can't strand future rows. Idempotent — re-running inserts nothing new.
--
-- NOT destructive: pure INSERT, no updates or deletes.

INSERT INTO members (
  clerk_user_id, email, first_name, last_name, preferred_name,
  pronouns, phone, avatar_url, status, application_id
)
SELECT
  a.clerk_user_id, a.email, a.first_name, a.last_name, a.preferred_name,
  a.pronouns, a.phone, a.avatar_url, a.status, a.id
FROM applications a
WHERE NOT EXISTS (
  SELECT 1 FROM members m
  WHERE (a.clerk_user_id IS NOT NULL AND m.clerk_user_id = a.clerk_user_id)
     OR (a.email IS NOT NULL AND lower(m.email) = lower(a.email))
     OR m.application_id = a.id
);
