# PRODUCT.md — StreamPay (web)

## Register

**Product.** This is application UI, not a marketing surface. Design serves the
task: an app shell (sidebar + topbar) wrapping a dashboard, a streams list, a
create-stream form, an activity feed, and an architecture explainer. Clarity,
state legibility, and trust beat visual spectacle.

## Platform

`web` — Vite + React 18 SPA, Tailwind, React Router, Zustand. No native target.
Runs fully in-memory in mock mode (no `VITE_CONTRACT_ID`) so every view is
demoable without a chain or wallet.

## Purpose

StreamPay is a Soroban (Stellar) recurring-payment / subscription-stream service.
A sender locks funds into an escrow contract; the contract disburses a fixed
amount to a recipient on a cadence (weekly, monthly, …) until an installment
count is reached or the sender cancels. Because Soroban contracts can't
self-execute, an off-chain watcher triggers `pay_next()` on schedule.

The web app is the control surface: create streams, monitor escrow balances and
progress, top up, pause/resume, cancel, and watch disbursement events land.

## Stage

Production build targeting a **hackathon on Stellar testnet**. This is not a
throwaway prototype — it should hold up to live demo and judging on testnet — but
it is early. Scope is the happy path plus honest state handling, not a hardened
v1.

## Target users

Mixed / general. Assume a crypto-literate but not expert audience: people
comfortable with a wallet and testnet, evaluating whether programmable recurring
payments feel trustworthy. Judges and demo viewers are a real secondary
audience, so first-glance credibility matters as much as depth.

## Brand personality

**Sleek, premium fintech.** Confident, quiet, and precise — money software you'd
trust with a standing order. The feeling to earn is *composure*: this thing
handles funds on a schedule and never makes you nervous about it. Restraint reads
as competence here.

## Anti-references

- **Generic crypto neon.** Saturated cyan/violet/lime gradients, ambient glow,
  "web3" shine. This is the single loudest thing to move away from.
- **Overdesigned / flashy.** Motion for its own sake, decorative glass
  everywhere, spectacle that competes with the numbers.

> **Known gap (act on this in later commands).** The current build contradicts
> the brand: it's dark glassmorphism with a `cyan → violet → lime` brand
> gradient (`gradient-text`, `bg-brand-gradient`), ambient radial glows, and
> frosted `.glass` panels as the default surface — i.e. exactly the "generic
> crypto neon" and "overdesigned" looks listed above. The confirmed direction is
> to **redirect**: keep a dark, confident base but strip the neon gradient/glow
> toward restrained, premium dark fintech. Color and depth should come from one
> disciplined accent and real hierarchy, not a tri-color gradient. `gradient-text`
> and `bg-brand-gradient` are the first things to retire.

## Strategic design principles

1. **Composure over spectacle.** Every screen should feel calm and in control.
   When in doubt, remove an effect rather than add one.
2. **The numbers are the interface.** Balances, amounts, progress, and next-due
   times are the product. Type and layout serve legibility of financial state;
   nothing decorative should compete with them.
3. **One disciplined accent.** Retire the tri-color gradient. A single restrained
   accent carries brand and intent (primary actions, active state); status uses a
   small, semantic set (active / paused / ended, success / warning / danger).
4. **State honesty.** This is escrow. Show loading, empty, in-flight, and
   error/edge states truthfully (e.g. insufficient deposit, fully paid, paused).
   A money app that hides its state loses trust instantly.
5. **Premium is in the details.** Spacing rhythm, typographic hierarchy, and
   precise interactive states — not glow. Monospace (JetBrains Mono) for
   addresses/amounts is a good instinct; keep it.

## Accessibility

Current stated bar: **looks-first, accessibility secondary for now** (demo
pressure). Documented as a deliberate deferral, not a standard.

Because StreamPay handles money, treat *readability* as the non-negotiable
subset: body/number text must stay legible against dark surfaces (aim ≥4.5:1),
and status must never rely on color alone. Full WCAG AA (keyboard nav, focus
states, reduced-motion) is a fast-follow — revisit with `/impeccable harden` or
`audit` before anything past the hackathon.
