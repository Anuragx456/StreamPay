import { useState } from 'react';
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

/**
 * App shell: a persistent Sidebar + Topbar around the routed page content.
 * The sidebar is a static column on desktop and an off-canvas drawer on mobile,
 * toggled by the Topbar hamburger via the shared `menuOpen` state.
 */
function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/streams" element={<Streams />} />
            <Route path="/create" element={<Create />} />
            <Route path="/send" element={<Send />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
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
