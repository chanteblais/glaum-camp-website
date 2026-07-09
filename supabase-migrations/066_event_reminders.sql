-- Migration 066: Confirmation + reminder emails for lead-up gatherings & shifts
--
-- Two pieces:
--   1. A member opt-out preference governing ALL gathering/shift emails
--      (signup confirmations + the day-before / morning-of reminders). Default ON.
--   2. A "already sent" ledger so the twice-daily reminder cron never
--      double-emails. One row per (member, the date their items fall on, phase);
--      reminders are batched, so a member gets at most one email per phase per day
--      covering every gathering + shift they have that day.
--
-- Additive + idempotent — safe to re-run.
--
-- NOTE ON NUMBERING: `065` is claimed by the in-flight shifts-legacy-drop branch;
-- this took `066` to avoid a collision. If the numbers shift at merge, renumber.

-- 1. Opt-out toggle (fails open to TRUE — an existing member with no explicit
--    preference still gets these emails, matching every other pref default).
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_event_reminders BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Reminder send ledger. The UNIQUE constraint is the dedupe: the cron only
--    sends when it can claim (clerk_user_id, target_date, phase).
CREATE TABLE IF NOT EXISTS event_reminders_sent (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  target_date   DATE NOT NULL,
  phase         TEXT NOT NULL CHECK (phase IN ('day_before', 'morning_of')),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, target_date, phase)
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_sent_lookup
  ON event_reminders_sent (target_date, phase);
