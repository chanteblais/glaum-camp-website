-- 062: Push notification device tokens (docs/mobile-companion.md).
-- One row per device the member has granted notifications on (the native app
-- registers via POST /api/push/register). Tokens are FCM registration tokens
-- (FCM delivers to both APNs/iOS and Android). Dead tokens are deleted when
-- FCM reports them unregistered. Additive + idempotent.

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  platform TEXT NOT NULL,            -- 'ios' | 'android'
  token TEXT NOT NULL UNIQUE,        -- FCM registration token (device-scoped)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens (clerk_user_id);
