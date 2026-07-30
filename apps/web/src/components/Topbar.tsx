import { useState } from 'react';
import { useWalletStore } from '@/store/wallet';
import { truncateKey, formatAmount } from '@/lib/format';
import { ThemeToggle } from './ThemeToggle';
import { IconMenu, IconWallet } from './icons';
import { Modal } from './Modal';

interface TopbarProps {
  onOpenMenu: () => void;
}

/**
 * Top bar with the mobile menu button, theme toggle, wallet control, and
 * a disconnect confirmation modal.
 *
 * Connect opens the stellar-wallets-kit selector modal (Freighter / Lobstr);
 * once connected we show the truncated key, live XLM balance, and a disconnect
 * button that opens a confirmation dialog.
 *
 * Wallet session restoration is handled by AppShell in App.tsx so that
 * startEventSync() always runs against the correct mode.
 */
export function Topbar({ onOpenMenu }: TopbarProps) {
  const {
    publicKey,
    walletId,
    connecting,
    disconnecting,
    balance,
    balanceLoading,
    funded,
    connect,
    disconnect,
  } = useWalletStore();

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisconnect = async () => {
    await disconnect();
    setShowConfirm(false);
  };

  return (
    <header
      style={{ zIndex: 'var(--z-sticky)' }}
      className="sticky top-0 flex items-center gap-2 border-b border-line bg-bg px-3 py-2 sm:gap-3 sm:px-6 sm:py-3"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="grid h-11 w-11 place-items-center rounded-sm text-muted transition-colors hover:text-ink lg:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <ThemeToggle />

      {publicKey ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="chip hidden sm:inline-flex" title={publicKey}>
            <span className="h-1.5 w-1.5 rounded-pill" style={{ background: 'var(--accent-2)' }} />
            <span className="font-mono">{truncateKey(publicKey)}</span>
            <span className="text-faint">
              · {walletId ? (walletId.toLowerCase() === 'freighter' ? 'Freighter' : walletId) : 'Freighter'}
            </span>
          </span>
          <span className="chip hidden md:inline-flex" title="Native XLM balance on Stellar Testnet">
            <span className="text-muted mr-1">XLM Balance:</span>
            {balanceLoading ? (
              <span className="text-faint">loading…</span>
            ) : balance === null ? (
              <span className="text-faint">—</span>
            ) : funded ? (
              <span className="font-mono font-semibold text-ink">{formatAmount(balance, 'XLM')}</span>
            ) : (
              <span className="text-faint">unfunded</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="btn-ghost"
          >
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
          {connecting ? 'Connecting…' : 'Connect Wallet (Freighter)'}
        </button>
      )}

      {/* Disconnect confirmation modal */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        disableClose={disconnecting}
        title="Disconnect wallet?"
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              disabled={disconnecting}
              onClick={() => setShowConfirm(false)}
            >
              Keep connected
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={disconnecting}
              onClick={() => void handleDisconnect()}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            Connected as{' '}
            <span className="font-mono text-ink">
              {publicKey ? truncateKey(publicKey) : ''}
            </span>
            {walletId && (
              <span className="text-faint"> · {walletId === 'freighter' ? 'Freighter' : walletId}</span>
            )}
            .
          </p>
          <p className="text-faint">
            This only ends the app session. Your XLM balance, active streams, and
            funds on Stellar are unaffected. You can reconnect at any time.
          </p>
        </div>
      </Modal>
    </header>
  );
}
