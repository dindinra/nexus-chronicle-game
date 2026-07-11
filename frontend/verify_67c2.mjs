import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SHOT = 'C:/Users/Dindin/nexus-chronicle-game/screenshots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // Navigasi cepat (jangan networkidle — banner 1400ms bakal lewat).
  await page.goto('http://127.0.0.1:5173/game', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nc-board', { timeout: 8000 });

  // 1) Tangkap banner (.show, flash 1400ms saat mount -> startPlayerTurn).
  // Poll segera setelah DOM load (sebelum window 1400ms tutup).
  let bannerShot = false;
  let bannerShowStyle = null;
  try {
    await page.waitForSelector('.turn-banner.show', { timeout: 4000 });
    bannerShowStyle = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('.turn-banner'));
      return { opacity: s.opacity, background: s.background, text: document.querySelector('.turn-banner').textContent.trim() };
    });
    await page.screenshot({ path: SHOT + '/6.7c-2-banner.png' });
    bannerShot = true;
  } catch (e) {
    // banner mungkin sudah lewat; lanjut
  }

  // 2) Tunggu lewat 1400ms -> banner hilang, phase auto->main (600ms).
  await page.waitForTimeout(1700);
  await page.screenshot({ path: SHOT + '/6.7c-2-main.png' });

  // 3) Ekstrak computed style + teks verifikasi.
  const data = await page.evaluate(() => {
    const cs = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        opacity: s.opacity,
        fontWeight: s.fontWeight,
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        color: s.color,
        textTransform: s.textTransform,
        display: s.display,
        position: s.position,
        zIndex: s.zIndex,
        pointerEvents: s.pointerEvents,
      };
    };
    const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };

    // Phase strip active classes
    const phaseEls = ['DRW', 'MAIN', 'BTL', 'END'].map((_, i) => {
      const el = document.querySelectorAll('.phase-strip-field .ph')[i];
      return el ? { label: el.textContent.trim(), active: el.classList.contains('active') } : null;
    });

    // Player / enemy energy badges
    const badges = [...document.querySelectorAll('.player-badge .pb-energy')].map(e => e.textContent.trim());
    const lp = [...document.querySelectorAll('.player-badge .pb-lp')].map(e => e.textContent.trim());

    // Player hand count (kartu face-up di .player-hand-row .hand-card-wrapper)
    const handWrappers = document.querySelectorAll('.player-hand-row .hand-card-wrapper').length;
    // Player deck pile count
    const deckCount = (() => {
      // cari pile "Deck" di player side
      const piles = [...document.querySelectorAll('.field-pile')];
      const d = piles.find(p => p.querySelector('.pile-label')?.textContent.trim() === 'Deck' && p.closest('.player-rows-wrap'));
      return d ? d.querySelector('.pile-count').textContent.trim() : null;
    })();
    const gyCount = (() => {
      const piles = [...document.querySelectorAll('.field-pile')];
      const g = piles.find(p => p.querySelector('.pile-label')?.textContent.trim() === 'GY' && p.closest('.player-rows-wrap'));
      return g ? g.querySelector('.pile-count').textContent.trim() : null;
    })();

    // Battle / End tombol disabled
    const btns = [...document.querySelectorAll('.circle-btn')].map(b => ({ title: b.getAttribute('title'), disabled: b.disabled }));

    return {
      banner: cs('.turn-banner'),
      bannerShowOpacityNow: getComputedStyle(document.querySelector('.turn-banner')).opacity,
      phaseStrip: phaseEls,
      energyBadges: badges,
      lpBadges: lp,
      handCount: handWrappers,
      playerDeckCount: deckCount,
      playerGYCount: gyCount,
      buttons: btns,
    };
  });

  const report = { bannerShot, bannerShowStyle, errors, data };
  writeFileSync(SHOT + '/6.7c-2-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
