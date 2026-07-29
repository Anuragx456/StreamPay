# DESIGN.md — StreamPay (web)

> The visual system as it exists in the code today: **Warm Editorial**. A
> light/dark, token-driven design language that replaced the original neon
> cyan/violet/lime glassmorphism. Hierarchy comes from typography and whitespace,
> not from glow, gradients, or heavy shadows. Keep future edits on-system by
> obeying the philosophy and the SLOP BAN LIST below.

## Philosophy

- **Hierarchy from type + whitespace**, never from glows, gradients, or heavy
  shadows.
- **One warm accent (amber)** used sparingly for primary action + focus. **One
  secondary (teal)** used only for light-mode active/status states and event
  texture. In dark mode the active state is amber (teal is reserved for a few
  status/event dots).
- **Hairline 1px borders define surfaces.** Big shadows are forbidden except on
  the `<BrowserMockup>` element.
- **Sharp / minimal radii (2–6px).** Pills (999px) only for tiny controls (theme
  toggle, chips, status pills, dots).
- **Warm neutrals only** — cream / warm-black / taupe. No cool blue-grays.
- **Background is material, not flat:** a fixed paper-grain layer (light) / fine
  noise (dark) plus a faint amber gold-leaf bleed pinned bottom-right.
- **Two registers.** The **product** register (dense, functional) is the default
  for every dApp view. The **brand** register (oversized thin headline, marquee,
  browser mockup) appears only where it earns its place — the dashboard hero, the
  live-events marquee, and the Architecture mockup.

## Themes & tokens

Defined as CSS custom properties in `src/index.css`. `:root` is **light**;
`[data-theme="dark"]` is **dark**. `data-theme` is set on `<html>` by
`useTheme.ts` (and pre-paint by an inline script in `index.html` to avoid FOUC).
Tailwind maps every token to a utility color in `tailwind.config.js`, so
`bg-surface`, `text-muted`, `border-line`, etc. swap with the theme for free.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F4F1EA` | `#0C0B0A` | Page background (cream paper / warm black) |
| `--surface` | `#FBFAF6` | `#141210` | Cards, panels (opaque, no blur) |
| `--surface-2` | `#F1EDE4` | `#1B1815` | Inputs, insets, progress track |
| `--border` | `rgba(20,18,14,.12)` | `rgba(255,255,255,.10)` | Hairline borders / dividers |
| `--border-strong` | `rgba(20,18,14,.20)` | `rgba(255,255,255,.18)` | Hover border, scrollbar |
| `--text` | `#1A1815` | `#ECEAE3` | Primary text, numbers |
| `--text-muted` | `#5B564C` | `#A49D92` | Body / secondary text |
| `--text-faint` | `#857E72` | `#7A7369` | Labels, hints (large/label tier only) |
| `--accent` | `#F5A623` | `#F5B301` | Amber — primary action, focus ring, progress fill |
| `--accent-ink` | `#1A1815` | `#0C0B0A` | Text on the accent |
| `--accent-hover` | `#E0940F` | `#FFC426` | Primary-button hover |
| `--accent-2` | `#0E7C66` | `#35A08D` | Teal — light active state, status/event texture |
| `--active-nav` | `--accent-2` | `--accent` | Active nav text + underline |
| `--status-active` | `--accent-2` | `--accent` | Status pill: Active |
| `--status-paused` | `#9A6A0F` | `#D9A441` | Status pill: Paused (muted amber) |
| `--status-ended` | `--text-faint` | `--text-faint` | Status pill: Ended |
| `--danger` | `#A12A1F` | `#E88B7D` | Cancel / errors (warm oxblood) |
| `--danger-surface` | `rgba(161,42,31,.08)` | `rgba(232,139,125,.10)` | Danger-button hover fill |
| `--shadow-mockup` | `0 40px 80px -24px rgba(60,50,30,.25)` | `0 40px 80px -20px rgba(0,0,0,.7)` | **Only** shadow in the system |

Texture: `--bg-grain` (inline SVG fractalNoise) rendered by `body::before` at
`--grain-opacity` (.045 light / .05 dark) with `mix-blend-mode` multiply/overlay.
`--goldleaf` is a faint amber radial pinned bottom-right.

Semantic z-index scale (no arbitrary 999s): `--z-dropdown: 100`, `--z-sticky:
200`, `--z-drawer: 300`, `--z-modal-backdrop: 400`, `--z-modal: 500`, `--z-toast:
600`.

## Typography

Loaded from Google Fonts in `index.css`.

| Role | Family | Notes |
| --- | --- | --- |
| Display | **Hanken Grotesk** (300–600) | Headlines, KPI numbers, section titles. `letter-spacing -0.02em`, `line-height ~1.02`, `text-wrap: balance` on h1–h3. |
| Body | **Inter** (400–600) | UI + prose, `1.0625rem / 1.6`, muted color, capped at 52ch. |
| Serif | **Georgia** (fallback) | Brand wordmark lockup only (sidebar "StreamPay"). Never in UI/body. |
| Mono | **JetBrains Mono** (400–500) | Numbers, addresses, hashes, eyebrows, labels, status pills, config values. |

- Display headline: `clamp(2.25rem, 5.5vw, 3.75rem)` on the dashboard hero
  (product-register ceiling; the brand `.display` primitive goes to 5.25rem).
