// defineConfig imported from vitest/config (a superset of vite's) so the
// `test` block below type-checks.
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// @stellar/stellar-sdk pulls in some Node builtins; Vite handles the browser
// build fine as long as we don't try to polyfill unnecessarily. `global` is
// aliased to `globalThis` because a few transitive deps still reference it.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the `@/*` path alias from tsconfig so runtime resolution matches
    // type resolution. Without this, Vite/Rollup can't resolve `@/...` imports.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
