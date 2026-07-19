import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Toaster } from '@/components/Toaster';
import { Dashboard } from '@/views/Dashboard';
import { Streams } from '@/views/Streams';
import { Create } from '@/views/Create';
import { Activity } from '@/views/Activity';
import { Architecture } from '@/views/Architecture';

/**
 * App shell: a persistent Sidebar + Topbar around the routed page content.
 * The sidebar is a static column on desktop and an off-canvas drawer on mobile,
 * toggled by the Topbar hamburger via the shared `menuOpen` state. Routes map
 * 1:1 to the sidebar nav; unknown paths (and `/`) redirect to the dashboard.
 */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/streams" element={<Streams />} />
            <Route path="/create" element={<Create />} />
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
