# Generalizability Log

A **running ledger of everything Glåüm/What If–specific or single-community–assuming** in the codebase. This is the requirements source for the multi-tenant foundation we'll build *after* What If (July 23, 2026). The roadmap & resolution plan lives in [`multi-community.md`](./multi-community.md) — this file is the raw, append-as-you-go ledger that feeds it.

> **Why this exists:** What If is the dogfood. The single best way to learn what's truly core vs. Glåüm-specific is to build/run the real event and notice every place the app assumes "Glåüm" or "What If." Captured from reality, not guessed.

## Maintenance protocol — for Claude (automatic, every iteration)

During **any** work on this codebase, whenever you write or read code that:
- hardcodes a Glåüm- or What-If–specific value (name, term, color, copy, option list, image, font, domain), **or**
- assumes there is only one community (global query, global unique constraint, global storage path, single auth scope), **or**
- makes something awkward to vary per-community,

→ **add a row to the table below before you finish the task.** Rules:
- **Log it, don't necessarily fix it.** During What If we ship single-tenant; the point is to *capture*, not detour. Only fix in-place if it's trivial and already in your task's scope (e.g. you're editing that exact line and `SITE_NAME` is a one-word swap).
- **Prefer config-first when you DO touch it.** If implementing a Glåüm-specific need for What If, route it through `page_content`/`site-config` rather than a hardcode, even when slightly more work — that way the dogfood builds the customization layer instead of debt.
- Keep entries terse. One row. Link `file:line` where useful.
- Mark **Status**: `open` (needs work in the foundation phase) · `good-pattern` (already done right, kept as a reference example) · `done`.

## Categories (for the "Type" column)
`copy` · `terminology` · `branding` (color/font/image) · `option-list` · `schema` (column/table) · `auth` · `storage` · `domain/routing` · `email` · `query-scope`

---

## Ledger

| Date | Area / `file` | Type | What's Glåüm/What-If–specific | Suggested config approach | Status |
|---|---|---|---|---|---|
| 2026-06-30 | `lib/site-config.ts`, `app/manifest.ts`, `app/layout.tsx` | branding/copy | Site/event name + PWA manifest read from env (`SITE_NAME`/`EVENT_NAME`) instead of hardcoded | Already env-driven; PWA manifest dynamic per deploy | good-pattern |
| 2026-06-30 | Inline hex colors across ~all components (`#1A0A24`/`#C8A848`/`#D239F8`/`#F3EDE6`) | branding | Brand palette hardcoded inline in every component (per design-system.md) — biggest theming blocker | Per-community `community_config` color keys → CSS custom properties injected at layout level | open |
| 2026-06-30 | `/api/badge`, `public/badge_base.png`, `TokyoDreams` font | branding | Badge base image + display font are local Glåüm assets | `community_config` `badge_base_url` + `badge_font_url`; load remotely | open |
| 2026-06-30 | Terminology: "Attunement", "Many Hands", form step subtitles | terminology | Glåüm ceremonial vocabulary baked into UI | `community_config` term keys (`term_onboarding`, etc.) | open |
| 2026-06-30 | `ApplyWizard.tsx` "Shrimp" step / `applications.shrimp_relationship` | schema | Culture-specific question as a real DB column | Move to `custom_answers JSONB` in a future migration | open |
| 2026-06-30 | `DEPT_OPTIONS` in `ApplyWizard.tsx` | option-list | Department interest checkboxes hardcoded | Source from `departments` table or `page_content` key | open |
| 2026-06-30 | `lib/send-email.ts` (sender = verified `glaum.ca`) | email | Sending domain/identity is Glåüm's | Per-community verified sender in `community_config`; see [`../`](./) email notes | open |
| 2026-06-30 | Supabase Storage buckets (`group-badges`, avatars, etc.) | storage | Upload paths are global, not namespaced per community | Prefix paths with `community_id/` | open |
| 2026-06-30 | Live domain `camp.glaum.ca`; no tenant resolution | domain/routing | Single-tenant routing; one origin | Decide subdomain-per-community vs custom domains; affects Clerk allowed origins, cookies, storage | open |
| 2026-06-30 | All entity tables lack `community_id` | query-scope/schema | Every table assumes one community | Add `communities` table + `community_id` FK + scope every query (foundation phase) | open |
| 2026-06-30 | `lead_up_events` (new) — see [`lead-up-gatherings.md`](./lead-up-gatherings.md) | schema | Assumes a single upcoming event + its runway; "lead-up vs at-camp" hardcodes one event's timeline | Generalize to *Event* as a first-class object: community → many events, each with its own lead-up phase + schedule | open |
| 2026-06-30 | `sendLeadUpGatheringEmail` in `lib/send-email.ts` | terminology/copy | Email copy says "on the way to camp" — "camp" is What-If/Glåüm-specific | Use a per-community event/term token in email copy | open |
| 2026-06-30 | `lib/asset-library.ts` `BUILTIN_ASSETS` (Glåüm Elder) | storage/branding | Community-specific medal art shipped as a code built-in (meant to be the shared global library) | Built-ins should hold only generic/global art; per-community art → tenant-scoped `asset_library` table (`community_id`) merged into the same picker; migrate Elder to a Glåüm upload | open |
