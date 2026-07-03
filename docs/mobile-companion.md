# Mobile Companion — Long-Term Direction

Direction set 2026-07-03. Nothing here is scheduled to be built before What If (July 23, 2026) — the web application remains the priority until the platform proves itself there. This document exists so that decisions made **now** don't make a future mobile app difficult, and so the direction survives until it's time to act on it.

> **Sibling doc:** [`multi-community.md`](./multi-community.md). The two long-term tracks demand the *same* foundation — a real API boundary, server-side business logic, config over hardcoding. The post–What If foundation phase serves both; there is no separate "mobile workstream."

---

## Philosophy

**Web = organize the community. Mobile = participate in the community.** Those are different experiences.

The mobile app is **not** the website wrapped in a native shell. It is the community companion — the things members naturally reach for while away from their computer, throughout the day at camp. The desktop/web experience remains the organizer's primary workspace.

The app should feel **focused rather than feature-complete**: fast, calm, and glanceable. It answers:

- What's happening?
- What's changed?
- Where do I need to be?
- How can I help?
- Who's trying to reach me?

In one line: **"What do I need to know right now?"** — not "expose every feature in the platform."

---

## Scope

### On mobile — high-frequency member interactions

- **Messages** (DMs + group threads)
- **Radio** — a community activity feed (net-new feature; see below)
- **Schedule** (incl. personal commitments/shifts)
- **Resources / Bring Something**
- **Profile**
- **Push notifications**
- Future: QR codes / check-in, maps

A possible home screen is the *pulse of the community*: Radio, upcoming schedule items, messages, resources that still need attention, personal commitments, notifications.

### Stays on the web — all admin

Department management, role configuration, distinction configuration, profile-attribute configuration, event management, resource management, application review. The mobile app does not attempt to replicate the admin experience.

---

## Push notifications — the biggest motivation

Examples of what the app should deliver:

- Someone replied to a message.
- Your shift starts in 30 minutes.
- Dinner has moved.
- Opening Ceremony begins soon.
- Your resource commitment has changed.
- Important organizer announcement.

Two notes:

1. Several of these are **scheduled** notifications ("starts in 30 minutes"). The Vercel Cron pattern established by attunement nudges (`/api/cron/attunement-nudges`) already prototypes the delivery mechanism for time-triggered sends.
2. **Bridge option:** since iOS 16.4, installed PWAs can receive Web Push. If push pressure arrives before a native app exists, the current PWA shell could deliver real notifications without building an app. This doesn't change the long-term direction; it decouples "members get push" from "we built a native app." (Current standing decision remains email-first — see `docs/features.md`.)

---

## Architecture

Both clients consume the same backend APIs. The backend remains the source of truth; business logic lives on the server whenever possible. The mobile app is **mostly another client**, which lets web, mobile, and future desktop clients evolve independently over the same data model.

```
        Backend APIs (Next.js API routes + lib/)
              /                      \
     Web Application           Mobile Application
   (organizer workspace)      (member companion)
```

### Where the codebase already stands (assessed 2026-07-03)

- **Member *write* API surface is essentially mobile-ready.** Messages (send/read/unread, DM + group), event RSVPs, lead-up RSVPs, shift signups, resource claims/offers, poll votes, group join/leave, shoutouts, profile fields/avatar — all already exist as API routes.
- **The gap is member *read* endpoints.** Schedule, dashboard, commitments, and attunement data are fetched inside server components (a deliberate perf choice — see `docs/architecture.md` → Auth standing rules). The logic lives in `lib/` (`participate-data.ts`, `attunement.ts`, `resources.ts`, `conversations.ts`, `groups.ts`, …), so closing the gap later is mechanical: wrap the same functions in `GET` routes. **Do not build this API layer preemptively** — it earns its existence when a second client does.
- **Business logic is already server-side** (`lib/member-facts.ts`, `lib/distinctions.ts`, etc.). "Store facts, derive medals" is exactly the shape a thin client wants.
- **Auth is a non-issue.** Clerk ships a native SDK (`@clerk/clerk-expo`); existing routes' `auth()` checks accept native session tokens. Same instance, same users.

---

## Standing disciplines (hold from now on — they cost nothing)

1. **New member-facing logic goes in a `lib/` function returning plain JSON-serializable data**; the server component or API route is a thin caller. (Sharpens the existing architecture standing rule. No JSX or Next-only constructs inside data functions.)
2. **Notifications flow through one dispatch seam** — "member + event → deliver via their channels." Email is today's only channel; push slots in later as an added channel rather than a hunt through feature code. Don't scatter direct `send-email` calls in new feature code; fold consolidation of existing sends into the post–What If foundation phase.
3. **Radio is designed data-first.** It's the one item on the mobile list with no data model behind it (everything else is a re-presentation of existing features). Design it as an activity-events model that features write into, and dogfood it as a **web dashboard widget** before any app exists. That's also the honest test: if the Radio widget earns its place at What If, it deserves the mobile home screen.
4. **No preemptive refactoring** of existing server components, and no speculative API layer. Same principle as multi-community: don't abstract without a second use case.

---

## Deliberately undecided

These decisions get better with What If data — do not settle them now:

- Framework (Expo/React Native vs. alternatives)
- Offline strategy
- QR check-in and maps
- Whether the home screen is Radio-led or schedule-led
- Native push vs. Web-Push-on-PWA sequencing
