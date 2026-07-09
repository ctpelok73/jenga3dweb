import { expect, test } from '@playwright/test';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function skipTutorial(page) {
  await page.addInitScript(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
}

// Pixel 7 viewport: 412×915 (CSS pixels, default for https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/frame/device_emulation.cc)
// Used via devices['Pixel 7'] in playwright.config.js

// ─── Viewport & Layout ─────────────────────────────────────────────────────

test('mobile viewport is Pixel 7 size', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  const vp = page.viewportSize();
  expect(vp?.width || 412).toBeGreaterThanOrEqual(360);
  expect(vp?.height || 800).toBeGreaterThanOrEqual(600);
});

test('start screen fits without horizontal scroll', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  const overflow = await page.evaluate(() => {
    const html = document.documentElement;
    const style = getComputedStyle(html);
    return {
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollW: html.scrollWidth,
      clientW: html.clientWidth,
    };
  });
  // Should not be scrollable horizontally
  expect(overflow.scrollW).toBeLessThanOrEqual(Math.ceil(overflow.clientW) + 2);
});

// ─── Start Screen Elements ─────────────────────────────────────────────────

test('mobile start screen shows all elements', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  // Title is visible and sized for mobile
  const title = page.getByRole('heading', { name: /Jenga 3D/ });
  await expect(title).toBeVisible();

  // Mode toggles (short text to fit mobile)
  await expect(page.getByRole('button', { name: 'Классика' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speed Run' })).toBeVisible();

  // Player mode buttons
  await expect(page.getByRole('button', { name: '1 игрок' })).toBeVisible();
  await expect(page.getByRole('button', { name: '2 игрока' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Против ИИ' })).toBeVisible();

  // Primary CTA
  await expect(page.getByRole('button', { name: 'Начать игру' })).toBeVisible();

  // Action buttons row wraps on mobile
  const actionBtns = page.locator('.j-actions-row button');
  await expect(actionBtns.first()).toBeVisible();
  const btnCount = await actionBtns.count();
  expect(btnCount).toBeGreaterThanOrEqual(4);
});

test('mobile start screen font sizes are readable', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  const sizes = await page.evaluate(() => {
    const title = document.querySelector('.j-heading--gradient');
    const card = document.querySelector('.j-card');
    return {
      titleSize: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
      cardFont: card ? parseFloat(getComputedStyle(card).fontSize) : 0,
    };
  });
  expect(sizes.titleSize).toBeGreaterThanOrEqual(20);
  expect(sizes.cardFont).toBeGreaterThanOrEqual(12);
});

// ─── Panels ────────────────────────────────────────────────────────────────

test('mobile online lobby fits viewport', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Онлайн' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Онлайн' }).click();

  // Lobby card is fully within viewport
  const cardBox = await page.locator('.j-card').boundingBox();
  expect(cardBox).not.toBeNull();
  const vpw = (page.viewportSize()?.width ?? 412);
  expect(cardBox.x).toBeGreaterThanOrEqual(0);
  expect(cardBox.y).toBeGreaterThanOrEqual(0);
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(vpw + 4);

  // All buttons visible
  await expect(page.getByRole('button', { name: /Создать комнату/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Быстрый поиск/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Войти/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Назад/ })).toBeVisible();

  // Code input fits
  const input = page.locator('.j-input--code');
  await expect(input).toBeVisible();
  const inputBox = await input.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(inputBox.width).toBeLessThanOrEqual(vpw);
});

test('mobile settings panel scrollable if needed', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Настройки' }).click();

  // Settings card exists and is within viewport width
  const card = page.locator('.j-card').first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  const vpw = (page.viewportSize()?.width ?? 412);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vpw + 4);

  await page.locator('.j-close-btn').click();
});

test('mobile achievements panel shows card list', async ({ page }) => {
  // Seed achievement data so the panel has content
  await page.addInitScript(() => {
    const achievements = [
      { id: 'first_move', unlockedAt: Date.now() },
      { id: 'ten_moves', unlockedAt: Date.now() },
      { id: 'no_collapse', unlockedAt: Date.now() },
    ];
    localStorage.setItem('jenga3d_achievements', JSON.stringify(achievements));
    localStorage.setItem('jenga3d_tutorial_done', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Достижения' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Достижения' }).click();

  // Achievement cards are visible (rendered as list items)
  await expect(page.getByText('Первый ход').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('10 ходов').first()).toBeVisible();

  await page.locator('.j-close-btn').click();
});

test('mobile daily challenge panel is accessible', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ежедневный челлендж' }).click();
  await expect(page.locator('.j-card').first()).toBeVisible({ timeout: 5_000 });

  // Card fits viewport width
  const box = await page.locator('.j-card').first().boundingBox();
  expect(box).not.toBeNull();
  const vpw = (page.viewportSize()?.width ?? 412);
  expect(box.width).toBeLessThanOrEqual(vpw + 4);
});

// ─── Touch Targets ─────────────────────────────────────────────────────────

test('mobile start button has minimum touch target size', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Начать игру' })).toBeVisible({ timeout: 10_000 });

  const btnSize = await page.getByRole('button', { name: 'Начать игру' }).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      w: parseFloat(s.width),
      h: parseFloat(s.height),
      minH: parseFloat(s.minHeight || '0'),
    };
  });
  // Apple HIG & Material Design recommend ≥ 44px
  expect(Math.max(btnSize.h, btnSize.minH)).toBeGreaterThanOrEqual(44);
});

