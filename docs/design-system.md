# Design System

---

## Color Palette

Defined in `tailwind.config.ts` under `theme.extend.colors.glaum` and used throughout.

| Name | Hex | Tailwind class | Usage |
|---|---|---|---|
| Ink | `#1A0A24` | `bg-glaum-ink` | Site background, base dark |
| Purple | `#D239F8` | `text-glaum-purple` | Accent, focus rings, highlights |
| Gold | `#C8A848` | `text-glaum-gold` | Headings, links, dividers, badges |
| Dark Gold | `#634D0B` | `text-glaum-dark-gold` | Darker gold for contrast |
| Cream | `#FFFACD` | `text-glaum-cream` | High-contrast text on dark |
| Plum | `#5D2B7A` | `bg-glaum-plum` | Mid-tone purple fills |
| Lavender | `#D9B3FF` | `text-glaum-lavender` | Light purple accents |

**Base text color:** `#F3EDE6` (warm off-white — not pure white)  
**Placeholder text:** `rgba(243, 237, 230, 0.28)` (same cream, highly transparent)

### Background

The site shell (`.site-shell` in `globals.css`) layers, bottom to top: base ink color, a purple radial glow at top-center fading out, a subtle plum mid-section linear gradient, and a fixed gold dot-grid via `::before`. Exact gradient stops and opacities live in `globals.css`.

---

## Typography

### Fonts

| Font | Weight | Source | CSS variable / class |
|---|---|---|---|
| TokyoDreams (Plain) | 400 | Local `/fonts/TokyoDreamsPlain.otf` | `font-tokyo` / `font-family: 'TokyoDreams'` |
| TokyoDreams (Bold) | 700 | Local `/fonts/TokyoDreams.otf` | `font-bold font-tokyo` |
| Libre Baskerville | — | Google Fonts | `--font-libre-baskerville` / `font-baskerville` |
| Marcellus | — | Google Fonts | `--font-marcellus` |
| Cormorant Garamond | — | Google Fonts | `--font-cormorant-garamond` |

**TokyoDreams** is the display/heading font — used for the site name, section headings, and decorative text.  
**Libre Baskerville** is the body serif — used for readable paragraph text.  
**Marcellus** and **Cormorant Garamond** are supporting serifs used for cards, labels, and sub-headings.

### Heading defaults

Inside `.site-shell`, all `h1`–`h6` default to:
- Color: `#C8A848` (gold)
- Text shadow: `0 2px 8px rgba(0,0,0,0.8)`

Inside `.site-shell .clerk-scope` (Clerk auth embeds), headings reset to dark ink with no shadow to remain legible on Clerk's white card background.

---

## Spacing & Layout

- **Default text color:** white (Tailwind `textColor.DEFAULT`)
- **Container:** centered, with responsive horizontal padding (1rem → 6rem at 2xl)
- **Max page width:** `1100px` (profile page)
- **Border radius:** `2xl` = `1rem`
- **Mobile breakpoint:** `768px` (JS-detected for nav), `640px` (CSS media queries for schedule calendar)

---

## Reusable CSS Classes

Defined in `globals.css` under `@layer components`:

| Class | What it does |
|---|---|
| `.font-tokyo` | Applies TokyoDreams font family |
| `.shimmer` | Animated shimmer sweep (10s loop, 25% active, 75% paused) |
| `.gold-divider` | 1px horizontal line, gold gradient, 40% opacity |
| `.purple-glow` | Box shadow with layered purple glow |
| `.site-shell` | Full site wrapper — background, dot grid, base text color |
| `.mobile-stack` | Collapses a hardcoded two-column inline grid (`gridTemplateColumns: '1fr 1fr'`) to one column under 560px (`!important`, since the grids are inline styles). Used by paired form fields (apply wizard, volunteer form, profile settings) and the Your Role / Your Shifts cards. |

### Mobile ergonomics (globals.css, not a class)

- **Form fields are forced to `font-size: 16px` under 768px** (`!important`, overriding inline styles). iOS Safari auto-zooms the page — and leaves it zoomed — when focusing a field styled under 16px; 16px is the threshold that disables that. Don't "fix" a field back down on mobile.
- **`touch-action: manipulation` on interactive elements** (links, buttons, form controls) disables double-tap-to-zoom and its tap delay; pinch-zoom is unaffected.

### Layout classes (profile page, defined inline via `<style>`)

