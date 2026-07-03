# Mobile — One Product, Two Clients

Direction set 2026-07-03, **revised same day** after the home-screen concept round (see History below). **Launch target: before What If (July 23, 2026)** — decided later the same day; the app ships as a real installable app (TestFlight/store distribution), not as an installed PWA (see Explicitly rejected).

> **Sibling doc:** [`multi-community.md`](./multi-community.md). The two long-term tracks demand the *same* foundation — a real API boundary, server-side business logic, config over hardcoding. The post–What If foundation phase serves both; there is no separate "mobile workstream."

---

## Philosophy

**One backend. One information architecture. Two clients.**

The mobile app is **the same product, optimized for a different device** — not a separate mobile ecosystem with its own mental model. Users learn the platform once; the navigation and concepts they know on the web don't change because the screen got smaller.

- **Web** — optimized for larger screens; remains the organizer's primary workspace.
- **Mobile** — optimized for quick interactions: the same questions (*What's happening? Where do I need to be? Did anyone message me? How can I help?*), answered faster.

The difference is in the **interaction patterns, not the product structure.**

### Shared information architecture

Both clients navigate the same surfaces:

- Schedule
- Radio
- Many Hands — the member registry (today's `/members`): *see the many hands you're building with*
- Messages
- Participate
- Profile

("Many Hands" is Glåüm terminology — hands-pillar naming for the directory. When the nav rename actually lands in the app, log the term in `generalizability-log.md` like the other community-specific vocabulary.)

### Explicitly rejected (2026-07-03)

- **A separate mobile philosophy.** No mobile-only paradigm centered on a single concept — a Radio-led home, a daily briefing, a glance dashboard. Those were explored (concept round 1) and set aside: they'd require members to learn a second mental model, which is unnecessary complexity.
- **Admin on mobile.** Department/role/distinction/profile-field configuration, event and resource management, application review — all stay web. Unchanged from v1 of this direction.
- **The PWA-install route — tried with real members, rejected (2026-07-03).** Getting people through iOS Share → Add to Home Screen is too much friction; members don't complete it. Do not re-propose installed-PWA launches, install-nag cards, or the iOS 16.4 Web-Push-on-installed-PWA "bridge" — anything that depends on members having installed the PWA is built on a dead dependency. (The PWA shell remains as a harmless bonus; webview *technology* like Capacitor is a separate question and is not rejected — the rejection is the install/distribution path.)

---

## Mobile-specific improvements

Make the existing experience feel native rather than redesigning it. The current web app is already evolving mobile-friendly bones — mostly single-column layouts, large touch targets, clear hierarchy — so responsive design plus native capabilities do most of the work:

- Bottom navigation
- Native push notifications
- Pull-to-refresh
- Swipe gestures where appropriate
- Better touch spacing
- Native image picker / camera
- QR scanning
- Offline schedule caching
- Haptics
- Faster page transitions and animations

Several of these (bottom navigation on small screens, touch spacing, transition polish) are ordinary responsive work that can land in the **web product** whenever a surface gets touched — no app required.

> **Landed:** bottom navigation shipped on mobile web 2026-07-03 (`components/MobileTabBar.tsx`) — the member nav list rendered as icon tabs; same surfaces, same order as the desktop top nav.

---

## Push notifications — the biggest motivation

Examples of what mobile should deliver:

- Someone replied to a message.
- Your shift starts in 30 minutes.
- Dinner has moved.
- Opening Ceremony begins soon.
- Your resource commitment has changed.
- Important organizer announcement.

Two notes:

1. Several of these are **scheduled** notifications ("starts in 30 minutes"). The Vercel Cron pattern established by attunement nudges (`/api/cron/attunement-nudges`) already prototypes the delivery mechanism for time-triggered sends.
2. Push delivers via **native push (APNs/FCM) through the installed app** — the Web-Push-on-installed-PWA bridge is off the table (see Explicitly rejected). The dispatch seam is channel-agnostic either way: email today, native push when the app ships; members without the app stay on email.

---

## Architecture

Both clients consume the same backend APIs. The backend remains the source of truth; business logic lives on the server whenever possible. The mobile client is **just another client** over the same data model.

```
        Backend APIs (Next.js API routes + lib/)
              /                      \
     Web client                 Mobile client
  (larger screens,          (quick interactions,
   organizer workspace)      native capabilities)
```

### Where the codebase already stands (assessed 2026-07-03)

- **Member *write* API surface is essentially mobile-ready.** Messages (send/read/unread, DM + group), event RSVPs, lead-up RSVPs, shift signups, resource claims/offers, poll votes, group join/leave, shoutouts, profile fields/avatar — all already exist as API routes.
- **The gap is member *read* endpoints.** Schedule, dashboard, commitments, and attunement data are fetched inside server components (a deliberate perf choice — see `docs/architecture.md` → Auth standing rules). The logic lives in `lib/` (`participate-data.ts`, `attunement.ts`, `resources.ts`, `conversations.ts`, `groups.ts`, …), so closing the gap later is mechanical: wrap the same functions in `GET` routes. **Do not build this API layer preemptively.**
- **Business logic is already server-side** (`lib/member-facts.ts`, `lib/distinctions.ts`, etc.).
- **Auth is a non-issue.** Clerk ships native SDKs; existing routes' `auth()` checks accept native session tokens. Same instance, same users.

### Standing disciplines (hold from now on — they cost nothing)

1. **New member-facing logic goes in a `lib/` function returning plain JSON-serializable data**; the server component or API route is a thin caller.
2. **Notifications flow through one dispatch seam** — "member + event → deliver via their channels." Email is today's only channel; push slots in later as an added channel. Don't scatter direct `send-email` calls in new feature code.
3. **Keep the web product's mobile manners.** Since mobile *is* the same product, every responsive improvement to the web (single-column layouts, touch targets, the existing ~380px pass on all UI work) is direct progress toward the mobile client — not throwaway.
4. **No preemptive refactoring** and no speculative API layer. Don't abstract without a second client.

---

## Deliberately undecided

These get better with What If data — do not settle them now:

- **Client technology.** "One product, two clients" reopens the wrapped-web route: a thin native shell (e.g. Capacitor) around the existing responsive UI would deliver push, camera/QR, haptics, and offline caching without rebuilding screens — versus a native-UI client (e.g. Expo/React Native) for maximum interaction quality. Either way, distribution is a real app install (TestFlight/stores) — the pre–What If launch timeline favors the wrapped-web shell.
- Offline strategy beyond schedule caching
- QR check-in and maps

---

## History

- **v1 (2026-07-03, morning):** "companion" framing — mobile as a distinct member experience with its own glanceable home. Explored via **concept round 1**: six home-screen paradigms (`design/app-concepts/` on the `design-exploration` branch — The Frequency, The Day's Path, The Glance, The Evening Briefing, Many Hands, The Lantern).
- **v2 (2026-07-03, same day — current):** after reviewing the concepts, the separate-paradigm approach was rejected as unnecessary complexity. One product, one IA, two clients. The round still yielded keepable interaction details that fit the existing IA and can land in the web product incrementally: **purple = "this changed since you last looked"**, an explicit **caught-up state** ("all else is quiet"), the **on-air Now/Up-next strip** (already part of Radio), and **one-tap offers** wherever a need appears.
