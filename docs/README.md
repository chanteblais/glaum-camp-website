# Glåüm Camp — Design Docs

| Doc | What's in it |
|---|---|
| [Architecture](architecture.md) | Stack, data fetching pattern, auth, routing, all API routes, storage, badge generation |
| [Database](database.md) | All Supabase tables, columns, relationships, migrations reference |
| [Features](features.md) | Every page and feature — who it's for, what it does, key states |
| [Group Messaging](group-messaging.md) | Group threads design + build log (conversations model, replies, @mention, governance) |
| [Shifts Redesign](shifts-redesign.md) | Schedule & shifts redesign — design history + build record (shift types, hour requirements, multi-signup, calendars). Built 2026-07-01 |
| [Lead-Up Gatherings](lead-up-gatherings.md) | Pre-event planning sessions (`lead_up_events`) — design + build log |
| [Design System](design-system.md) | Colors, typography, spacing, reusable CSS classes, component patterns |
| [Pre-Production](pre-prod.md) | Checklist of things to complete before going live |
| [Multi-Community Roadmap](multi-community.md) | Long-term direction, what's already configurable, phased migration plan |

---

## Project direction

This codebase is being evolved into a **reusable platform** that can serve many communities — camps, retreats, festivals, volunteer groups, and intentional communities — while each community feels unique. Glåüm is the first community on the platform.

When building new features, read [multi-community.md](multi-community.md) before adding hardcoded community-specific values. The short version: put copy in `page_content`, put options in `lib/site-config.ts` defaults, avoid baking community names into source code.
