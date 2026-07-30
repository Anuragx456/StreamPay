import { useState } from 'react';
import type { Schedule } from '@/lib/types';
import { cadenceLabel, formatAmount, nextDueTs, progressPct, timeAgo, truncateKey } from '@/lib/format';
import { useStreamsStore } from '@/store/streams';
import { useWalletStore } from '@/store/wallet';
import { ProgressBar } from './ProgressBar';
import { StatusPill } from './StatusPill';
import { Modal } from './Modal';
import { IconBolt, IconPause, IconPlay, IconPlus, IconTrash } from './icons';
import { TransactionFeedback } from './TransactionFeedback';

interface StreamCardProps {
  schedule: Schedule;
}

/**
 * A single subscription stream: progress, next-due, and the mutating actions
 * (top up / pay_next / pause·resume / cancel). Ownership-aware: cancel, pause,
 * resume, and top-up are only shown for the stream sender (matching the
 * contract's sender.require_auth() guards). Pay_next is permissionless and
 * always visible for Active due streams.
 *
 * Buttons disable while an action for this schedule is in flight and reflect
 * the on-chain guards (e.g. no pay_next on a paused or fully-paid stream).
 */
export function StreamCard({ schedule: s }: StreamCardProps) {
  const publicKey = useWalletStore((st) => st.publicKey);
  const pending = useStreamsStore((st) => st.pending[s.id] ?? false);
  const payNext = useStreamsStore((st) => st.payNext);
  const pause = useStreamsStore((st) => st.pause);
  const resume = useStreamsStore((st) => st.resume);
  const cancel = useStreamsStore((st) => st.cancel);
  const deposit = useStreamsStore((st) => st.deposit);
  const transaction = useStreamsStore((st) =>
    Object.entries(st.transactions)
      .filter(([key]) => key.startsWith(`${s.id}:`))
      .at(-1)?.[1],
  );

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  const isSender = publicKey === s.sender;
  const isRecipient = publicKey === s.recipient;
  const roleLabel = isSender ? 'Sender' : isRecipient ? 'Recipient' : null;

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
    <div className="card card-hover flex flex-col p-5 animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-body text-base font-semibold text-ink">{s.label}</h3>
          <p className="mt-0.5 font-mono text-xs text-faint">
            {isSender ? 'to' : 'from'}{' '}
            {truncateKey(isSender ? s.recipient : s.sender)}
            {roleLabel && (
              <span
                className="ml-1.5 inline-block rounded-sm px-1 py-px font-mono text-[0.6rem] uppercase tracking-wider"
                style={{ background: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--accent-2)' }}
                title={isSender ? 'You are the sender of this stream' : 'You are the recipient of this stream'}
              >
                {roleLabel}
              </span>
            )}
          </p>
        </div>
        <StatusPill status={s.status} />
      </div>

      <div className="mb-4 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold text-ink">{formatAmount(s.amount)}</span>
        <span className="text-sm text-muted">{s.asset}</span>
        <span className="text-xs text-faint">· {cadenceLabel(s.cadenceSecs)}</span>
      </div>

      <ProgressBar pct={pct} className="mb-2" />
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span className="font-mono">
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

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line text-xs">
        <div className="bg-surface-2 p-3">
          <div className="text-faint">Escrow left</div>
          <div className="mt-0.5 font-mono font-semibold text-ink">
            {formatAmount(s.deposit, s.asset)}
          </div>
        </div>
        <div className="bg-surface-2 p-3">
          <div className="text-faint">Committed</div>
          <div className="mt-0.5 font-mono font-semibold text-ink">
            {formatAmount(s.amount * runsLeft, s.asset)}
          </div>
        </div>
      </div>

      {/* Actions */}
      {isSender ? (
        <>
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
        </>
      ) : roleLabel ? (
        /* Recipient or other known role: only pay_next (permissionless), no owner controls */
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
        </div>
      ) : (
        /* No wallet connected or neither sender nor recipient: read-only */
        <div className="mt-2 text-center font-mono text-[0.6rem] uppercase tracking-widest text-faint">
          Read-only
        </div>
      )}
      <TransactionFeedback feedback={transaction} />

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
        <p className="mt-2 text-xs text-muted">
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
          <span className="font-mono font-semibold text-ink">{formatAmount(s.deposit, s.asset)}</span>{' '}
          will be refunded to the sender and the stream marked <em>Ended</em>. The on-chain record is
          preserved — cancellation is not deletion.
        </p>
      </Modal>
    </div>
  );
}
