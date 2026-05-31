import { expect, test } from '@playwright/test';

test('desktop can start, pause, and return to menu', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible();
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Открыть меню паузы' }).click();
  await page.getByRole('button', { name: /главное меню/i }).click();
  await page.getByRole('button', { name: 'Выйти в меню' }).click();
  await expect(page.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible();
});

test('placeholder env does not inject analytics or ads scripts', async ({ page }) => {
  await page.goto('/');
  const scriptSources = await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) => script.src));

  expect(scriptSources.some((src) => src.includes('googletagmanager.com/gtag'))).toBe(false);
  expect(scriptSources.some((src) => src.includes('pagead2.googlesyndication.com'))).toBe(false);
});

test('mobile gestures do not break gameplay startup', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only gesture smoke');

  await page.addInitScript(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру' }).click();
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible({ timeout: 30_000 });

  const root = page.getByRole('application');
  const box = await root.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('status', { name: 'Игровая панель' })).toBeVisible();
});
