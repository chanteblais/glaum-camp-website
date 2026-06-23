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

The site shell has a layered background applied via the `.site-shell` class:
1. Base color: `#1A0A24` (ink)
2. Radial gradient: purple glow at top center fading to transparent
3. Linear gradient: subtle `#2A0A3A` mid-section
4. Fixed dot grid: gold dots at 7% opacity, 24px spacing (applied via `::before` pseudo-element)

```css
.site-shell {
  background-color: #1A0A24;
  background-image:
    radial-gradient(ellipse at center top, rgba(210,57,248,0.18) 0%, rgba(93,43,122,0.1) 50%, transparent 100%),
    linear-gradient(180deg, #1A0A24 0%, #2A0A3A 60%, #1A0A24 100%);
}
/* Fixed dot grid via ::before */
```

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

### Layout classes (profile page, defined inline via `<style>`)

| Class | Purpose |
|---|---|
| `.profile-main-grid` | Two-column responsive grid for profile page main content |
| `.profile-info-grid` | Info card grid within profile |
| `.profile-badge-row` | `1fr auto 1fr` grid to keep avatar centered with badge overlay |
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

| `event_type` | Color |
|---|---|
| `null` (general) | Purple |
| `'all_hands'` | Teal |
| `'camp_tending'` | Gold / amber |
| `'service'` | Purple / pink |

### Department Icons

The `icon` field on `departments` accepts:
- **Emoji** — rendered as text
- **Image path** (starts with `/`) — rendered as `<img>` everywhere: admin UI, profile, SignupSection, CommitmentsSection

---

## Accessibility

- `prefers-reduced-motion` — all animations and transitions disabled
- Focus rings — consistent purple outline on all interactive elements
- Clerk embed overrides — heading color + text-shadow reset inside `.clerk-scope` to preserve Clerk's own accessible contrast
