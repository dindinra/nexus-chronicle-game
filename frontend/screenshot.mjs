import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'C:/Users/Dindin/nexus-chronicle-game/screenshots';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const log = (...a) => console.log('[shot]', ...a);

async function cardSizes(page, sel) {
  return page.$$eval(sel, els => els.slice(0, 4).map(e => {
    const cs = getComputedStyle(e);
    return `${Math.round(parseFloat(cs.width))}x${Math.round(parseFloat(cs.height))}`;
  }));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('console', m => { if (m.type() === 'error') log('PAGE-ERR:', m.text()); });

  // --- Auth: register + login (diperlukan untuk /deck-builder) ---
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  const regToggle = page.getByText('Need an account? Register');
  if (await regToggle.count()) await regToggle.click();
  await page.locator('input').nth(0).fill('shot_bot');
  await page.locator('input[type=password]').fill('shot1234');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForTimeout(1400);
  log('auth selesai, url=', page.url());

  // --- Arena (/game) ---
  await page.goto(BASE + '/game', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: OUT + '/arena.png', fullPage: true });
  log('ARENA cards (nc-card):', JSON.stringify(await cardSizes(page, '.nc-board .nc-card')));
  log('ARENA card-backs:', JSON.stringify(await cardSizes(page, '.nc-board .card-back')));
  log('ARENA energy badges:', JSON.stringify(await page.$$eval('.pb-energy', e => e.map(x => x.textContent.trim()))));

  // --- Deck list panel (#deck-list-body) ---
  const dl = await page.$('#deck-list-body');
  if (dl) {
    await dl.screenshot({ path: OUT + '/deck-list.png' });
    log('DECK-LIST cards:', JSON.stringify(await cardSizes(page, '#deck-list-body .nc-card')));
  } else {
    log('WARN: #deck-list-body tidak ditemukan');
  }

  // --- Deck Builder (/deck-builder) ---
  await page.goto(BASE + '/deck-builder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: OUT + '/deck-builder.png', fullPage: true });
  log('DECK-BUILDER cards:', JSON.stringify(await cardSizes(page, '.deck-body .nc-card')));

  await browser.close();
  log('DONE — screenshots di', OUT);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
