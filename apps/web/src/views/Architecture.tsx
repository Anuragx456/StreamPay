import { IS_MOCK } from '@/lib/contract';
import { NETWORK, SOROBAN_RPC_URL } from '@/lib/constants';
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
  accent: string;
}

const PIECES: Piece[] = [
  {
    title: 'Sender',
    body: 'Locks funds into the escrow and sets the recipient, per-installment amount, cadence, and installment count. Can top up or cancel at any time.',
    icon: <IconWallet className="h-5 w-5" />,
    accent: 'text-brand-cyan',
  },
  {
    title: 'Subscription contract (escrow)',
    body: 'Holds the deposit on-chain. pay_next() enforces the cadence timing, deposit sufficiency, and installment cap before disbursing to the recipient — the same guards mirrored in this UI.',
    icon: <IconStreams className="h-5 w-5" />,
    accent: 'text-brand-violet',
  },
  {
    title: 'Off-chain watcher',
    body: 'Soroban contracts cannot self-execute. A Node cron polls due schedules and submits pay_next() on schedule, paying fees from a funded account.',
    icon: <IconActivity className="h-5 w-5" />,
    accent: 'text-brand-lime',
  },
  {
    title: 'Recipient',
    body: 'Receives a fixed amount each cadence until the installment count is reached or the sender cancels and the remainder is refunded.',
    icon: <IconBolt className="h-5 w-5" />,
    accent: 'text-brand-cyan',
  },
];

const CONFIG: { label: string; value: string }[] = [
  { label: 'Mode', value: IS_MOCK ? 'Mock (in-memory)' : 'Live contract' },
  { label: 'Network', value: NETWORK },
  { label: 'Soroban RPC', value: SOROBAN_RPC_URL },
];

export function Architecture() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Architecture</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          A sender locks funds into an escrow contract that disburses a fixed amount to a recipient
          on a cadence. Because Soroban contracts cannot self-execute, an off-chain watcher triggers{' '}
          <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">pay_next()</code> on
          schedule.
        </p>
      </div>

      {/* Flow diagram */}
      <section className="glass p-6">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <FlowNode label="Sender" sub="deposit" accent="text-brand-cyan" />
          <FlowArrow label="deposit" />
          <FlowNode label="Escrow contract" sub="pay_next()" accent="text-brand-violet" />
          <FlowArrow label="disburse" />
          <FlowNode label="Recipient" sub="receives" accent="text-brand-cyan" />
        </div>
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <IconActivity className="h-4 w-4 text-brand-lime" />
            Off-chain watcher triggers <span className="font-mono text-xs">pay_next()</span> on a cron
          </div>
        </div>
      </section>

      {/* Pieces */}
      <section className="grid gap-4 sm:grid-cols-2">
        {PIECES.map((p) => (
          <div key={p.title} className="glass p-5">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ${p.accent}`}>
                {p.icon}
              </span>
              <h2 className="text-base font-semibold text-slate-100">{p.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.body}</p>
          </div>
        ))}
      </section>

      {/* Runtime config */}
      <section className="glass p-6">
        <div className="mb-4 flex items-center gap-2">
          <IconArchitecture className="h-5 w-5 text-brand-violet" />
          <h2 className="text-lg font-semibold text-slate-100">Runtime configuration</h2>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          {CONFIG.map((c) => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{c.label}</dt>
              <dd className="mt-1 break-words font-mono text-sm text-slate-200">{c.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          {IS_MOCK
            ? 'Running fully in-memory. Set VITE_CONTRACT_ID to point the app at a deployed Soroban contract.'
            : 'Connected to a deployed Soroban contract. Mutating calls are signed by the connected wallet.'}
        </p>
      </section>
    </div>
  );
}

function FlowNode({ label, sub, accent }: { label: string; sub: string; accent: string }) {
  return (
    <div className="glass flex-1 p-4 text-center">
      <div className={`text-sm font-semibold ${accent}`}>{label}</div>
      <div className="mt-1 font-mono text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center text-slate-500">
      <span className="hidden text-xs lg:block" aria-hidden="true">
        {label} →
      </span>
      <span className="text-xs lg:hidden" aria-hidden="true">
        ↓ {label}
      </span>
    </div>
  );
}
