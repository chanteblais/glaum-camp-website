-- Attunement nudge emails (daily cron — see app/api/cron/attunement-nudges).

-- 1) Per-member opt-out toggle, alongside the existing email preferences.
--    Default ON, consistent with the other email_* columns (absent row == ON).
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_attunement_nudges BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Send ledger: one row per member, upserted on every send. The cooldown
--    check against last_sent_at guards against double-sends if the cron fires
--    twice; nudge_count gives admins visibility into how often someone has
--    been nudged.
CREATE TABLE IF NOT EXISTS attunement_nudges (
  clerk_user_id      TEXT PRIMARY KEY,
  last_sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outstanding_count  INT NOT NULL DEFAULT 0,
  nudge_count        INT NOT NULL DEFAULT 1
);
