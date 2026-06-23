# Pre-Production Checklist

Things to sort before going live.

---

## Email (Resend)

- [x] **Sender domain verified** — `glaum.ca` is verified in Resend (the site itself is `glaum.camp`; email is sent from `.ca`, in-body links point to `.camp` — both intentional).
- [x] **`FROM` is now env-driven**, not a constant. `lib/send-email.ts` reads `RESEND_FROM` (set to `Glåüm Camp <notifications@glaum.ca>` in `.env.local` and Vercel). If `RESEND_FROM` is **unset** it falls back to the `onboarding@resend.dev` sandbox sender, which only delivers to the Resend account-owner's own email — every other recipient silently bounces. **Always keep `RESEND_FROM` set in every environment.**
- [x] **Send failures now surface.** `sendUserEmail`/`sendAdminEmail` return `{ ok, error }` instead of swallowing errors; `/api/admin/[id]/approve` returns an `emailWarning` and `AdminActions.tsx` alerts the admin when an approval email fails (the approval still succeeds).
- [ ] Send a test email for each trigger (new application, approve, reject, volunteer approve, role suggestion approve/reject) and confirm delivery to a recipient that is **not** your Resend account email.

## Clerk

- [ ] **Swap development keys for production keys.** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local` are currently dev keys — Clerk will warn users and enforce strict rate limits. Create a production instance in the Clerk dashboard and update the env vars on Vercel.
- [ ] Replace deprecated `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` env vars with `NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL` (Clerk v7 deprecation warning is already showing in the console).

## Database

- [ ] Confirm migration `017_role_suggestions.sql` has been applied to the production Supabase project.
- [ ] Apply migration `018_page_content.sql` to create the `page_content` table with default homepage copy.
- [ ] Apply migration `031_shoutouts.sql` (creates the `shoutouts` table) — required before the Shoutouts dashboard widget works.
- [ ] Apply migration `032_message_sender_name.sql` (adds `messages.sender_name` + backfill). **Apply this before or together with the deploy** — the message-send path now writes `sender_name`, so deploying the code ahead of the column will break sending messages.
- [ ] Apply migration `034_group_badge_image.sql` (adds `groups.badge_image` + the public `group-badges` bucket). **Apply before/with the deploy** — `getMemberGroups` and the groups admin API now select `badge_image`, so deploying the code ahead of the column breaks the profile and Groups admin.
- [ ] Confirm storage buckets `avatars`, `schedule-icons`, `application-files`, and `group-badges` are set to **public** in the production project.

## Environment variables (Vercel)

Ensure all of the following are set in the Vercel project settings (not just `.env.local`):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production key)
- `CLERK_SECRET_KEY` (production key)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM` (e.g. `Glåüm Camp <notifications@glaum.ca>` — required; without it email only reaches the Resend account owner)

## General

- [ ] Test the full member journey end-to-end on the deployed URL: apply → approve → role/shift selection → profile.
- [ ] Test the volunteer journey: sign up → approve.
- [ ] Confirm the admin bell notification and email both fire on a new application.
