import { NETWORK, SOROBAN_RPC_URL } from '@/lib/constants';
import { useMockModeStore } from '@/store/mockMode';
import { BrowserMockup } from '@/components/BrowserMockup';
import { IconActivity, IconArchitecture, IconBolt, IconStreams, IconWallet } from '@/components/icons';

/**
 * Static explainer of how StreamPay fits together: the escrow contract, the
 * off-chain watcher that triggers pay_next() on a cadence, and the wallet that
 * signs mutating calls. Mirrors the README diagram so the demo is self-documenting.
 */

interface Piece {
  title: string;
  body: string;
  icon: JSX.Element;
}

const PIECES: Piece[] = [
  {
    title: 'Sender',
    body: 'Locks funds into the escrow and sets the recipient, per-installment amount, cadence, and installment count. Can top up or cancel at any time.',
    icon: <IconWallet className="h-5 w-5" />,
  },
  {
    title: 'Subscription contract (escrow)',
    body: 'Holds the deposit on-chain. pay_next() enforces the cadence timing, deposit sufficiency, and installment cap before disbursing to the recipient — the same guards mirrored in this UI.',
    icon: <IconStreams className="h-5 w-5" />,
  },
  {
    title: 'Off-chain watcher',
    body: 'Soroban contracts cannot self-execute. A Node cron polls due schedules and submits pay_next() on schedule, paying fees from a funded account.',
    icon: <IconActivity className="h-5 w-5" />,
  },
  {
    title: 'Recipient',
    body: 'Receives a fixed amount each cadence until the installment count is reached or the sender cancels and the remainder is refunded.',
    icon: <IconBolt className="h-5 w-5" />,
  },
];

const CONFIG = (isMock: boolean): { label: string; value: string }[] => [
  { label: 'Mode', value: isMock ? 'Mock (in-memory)' : 'Live contract' },
  { label: 'Network', value: NETWORK },
  { label: 'Soroban RPC', value: SOROBAN_RPC_URL },
];

export function Architecture() {
  const isMock = useMockModeStore((s) => s.isMock);

  return (
    <div className="space-y-10">
      <div className="border-b border-line pb-6">
        <span className="eyebrow text-faint">How it works</span>
        <h1 className="mt-3 font-display text-[clamp(1.875rem,4vw,2.5rem)] font-light leading-tight tracking-[-0.02em] text-ink">
          Architecture
        </h1>
        <p className="mt-3 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">
          A sender locks funds into an escrow contract that disburses a fixed amount to a recipient
          on a cadence. Because Soroban contracts cannot self-execute, an off-chain watcher triggers{' '}
          <code className="rounded-xs bg-surface2 px-1.5 py-0.5 font-mono text-[0.8em] text-ink">
            pay_next()
          </code>{' '}
          on schedule.
        </p>
      </div>

      {/* Flow diagram, shown inside a browser mockup — the one place a soft shadow is allowed. */}
      <section>
        <BrowserMockup url="streampay.app/flow">
          <div className="bg-surface p-6 sm:p-8">
            <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
              <FlowNode label="Sender" sub="deposit" />
              <FlowArrow label="deposit" />
              <FlowNode label="Escrow contract" sub="pay_next()" />
              <FlowArrow label="disburse" />
              <FlowNode label="Recipient" sub="receives" />
            </div>
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm text-muted">
                <IconActivity className="h-4 w-4 text-accent" />
                Off-chain watcher triggers
                <span className="font-mono text-xs text-ink">pay_next()</span> on a cron
              </div>
            </div>
          </div>
        </BrowserMockup>
      </section>

      {/* Pieces */}
      <section className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
        {PIECES.map((p) => (
          <div key={p.title} className="bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-sm border border-line text-muted">
                {p.icon}
              </span>
              <h2 className="text-[0.95rem] font-semibold text-ink">{p.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      {/* Runtime config */}
      <section className="card p-6">
        <div className="mb-5 flex items-center gap-2 border-b border-line pb-3">
          <IconArchitecture className="h-5 w-5 text-muted" />
          <h2 className="font-display text-xl font-light tracking-tight text-ink">
            Runtime configuration
          </h2>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          {CONFIG(isMock).map((c) => (
            <div key={c.label} className="bg-surface p-4">
              <dt className="eyebrow text-faint">{c.label}</dt>
              <dd className="mt-2 break-words font-mono text-sm text-ink">{c.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-faint">
          {isMock
            ? 'Running fully in-memory. Set VITE_CONTRACT_ID to point the app at a deployed Soroban contract.'
            : 'Connected to a deployed Soroban contract. Mutating calls are signed by the connected wallet.'}
        </p>
      </section>
    </div>
  );
}

function FlowNode({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex-1 rounded-sm border border-line bg-bg p-4 text-center">
      <div className="text-sm font-semibold text-ink">{label}</div>
      <div className="mt-1 font-mono text-xs text-muted">{sub}</div>
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center text-faint">
      <span className="hidden font-mono text-xs lg:block" aria-hidden="true">
        {label} →
      </span>
      <span className="font-mono text-xs lg:hidden" aria-hidden="true">
        ↓ {label}
      </span>
    </div>
  );
}
