// Level 1 — send a native XLM payment on Stellar Testnet.
//
// This view is the core "wallet → balance → transaction" flow. It is fully real
// against testnet (Horizon) and independent of the Soroban subscription
// contract, so it works whether or not VITE_CONTRACT_ID is set. On success it
// surfaces the transaction hash, a stellar.expert explorer link, and refreshes
// the connected wallet's balance.

import { useMemo, useState } from 'react';
import { useWalletStore } from '@/store/wallet';
import {
  isValidPublicKey,
  sendXlmPayment,
  fundWithFriendbot,
  explorerTxUrl,
} from '@/lib/stellar';
import { IS_TESTNET } from '@/lib/constants';
import { formatAmount, truncateKey } from '@/lib/format';
import { toast } from '@/store/toast';
import { IconSend, IconWallet, IconCheck, IconExternal } from '@/components/icons';
import { errorMessage } from '@/lib/errors';

/** Outcome of the most recent send, shown in the feedback panel. */
type SendResult =
  | { state: 'success'; hash: string; amount: number; destination: string }
  | { state: 'error'; message: string };

export function Send() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const balance = useWalletStore((s) => s.balance);
  const funded = useWalletStore((s) => s.funded);
  const refreshBalance = useWalletStore((s) => s.refreshBalance);

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [funding, setFunding] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const amountNum = Number(amount);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!destination.trim()) e.destination = 'Recipient is required.';
    else if (!isValidPublicKey(destination))
      e.destination = 'Not a valid Stellar public key (G… 56 chars).';
    if (!(amountNum > 0)) e.amount = 'Amount must be greater than 0.';
    else if (balance !== null && funded && amountNum > balance)
      e.amount = 'Amount exceeds your available balance.';
    return e;
  }, [destination, amountNum, balance, funded]);

  const valid = Object.keys(errors).length === 0;

  const handleFund = async () => {
    if (!publicKey) return;
    setFunding(true);
    try {
      await fundWithFriendbot(publicKey);
      await refreshBalance();
      toast.success('Account funded', 'Friendbot added testnet XLM.');
    } catch (err) {
      toast.error('Funding failed', err instanceof Error ? err.message : String(err));
    } finally {
      setFunding(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!publicKey) {
      toast.error('Connect a wallet', 'Connect a wallet to send XLM.');
      return;
    }
    if (!valid) {
      toast.error('Check the form', 'Some fields need attention.');
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const { hash } = await sendXlmPayment({
        source: publicKey,
        destination: destination.trim(),
        amount: amountNum,
      });
      setResult({ state: 'success', hash, amount: amountNum, destination: destination.trim() });
      toast.success('Payment sent', `Tx ${truncateKey(hash, 6, 6)}`);
      setAmount('');
      void refreshBalance();
    } catch (err) {
      const message = errorMessage(err);
      setResult({ state: 'error', message });
      toast.error('Payment failed', message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-line pb-6">
        <span className="eyebrow text-faint">Testnet payment</span>
        <h1 className="mt-3 font-display text-[clamp(1.875rem,4vw,2.5rem)] font-light leading-tight tracking-[-0.02em] text-ink">
          Send XLM
        </h1>
        <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted">
          Send a native XLM payment on the Stellar test network. Signed by your connected wallet,
          submitted through Horizon, with the transaction hash returned on success.
        </p>
      </div>

      {!publicKey ? (
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface2 p-4">
          <IconWallet className="h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-muted">
            Connect a wallet first — use the “Connect wallet” button in the top bar.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface2 p-4">
          <div className="text-sm">
            <div className="text-faint">Connected</div>
            <div className="font-mono text-ink" title={publicKey}>
              {truncateKey(publicKey, 6, 6)}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-faint">Balance</div>
            <div className="font-mono text-ink">
              {balance === null ? '—' : funded ? formatAmount(balance, 'XLM') : 'Unfunded'}
            </div>
          </div>
          {IS_TESTNET && (balance === null || !funded || (balance ?? 0) < 1) && (
            <button
              type="button"
              onClick={() => void handleFund()}
              disabled={funding}
              className="btn-ghost disabled:opacity-50"
            >
              {funding ? 'Funding…' : 'Fund with Friendbot'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6 p-6">
        <div>
          <label className="label" htmlFor="destination">
            Recipient public key
          </label>
          <input
            id="destination"
            className="input font-mono"
            placeholder="G…"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            aria-invalid={!!errors.destination}
          />
          {errors.destination && <p className="mt-1 text-xs text-danger">{errors.destination}</p>}
        </div>

        <div>
          <label className="label" htmlFor="send-amount">
            Amount (XLM)
          </label>
          <input
            id="send-amount"
            className="input font-mono"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!!errors.amount}
          />
          {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount}</p>}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary disabled:opacity-50"
            disabled={sending || !valid || !publicKey}
          >
            <IconSend className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send payment'}
          </button>
        </div>
      </form>

      {result && (
        <div
          className={`rounded-md border p-5 ${
            result.state === 'success' ? 'border-line bg-surface2' : 'border-danger/40 bg-surface2'
          }`}
        >
          {result.state === 'success' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-ink">
                <IconCheck className="h-5 w-5 text-accent2" />
                <span className="font-medium">Payment confirmed</span>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Amount</dt>
                  <dd className="font-mono text-ink">{formatAmount(result.amount, 'XLM')}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">To</dt>
                  <dd className="font-mono text-ink" title={result.destination}>
                    {truncateKey(result.destination, 6, 6)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Transaction hash</dt>
                  <dd className="font-mono text-ink" title={result.hash}>
                    {truncateKey(result.hash, 8, 8)}
                  </dd>
                </div>
              </dl>
              <a
                href={explorerTxUrl(result.hash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                View on stellar.expert
                <IconExternal className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-medium text-danger">Transaction failed</div>
              <p className="break-words text-sm text-muted">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
