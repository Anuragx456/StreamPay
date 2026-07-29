import { Link } from 'react-router-dom';
import { BrowserMockup } from '@/components/BrowserMockup';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconArrow, IconBolt, IconStreams, IconActivity, IconWallet } from '@/components/icons';

/**
 * Marketing surface (BRAND register): oversized thin headline, muted subcopy,
 * one amber CTA + a plain text link, a desaturated integration-logo row
 * (colorized in light / grayscale in dark via the theme class), a BrowserMockup
 * of the dashboard, and an infinite testimonial marquee. Standalone — it does
 * NOT wear the app shell (sidebar/topbar). Token-only: no new colors.
 */

// Monochrome partner lockups. Each renders in `currentColor` so it inherits the
// row's ink; the .logo-row class colorizes in light and desaturates in dark.
const LOGOS: { name: string; mark: JSX.Element }[] = [
  {
    name: 'Stellar',
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M4 15l16-7M4 12l16 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Soroban',
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6M9 15h6M12 9v6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Freighter',
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 12l18-8-8 18-2-8-8-2z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Lobstr',
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'USDC',
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5a2.5 2 0 015 0M9.5 14.5a2.5 2 0 005 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

const STEPS: { icon: JSX.Element; title: string; body: string }[] = [
  {
    icon: <IconWallet className="h-5 w-5" />,
    title: 'Fund the escrow',
    body: 'Lock a deposit and set the recipient, amount, cadence, and installment count in one signed transaction.',
  },
  {
    icon: <IconActivity className="h-5 w-5" />,
    title: 'The watcher ticks',
    body: 'An off-chain cron calls pay_next() on schedule. The contract enforces timing, balance, and the installment cap.',
  },
  {
    icon: <IconBolt className="h-5 w-5" />,
    title: 'Funds stream out',
    body: 'A fixed amount reaches the recipient every cadence until the plan completes or you cancel and reclaim the rest.',
  },
];

const TESTIMONIALS: { quote: string; who: string; role: string }[] = [
  { quote: 'Set a contractor retainer once and never touched it again. It just pays.', who: 'Mara V.', role: 'Studio lead' },
  { quote: 'The escrow balance and next-due time are right there. No spreadsheet, no anxiety.', who: 'Devin O.', role: 'Ops, DAO treasury' },
  { quote: 'Cancelled mid-plan and the remainder refunded to the cent. Exactly as promised.', who: 'Priya S.', role: 'Indie founder' },
  { quote: 'Recurring payouts on Stellar without writing a line of contract glue.', who: 'Tomas L.', role: 'Payments eng.' },
  { quote: 'It reads like money software should — quiet, precise, legible.', who: 'Aisha K.', role: 'Fintech PM' },
];

export function Landing() {
  return (
    <div className="min-h-screen">
      {/* Minimal brand nav — no app shell here. */}
      <header
        style={{ zIndex: 'var(--z-sticky)' }}
        className="sticky top-0 border-b border-line bg-bg"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link to="/landing" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-sm border border-lineStrong">
              <span className="font-serif text-base font-medium text-ink">S</span>
            </span>
            <span className="font-serif text-lg font-medium leading-none text-ink">StreamPay</span>
          </Link>
          <nav className="ml-auto flex items-center gap-5">
            <a
              href="#how"
              className="hidden text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline sm:inline"
            >
              How it works
            </a>
            <ThemeToggle />
            <Link to="/dashboard" className="btn-primary">
              Get started <IconArrow className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10">
          <div>
            <span className="eyebrow text-faint">Soroban · Stellar testnet</span>
            <h1 className="mt-5 font-display text-[clamp(2.75rem,7vw,5.25rem)] font-light leading-[1.02] tracking-[-0.02em] text-ink">
              Program money to stream itself.
            </h1>
            <p className="mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted">
              StreamPay locks funds into an on-chain escrow and disburses a fixed amount on your
              cadence — weekly, monthly, whatever the plan says — until it ends or you cancel.
              Composed on Stellar, triggered by an off-chain watcher.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link to="/dashboard" className="btn-primary">
                Get started <IconArrow className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Dashboard mockup — the one element permitted --shadow-mockup. */}
          <div className="lg:pl-4">
            <BrowserMockup url="streampay.app/dashboard">
              <MockDashboard />
            </BrowserMockup>
          </div>
        </section>

        {/* Integration logos — colorized (full ink) in light, grayscale in dark. */}
        <section className="border-y border-line py-8">
          <p className="eyebrow mb-5 text-center text-faint">Built on the Stellar stack</p>
          <div className="logo-row flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {LOGOS.map((l) => (
              <span key={l.name} className="flex items-center gap-2 text-ink">
                {l.mark}
                <span className="font-display text-base font-light tracking-tight">{l.name}</span>
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow text-faint">How it works</span>
            <h2 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-light leading-tight tracking-[-0.02em] text-ink">
              Three moving parts, one predictable outcome.
            </h2>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-surface p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-sm border border-line text-muted">
                    {s.icon}
                  </span>
                  <span className="font-mono text-xs text-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-xl font-light tracking-tight text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      {/* Testimonial marquee — infinite scroll, pauses on hover. */}
      <section className="border-t border-line py-16 sm:py-20">
        <div className="mx-auto mb-8 max-w-6xl px-4 sm:px-6">
          <span className="eyebrow text-faint">From the people who run it</span>
        </div>
        <div className="marquee-track group relative overflow-hidden">
          {/* edge fades */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
            style={{ background: 'linear-gradient(90deg, var(--bg), transparent)' }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
            style={{ background: 'linear-gradient(270deg, var(--bg), transparent)' }}
            aria-hidden="true"
          />
          <div className="marquee">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <figure
                key={i}
                className="mr-4 flex w-80 shrink-0 flex-col justify-between rounded-md border border-line bg-surface p-5"
              >
                <blockquote className="text-[0.95rem] leading-relaxed text-ink">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-pill bg-accent2" aria-hidden="true" />
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                    {t.who}
                  </span>
                  <span className="font-mono text-xs text-faint">· {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-[20ch] font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-ink">
            Set it once. Let it run.
          </h2>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/dashboard" className="btn-primary">
              Get started <IconArrow className="h-4 w-4" />
            </Link>
            <Link
              to="/architecture"
              className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Read the architecture
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <span className="font-mono text-xs text-faint">StreamPay · Soroban subscription streams</span>
          <span className="font-mono text-xs text-faint">Stellar testnet · demo build</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * A static, non-interactive miniature of the dashboard for the hero mockup.
 * Purely presentational — no store wiring — so the marketing page stays cheap
 * and never shows loading/empty states.
 */
function MockDashboard() {
  const stats = [
    { label: 'Active streams', value: '6' },
    { label: 'Total locked', value: '48.2K' },
    { label: 'Monthly out', value: '9.4K' },
  ];
  const rows = [
    { label: 'Payment', id: '#3', amt: '250.00' },
    { label: 'Deposit', id: '#1', amt: '1,000.00' },
    { label: 'Payment', id: '#5', amt: '75.00' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg font-light tracking-tight text-ink">Dashboard</span>
        <span className="eyebrow text-faint">Mock</span>
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-3">
            <div className="eyebrow text-[0.55rem] text-faint">{s.label}</div>
            <div className="mt-2 font-display text-xl font-light leading-none text-ink">
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-sm border border-line">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <IconStreams className="h-3.5 w-3.5 text-faint" />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
            Design retainer
          </span>
          <span className="ml-auto font-mono text-xs text-ink">250.00</span>
        </div>
        <div className="px-3 py-3">
          <div className="progress-track">
            <div className="progress-fill" style={{ transform: 'scaleX(0.58)' }} />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[0.6rem] text-faint">
            <span>7/12 paid</span>
            <span>next in 3d</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-line rounded-sm border border-line px-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <span className="h-1.5 w-1.5 rounded-pill bg-accent2" aria-hidden="true" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
              {r.label}
            </span>
            <span className="text-xs text-faint">{r.id}</span>
            <span className="ml-auto font-mono text-xs text-ink">{r.amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
