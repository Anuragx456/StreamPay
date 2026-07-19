import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStreamsStore } from '@/store/streams';
import { useWalletStore } from '@/store/wallet';
import { ASSETS, CADENCES } from '@/lib/constants';
import { formatAmount } from '@/lib/format';
import { toast } from '@/store/toast';
import { IconBolt, IconWallet } from '@/components/icons';

/** A Stellar public key is a 56-char base32 string starting with G. */
const PUBKEY_RE = /^G[A-Z2-7]{55}$/;

/** Default cadence for the form: Weekly if present, else the first preset. */
const DEFAULT_CADENCE_SECS =
  (CADENCES.find((c) => c.secs === 604800) ?? CADENCES[0])?.secs ?? 604800;

/**
 * Form to create a new stream. Validates the recipient key, per-installment
 * amount, cadence, and installment count client-side (mirroring the contract's
 * guards) and surfaces a live cost summary. Requires a connected wallet, since
 * the connected key becomes the escrow's sender.
 */
export function Create() {
  const navigate = useNavigate();
  const create = useStreamsStore((s) => s.create);
  const publicKey = useWalletStore((s) => s.publicKey);

  const [label, setLabel] = useState('');
  const [recipient, setRecipient] = useState('');
  const [asset, setAsset] = useState<string>(ASSETS[0]);
  const [amount, setAmount] = useState('');
  const [cadenceSecs, setCadenceSecs] = useState(DEFAULT_CADENCE_SECS);
  const [totalCount, setTotalCount] = useState('12');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountNum = Number(amount);
  const countNum = Number(totalCount);
  const depositNum = Number(initialDeposit);

  const totalCommitment = useMemo(
    () => (Number.isFinite(amountNum) && Number.isFinite(countNum) ? amountNum * countNum : 0),
    [amountNum, countNum],
  );
  const runsFunded = useMemo(
    () => (amountNum > 0 && Number.isFinite(depositNum) ? Math.floor(depositNum / amountNum) : 0),
    [amountNum, depositNum],
  );

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!recipient.trim()) e.recipient = 'Recipient is required.';
    else if (!PUBKEY_RE.test(recipient.trim()))
      e.recipient = 'Not a valid Stellar public key (G… 56 chars).';
    if (!(amountNum > 0)) e.amount = 'Amount must be greater than 0.';
    if (!(Number.isInteger(countNum) && countNum > 0))
      e.totalCount = 'Installments must be a whole number ≥ 1.';
    if (!(depositNum >= 0) || !Number.isFinite(depositNum))
      e.initialDeposit = 'Deposit cannot be negative.';
    return e;
  }, [recipient, amountNum, countNum, depositNum]);

  const valid = Object.keys(errors).length === 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!publicKey) {
      toast.error('Connect a wallet', 'A connected wallet funds the escrow as the sender.');
      return;
    }
    if (!valid) {
      toast.error('Check the form', 'Some fields need attention.');
      return;
    }
    setSubmitting(true);
    const id = await create(
      {
        recipient: recipient.trim(),
        label: label.trim(),
        amount: amountNum,
        asset,
        cadenceSecs,
        totalCount: countNum,
        initialDeposit: depositNum || 0,
      },
      publicKey,
    );
    setSubmitting(false);
    if (id) navigate('/streams');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Create a stream</h1>
        <p className="mt-1 text-sm text-slate-400">
          Lock funds into an escrow that disburses a fixed amount on your cadence until the plan
          ends or you cancel.
        </p>
      </div>

      {!publicKey && (
        <div className="glass flex items-center gap-3 border-amber-400/30 bg-amber-400/5 p-4">
          <IconWallet className="h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-200/90">
            Connect a wallet first — the connected key becomes the escrow sender.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="glass space-y-5 p-6">
        <div>
          <label className="label" htmlFor="label">
            Label
          </label>
          <input
            id="label"
            className="input"
            placeholder="e.g. Design contractor retainer"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Optional. Shown in the UI, not stored on-chain.</p>
        </div>

        <div>
          <label className="label" htmlFor="recipient">
            Recipient public key
          </label>
          <input
            id="recipient"
            className="input font-mono"
            placeholder="G…"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            aria-invalid={!!errors.recipient}
          />
          {errors.recipient && <p className="mt-1 text-xs text-red-300">{errors.recipient}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="amount">
              Amount per installment
            </label>
            <input
              id="amount"
              className="input font-mono"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-300">{errors.amount}</p>}
          </div>

          <div>
            <label className="label" htmlFor="asset">
              Asset
            </label>
            <select
              id="asset"
              className="input"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            >
              {ASSETS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cadence">
              Cadence
            </label>
            <select
              id="cadence"
              className="input"
              value={cadenceSecs}
              onChange={(e) => setCadenceSecs(Number(e.target.value))}
            >
              {CADENCES.map((c) => (
                <option key={c.secs} value={c.secs}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="count">
              Total installments
            </label>
            <input
              id="count"
              className="input font-mono"
              type="number"
              min="1"
              step="1"
              value={totalCount}
              onChange={(e) => setTotalCount(e.target.value)}
              aria-invalid={!!errors.totalCount}
            />
            {errors.totalCount && <p className="mt-1 text-xs text-red-300">{errors.totalCount}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="deposit">
            Initial deposit ({asset})
          </label>
          <input
            id="deposit"
            className="input font-mono"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(e.target.value)}
            aria-invalid={!!errors.initialDeposit}
          />
          {errors.initialDeposit ? (
            <p className="mt-1 text-xs text-red-300">{errors.initialDeposit}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Funds the escrow now. You can top up later.
            </p>
          )}
        </div>

        {/* Cost summary */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total commitment</span>
            <span className="font-mono text-slate-100">
              {formatAmount(totalCommitment, asset)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-slate-400">Runs funded by deposit</span>
            <span className="font-mono text-slate-100">
              {runsFunded}
              {Number.isFinite(countNum) && countNum > 0 ? ` / ${countNum}` : ''}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !valid || !publicKey}
          >
            <IconBolt className="h-4 w-4" />
            {submitting ? 'Creating…' : 'Create stream'}
          </button>
        </div>
      </form>
    </div>
  );
}
