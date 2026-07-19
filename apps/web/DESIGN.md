# DESIGN.md — StreamPay (web)

> Visual system as it exists in the code today. This documents the **current**
> state, which is intentionally slated for redirection: PRODUCT.md confirms the
> brand should move away from "generic crypto neon" toward restrained premium
> dark fintech. Where the current system conflicts with that intent, it's flagged
> **�redirect**. Follows the design.md spec.

## Theme

Dark, single-mode (`<html class="dark">`, `color-scheme: dark`, `darkMode:
'class'` in Tailwind — no light theme). Dark glassmorphism: frosted translucent
panels floating over a near-black background with two ambient brand-colored
radial glows fixed behind the whole app.

**�redirect:** the glass-everywhere surface treatment and ambient glow are the
"overdesigned / flashy" anti-reference. Target: opaque, layered dark surfaces
with quiet borders; drop the fixed glow.

## Color

Defined in `tailwind.config.js` and `src/index.css`. Hex today (migrate to OKLCH
on redirect).

### Surfaces (ink)
| Token | Hex | Use |
| --- | --- | --- |
| `ink-900` | `#07070d` | Deepest — inputs, primary-button text |
| `ink-800` | `#0a0a12` | Body background, `theme-color` |
| `ink-700` | `#12121d` | Raised surface |
| `ink-600` | `#1a1a2b` | Scrollbar thumb / highest surface |

Translucent surfaces do most of the real work: `.glass` = `bg-white/5` +
`border-white/10` + `backdrop-blur-xl`; hover lifts to `white/[0.07]` and
`border-white/20`.

### Brand accents
| Token | Hex |
| --- | --- |
| `brand.cyan` | `#22d3ee` |
| `brand.violet` | `#8b5cf6` |
| `brand.lime` | `#a3e635` |

Combined into `bg-brand-gradient` (`linear-gradient(135deg, cyan 0%, violet 50%,
lime 100%)`), used for `.gradient-text`, `.btn-primary`, and the `shadow-glow`
(`0 0 40px -10px rgba(139,92,246,.5)`).

**�text/foreground:** slate ramp — `slate-100`/`200` for text, `slate-400`/`500`
for muted/labels.

### Status colors
- Active: `brand-lime/15` bg + `brand-lime` text
- Paused: `amber-400/15` bg + `amber-300` text
- Ended: `slate-500/15` bg + `slate-400` text
- Danger: `red-500/10` bg, `red-500/30` border, `red-300` text (`.btn-danger`)

**�redirect (color, the big one):** the cyan→violet→lime tri-color gradient and
`shadow-glow` are the core of "generic crypto neon." Collapse to **one**
disciplined accent for primary action + active state; keep status as a small
semantic set. Retire `.gradient-text` and `bg-brand-gradient` first.

## Typography

Loaded from Google Fonts in `index.css`.

- **Sans:** Inter (weights 400–800) — `font-sans`, all UI text.
- **Mono:** JetBrains Mono (400, 500) — `font-mono`, for addresses, amounts,
  tx-relevant values, and `pay_next()` code references. Keep this; it reads as
  precise/financial and supports the premium direction.

Scale in use: hero `text-3xl`→`sm:text-4xl` `font-extrabold`; section headings
`text-lg`/`text-2xl` `font-semibold`/`bold`; body `text-sm`; labels `text-xs`
`uppercase tracking-wide` (`.label`). No `clamp()` fluid scale yet.

## Components

Reusable UI in `src/components/`:

- **App shell:** `Sidebar` (static column desktop / off-canvas drawer mobile),
  `Topbar` (hamburger + wallet), `Toaster` (toast notifications).
- **Surfaces:** `.glass` panel is the base card; `StatCard` (KPI), `StreamCard`
  (per-stream: progress, next-due, actions + top-up/cancel modals),
  `EventRow` (activity feed row).
- **Primitives:** `Modal`, `ProgressBar`, `Skeleton` (+ `StatCardSkeleton`,
  `StreamCardSkeleton`), `EmptyState`, `icons.tsx` (inline SVG set).
- **Buttons:** `.btn` base → `.btn-primary` (gradient + glow **�redirect**),
  `.btn-ghost` (bordered translucent), `.btn-danger`.
- **Inputs:** `.input` (dark, violet focus ring), `.label`, `.chip` (status pills).

Rounding is generous and consistent: `rounded-xl` / `rounded-2xl`. Borders are
hairline `white/10`.

## Layout

- **Shell:** flex row — Sidebar + main column; main is `max-w-6xl` centered,
  padding `p-4 sm:p-6 lg:p-8`.
- **Grids:** stats `grid-cols-2 lg:grid-cols-4`; dashboard body `lg:grid-cols-3`
  (streams span 2, activity 1); stream/piece grids `sm:grid-cols-2`.
- **Spacing rhythm:** `space-y-6` between page sections; `gap-4`/`gap-6` in grids.
- **Responsive:** mobile-first; sidebar collapses to a drawer, grids collapse to
  single column.

## Motion

Minimal, defined in `tailwind.config.js`:
- `animate-fade-in` (0.3s ease-out, 4px rise) on cards like `StreamCard`.
- `animate-shimmer` (2s linear infinite) on skeleton loaders.
- Button micro-interactions: `active:scale-[0.98]`, `hover:brightness-110`,
  color/border transitions.

No `prefers-reduced-motion` guard yet, and no motion library. Fine for now;
add the reduced-motion alternative during `harden`/`audit`.

## Iconography

Inline SVG components in `src/components/icons.tsx` (`IconBolt`, `IconStreams`,
`IconActivity`, `IconWallet`, `IconArrow`, `IconArchitecture`, `IconPause`,
`IconPlay`, `IconPlus`, `IconTrash`, …). Stroke-style, sized via `h-*/w-*`,
colored by `currentColor` / accent classes.
