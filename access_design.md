# Access by AMS UI Design Guide

This document captures the current UI direction for Access by AMS so new pages, flows, and components can keep the same visual system. It is intentionally UI-only: layout, typography, color, components, responsive behavior, and interaction states.

## Design Intent

Access by AMS should feel like secure institutional software for serious evaluations. The UI is dark, calm, precise, and operational. It should communicate trust, reviewability, control, and technical competence without becoming loud or decorative.

The closest product references are Linear, Vercel, Warp, Tailscale, and Raycast, but the Access by AMS expression is darker, more restrained, and assessment-focused.

Use these keywords as the north star:

- Clarity
- Integrity
- Structure
- Reviewability
- Trust
- Precision

## Product Surfaces

The app currently has three related UI surfaces:

- Marketing pages: cinematic dark pages with fixed glass navigation, large gradient headings, product-console visuals, and premium glass cards.
- Admin pages: dense internal dashboards with tables, search, stats, filters, risk/status badges, and compact action buttons.
- Organization pages: operational workspace UI for contests, invites, questions, settings, and setup flows.

All three surfaces should share the same core tokens: black background, Geist typography, violet accent, translucent panels, thin borders, soft shadows, and compact controls.

## Technology Baseline

- Framework: Next.js App Router.
- Styling: Tailwind CSS plus global utility classes in `src/app/globals.css`.
- Icons: `lucide-react`.
- Fonts: Geist Sans for UI and JetBrains Mono for code, logs, metadata, and JSON-like surfaces.
- Logo: `/public/AMS_ACCESS.svg`, rendered through `AMSLogo`.

Prefer existing classes and patterns before adding new UI primitives.

## Theme

The default experience is dark. A light theme exists through CSS variables, but most current UI is composed for the dark theme.

Primary dark tokens:

- Page background: `#000000`.
- Main panel: `rgb(9 9 11)`, commonly `#09090B`.
- Secondary surface: `rgb(14 15 18)` or `rgba(255,255,255,0.025-0.055)`.
- Field surface: `rgba(18,18,22,0.82)` or `rgb(var(--ams-field))`.
- Text: white for headings, white at reduced opacity for body and metadata.
- Accent: violet, mainly `#8B5CF6`, with hover/deeper state `#7C3AED`.
- Success: emerald/green, used sparingly for live, saved, OK, accepted states.
- Warning: amber, used for pending or draft-like states.
- Error/destructive: red, used for errors and delete actions.

Avoid introducing a broad new palette. Teal and amber exist as secondary tokens, but violet is the signature accent.

## Color Usage

Use color with restraint:

- Headings: `text-white`, or a vertical white-to-zinc gradient on marketing hero titles.
- Body copy: `text-white/50` to `text-white/70`.
- Muted metadata: `text-white/30` to `text-white/45`.
- Borders: `border-white/10` as the default, increasing to `border-white/20` or `border-purple-300/30` on hover/active.
- Primary accent: violet surfaces should normally be translucent, such as `bg-purple-500/10` or `rgba(139,92,246,0.12)`.
- Full violet fills are reserved for important app actions such as "New contest", "Save", or active primary operations.
- White-filled buttons are the marketing primary CTA pattern.

Do not use bright saturated accent blocks as large backgrounds. Keep color mostly in borders, badges, focus rings, glows, icons, and small controls.

## Typography

Use Geist Sans everywhere except code, logs, payload previews, timestamps, IDs, and technical labels.

Marketing typography:

- Hero H1: very large, tight, premium. Current pattern uses `text-[2.2rem]` on mobile up to `lg:text-[4.85rem]`, `font-semibold`, `leading-[0.92]`, `tracking-tight`.
- Page hero H1: `text-4xl` to `md:text-7xl`, `font-semibold`, `leading-[1.05]`, gradient clipped text.
- Section H2: `text-2xl` to `md:text-6xl`, `font-semibold`, tight leading.
- Body: `text-sm` to `text-xl`, generous line height, muted white.

App and dashboard typography:

- Page title: `text-xl` to `text-2xl`, `font-semibold`, `tracking-tight`.
- Section label: small uppercase text with wide tracking.
- Table header: very small uppercase, `tracking-[0.16em]`.
- Card title: `text-sm` to `text-lg`, `font-semibold`.
- Form label: `text-xs`, medium weight, muted.

Use the global `.ams-label` class for tiny uppercase labels where possible.

## Layout Principles

Marketing pages:

