#!/usr/bin/env node
/**
 * Screenshot-check every view in both themes. Boots against a running dev/preview
 * server (default http://localhost:5174), forces the theme by seeding
 * localStorage before the app mounts, and writes PNGs to scripts/shots/.
 *
 * Usage: node scripts/shots.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5174';
const OUT = join(process.cwd(), 'scripts', 'shots');
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['landing', '/landing'],
  ['dashboard', '/dashboard'],
  ['streams', '/streams'],
  ['create', '/create'],
  ['activity', '/activity'],
  ['architecture', '/architecture'],
];
const THEMES = ['light', 'dark'];

const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    // Seed the persisted preference before any app code runs.
    await ctx.addInitScript((t) => {
      localStorage.setItem('streampay-theme', t);
    }, theme);
    const page = await ctx.newPage();
    for (const [name, route] of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      // Let fonts + the initial store refresh settle.
      await page.waitForTimeout(700);
      const file = join(OUT, `${name}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${name}-${theme}.png`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`\nWrote ${ROUTES.length * THEMES.length} shots to ${OUT}`);
