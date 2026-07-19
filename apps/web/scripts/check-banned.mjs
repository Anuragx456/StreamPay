#!/usr/bin/env node
/**
 * Design-system guardrail. Fails (exit 1) if any banned visual pattern shows up
 * in src/**. These are the SLOP-BAN escape hatches the warm-editorial system
 * forbids: Tailwind gradient/blur/over-round/heavy-shadow utilities and the old
 * neon cyan/violet/lime hex. Wired into `npm run lint` and CI so a regression
 * can't merge.
 *
 * Usage: node scripts/check-banned.mjs [rootDir=src]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'src';
const EXTS = new Set(['.ts', '.tsx', '.css', '.html', '.js', '.jsx']);

/** Each rule: a label + a regex. Matches are reported with file:line. */
const RULES = [
  { label: 'bg-gradient (gradient utility)', re: /\bbg-gradient(?:-to-[a-z]{1,2})?\b/ },
  { label: 'backdrop-blur (glassmorphism)', re: /\bbackdrop-blur\b/ },
  { label: 'rounded-2xl (over-rounded)', re: /\brounded-2xl\b/ },
  { label: 'rounded-3xl (over-rounded)', re: /\brounded-3xl\b/ },
  { label: 'shadow-xl (heavy shadow)', re: /\bshadow-xl\b/ },
  { label: 'shadow-2xl (heavy shadow)', re: /\bshadow-2xl\b/ },
  { label: 'old neon hex (#5eead4/#a78bfa/#bef264)', re: /#(?:5eead4|a78bfa|bef264)\b/i },
];

/** This checker file names the patterns literally; never scan it. */
const SELF = 'scripts/check-banned.mjs';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(full, out);
    } else if (EXTS.has(extname(name))) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = relative(process.cwd(), file);
  if (rel === SELF) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { label, re } of RULES) {
      if (re.test(line)) {
        violations.push({ rel, line: i + 1, label, text: line.trim() });
      }
    }
  });
}

if (violations.length) {
  console.error(`\n✖ Banned design patterns found (${violations.length}):\n`);
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  [${v.label}]`);
    console.error(`      ${v.text}`);
  }
  console.error('\nThese violate the warm-editorial design system (see DESIGN.md).');
  console.error('Use hairline borders, solid accent, and sharp radii instead.\n');
  process.exit(1);
}

console.log('✓ No banned design patterns in ' + ROOT + '/');
