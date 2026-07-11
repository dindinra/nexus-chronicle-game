import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'C:/Users/Dindin/nexus-chronicle-game/screenshots';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';
const log = (...a) => console.log('[vfy]', ...a);

// Ambil computed style beberapa property penting dari suatu selector.
async function cs(page, sel, props) {
  return page.$eval(sel, (el, props) => {
    const s = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = s.getPropertyValue(p);
    o.__disabled = el.disabled;
    return o;
  }, props).catch(e => ({ __error: String(e) }));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('console', m => { if (m.type() === 'error') log('PAGE-ERR:', m.text()); });
  page.on('pageerror', e => log('PAGEERROR:', e.message));

  // Auth injeksi (seperti screenshot.mjs) — /cards tampak publik, tp amankan saja.
  const API = 'http://127.0.0.1:8000';
  const creds = { username: 'shot_bot', password: 'shot1234' };
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  let r = await page.request.post(API + '/auth/login', { data: creds });
  if (!r.ok) { await page.request.post(API + '/auth/register', { data: creds }); r = await page.request.post(API + '/auth/login', { data: creds }); }
  const tok = await r.json();
  await page.evaluate((t) => localStorage.setItem('nexus_token', t), tok.access_token);

  // Ke /game, tunggu strip muncul.
  await page.goto(BASE + '/game', { waitUntil: 'networkidle' });
  await page.waitForSelector('.phase-strip-field', { timeout: 8000 });
  await page.waitForTimeout(800);

  log('=== STATE AWAL (phase diharapkan main, firstTurn=true) ===');
  log('strip pips:', JSON.stringify(await page.$$eval('.ph', els => els.map(e => ({ t: e.textContent, active: e.classList.contains('active') })))));
  log('.ph.active   =', JSON.stringify(await cs(page, '.ph.active', ['color', 'font-size', 'font-weight', 'text-transform', 'letter-spacing', 'text-shadow', 'font-family'])));
  log('.ph (DRW)    =', JSON.stringify(await cs(page, '.ph', ['color'])));
  log('.phase-strip-field =', JSON.stringify(await cs(page, '.phase-strip-field', ['position', 'top', 'left', 'transform', 'display', 'gap', 'pointer-events', 'z-index'])));
  log('.circle-btn  =', JSON.stringify(await cs(page, '.circle-btn', ['width', 'height', 'border-radius', 'background-color', 'border-top-width', 'border-top-color', 'color', 'font-size', 'box-shadow'])));
  log('.cb-battle   =', JSON.stringify(await cs(page, '.circle-btn.cb-battle', ['__disabled', 'opacity', 'border-top-color', 'color'])));
  log('.cb-end      =', JSON.stringify(await cs(page, '.circle-btn.cb-end', ['__disabled', 'opacity', 'border-top-color', 'color'])));

  await page.screenshot({ path: OUT + '/phase-strip.png', fullPage: true });
  log('screenshot -> phase-strip.png');

  // Klik End (enabled di main) -> phase jadi end.
  await page.click('.circle-btn.cb-end');
  await page.waitForTimeout(400);
  log('=== SETELAH KLIK END (phase diharapkan end) ===');
  log('strip pips:', JSON.stringify(await page.$$eval('.ph', els => els.map(e => ({ t: e.textContent, active: e.classList.contains('active') })))));
  log('.ph.active   =', JSON.stringify(await cs(page, '.ph.active', ['color'])));
  log('.cb-battle   =', JSON.stringify(await cs(page, '.circle-btn.cb-battle', ['__disabled', 'opacity'])));
  log('.cb-end      =', JSON.stringify(await cs(page, '.circle-btn.cb-end', ['__disabled', 'opacity'])));
  await page.screenshot({ path: OUT + '/phase-strip-end.png', fullPage: true });
  log('screenshot -> phase-strip-end.png');

  await browser.close();
  log('DONE');
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
