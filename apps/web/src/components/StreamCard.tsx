import { useState } from 'react';
import type { Schedule } from '@/lib/types';
import { cadenceLabel, formatAmount, nextDueTs, progressPct, timeAgo, truncateKey } from '@/lib/format';
import { useStreamsStore } from '@/store/streams';
import { ProgressBar } from './ProgressBar';
import { Modal } from './Modal';
import { IconBolt, IconPause, IconPlay, IconPlus, IconTrash } from './icons';

interface StreamCardProps {
  schedule: Schedule;
}

const STATUS_STYLES: Record<Schedule['status'], string> = {
  Active: 'bg-brand-lime/15 text-brand-lime',
  Paused: 'bg-amber-400/15 text-amber-300',
  Ended: 'bg-slate-500/15 text-slate-400',
};

/**
 * A single subscription stream: progress, next-due, and the mutating actions
 * (top up / pay_next / pause·resume / cancel). Buttons disable while an action
 * for this schedule is in flight and reflect the on-chain guards (e.g. no
 * pay_next on a paused or fully-paid stream).
 */
export function StreamCard({ schedule: s }: StreamCardProps) {
  const pending = useStreamsStore((st) => st.pending[s.id] ?? false);
  const payNext = useStreamsStore((st) => st.payNext);
  const pause = useStreamsStore((st) => st.pause);
  const resume = useStreamsStore((st) => st.resume);
  const cancel = useStreamsStore((st) => st.cancel);
  const deposit = useStreamsStore((st) => st.deposit);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  const pct = progressPct(s.paidCount, s.totalCount);
  const due = nextDueTs(s.lastPaidTs, s.cadenceSecs, s.createdTs);
  const canPay = s.status === 'Active' && s.paidCount < s.totalCount && s.deposit >= s.amount;
  const runsLeft = Math.max(0, s.totalCount - s.paidCount);

  const submitTopUp = async () => {
    const amt = Number(topUpAmount);
    if (Number.isFinite(amt) && amt > 0) {
      await deposit(s.id, amt);
      setTopUpAmount('');
      setTopUpOpen(false);
    }
  };

  return (
    <div className="glass glass-hover flex flex-col p-5 animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-100">{s.label}</h3>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            to {truncateKey(s.recipient)}
          </p>
        </div>
        <span className={`chip ${STATUS_STYLES[s.status]}`}>{s.status}</span>
      </div>

      <div className="mb-4 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-100">{formatAmount(s.amount)}</span>
        <span className="text-sm text-slate-400">{s.asset}</span>
        <span className="text-xs text-slate-500">· {cadenceLabel(s.cadenceSecs)}</span>
      </div>

      <ProgressBar pct={pct} className="mb-2" />
      <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>
          {s.paidCount}/{s.totalCount} paid · {runsLeft} left
        </span>
        <span>
          {s.status === 'Ended'
            ? 'Complete'
            : s.status === 'Paused'
              ? 'Paused'
              : `Next ${timeAgo(due)}`}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
        <div>
          <div className="text-slate-500">Escrow left</div>
          <div className="font-semibold text-slate-200">{formatAmount(s.deposit, s.asset)}</div>
        </div>
        <div>
          <div className="text-slate-500">Committed</div>
          <div className="font-semibold text-slate-200">
            {formatAmount(s.amount * runsLeft, s.asset)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={!canPay || pending}
          onClick={() => payNext(s.id)}
          title={canPay ? 'Trigger pay_next()' : 'Not payable (status/deposit/timing)'}
        >
          <IconBolt className="h-4 w-4" /> Pay next
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={s.status === 'Ended' || pending}
          onClick={() => setTopUpOpen(true)}
        >
          <IconPlus className="h-4 w-4" /> Top up
        </button>
        {s.status === 'Active' && (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() => pause(s.id)}
            aria-label="Pause stream"
          >
            <IconPause className="h-4 w-4" />
          </button>
        )}
        {s.status === 'Paused' && (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() => resume(s.id)}
            aria-label="Resume stream"
          >
            <IconPlay className="h-4 w-4" />
          </button>
        )}
        {s.status !== 'Ended' && (
          <button
            type="button"
            className="btn-danger"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
            aria-label="Cancel stream"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Top-up modal */}
      <Modal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title={`Top up ${s.label}`}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setTopUpOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submitTopUp} disabled={pending}>
              Deposit
            </button>
          </>
        }
      >
        <label className="label" htmlFor={`topup-${s.id}`}>
          Amount ({s.asset})
        </label>
        <input
          id={`topup-${s.id}`}
          className="input font-mono"
          type="number"
          min="0"
          placeholder="0.00"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate-500">
          Adds to the escrow balance. Current: {formatAmount(s.deposit, s.asset)}.
        </p>
      </Modal>

      {/* Cancel confirm modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this stream?"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCancelOpen(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={async () => {
                await cancel(s.id);
                setCancelOpen(false);
              }}
            >
              Cancel & refund
            </button>
          </>
        }
      >
        <p>
          The remaining escrow of{' '}
          <span className="font-semibold text-slate-100">{formatAmount(s.deposit, s.asset)}</span>{' '}
          will be refunded to the sender and the stream marked <em>Ended</em>. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