- Use `max-w-6xl` for most content and `max-w-7xl` when a form or two-column surface needs more width.
- Hero sections are full viewport or near full viewport with `min-h-screen`.
- Place content over a black background with a subtle grid and violet radial glow.
- Use fixed top navigation at `top-4` or `top-6`, centered inside a `max-w-6xl` pill.
- Prefer asymmetric two-column layouts for endpoint pages: copy on the left, interactive panel or cards on the right.
- Use generous vertical spacing: `py-16`, `sm:py-24`, `md:py-28/32`.
- Separate major sections with thin `border-white/10` lines.

Admin and organization pages:

- Keep the interface dense, scannable, and operational.
- Use constrained content widths: `max-w-7xl` for dashboards, `max-w-4xl` for focused contest detail/edit flows.
- Use sidebars for persistent org navigation.
- Use cards for stats, tables, forms, empty states, and actionable rows.
- Tables should support horizontal scrolling with sensible `min-w` values.

## Backgrounds

Primary background style:

- Black base.
- Subtle fixed grid using thin white lines at low opacity.
- Soft violet radial glow behind hero or major panels.
- Optional slow breathing or grid drift animation for marketing hero.

Current global helpers:

- `.ams-grid`: page grid texture.
- `.ams-hero-grid`: animated hero grid using a pseudo-element.
- `.raycast-hero-bg`: soft violet radial hero glow with breathing animation.
- `.ams-noise`: subtle highlight/noise gradient.

Keep backgrounds subtle. The product should feel premium and quiet, not like a generic neon dashboard.

## Surfaces And Cards

The dominant surface language is translucent glass over black.

Default glass card:

- `glass-card`
- Soft translucent fill.
- `border: 1px solid rgba(255,255,255,0.08)`.
- Rounded corners around `16px` for marketing cards.
- Deep black shadow plus faint inner white highlight.
- Hover: slight border brightening, soft violet glow, and `translateY(-1px)`.

Compact operational cards:

- Use `rounded`, `rounded-lg`, or `rounded-[8px]`.
- Borders stay thin and subtle.
- Use less blur and fewer decorative gradients than marketing cards.

Special surfaces:

- `.ams-pricing-card`: compact 8px cards with gradient border pseudo-element.
- `.ams-trust-card`: restrained stat cards.
- `.ams-volume-modeler`: large pricing interaction panel.
- `.ams-contact-form`: form panel with glow, blur, and 8px radius.
- `.ams-foundation-card`: feature cards with mini mockups.
- `.ams-embedded-screen`: nested console/product screen panels.

Do not nest decorative cards inside decorative cards unless the inner element represents a real embedded screen, code panel, table, or form control.

## Radius Scale

Use radius intentionally:

- Marketing nav and primary CTAs: full pill, `rounded-full`.
- Marketing cards: `rounded-2xl` or current `glass-card` default, but many newer cards use `rounded-[8px]`.
- App/admin controls: `rounded`, `rounded-lg`, `rounded-xl`.
- Tables and forms: usually `rounded-[8px]`, `rounded-lg`, or `rounded-xl`.
- Tiny pills and badges: `rounded-full` or compact `rounded`.

For new app/dashboard UI, prefer `8px` unless matching an existing larger card.

## Buttons

Marketing primary CTA:

- White fill.
- Black text.
- Pill shape.
- Medium/semi-bold label.
- Hover changes to violet fill with white text.
- Often includes `ArrowRight`.
- Height around `44px` to `52px`.

Marketing secondary CTA:

- Transparent or `bg-white/5`.
- Thin white border.
- White text around 70-80 percent opacity.
- Backdrop blur.
- Hover brightens border/background and text.

App primary action:

- Violet fill `rgb(139,92,246)`.
- White text.
- `rounded-lg`.
- Used for save, create, invite, and new contest actions.
- Hover deepens to `rgb(124,58,237)`.

App secondary action:

- Transparent or white at 3-4 percent opacity.
- `border-white/10`.
- Muted white text.
- Hover border shifts toward violet or white.

Destructive action:

- Red text and border.
- Use red fill only for alerts, not normal destructive buttons.

Icon usage:

- Use `lucide-react` icons.
- Buttons should include icons for tool-like actions such as refresh, search, sign out, save, delete, open, invite, and new.
- Icon-only buttons need accessible labels.

## Navigation

Marketing header:

- Fixed at top.
- Centered pill container, `h-14`, `max-w-6xl`.
- Background: `#09090B` at about 80 percent opacity.
- Border: `white/10`.
- Backdrop blur: strong, `backdrop-blur-2xl`.
- Logo left, nav center, CTA/search/mobile menu right.
- Desktop nav uses small text, medium weight, `text-white/56`, hover to white.

Mobile navigation:

