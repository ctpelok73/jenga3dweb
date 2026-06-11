import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/tmp/jenga-shots';
mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:5173';

const log = (...a) => console.log('[audit]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log('shot', name);
};

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
// Capture the interactive tutorial overlay first (shows on first visit)
await shot('00-tutorial');
// Dismiss tutorial the real way: value must be '1' (see App.jsx hasSeenTutorial)
await page.evaluate(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await shot('01-start');

// Dump start screen text + button labels for context
const startText = await page.evaluate(() => document.body.innerText.slice(0, 1200));
log('START TEXT:\n' + startText);

// Try to open Settings from start
const trySettings = await page.$('button[aria-label="Настройки"]');
if (trySettings) { await trySettings.click(); await page.waitForTimeout(700); await shot('02-settings');
  const close = await page.$('button[aria-label*="акрыть"], .j-close-btn, button:has-text("Закрыть")');
  if (close) { await close.click(); await page.waitForTimeout(400); }
}

// Achievements
const tryAch = await page.$('button[aria-label="Достижения"]');
if (tryAch) { await tryAch.click(); await page.waitForTimeout(700); await shot('03-achievements');
  const close = await page.$('button[aria-label*="акрыть"], .j-close-btn, button:has-text("Закрыть")');
  if (close) { await close.click(); await page.waitForTimeout(400); }
}

// Daily challenge
const tryDaily = await page.$('button[aria-label="Ежедневный челлендж"]');
if (tryDaily) { await tryDaily.click(); await page.waitForTimeout(700); await shot('04-daily');
  const close = await page.$('button[aria-label*="акрыть"], .j-close-btn, button:has-text("Закрыть")');
  if (close) { await close.click(); await page.waitForTimeout(400); }
}

// Start the game (1 player, classic)
const startBtn = await page.$('button[aria-label="Начать игру"]');
if (startBtn) {
  await startBtn.click();
  await page.waitForTimeout(3000); // let 3D scene + physics load
  await shot('05-hud-playing');
  const hudText = await page.evaluate(() => {
    const hud = document.querySelector('.j-hud, .j-hud-overlay');
    return hud ? hud.innerText.slice(0, 800) : '(no .j-hud found)';
  });
  log('HUD TEXT:\n' + hudText);

  // Open pause menu
  const pauseBtn = await page.$('button[aria-label="Открыть меню паузы"]');
  if (pauseBtn) { await pauseBtn.click(); await page.waitForTimeout(600); await shot('06-pause');
    const resume = await page.$('button[aria-label="Продолжить игру"]');
    if (resume) { await resume.click(); await page.waitForTimeout(400); }
  } else { log('NO pause button found'); }
}

// Mobile viewport pass on start screen
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mpage = await mctx.newPage();
await mpage.goto(URL, { waitUntil: 'domcontentloaded' });
await mpage.waitForTimeout(800);
await mpage.evaluate(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
await mpage.reload({ waitUntil: 'domcontentloaded' });
await mpage.waitForTimeout(2500);
await mpage.screenshot({ path: `${OUT}/07-start-mobile.png` });
log('shot 07-start-mobile');

log('=== JS ERRORS (' + errors.length + ') ===');
errors.forEach(e => log(e));

await browser.close();
log('DONE. Shots in ' + OUT);
