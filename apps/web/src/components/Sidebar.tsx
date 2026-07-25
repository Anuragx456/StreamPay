import { NavLink } from 'react-router-dom';
import {
  IconActivity,
  IconArchitecture,
  IconClose,
  IconDashboard,
  IconPlus,
  IconSend,
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
  { to: '/send', label: 'Send XLM', Icon: IconSend },
  { to: '/create', label: 'Create', Icon: IconPlus },
  { to: '/activity', label: 'Activity', Icon: IconActivity },
  { to: '/architecture', label: 'Architecture', Icon: IconArchitecture },
];

/**
 * Left navigation. On desktop (lg+) it's a static column; on mobile it becomes
 * an off-canvas drawer toggled by the Topbar hamburger, with a dimmed backdrop.
 * Editorial skin: hairline dividers, no filled highlight — the active item is
 * marked by accent text + a 1px underline.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        style={{ zIndex: 'var(--z-drawer)' }}
        className={`fixed inset-0 bg-black/40 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        style={{ zIndex: 'calc(var(--z-drawer) + 1)' }}
        className={`fixed inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface p-5 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:bg-transparent ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-sm border border-lineStrong bg-surface">
              <span className="font-serif text-lg font-medium text-ink">S</span>
            </div>
            <div>
              <div className="font-serif text-lg font-medium leading-none text-ink">StreamPay</div>
              <div className="eyebrow mt-1 text-[0.6rem] text-faint">Soroban streams</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-11 w-11 place-items-center rounded-sm text-muted transition-colors hover:text-ink lg:hidden"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-sm px-2 py-2 text-sm transition-colors ${
                  isActive
                    ? 'font-medium text-[color:var(--active-nav)]'
                    : 'text-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[1.15rem] w-[1.15rem]" />
                  <span
                    className={`border-b pb-px ${
                      isActive ? 'border-[color:var(--active-nav)]' : 'border-transparent'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-sm border border-line p-3">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-pill"
              style={{ background: IS_MOCK ? 'var(--accent-2)' : 'var(--accent)' }}
            />
            <span className="eyebrow text-[0.6rem] text-muted">
              {IS_MOCK ? 'Mock mode' : 'Live contract'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-faint">
            {IS_MOCK
              ? 'In-memory demo data. Set VITE_CONTRACT_ID to go live.'
              : 'Connected to a deployed Soroban contract.'}
          </p>
        </div>
      </aside>
    </>
  );
}