- Hamburger button is a small round glass icon button.
- Backdrop uses `bg-black/60` and blur.
- Menu panel is fixed below the header, centered or right-aligned on wider mobile.
- Panel background is nearly opaque `#09090B`.
- Nav items are a two-column grid with icons and arrow indicators.
- Opening and closing use opacity, scale, and translate transitions.
- Body scroll is locked while open.

Internal org navigation:

- Sidebar is 224px wide (`w-56`).
- Dark translucent background with thin right border.
- Active item uses violet translucent fill and violet icon.
- Sign out stays muted until hover, then turns red.

## Forms

Use the existing `.glass-input`, `.ams-contact-field`, and `.ams-contact-select` styles.

Input style:

- Full width.
- Dark translucent field background.
- Thin white border.
- Muted placeholder.
- 8-10px radius.
- Focus uses violet border and low-opacity violet ring.
- Text stays white.

Labels:

- Small, muted, medium weight.
- Place labels above fields with 6-8px spacing.

Textarea:

- Same field style.
- Use `resize-y` when content can grow.
- Code areas should use monospace, blacker background, and violet caret.

Select/dropdown:

- Prefer custom dark select surfaces where possible.
- Dropdown menu uses dark glass, thin violet border, and small rounded options.
- Selected option can show a small violet or purple dot.

Validation and status:

- Error block: red translucent fill, red text, compact radius.
- Success block: green translucent fill, green text.
- Keep messages short and operational.

## Tables

Tables are used for admin sessions, invites, and pricing comparison.

Pattern:

- Wrap in `glass-card` or a specialized matrix card.
- Use horizontal overflow for dense tables.
- Header row has subtle translucent background.
- Header text is uppercase, small, and widely tracked.
- Row separators use `border-white/10` or lower.
- Body text is mostly `text-white/60`, with key identifiers in white.
- Row hover can add a very subtle white overlay.
- Action cells use compact bordered buttons with icons.

Tables should feel like operational evidence surfaces, not spreadsheets with heavy grid lines.

## Badges And Status

Use small rounded badges with translucent backgrounds and tinted borders.

Status tones:

- Active/accepted/saved/OK/live: green or emerald.
- Scheduled/fit/ready/violet-highlighted: violet.
- Ended/inactive/muted: slate/zinc.
- Draft/pending/retry: amber.
- Error/destructive: red.

Badges should be compact:

- `px-2 py-0.5`
- `text-xs`
- `font-medium`
- Optional thin border.

For technical log states, use mono or uppercase tracking.

## Empty, Loading, And Error States

Loading:

- Use `.ams-skeleton` shimmer for cards, table rows, and page placeholders.
- For blocking loads, use a small spinner with `border-white/10` and `border-t-purple-500`.

Empty states:

- Centered content.
- Dashed or faint border.
- Minimal icon in muted zinc.
- Short title and one muted line.
- Add a primary action only when the next step is obvious.

Errors:

- Use red translucent panel.
- Keep copy concise.
- Retry buttons use white fill in global errors or normal secondary app button style in dashboards.

## Motion

Motion should be subtle and compositor-friendly.

Current motion language:

- Fade in up for section reveals.
- Small `translateY(-1px)` hover lifts.
- Active controls scale to about `0.97`.
- Slow hero grid drift.
- Soft hero glow breathing.
- Skeleton shimmer.
- Pulsing status rings for live/ready indicators.
- Typing animation in terminal-like mockups.
- Spotlight cards update CSS variables in `requestAnimationFrame`.

Respect `prefers-reduced-motion`. The global CSS already disables key animations and transitions for reduced motion users.

Avoid large bouncing, spinning, or playful motion. This product is serious, not whimsical.

## Product Visuals

Marketing pages rely on product-like visuals rather than generic illustrations.

Use:

- Console windows.
- Session shell mockups.
- Timeline/event rows.
- Platform cards for Windows, macOS, Linux.
- JSON payload previews.
- Code/config tabs.
- Review packet and reviewer workflow panels.
- Tiny status indicators, progress lines, and trace rows.

Product visuals should look like real software surfaces, even when simplified. They should reinforce evaluation, evidence, desktop control, and reviewer context.

## Iconography

Use `lucide-react` icons consistently.

Common icon meanings:

- `ArrowRight` / `ArrowUpRight`: navigation and CTA movement.
- `Search`: command menu or search input.
- `X`: close, clear, remove.
- `RefreshCcw`: refresh/retry.
- `Plus`: create/add.
- `Save`: save.
- `Trash2`: delete.
- `Mail` / `UserPlus`: invite/contact.
- `Monitor`: desktop shell.
- `ShieldCheck`: security/evidence.
- `Building2`: organization.
- `CalendarDays`, `Trophy`, `Users`: contest dashboard stats.

Icons should generally be 14-20px. Keep them muted unless the action or status requires emphasis.

