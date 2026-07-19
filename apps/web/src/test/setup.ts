// Vitest global setup. jsdom provides the DOM; add any polyfills here.
import { afterEach } from 'vitest';

afterEach(() => {
  // Keep module-level mock state from leaking across tests.
});
