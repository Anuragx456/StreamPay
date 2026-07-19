import { useState } from 'react';
import { useWalletStore, type WalletId } from '@/store/wallet';
import { truncateKey } from '@/lib/format';
import { Modal } from './Modal';
import { IconMenu, IconWallet } from './icons';

interface TopbarProps {
  onOpenMenu: () => void;
}

const WALLETS: { id: WalletId; name: string; hint: string }[] = [
  { id: 'freighter', name: 'Freighter', hint: 'Browser extension' },
  { id: 'lobstr', name: 'Lobstr', hint: 'Mobile / WalletConnect' },
  { id: 'demo', name: 'Demo key', hint: 'No extension needed' },
];

/**
 * Top bar with the mobile menu button and wallet connect control. The connect
 * modal lists the wallet-kit options; STEP 4 swaps the store internals for the
 * real kit while this UI stays the same.
 */
export function Topbar({ onOpenMenu }: TopbarProps) {
  const { publicKey, walletId, connecting, connect, disconnect } = useWalletStore();
  const [modalOpen, setModalOpen] = useState(false);

  const handleConnect = async (id: WalletId) => {
    await connect(id);
    setModalOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-ink-800/70 px-4 py-3 backdrop-blur-xl">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {publicKey ? (
        <div className="flex items-center gap-2">
          <span className="chip bg-white/5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-brand-lime" />
            <span className="font-mono">{truncateKey(publicKey)}</span>
            <span className="text-slate-500">· {walletId}</span>
          </span>
          <button type="button" onClick={disconnect} className="btn-ghost">
            Disconnect
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <IconWallet className="h-4 w-4" />
          Connect wallet
        </button>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Connect a wallet">
        <p className="mb-4 text-slate-400">
          Choose a wallet to sign transactions. In mock mode any option connects a demo key.
        </p>
        <div className="flex flex-col gap-2">
          {WALLETS.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={connecting}
              onClick={() => handleConnect(w.id)}
              className="glass glass-hover flex items-center gap-3 p-3 text-left disabled:opacity-50"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-ink-900">
                <IconWallet className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-100">{w.name}</span>
                <span className="block text-xs text-slate-500">{w.hint}</span>
              </span>
              {connecting && <span className="text-xs text-slate-400">Connecting…</span>}
            </button>
          ))}
        </div>
      </Modal>
    </header>
  );
}
