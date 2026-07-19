import { NavLink } from 'react-router-dom';
import {
  IconActivity,
  IconArchitecture,
  IconClose,
  IconDashboard,
  IconPlus,
  IconStreams,
} from './icons';
import { IS_MOCK } from '@/lib/contract';

interface SidebarProps {
  /** Whether the mobile drawer is open. Ignored on desktop (always visible). */
  open: boolean;
  onClose: () => void;
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/streams', label: 'Streams', Icon: IconStreams },
  { to: '/create', label: 'Create', Icon: IconPlus },
  { to: '/activity', label: 'Activity', Icon: IconActivity },
  { to: '/architecture', label: 'Architecture', Icon: IconArchitecture },
];

/**
 * Left navigation. On desktop (lg+) it's a static column; on mobile it becomes
 * an off-canvas drawer toggled by the Topbar hamburger, with a dimmed backdrop.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-ink-900/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-ink-800/95 p-4 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:bg-transparent ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-ink-900 shadow-glow">
              <span className="text-lg font-black">S</span>
            </div>
            <div>
              <div className="gradient-text text-lg font-extrabold leading-none">StreamPay</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Soroban streams
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-slate-100'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${IS_MOCK ? 'bg-brand-lime' : 'bg-brand-cyan'}`}
            />
            <span className="text-xs font-semibold text-slate-200">
              {IS_MOCK ? 'Mock mode' : 'Live contract'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {IS_MOCK
              ? 'In-memory demo data. Set VITE_CONTRACT_ID to go live.'
              : 'Connected to a deployed Soroban contract.'}
          </p>
        </div>
      </aside>
    </>
  );
}