## Responsive Behavior

Marketing:

- Header nav hides on mobile and tablet; mobile nav appears until `lg`.
- Hero CTAs stack on mobile and sit inline from `md`.
- Large visuals simplify on mobile. The hero console has a mobile-specific single-column version.
- Dense grids collapse to one or two columns before becoming four columns at desktop.
- Endpoint pages move from two columns to single column on small screens.

Admin/org:

- Dashboards should remain usable at narrower widths, but existing internal pages are more desktop-oriented.
- Tables need `overflow-x-auto`.
- Cards and stat grids should collapse when new responsive work is added.

Always check that button text, table content, badges, and cards do not overflow on mobile.

## Accessibility

Maintain:

- Semantic buttons and links.
- `aria-label` for icon-only buttons.
- `aria-expanded`, `aria-controls`, and `aria-hidden` for menus.
- `role="dialog"` and `aria-modal="true"` for modals.
- `role="listbox"` and `role="option"` for custom selects.
- Visible focus states using violet/white outlines or rings.
- Escape key handling for overlays and menus.
- Scroll locking for mobile menu overlays.

Color contrast should remain strong. Muted text is acceptable for metadata, but core instructions, labels, and actions must stay readable.

## Content Style In UI

Copy should be short, confident, and operational.

Good patterns:

- "Controlled Round"
- "Session Context"
- "Review trace"
- "Evidence captured"
- "Operational guarantees for live rounds."
- "Manage contests and invitations"
- "Invite candidates"

Avoid:

- Marketing fluff.
- Overexplaining features inside the UI.
- Long paragraphs inside cards.
- Cute language.
- Security claims that the product does not visibly support.

## Page Patterns

### Marketing Landing

Use a full-viewport dark hero with:

- Fixed pill header.
- Large centered gradient H1.
- Short muted supporting copy.
- Primary and secondary CTAs.
- Large console/product visual below CTAs.
- Subtle grid and violet radial glow.

Below the hero:

- Use section labels.
- Use large tight headings.
- Pair copy with product-like visuals.
- Use cards sparingly and give each section a distinct composition.

### Marketing Endpoint Page

Use:

- Same fixed header.
- Full-height dark section.
- Left column with eyebrow chip, gradient H1, supporting copy, and CTAs.
- Right column with cards, form, JSON preview, or product panel.

Endpoint pages should not feel like bare static documents. They should still carry the software/product visual language.

### Pricing

Use:

- Enterprise-oriented hero.
- Pricing philosophy panel.
- Volume modeler with slider.
- Four plan cards.
- Trust/SLA cards.
- Dense comparison matrix.

The pricing page should feel consultative and operational, not consumer SaaS.

### Contact

Use:

- Left category selector cards.
- Right contact form.
- Adjacent payload/status preview to reinforce technical credibility.
- Direct email links in a compact panel.

### Admin Dashboard

Use:

- Compact top header with logo, title, subtitle, refresh and sign out.
- Stat cards.
- Navigation cards for major admin areas.
- Search input with leading search icon and clear button.
- Glass table for sessions.
- Compact pagination.

### Organization Dashboard

Use:

- Left sidebar.
- Header with page title, subtitle, and primary action.
- Stat cards.
- Contest rows as clickable glass cards.
- Empty state with direct CTA.

### Contest Detail

Use:

- Focused `max-w-4xl` page.
- Back link.
- Contest title, description, date range, and status badge.
- Segmented tabs for Questions, Invites, and Settings.
- Forms in glass or violet-tinted cards.
- Code tabs and code areas for starter code.
- Destructive actions separated visually.

## Implementation Checklist

Before shipping a new UI change:

- Uses Geist Sans and JetBrains Mono appropriately.
- Uses existing AMS CSS variables/classes where practical.
- Keeps the dark institutional tone.
- Uses violet as the primary accent.
- Uses thin borders and translucent dark surfaces.
- Has hover, active, focus, disabled, loading, empty, and error states where relevant.
- Uses `lucide-react` icons for tool actions.
- Works on mobile without text overflow.
- Keeps motion subtle and respects reduced motion.
- Avoids one-off colors, decorative clutter, and unrelated illustration styles.

## Source Files To Follow

Use these files as the strongest current references:

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/app/layout.tsx`
- `src/app/(marketing)/page.tsx`
- `src/components/MarketingEndpointPage.tsx`
- `src/components/MobileNav.tsx`
- `src/components/CommandMenu.tsx`
- `src/components/PricingVolumeModeler.tsx`
- `src/app/(marketing)/contact/page.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/app/(org)/org/dashboard/page.tsx`
- `src/app/(org)/org/contests/[id]/page.tsx`
- `docs/product/brand.md`

