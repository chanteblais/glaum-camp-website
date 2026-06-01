# Pre-Production Checklist

Things to sort before going live.

---

## Email (Resend)

- [ ] **Verify a sender domain** in the Resend dashboard (e.g. `camp@glaum.camp`). Until then all emails go out from `onboarding@resend.dev`, which looks unprofessional and may land in spam.
- [ ] Update the `FROM` constant in `lib/send-email.ts` once the domain is verified.
- [ ] Send a test email for each trigger (new application, approve, reject, volunteer approve, role suggestion approve/reject) and confirm delivery.

## Clerk

- [ ] **Swap development keys for production keys.** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local` are currently dev keys — Clerk will warn users and enforce strict rate limits. Create a production instance in the Clerk dashboard and update the env vars on Vercel.
- [ ] Replace deprecated `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` env vars with `NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL` (Clerk v7 deprecation warning is already showing in the console).

## Database

- [ ] Confirm migration `017_role_suggestions.sql` has been applied to the production Supabase project.
- [ ] Apply migration `018_page_content.sql` to create the `page_content` table with default homepage copy.
- [ ] Confirm storage buckets `avatars` and `schedule-icons` are set to **public** in the production project.

## Environment variables (Vercel)

Ensure all of the following are set in the Vercel project settings (not just `.env.local`):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production key)
- `CLERK_SECRET_KEY` (production key)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

## General

- [ ] Test the full member journey end-to-end on the deployed URL: apply → approve → role/shift selection → profile.
- [ ] Test the volunteer journey: sign up → approve.
- [ ] Confirm the admin bell notification and email both fire on a new application.
