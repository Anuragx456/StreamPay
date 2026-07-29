import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const OUT_DIR = join(process.cwd(), 'docs', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  console.log('Starting preview server...');
  const devProcess = spawn('npx', ['vite', '--port', '5199'], {
    cwd: join(process.cwd(), 'apps', 'web'),
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2500));

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 950 },
      deviceScaleFactor: 2,
    });

    const page = await ctx.newPage();

    console.log('Capturing Wallet Disconnected state...');
    await page.goto('http://localhost:5199/send', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    console.log('Enabling connected Freighter demo wallet state...');
    await page.evaluate(() => {
      localStorage.setItem('streampay:demo', '1');
    });

    await page.goto('http://localhost:5199/send?demo=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 01-wallet-connected.png
    await page.screenshot({ path: join(OUT_DIR, '01-wallet-connected.png'), fullPage: false });
    console.log('✓ Wrote 01-wallet-connected.png');

    // 02-balance-displayed.png
    await page.screenshot({ path: join(OUT_DIR, '02-balance-displayed.png'), fullPage: false });
    console.log('✓ Wrote 02-balance-displayed.png');

    // 03-send-transaction.png (form filled)
    console.log('Filling transaction form...');
    await page.waitForSelector('#destination', { timeout: 5000 });
    await page.fill('#destination', 'GA2C3D4E5F6G7H2J3K4L5M6N7P2Q3R4S5T6U7V2W3X4Y5Z6A7B2C3D4E');
    await page.fill('#send-amount', '100');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, '03-send-transaction.png'), fullPage: false });
    console.log('✓ Wrote 03-send-transaction.png');

    // 04-transaction-result.png (form submitted, result showing hash)
    console.log('Submitting transaction...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT_DIR, '04-transaction-result.png'), fullPage: false });
    console.log('✓ Wrote 04-transaction-result.png');

  } catch (err) {
    console.error('Error generating level 1 screenshots:', err);
  } finally {
    await browser.close();
    devProcess.kill();
  }
}

run();
