/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode is driven by [data-theme="dark"] on <html>, set by useTheme.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Every color maps to a CSS custom property so light/dark swap for free.
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        line: 'var(--border)',
        lineStrong: 'var(--border-strong)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        accent: 'var(--accent)',
        accentInk: 'var(--accent-ink)',
        accent2: 'var(--accent-2)',
        activeNav: 'var(--active-nav)',
        statusActive: 'var(--status-active)',
        statusPaused: 'var(--status-paused)',
        statusEnded: 'var(--status-ended)',
        danger: 'var(--danger)',
      },
      // Sharp / minimal radii only — no lg/xl/2xl.
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        pill: 'var(--radius-pill)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        serif: 'var(--font-serif)',
        mono: 'var(--font-mono)',
      },
      // The ONLY shadow in the system — reserved for the browser mockup.
      boxShadow: {
        mockup: 'var(--shadow-mockup)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
