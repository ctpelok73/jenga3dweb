import { expect, test } from '@playwright/test';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function skipTutorial(page) {
  await page.addInitScript(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
}

// ─── Identity: Font, Colors, Background ────────────────────────────────────

test('Arcade Wood font, CSS variables, and background are applied', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  // 1. DM Sans font link is in the page
  await expect(page.locator('link[href*="DM+Sans"]')).toHaveCount(1);

  // 2. CSS custom properties
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      bark: s.getPropertyValue('--j-bark').trim(),
      walnut: s.getPropertyValue('--j-walnut').trim(),
      pink: s.getPropertyValue('--j-neon-pink').trim(),
      gold: s.getPropertyValue('--j-neon-gold').trim(),
      green: s.getPropertyValue('--j-neon-green').trim(),
    };
  });
  expect(vars.bark).toBe('#1a1410');
  expect(vars.walnut).toBe('#5c4033');
  expect(vars.pink).toBe('#ff3366');
  expect(vars.gold).toBe('#ffcc00');
  expect(vars.green).toBe('#00ff88');

  // 3. Wood background
  const bgLen = await page.evaluate(() => {
    const o = document.querySelector('.j-overlay--start');
    return o ? getComputedStyle(o).background.length : 0;
  });
  expect(bgLen).toBeGreaterThan(50);
});

// ─── Start Screen Elements ─────────────────────────────────────────────────

test('start screen renders all Arcade Wood UI elements', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  // Mode toggles
  await expect(page.getByRole('button', { name: 'Классика' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speed Run' })).toBeVisible();

  // Player mode buttons
  await expect(page.getByRole('button', { name: '1 игрок' })).toBeVisible();
  await expect(page.getByRole('button', { name: '2 игрока' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Против ИИ' })).toBeVisible();

  // Primary start button
  await expect(page.getByRole('button', { name: 'Начать игру' })).toBeVisible();

  // Action buttons row
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Достижения' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ежедневный челлендж' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Онлайн' })).toBeVisible();

  // Card accent line via ::before
  const hasAccent = await page.evaluate(() => {
    const card = document.querySelector('.j-card');
    return card ? getComputedStyle(card, '::before').height !== '0px' : false;
  });
  expect(hasAccent).toBeTruthy();
});

// ─── Mode Buttons ──────────────────────────────────────────────────────────

test('mode buttons show active state when clicked', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  // Classic → Speed
  await page.getByRole('button', { name: 'Speed Run' }).click();
  await expect(page.getByRole('button', { name: 'Speed Run' })).toHaveClass(/is-active/);
  await expect(page.getByRole('button', { name: '60с' })).toBeVisible();

  // 1 player → 2 players
  await page.getByRole('button', { name: '2 игрока' }).click();
  await expect(page.locator('.j-mode-btn--duo')).toHaveClass(/is-active/);

  // 2 players → vs AI
  await page.getByRole('button', { name: 'Против ИИ' }).click();
  await expect(page.getByRole('button', { name: 'Против ИИ' })).toHaveClass(/is-active/);
});

// ─── Panels: Settings / Achievements / Online / Challenge ──────────────────

test('settings panel opens and closes', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByText(/Настройки/)).toBeVisible();
  await page.locator('.j-close-btn').click();
});

test('achievements panel opens and shows list', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Достижения' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Достижения' }).click();
  // Check the heading is visible (use role selector for uniqueness)
  await expect(page.getByRole('heading', { name: /Достижения/ }).first()).toBeVisible();
  await page.locator('.j-close-btn').click();
});

test('online lobby shows lobby buttons', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Онлайн' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Онлайн' }).click();
  await expect(page.getByRole('button', { name: /Быстрый поиск/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Создать комнату/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Войти/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Назад/ })).toBeVisible();
  await page.getByRole('button', { name: /Назад/ }).click();
});

test('online lobby shows player name and code input', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Онлайн' }).click();

  await expect(page.getByText(/Аноним/).first()).toBeVisible();
  await expect(page.locator('.j-input--code')).toBeVisible();
  await expect(page.locator('.j-input--code')).toHaveAttribute('placeholder', 'Код комнаты');
});

test('daily challenge panel opens with content', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Ежедневный челлендж' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Ежедневный челлендж' }).click();
  // Panel is visible (heading + content)
  await expect(page.locator('.j-card').first()).toBeVisible({ timeout: 5_000 });
  // Don't close — next test navigates fresh
});

// ─── Tutorial ──────────────────────────────────────────────────────────────

test('tutorial shows wood-styled card with accent line', async ({ page }) => {
  // Remove tutorial flag so tutorial shows on page load
  await page.addInitScript(() => localStorage.removeItem('jenga3d_tutorial_done'));
  await page.goto('/');

  // Tutorial renders automatically (no click needed — StartScreen is hidden)
  await expect(page.locator('.j-tutorial-card')).toBeVisible({ timeout: 10_000 });

  // Accent line via ::before
  const hasAccent = await page.evaluate(() => {
    const card = document.querySelector('.j-tutorial-card');
    return card ? getComputedStyle(card, '::before').height !== '0px' : false;
  });
  expect(hasAccent).toBeTruthy();

  // Navigation button exists
  await expect(page.getByRole('button', { name: /Далее|Понятно/ })).toBeVisible();
});

// ─── Game Flow ─────────────────────────────────────────────────────────────

test('game flow: start → pause menu check', async ({ page }) => {
  await skipTutorial(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });

  // Move button exists
  const moveBtn = page.getByRole('button', { name: 'Сделать ход' });
  await expect(moveBtn).toBeVisible();
  const bColor = await moveBtn.evaluate((el) => getComputedStyle(el).borderColor);
  expect(bColor).not.toBe('rgb(42, 110, 255)');

  // Pause menu
  await page.getByRole('button', { name: 'Открыть меню паузы' }).click();
  await expect(page.getByRole('button', { name: 'Продолжить игру' })).toBeVisible();

  // Pause menu accent line
  const pmAccent = await page.evaluate(() => {
    const c = document.querySelector('.pm-card');
    return c ? getComputedStyle(c, '::before').height !== '0px' : false;
  });
  expect(pmAccent).toBeTruthy();

  // Resume
  await page.getByRole('button', { name: 'Продолжить игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible();
});

test('game restart cycle: play → pause → back to menu', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await skipTutorial(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Открыть меню паузы' }).click();
  await page.locator('.pm-btn--ghost', { hasText: /главное меню/i }).click();
  await page.getByRole('button', { name: 'Выйти в меню' }).click();
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible();

  const realErrors = errors.filter((e) => !/favicon|deprecation|ResizeObserver loop/i.test(e));
  expect(realErrors).toEqual([]);
});

// ─── Reduced Motion ────────────────────────────────────────────────────────

test('reduced motion disables animations', async ({ page }) => {
  await skipTutorial(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

  const animDur = await page.evaluate(() => {
    const o = document.querySelector('.j-card');
    return o ? getComputedStyle(o).animationDuration : '';
  });
  expect(animDur === '0.01ms' || parseFloat(animDur) < 1).toBeTruthy();
});