| Class | Purpose |
|---|---|
| `.profile-main-grid` | `1.1fr 1fr` equal-height grid for the Active Commitments + Attunement Status cards |
| `.profile-info-grid` | Info card grid within profile |
| `.profile-header-grid` | `1fr auto 1fr` header band: Designation · portrait · Member Information (stacks under 768px) |
| `.commitments-rows` | Responsive rows in the Commitments card |
| `.commitments-row` | Single commitment row |
| `.commitments-row-text` | Text portion of a commitment row |

---

## Component Patterns

### Cards / Parchment

Most content cards use a parchment aesthetic:
- Background: semi-transparent warm tone or light parchment
- Border: subtle gold or cream at low opacity
- Border radius: `rounded-2xl` (1rem)
- No harsh drop shadows — prefer `purple-glow` or no shadow

### Buttons

- Primary: gold background (`#C8A848` or `glaum-gold`) with dark text
- Secondary/ghost: transparent with gold or cream border
- Focus: `outline: 2px solid #D239F8` (purple), offset 2px, `border-radius: 4px`

### Confirm Dialog

`ConfirmDialog` / `useConfirm()` (`components/ConfirmDialog.tsx`) — in-app replacement for native `confirm()`/`alert()`. Ink card on a dimmed overlay: gold uppercase eyebrow ("✦ A moment of pause"), TokyoDreams title, cream body, pill buttons ("Never mind" ghost + confirm; red accent when `danger`). `notice: true` = single "Understood" button (alert replacement, eyebrow "✦ A small snag"). Promise-based: `const { confirm, confirmDialog } = useConfirm()`, `await confirm({ title, body, confirmLabel, danger })`, render `{confirmDialog}` in the tree. Esc / overlay click cancel. Used everywhere — no native `confirm()`/`alert()` calls remain in the app (delete confirmations name the item and use `danger: true`; error alerts use `notice: true`). The one styled sibling is `ShiftConfirmModal` (shift sign-up/cancel), which predates this component.

### Avatar

- 260px circle
- Gold border: `#6F491F` (darker than the palette gold — richer for the ring)
- Component: `AvatarUpload` (`components/AvatarUpload.tsx`), id=`"avatar-upload"`

### Notification Bell

- Two variants: `NotificationBell` (admin) and `UserNotificationBell` (members)
- Shows unread count badge when > 0
- `UserNotificationBell` deep-links per event type — `new_message` → the sender's DM thread, `group_mention` → the group thread (`/messages/g/[groupId]`)

### Messages Nav Link

`MessagesNavLink` (`components/MessagesNavLink.tsx`) — a special nav link component used in the member nav for Messages. Polls `/api/messages/unread` every 30s and renders an inline unread count badge next to the label when > 0. Used in `HeaderClient` instead of a plain `<a>` tag for that nav item.

### Schedule Calendar

**Public** (`ScheduleCalendarClient`):
- Mobile (< 640px): day-tab switcher
- Desktop: 6-column grid

**Personal** (`PersonalScheduleCalendar`):
- Mobile (< 640px): day-tab switcher
- Desktop: multi-column grid
- `PX_PER_HOUR = 40`

### Event Type Colors

Colours key off `participation_type` + the shift type's palette slot (`lib/shift-colors.ts` — the single source shared by the main schedule, personal schedule, and shift picker):

| Event | Color |
|---|---|
| `general` | Default purple (uncoloured) |
| `mandatory` | Teal (`MANDATORY_HUE`, the old all-hands colour) |
| `shift` | A hue from `SHIFT_HUES` by the shift type's registry position: ember orange → lake blue → moss green → glåüm magenta → rose pink → gold (cycles). Currently: Decor orange, Setup blue, Teardown green, Service magenta |
| legacy `event_type` text (`'all_hands'`/`'camp_tending'`/`'service'`) | Old hardcoded styles kept as a fallback for undecorated rows |

Per-shift-type configurable colour is a future hook — a colour field on the Shift Types registry would override the palette index.

### Department Icons

The `icon` field on `departments` accepts:
- **Emoji** — rendered as text
- **Image path** (starts with `/`) — rendered as `<img>` everywhere: admin UI, profile, SignupSection, CommitmentsSection

---

## Accessibility

- `prefers-reduced-motion` — all animations and transitions disabled
- Focus rings — consistent purple outline on all interactive elements
- Clerk embed overrides — heading color + text-shadow reset inside `.clerk-scope` to preserve Clerk's own accessible contrast
