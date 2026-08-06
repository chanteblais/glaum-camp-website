# Business Launch — Living Notes

A running record of the "should this be a business, and what kind" conversation. Companion to
[`multi-community.md`](./multi-community.md) (the *technical* path to multi-tenant) — this doc is the
*commercial* path: who pays, why, how much, and what success even means.

**Protocol:** append a dated entry to the Discussion Log for each substantial conversation. When
something graduates from "idea" to "decided," move it up into the relevant section and mark it
**DECIDED (date)**. Market-size numbers below are order-of-magnitude estimates from memory —
verify before betting anything real on them (marked ⚠︎).

---

## North star

Chante's framing (2026-07-10, verbatim in spirit):

> Burn camp organizers **need** this. Even at break-even I'd still do it. If it happens to make
> some passive income, I wouldn't be mad.

That ordering — mission first, money welcome — is a strategic asset, not a compromise. It means:

- No growth pressure → no VC, no hiring plans, no feature treadmill to justify a valuation.
- The architecture can stay **single-operator-friendly** (this is already a design constraint in
  practice; now it's an explicit business requirement).
- The one non-negotiable is **sustainability**: the product must not die of operator burnout or
  hosting bills. Free products die this way constantly. **Charging modestly is a service to the
  communities that depend on the tool** — it's the commitment device that keeps it alive.

### Success tiers (pick decisions against these)

| Tier | Looks like | Requires |
|---|---|---|
| **A — Mission covered** | Infra + tooling costs covered; a handful of camps/communities run on it; Glåüm thrives | ~5–15 paying communities at modest annual pricing |
| **B — Meaningful side income** | ~$1–3k/mo after costs; real but part-time | ~50–150 communities, at least one year-round segment |
| **C — Real business** | Replaces salary; possibly a first hire | Hundreds of communities, multi-segment, real marketing |

Tier A is already declared acceptable. The practical question this doc works on: **is Tier B
reachable without doing anything that would make Tier A worse?** (Tier C is not a goal unless the
market drags us there.)

---

## The seasonality question

**The worry:** burn camps run once a year. Activity concentrates in roughly Feb–Sep (camp forms →
applications → planning → event → teardown), then goes dormant. A monthly subscription invites
churn-cycling: subscribe in March, cancel in September.

**Assessment: seasonality is a real TAM problem but only a mechanical pricing problem.**

1. **The pricing fix is easy: bill annually, frame it as a season pass.** Camps already run on an
   annual money cycle — dues. A camp of 30 paying (say) $200/yr for the platform is under
   $7/member/year, a rounding error inside dues. The platform's own dues feature makes collecting
   that painless. Monthly billing should probably never be offered to camps at all.
2. **Renewal concentrates at a predictable moment** (camp formation, roughly Jan–Mar for a summer
   burn). That's an efficiency: one marketing/renewal push per year, not a constant drip.
3. **The year-round value is the registry, and it's the anti-churn moat.** Member history,
   distinctions, attunement records, who held what shift last year, the resource lists — that's
   the camp's institutional memory. A camp that churns loses continuity between years. Product
   implication: lean into continuity features (year-over-year records, returning-member flows,
   "last year you…"), because they convert a seasonal tool into a permanent archive.
4. **What seasonality actually caps is market size, not viability.** Burning Man places on the
   order of ~1,300 theme camps ⚠︎; regionals worldwide add a few thousand more of very mixed size
   ⚠︎. A realistic solo-operator penetration (word-of-mouth, no ad spend) is dozens-to-low-hundreds
   of camps over several years. 100 camps × $200/yr = $20k/yr — comfortably Tier A→B, and it
   plateaus there. **Conclusion: the burn niche alone = mission success + modest income, not a
   business. That's consistent with the north star, so it's fine — but Tier B is easier and safer
   with a second, year-round segment.**

---

## Market segments

Ranked by structural fit with what's already built (application pipeline → approval → onboarding
checklist, groups, shifts, dues, distinctions, messaging, schedule, lead-up gatherings).

