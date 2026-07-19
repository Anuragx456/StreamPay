import { useCallback, useEffect, useState } from 'react';

/** User-selectable theme preference. `system` follows the OS. */
export type Theme = 'light' | 'dark' | 'system';
/** The concrete theme actually applied to the document. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'streampay-theme';

function getStored(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function systemPrefersDark(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

/** Apply the resolved theme to <html data-theme> so CSS tokens switch. */
function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
}

/**
 * Theme controller: three states (light | dark | system) persisted to
 * localStorage and mirrored onto <html data-theme>. In `system` mode it tracks
 * `prefers-color-scheme` live via a change listener.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStored);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(getStored()));

  // Keep the DOM + resolved value in sync whenever the preference changes.
  useEffect(() => {
    const next = resolve(theme);
    setResolved(next);
    apply(next);
  }, [theme]);

  // In `system` mode, follow live OS changes.
  useEffect(() => {
    if (theme !== 'system' || typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = systemPrefersDark() ? 'dark' : 'light';
      setResolved(next);
      apply(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable (private mode) — in-memory only */
    }
  }, []);

  return { theme, resolved, setTheme };
}
