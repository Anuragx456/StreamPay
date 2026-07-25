import { useTheme } from '@/hooks/useTheme';
import { IconMoon, IconSun } from './icons';

/**
 * Quiet, editorial theme toggle: a single hairline-outlined icon button that
 * flips light <-> dark. Sun shows in light mode, moon in dark. A long-press or
 * right-click resets to `system`. Kept minimal on purpose — no segmented
 * control competing with the topbar.
 */
export function ThemeToggle() {
  const { resolved, theme, setTheme } = useTheme();
  const isDark = resolved === 'dark';

  const label =
    theme === 'system'
      ? `Theme: system (${resolved}). Click to set ${isDark ? 'light' : 'dark'}.`
      : `Theme: ${resolved}. Click to set ${isDark ? 'light' : 'dark'}.`;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      onContextMenu={(e) => {
        e.preventDefault();
        setTheme('system');
      }}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 place-items-center rounded-pill border border-line text-muted transition-colors hover:border-lineStrong hover:text-ink"
    >
      {isDark ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4" />}
    </button>
  );
}