test('mobile action buttons have adequate spacing', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible({ timeout: 10_000 });

  const gapPx = await page.evaluate(() => {
    const row = document.querySelector('.j-actions-row');
    if (!row) return 0;
    const g = getComputedStyle(row).gap;
    if (g === 'normal') return 0;
    return parseFloat(g);
  });
  expect(gapPx).toBeGreaterThanOrEqual(4);
});

// ─── Landscape ─────────────────────────────────────────────────────────────

test('mobile landscape start screen has no overflow', async ({ page }) => {
  await skipTutorial(page);
  await page.setViewportSize({ width: 800, height: 412 }); // landscape
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Начать игру' })).toBeVisible({ timeout: 10_000 });

  // Still no horizontal scroll
  const noOverflow = await page.evaluate(() => {
    const html = document.documentElement;
    return html.scrollWidth <= Math.ceil(html.clientWidth) + 2;
  });
  expect(noOverflow).toBeTruthy();
});

test('mobile landscape gameplay HUD fits and is usable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await skipTutorial(page);
  await page.setViewportSize({ width: 800, height: 412 }); // landscape
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });

  // HUD fits horizontally
  const hudBox = await page.locator('.j-hud').boundingBox();
  expect(hudBox).not.toBeNull();
  const vpw = (page.viewportSize()?.width ?? 800);
  expect(hudBox.width).toBeLessThanOrEqual(vpw + 2);

  // HUD fully within viewport vertically (not clipped at top or bottom)
  const vph = (page.viewportSize()?.height ?? 412);
  expect(hudBox.y).toBeGreaterThanOrEqual(0);
  expect(hudBox.y + hudBox.height).toBeLessThanOrEqual(vph);

  // All HUD buttons are present and tappable
  await expect(page.getByRole('button', { name: 'Сделать ход' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Открыть меню паузы' })).toBeVisible();

  // Message with turn info
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toContainText(/выберите блок/i);

  // Open pause menu — still works in landscape
  await page.getByRole('button', { name: 'Открыть меню паузы' }).click();
  await expect(page.getByRole('button', { name: 'Продолжить игру' })).toBeVisible();

  const realErrors = errors.filter((e) => !/favicon|deprecation|ResizeObserver loop/i.test(e));
  expect(realErrors).toEqual([]);
});

// ─── Wood Theme on Mobile ──────────────────────────────────────────────────

test('mobile respects Arcade Wood CSS variables', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      bark: s.getPropertyValue('--j-bark').trim(),
      neonPink: s.getPropertyValue('--j-neon-pink').trim(),
    };
  });
  expect(vars.bark).toBe('#1a1410');
  expect(vars.neonPink).toBe('#ff3366');
});

// ─── Mobile CSS Breakpoint ────────────────────────────────────────────────

test('mobile CSS breakpoint overrides card border-radius', async ({ page }) => {
  // This test only makes sense on mobile viewport (<=480px width)
  // Skip on desktop where viewport is wider and the media query doesn't apply
  const vpw = page.viewportSize()?.width ?? 0;
  if (vpw > 480) {
    test.skip();
    return;
  }

  await skipTutorial(page);
  await page.goto('/');
  await expect(page.locator('.j-card').first()).toBeVisible({ timeout: 10_000 });

  // On mobile (<=480px), cards have 16px border-radius (desktop: 6px)
  const br = await page.locator('.j-card').first().evaluate((el) => {
    return parseFloat(getComputedStyle(el).borderRadius);
  });
  // Pixel 7 at 412px is below 480px breakpoint, so should be 16px
  expect(br).toBeCloseTo(16, 0);
});

// ─── Gameplay HUD on Mobile ───────────────────────────────────────────────

test('mobile gameplay HUD fits within viewport', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });

  // HUD panel fits viewport width
  const hudBox = await page.locator('.j-hud').boundingBox();
  expect(hudBox).not.toBeNull();
  const vpw = (page.viewportSize()?.width ?? 412);
  expect(hudBox.width).toBeLessThanOrEqual(vpw + 2);

  // Main buttons visible
  await expect(page.getByRole('button', { name: 'Сделать ход' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Открыть меню паузы' })).toBeVisible();

  // Message bar visible
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toContainText(/выберите блок/i);
});

test('mobile pause menu fits in narrow viewport', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Открыть меню паузы' }).click();

  // Pause menu card fits
  const pmBox = await page.locator('.pm-card').boundingBox();
  expect(pmBox).not.toBeNull();
  const vpw = (page.viewportSize()?.width ?? 412);
  expect(pmBox.width).toBeLessThanOrEqual(vpw + 4);

  // All pause buttons visible
  await expect(page.getByRole('button', { name: 'Продолжить игру' })).toBeVisible();
});

// ─── No Console Errors ─────────────────────────────────────────────────────

test('mobile navigation produces no critical console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible({ timeout: 10_000 });

  // Navigate through panels
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.locator('.j-close-btn').click();
  await page.getByRole('button', { name: 'Достижения' }).click();
  await page.locator('.j-close-btn').click();
  await page.getByRole('button', { name: 'Онлайн' }).click();
  await page.getByRole('button', { name: /Назад/ }).click();
  await page.getByRole('button', { name: 'Ежедневный челлендж' }).click();

  const realErrors = errors.filter((e) => !/favicon|deprecation|ResizeObserver loop/i.test(e));
  expect(realErrors).toEqual([]);
});