| Segment | Size (⚠︎ verify) | Fit | Notes |
|---|---|---|---|
| **Burn camps** (BM + regionals) | Low thousands of camps worldwide | ★★★ native | The beachhead: Chante's network, credibility, design soul, live dogfood. Seasonal. |
| **Intentional communities / ecovillages / cohousing** | ~1,000+ listed in the FIC directory (US); cohousing ~170 built + ~100 forming | ★★★ eerily close | Year-round. Dues, work-share shifts (cooking/cleaning rotas), membership pipeline with provisional periods (≈ attunement), consensus culture. Tooling today: spreadsheets, Google Groups, Hylo (social, weak on ops). **The operations layer is underserved.** |
| **Housing & student co-ops** (NASCO orbit) | Hundreds of group-equity/student co-ops | ★★☆ | Work-shift scheduling + dues + annual member turnover (constant onboarding). Notorious spreadsheet pain. Year-round. |
| **Volunteer-run festivals** (fringe, folk, transformational) | Thousands of events | ★★☆ | Same shape as burns (seasonal), but orgs often run several events — the lead-up-gatherings model already fits. |
| **Makerspaces / tool libraries / community gardens** | Thousands | ★☆☆ | Membership + dues + volunteer shifts, but makerspaces have vertical incumbents (Nexudus etc.). Lower priority. |

### The category proof: church management software

Planning Center serves congregations — membership, volunteer scheduling, giving (= dues),
check-ins, services (= shifts) — priced per-module, and it's a large, durable, *bootstrapped*
business. Congregations are just year-round participatory communities. The useful one-line
positioning that falls out:

> **"Planning Center for secular participatory communities."**

Two things follow: (1) year-round participatory communities *demonstrably pay* for operations
software, so Tier B is not fantasy; (2) Planning Center is a reference for module-based pricing
and for what "ops platform, not content platform" looks like at maturity.

### What this product is NOT competing with

