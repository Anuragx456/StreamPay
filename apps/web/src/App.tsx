import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Toaster } from '@/components/Toaster';
import { Dashboard } from '@/views/Dashboard';
import { Streams } from '@/views/Streams';
import { Create } from '@/views/Create';
import { Send } from '@/views/Send';
import { Activity } from '@/views/Activity';
import { Architecture } from '@/views/Architecture';
import { Landing } from '@/views/Landing';
import { useStreamsStore } from '@/store/streams';
import { useWalletStore } from '@/store/wallet';

/**
 * App shell: a persistent Sidebar + Topbar around the routed page content.
 * The sidebar is a static column on desktop and an off-canvas drawer on mobile,
 * toggled by the Topbar hamburger via the shared `menuOpen` state.
 *
 * Initialization order matters: wallet session restoration must complete
 * before the first event sync so that refresh() resolves against the
 * correct contract client (mock vs. live). We wait for restore() to settle,
 * then start the event sync loop.
 */
function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const startEventSync = useStreamsStore((state) => state.startEventSync);
  const stopEventSync = useStreamsStore((state) => state.stopEventSync);

  useEffect(() => {
    // 1. Restore a persisted wallet session first so the mock/live mode flag
    //    is settled before the first event sync.
    useWalletStore.getState().restore().finally(() => {
      // 2. Start polling streams + events now that the mode is settled.
      startEventSync();
      setReady(true);
    });
    return () => {
      stopEventSync();
      setReady(false);
    };
  }, [startEventSync, stopEventSync]);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          {ready ? (
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/streams" element={<Streams />} />
              <Route path="/create" element={<Create />} />
              <Route path="/send" element={<Send />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/architecture" element={<Architecture />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          ) : (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-lineStrong border-t-accent" />
                <p className="text-sm text-muted">Initializing wallet…</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <Toaster />
    </div>
  );
}

/**
 * Top-level router. `/landing` is a standalone BRAND-register marketing surface
 * (its own nav, no app chrome); every other path renders inside the product
 * AppShell. `/` opens on the landing page.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}
