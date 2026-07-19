/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces for the dark glassmorphism theme.
        ink: {
          900: '#07070d',
          800: '#0a0a12',
          700: '#12121d',
          600: '#1a1a2b',
        },
        // Brand accents: cyan -> violet -> lime.
        brand: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          lime: '#a3e635',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 50%, #a3e635 100%)',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.5)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