- Eyebrow / label: mono, uppercase, `letter-spacing 0.18em` (`.eyebrow`) /
  `0.14em` (`.label`), `0.7rem`, faint/muted.

## Radius, border & shadow rules

- **Radii:** `--radius-xs 2px`, `--radius-sm 4px` (buttons, inputs, small tiles),
  `--radius-md 6px` (cards, panels), `--radius-pill 999px` (chips, dots, toggle).
  No `lg/xl/2xl` exist in the Tailwind scale — they were deleted.
- **Borders:** every surface is a `--hairline` (1px `--border`). Hover raises to
  `--border-strong`; no lift, no glow. Dividers are hairlines too.
- **Shadows:** exactly one — `boxShadow.mockup` (`--shadow-mockup`), used only by
  `<BrowserMockup>`. No card shadows anywhere else.

## Components

Shared primitives in `src/components/` and the `@layer components` block of
`index.css`:

- **Buttons:** `.btn-primary` (amber fill, `accent-ink` text, radius-sm, weight
  600, hover darkens + trailing-icon nudges `translateX(2px)`), `.btn-ghost`
  (transparent + hairline, hover strengthens border), `.btn-danger` (transparent
  danger text, hover fills `--danger-surface`).
- **Cards:** `.card` / `.card-hover` — `--surface` + hairline + radius-md, no
  shadow, no blur. `StatCard`, `StreamCard`, panels all build on this.
- **Inputs:** `.input` — `--surface-2` + hairline + radius-sm; focus sets
  `border-color: --accent` + a 1px inset ring (no glow).
- **Chips / pills:** `.chip` — hairline, pill radius, mono uppercase tiny text.
  Used sparingly (wallet key, filters).
- **Status pills:** `StatusPill` / `.status-pill` — hairline-bordered, mono
  uppercase, **colored text + a tiny dot, never a filled background.** Active =
  teal(light)/amber(dark), Paused = muted amber, Ended = faint.
- **Progress:** `.progress-track` (`--surface-2` + hairline) + `.progress-fill`
  (solid `--accent`, no gradient). Animated with `transform: scaleX`
  (compositor-friendly, no layout thrash). `transform-origin: left`. The
  component passes the 0–1 ratio as an inline `transform: scaleX(...)`.
- **Sidebar / Topbar:** hairline dividers; active nav = `--active-nav` text + a
  1px underline (not a filled box). No blur on the topbar.
- **Tables:** hairline row dividers only; header = mono uppercase faint labels.
- **Modals:** `--surface` panel + hairline + a dim warm backdrop
  (`rgba(0,0,0,.5)`), no heavy blur.
- **Toasts:** `Toaster` — surface + hairline + a tiny accent **dot** + mono
  uppercase kind label. No side-stripe, no glow.
- **Skeleton:** token-driven sweep (`--surface-2` base, hairline-colored gradient
  sweep), reduced-motion aware.

### Brand-register pieces

- **`EventMarquee`** — infinite horizontal scroll of bordered event cards
  (`translateX` keyframes, pause on hover, reduced-motion off). Dashboard "Live
  activity".
- **`BrowserMockup`** — mac dots + mono URL pill + `--shadow-mockup`. The single
  place a big shadow is allowed. Used on Architecture.
- **Dashboard hero** — oversized thin headline + muted 52ch paragraph + amber CTA
  + plain-text secondary action. No glow, no gradient.

## Motion

- 150–250ms on interactive transitions (color/border only; layout props are not
  animated). Ease-out curves; no bounce/elastic.
- Marquee 40s linear; progress fill uses a `transform: scaleX` transition
  (ease-out-quart curve, compositor-friendly).
- Every animation has a `@media (prefers-reduced-motion: reduce)` off-switch
  (marquee, skeleton sweep, progress transition, smooth scroll).

## Accessibility

- Body/number text (`--text-muted`) clears WCAG AA (~6.4:1 light, ~7.4:1 dark).
  `accent-ink`-on-`accent` clears AA large + normal (~8.6:1 light, ~10.8:1 dark).
  `--text-faint` (~3.7–4.0:1) is reserved for large/label text only.
- Status never relies on color alone: every status/event carries a text label
  plus a dot.
- `:focus-visible` = 1px `--accent` outline, `offset 2px`, on all controls.
- `useTheme` supports light / dark / **system** (live `prefers-color-scheme`
  listener); right-click the toggle resets to system.

## SLOP BAN LIST (do not generate)

- Gradient text on headings or numbers (`background-clip: text` + gradient).
- Side-stripe / left-accent-border cards, list items, callouts, toasts.
- Generic "AI" purple/indigo/neon crypto palettes.
- Image-zoom-on-hover, parallax, bouncy spring / elastic animations.
- Ghost cards (surfaces with no clear border or purpose).
- Over-rounded everything — no 16–24px radii on buttons/cards (no `lg/xl/2xl`).
- Glassmorphism blur panels (the old `.glass` look is removed).
- Drop shadows on cards — use hairline borders instead. The only shadow is
  `--shadow-mockup` on `<BrowserMockup>`.
- Filled neon status backgrounds — status is hairline + colored text + dot.
- Decorative motion that doesn't convey state.
