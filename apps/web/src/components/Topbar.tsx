import { useEffect } from 'react';
import { useWalletStore } from '@/store/wallet';
import { truncateKey, formatAmount } from '@/lib/format';
import { ThemeToggle } from './ThemeToggle';
import { IconMenu, IconWallet } from './icons';

interface TopbarProps {
  onOpenMenu: () => void;
}

/**
 * Top bar with the mobile menu button, theme toggle, and wallet control.
 * Connect opens the stellar-wallets-kit selector modal (Freighter / Lobstr);
 * once connected we show the truncated key, live XLM balance, and disconnect.
 */
export function Topbar({ onOpenMenu }: TopbarProps) {
  const { publicKey, walletId, connecting, balance, balanceLoading, funded, connect, disconnect } =
    useWalletStore();

  // Restore a persisted wallet session once on mount.
  useEffect(() => {
    void useWalletStore.getState().restore();
  }, []);

  return (
    <header
      style={{ zIndex: 'var(--z-sticky)' }}
      className="sticky top-0 flex items-center gap-3 border-b border-line bg-bg px-4 py-3 sm:px-6"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-sm text-muted transition-colors hover:text-ink lg:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <ThemeToggle />

      {publicKey ? (
        <div className="flex items-center gap-2">
          <span className="chip" title={publicKey}>
            <span className="h-1.5 w-1.5 rounded-pill" style={{ background: 'var(--accent-2)' }} />
            <span className="font-mono">{truncateKey(publicKey)}</span>
            {walletId && <span className="text-faint">· {walletId}</span>}
          </span>
          <span className="chip" title="Native XLM balance (testnet)">
            {balanceLoading ? (
              <span className="text-faint">loading…</span>
            ) : balance === null ? (
              <span className="text-faint">—</span>
            ) : funded ? (
              <span className="font-mono">{formatAmount(balance, 'XLM')}</span>
            ) : (
              <span className="text-faint">unfunded</span>
            )}
          </span>
          <button type="button" onClick={() => void disconnect()} className="btn-ghost">
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={connecting}
          onClick={() => void connect()}
          className="btn-primary disabled:opacity-50"
        >
          <IconWallet className="h-4 w-4" />
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      )}
    </header>
  );
}