Circle, Mighty Networks, Discord, Slack — those are **content/conversation** platforms built for
creators and audiences. This is an **operations** platform for communities where members *do
things*: apply, get approved, join groups, hold shifts, pay dues, earn distinctions. Nobody
serious owns that wedge for secular grassroots communities. (Hylo is the nearest neighbor and
it's a nonprofit social network, not an ops tool.)

---

## Business-model directions (nothing decided yet)

- **Annual, per-community flat tiers by member count.** Never per-member metering (hostile to
  community culture, annoying to administer). "Season pass" framing for camps; plain annual for
  year-round communities. Ballpark instinct: $100–400/yr by size, free or pay-what-you-can below
  ~15 members — numbers to be set *after* test users, not before.
- **Decommodification care (burn segment only).** Burner culture is allergic to being sold to.
  Position as infrastructure the camp buys, like the U-Haul and the water — priced modestly,
  sold organizer-to-organizer by word of mouth, never marketed inside burner spaces. A
  pay-what-you-can tier for small camps buys enormous goodwill and costs nearly nothing.
- **Open-source / self-host escape valve (open question).** Resonates deeply with both burner and
  IC ethos and builds trust; hosted convenience is what people actually pay for anyway. Real
  support-cost implications — do not decide casually.
- **"Passive" income realism.** SaaS is never fully passive: support, deploys, migrations,
  renewal-season spikes. The generalizability log + config-first design *are* the cost-control
  mechanism — every hardcode removed is a support ticket that never happens. Current stack
  (Vercel/Supabase/Clerk/Resend) has near-zero marginal cost per additional community at this
  scale, so break-even is a genuinely low bar.

---

## What this changes about the near-term plan

The post–What-If plan (foundation → 3–4 free test users → first paid) stands, with one amendment:

- **Recruit test users from TWO segments** — at least one burn camp *and* one intentional
  community (or co-op house). The IC user stress-tests terminology config, timezone/locale
  assumptions, and the "no single annual event" model exactly where the generalizability log
  predicts the debt is. If the platform only ever dogfoods camps, the year-round segment stays
  hypothetical right up until it's load-bearing.
- Keep logging: seasonality-driven design choices (event countdowns, "camp" framing, one-event
  assumptions) are now *business* risks, not just refactor chores.

---

## Showcase & demo strategy

**The problem (2026-07-10):** today the only way to show the app is "join my camp as a
pretend member" — fine for friends, unscalable, and it exposes real members' names/photos/
commitments to outsiders. Also, a member account never shows the thing organizers most need to
see: **the admin console**. The buyer is an organizer; the demo must let them *be the organizer*.

### The ladder (cheapest → richest)

1. **Guided walkthrough (available now).** Screen-share or in-person tour, driven by Chante.
   Highest-conversion format for warm leads. Rule: demo from **seeded fake data**, never live
   member data (member PII is not demo material, even among friends).
2. **Demo video.** A 3–5 min narrated tour (apply → approve → groups/shifts → dues → radio →
   distinctions), embedded on the landing page. An afternoon of work once there's seeded data
   worth filming; does most of the video-era selling asynchronously.
3. **Landing page.** A simple product page — the pitch, screenshots, the video, "book a
   walkthrough" link. Needs the platform name eventually (open question #4) but can start life
   under a Glåüm URL; don't let naming block it.
4. **Seeded live demo community — the real showcase.** A second deployment of the same codebase
   (own Vercel project + Supabase + Clerk) as a fictional camp with a believable season of
   history: members with avatars, filled shifts, dues in various states, radio chatter, earned
   distinctions. Landing page offers **"Explore as the organizer"** with shared demo credentials;
   a nightly reseed wipes visitor graffiti. This is the standard vertical-SaaS pattern (it's how
   Planning Center et al. sell).

### The strategic twofer

A demo deployment is **the first real test of the config layer** — `SITE_NAME`/`EVENT_NAME` env
vars, `page_content` copy, its own branding — i.e. a mini second tenant with zero multi-tenant
code. Building it is not a detour from the foundation phase; it's the foundation phase's first
concrete exercise, and every hardcode it trips over is a generalizability-log row found *before*
a real customer finds it.

### The keystone asset: the seed script

A `seed-demo` script that fabricates a convincing community is the piece everything else reuses:
walkthroughs, video footage, landing-page screenshots, the live demo instance, local testing, and
eventually new-tenant starter templates. If anything gets built early, it's this.

### Sequencing (decided direction, not yet scheduled)

- **Pre–What-If: build nothing that touches the app.** The event is the priority. The IC friend
  gets rung 1 — a personal walkthrough on seeded data.
- **Exception — the landing page grows incrementally, starting whenever (DECIDED 2026-07-10).**
  It's the one rung fully decoupled from the app: own repo, own deployment, zero risk to camp
  or event. Treat it as a living artifact that accretes as the product develops — positioning
  copy first, staged screenshots as features polish, the video and "explore the demo" button
  slotting in post–What-If when those rungs exist. Writing the pitch is itself product work: it
  forces the positioning, the feature story, and (eventually) the name. Prerequisites to settle
  at kickoff: a working name (placeholder is fine, decide it's a placeholder), where it lives
  (own repo + free `.vercel.app` URL until named/domained), and the screenshot rule below.
- **Screenshot policy: staged data only.** No real member names/faces/commitments in any
  marketing surface — screenshots come from a seeded local/dev instance, ever.
- **During What If: capture the case study.** Screenshots, numbers ("one platform ran a
  ~40-person camp's whole season"), member quotes. Real-world proof is the scarcest asset and
  it's only harvestable once a year.
- **Post–What-If foundation window: seed script → demo instance → video → landing page**, in
  that order, as the opening act of the foundation phase (see twofer above).

---

## Open questions

1. **Which tier are we building toward?** A is guaranteed acceptable; is B the actual target?
   (Affects how much energy goes into the IC segment vs. pure camp polish.)
2. **Pricing numbers** — set after free test users reveal willingness to pay.
3. **Open-source or not** — decide deliberately, once, after test-user phase.
4. **Platform name/brand** — the product needs an identity distinct from Glåüm before the first
   external community onboards.
5. **Boring-but-real launch mechanics** — business entity, liability, payment processing (Stripe
   already deferred once), privacy policy for multi-tenant member data. Park until first paid
   customer is in sight.

---

## Discussion log

### 2026-07-10 — Doc created; seasonality + adjacent markets

- Chante: organizers **need** this; break-even acceptable; passive income welcome. → North star +
  success tiers written down.
- Seasonality analyzed: annual "season pass" billing neutralizes the churn mechanics; the registry
  (institutional memory) is the anti-churn moat; the real cap is burn-niche TAM (~Tier A/B alone).
- Adjacent markets ranked; **intentional communities** confirmed as the priority second segment
  (year-round, structurally near-identical needs, underserved ops layer). Positioning line coined:
  *Planning Center for secular participatory communities.*
- Near-term amendment: post–What-If test users should span camps **and** one IC/co-op.

### 2026-07-10 (later) — Showcase strategy

- Chante has a concrete intentional community she can reach out to — the IC segment gets its
  first warm lead.
- "Join my camp as a pretend member" rejected as the demo path (unscalable + exposes real member
  PII + never shows the admin console). → Showcase & demo strategy section added: walkthrough →
  video → landing page → seeded live demo community, with the seed script as the keystone asset
  and the demo instance doubling as the first config-layer/second-tenant exercise. Nothing built
  pre–What-If; capture the case study during the event.
- Amendment (same day): **landing page carved out of the freeze** — it's app-decoupled and
  grows incrementally as the product develops. Kickoff prerequisites: working name, own
  repo/deployment, staged-data-only screenshot policy (now standing).

### 2026-08-04 — Catering: a possible adjacent segment

- Chante's partner Daniel is catering a festival right now (176 volunteers + 241 production
  artists on the Thursday alone) and the whole operation runs on spreadsheets and handwritten
  sheets — she reads this as an additional market gap adjacent to the community-ops product
  (festivals/events are the same seasonal-community world; camp feeding is already in-domain).
- First probe built same day: a standalone single-file shopping-list builder (headcounts ×
  per-person portions → printable buy list) for Daniel's Thursday taco-night service. Lives at
  `~/Documents/Glaum/catering/` (deliberately outside both existing repos) + published as a
  private artifact for his phone. Zero commitment to architecture yet.
- Open question, undecided: fold catering into the app's functionality later vs. stand-alone
  tool/product. Field test (Daniel actually shopping off it) decides whether the thread is
  worth pulling.

### 2026-08-05 — Catering: voice-driven AI inventory as a differentiator

- Built the same day it was proposed: an AI assistant drawer on the kitchen board
  (`/api/kitchen-ai`) — the caterer dictates via the phone keyboard's mic ("twelve and a
  half pounds of black beans"), Claude turns it into proposed board edits, the caterer taps
  Apply. No audio pipeline; the OS does speech-to-text, the model does semantic matching
  ("pasta sauce" → "Tomato sauce (bolognese)") and unit math (6 bags × 12 buns = 72 pc),
  reading converted numbers back so dictation mis-hears get caught.
- Commercial read: hands-busy, aisle-standing inventory update with zero UI navigation is a
  genuine differentiator for the catering segment — spreadsheets can't do it, and the
  propose→preview→apply pattern keeps the human accountable for every number (matters for
  food-cost trust). Cost ~5¢/interaction — noise against a catering contract.
- Chante accepted the unauthenticated-endpoint risk explicitly for the festival window
  ("no one knows about it, worth it for real data"); retire-or-gate stays on the books.
