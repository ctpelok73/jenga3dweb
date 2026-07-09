import { test, expect } from '@playwright/test';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function openLobby(page) {
  await page.addInitScript(() => localStorage.setItem('jenga3d_tutorial_done', '1'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Онлайн' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Онлайн' }).click();
  await expect(page.getByRole('button', { name: /Создать комнату/ })).toBeVisible({ timeout: 5_000 });
}

async function waitForGameScreen(page) {
  await expect(page.locator('.j-online-hud__players')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.j-online-hud__turn')).toBeVisible();
}

async function waitForGameOver(page) {
  await expect(page.getByRole('dialog', { name: 'Конец игры' })).toBeVisible({ timeout: 15_000 });
}

/**
 * Helper: set up a two-player online game and return cleanup function.
 * Resolves when both pages show game screen.
 * @param {string} [mode='classic'] — game mode ('classic' | 'speed')
 */
async function setupTwoPlayerGame(browser, page1, mode = 'classic') {
  await openLobby(page1);

  // Select mode if not classic (classic is the default in lobby)
  if (mode === 'speed') {
    await page1.getByRole('button', { name: /Speed/ }).click();
    await expect(page1.getByRole('button', { name: /Speed/ })).toHaveClass(/is-active/);
  }

  await page1.getByRole('button', { name: /Создать комнату/ }).click();
  // Wait for actual 6-char room code (not '...' placeholder from initial render)
  await expect(page1.locator('.j-online-code')).not.toContainText('...', { timeout: 5_000 });
  const rawCode = await page1.locator('.j-online-code').textContent();
  const roomCode = rawCode ? rawCode.trim() : null;
  expect(roomCode).not.toBeNull();
  expect(roomCode.length).toBe(6);

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();

  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone) return;
    cleanupDone = true;
    try { await ctx2.close(); } catch { /* ignore */ }
  };

  try {
    await openLobby(page2);
    await page2.locator('.j-input--code').fill(roomCode);
    await page2.getByRole('button', { name: /Войти/ }).click();
    await waitForGameScreen(page2);
    await waitForGameScreen(page1);
  } catch (err) {
    await cleanup();
    throw err;
  }

  return { page2, cleanup };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe('Online Multiplayer', () => {

  test('lobby opens and shows player profile and connection elements', async ({ page }) => {
    await openLobby(page);

    await expect(page.getByText(/Аноним/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Классика' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Speed' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Быстрый поиск/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Создать комнату/ })).toBeVisible();
    await expect(page.locator('.j-input--code')).toBeVisible();
    await expect(page.getByRole('button', { name: /Назад/ })).toBeVisible();
  });

  test('create room shows waiting screen with 6-char room code', async ({ page }) => {
    await openLobby(page);
    await page.getByRole('button', { name: /Создать комнату/ }).click();

    await expect(page.getByRole('dialog', { name: /Ожидание противника/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.j-online-waiting__spinner')).toBeVisible();

    // Wait for actual 6-char room code (not '...' placeholder)
    await expect(page.locator('.j-online-code')).not.toContainText('...', { timeout: 5_000 });
    const raw = await page.locator('.j-online-code').textContent();
    const code = raw ? raw.trim() : null;
    expect(code).not.toBeNull();
    expect(code.length).toBe(6);

    await page.getByRole('button', { name: /Отмена/ }).click();
    await expect(page.getByRole('button', { name: /Создать комнату/ })).toBeVisible({ timeout: 5_000 });
  });

  test('joining with invalid room code shows error', async ({ page }) => {
    await openLobby(page);

    await page.locator('.j-input--code').fill('XXXXXX');
    await page.getByRole('button', { name: /Войти/ }).click();

    await expect(page.locator('.j-online-error')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.j-online-error')).toContainText(/не найдена|ошибка/i);
  });

  test('join button is disabled with empty code input', async ({ page }) => {
    await openLobby(page);
    const joinBtn = page.getByRole('button', { name: /Войти/ });
    await expect(joinBtn).toBeDisabled();
  });

  // ─── Parameterized: create+join in different modes ─────────────────

  const gameModes = ['classic', 'speed'];

  for (const mode of gameModes) {
    test(`create+join in mode=${mode} — both see game screen`, async ({ browser, page: page1 }) => {
      const { page2, cleanup } = await setupTwoPlayerGame(browser, page1, mode);
      try {
        // Both players see game HUD
        await expect(page1.locator('.j-online-hud__players')).toBeVisible({ timeout: 5_000 });
        await expect(page2.locator('.j-online-hud__players')).toBeVisible({ timeout: 5_000 });

        // Connection status shows "Онлайн"
        await expect(page1.locator('.j-online-hud__status')).toContainText(/Онлайн/);
        await expect(page2.locator('.j-online-hud__status')).toContainText(/Онлайн/);

        // Turn indicator — host goes first
        const turn1 = await page1.locator('.j-online-hud__turn').textContent();
        expect(turn1).toContain('🟢');
        const turn2 = await page2.locator('.j-online-hud__turn').textContent();
        expect(turn2).toContain('🔴');

        // Leave button visible for both
        await expect(page1.getByRole('button', { name: /Покинуть игру/ })).toBeVisible();
        await expect(page2.getByRole('button', { name: /Покинуть игру/ })).toBeVisible();
      } finally {
        await cleanup();
      }
    });
  }

  // ─── Quick match ───────────────────────────────────────────────────

  test('quick match shows waiting screen with room code', async ({ page }) => {
    await openLobby(page);
    await page.getByRole('button', { name: /Быстрый поиск/ }).click();
    await expect(page.getByRole('dialog', { name: /Ожидание противника/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.j-online-waiting__spinner')).toBeVisible();
    await expect(page.locator('.j-online-code')).not.toContainText('...', { timeout: 5_000 });
    const raw = await page.locator('.j-online-code').textContent();
    const code = raw ? raw.trim() : null;
    expect(code).not.toBeNull();
    expect(code.length).toBe(6);
    // Cancel
    await page.getByRole('button', { name: /Отмена/ }).click();
    await expect(page.getByRole('button', { name: /Создать комнату/ })).toBeVisible({ timeout: 5_000 });
  });

  test('online game HUD shows player info and turn indicator', async ({ browser, page: page1 }) => {
    const { page2, cleanup } = await setupTwoPlayerGame(browser, page1);

    try {
      // Player 1 (host) goes first — 🟢
      const turn1 = await page1.locator('.j-online-hud__turn').textContent();
      expect(turn1).toContain('🟢');

      // Player 2 (joiner) waits — 🔴
      const turn2 = await page2.locator('.j-online-hud__turn').textContent();
      expect(turn2).toContain('🔴');

      // VS divider visible
      await expect(page1.locator('.j-online-hud__vs')).toBeVisible();
      await expect(page2.locator('.j-online-hud__vs')).toBeVisible();

      // Connection status
      await expect(page1.locator('.j-online-hud__status')).toContainText(/Онлайн/);
      await expect(page2.locator('.j-online-hud__status')).toContainText(/Онлайн/);

      // Leave button
      await expect(page1.getByRole('button', { name: /Покинуть игру/ })).toBeVisible();
      await expect(page2.getByRole('button', { name: /Покинуть игру/ })).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test('player can make a move via keyboard — turn switches to opponent', async ({ browser, page: page1 }) => {
    const { page2, cleanup } = await setupTwoPlayerGame(browser, page1);

    try {
      // Player 1 (host) should have 🟢
      const turnBefore = await page1.locator('.j-online-hud__turn').textContent();
      expect(turnBefore).toContain('🟢');

      // Make a move via keyboard:
      // Tab → focus first selectable block
      await page1.keyboard.press('Tab');
      // Enter → select the block
      await page1.keyboard.press('Enter');
      // Wait for selection UI to update
      await page1.waitForTimeout(500);
      // Enter → make the move (executeMove)
      await page1.keyboard.press('Enter');

      // Wait for physics simulation + server confirmation
      // After the move, Player 1's turn ends → 🔴
      await expect(async () => {
        const turnAfter = await page1.locator('.j-online-hud__turn').textContent();
        expect(turnAfter).toContain('🔴');
      }).toPass({ timeout: 15_000 });

      // Player 2 should now have 🟢
      await expect(async () => {
        const turnP2 = await page2.locator('.j-online-hud__turn').textContent();
        expect(turnP2).toContain('🟢');
      }).toPass({ timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test('collapse triggers game over for both players with correct result', async ({ browser, page: page1 }) => {
    // Intercept WebSocket on page1 to send tower_collapsed message later
    await page1.addInitScript(() => {
      const OrigWS = window.WebSocket;
      let lastWS = null;
      window.__wsSend = (data) => {
        if (lastWS && lastWS.readyState === OrigWS.OPEN) {
          lastWS.send(data);
          return true;
        }
        return false;
      };
      window.WebSocket = function(...args) {
        const ws = new OrigWS(...args);
        lastWS = ws;
        return ws;
      };
      window.WebSocket.prototype = OrigWS.prototype;
      window.WebSocket.CONNECTING = OrigWS.CONNECTING;
      window.WebSocket.OPEN = OrigWS.OPEN;
      window.WebSocket.CLOSING = OrigWS.CLOSING;
      window.WebSocket.CLOSED = OrigWS.CLOSED;
    });

    const { page2, cleanup } = await setupTwoPlayerGame(browser, page1);

    try {
      // Player 1 (host) makes a move via keyboard
      await page1.keyboard.press('Tab');
      await page1.keyboard.press('Enter');
      await page1.waitForTimeout(500);
      await page1.keyboard.press('Enter');

      // Wait for move to complete (turn switches to Player 2)
      await expect(async () => {
        const turn = await page1.locator('.j-online-hud__turn').textContent();
        expect(turn).toContain('🔴');
      }).toPass({ timeout: 15_000 });

      // Trigger collapse via intercepted WebSocket
      const sent = await page1.evaluate(() => {
        return window.__wsSend(JSON.stringify({ type: 'tower_collapsed', payload: {} }));
      });
      expect(sent).toBeTruthy();

      // Both players see game over
      await waitForGameOver(page1);
      await waitForGameOver(page2);

      // Verify game over content on both pages
      await expect(page1.getByText(/Победа|Поражение/)).toBeVisible();
      await expect(page2.getByText(/Победа|Поражение/)).toBeVisible();

      // Verify game over dialog content
      const text1 = await page1.getByRole('dialog', { name: 'Конец игры' }).textContent();
      const text2 = await page2.getByRole('dialog', { name: 'Конец игры' }).textContent();
      expect(text1).toContain('ходов сделано');
      expect(text2).toContain('ходов сделано');

      // Player 1 collapsed → loses, Player 2 wins
      expect(text1).toContain('Поражение');
      expect(text2).toContain('Победа');

      // Elements that should NOT appear (they belong to the other outcome)
      expect(text1).not.toContain('Победа');
      expect(text2).not.toContain('Поражение');

      // Verify OnlineGameOver specific UI elements
      await expect(page1.getByRole('button', { name: /Реванш/ })).toBeVisible();
      await expect(page1.getByRole('button', { name: /В меню/ })).toBeVisible();
      await expect(page2.getByRole('button', { name: /Реванш/ })).toBeVisible();
      await expect(page2.getByRole('button', { name: /В меню/ })).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test('opponent disconnect shows game over screen to remaining player', async ({ browser, page: page1 }) => {
    const { page2, cleanup } = await setupTwoPlayerGame(browser, page1);

    try {
      // Player 2 disconnects (close page → WS close → server sends opponent_left)
      await page2.close();

      // Player 1 should see game over
      await waitForGameOver(page1);
      await expect(page1.getByText(/Победа/)).toBeVisible();
      const body = await page1.getByRole('dialog', { name: 'Конец игры' }).textContent();
      expect(body).toContain('Победа');
    } finally {
      await cleanup();
    }
  });

  test('leave game from HUD returns to start screen and notifies opponent', async ({ browser, page: page1 }) => {
    const { page2, cleanup } = await setupTwoPlayerGame(browser, page1);

    try {
      // Player 1 clicks "Покинуть игру"
      await page1.getByRole('button', { name: /Покинуть игру/ }).click();

      // Player 1 → back to start screen
      await expect(page1.getByRole('heading', { name: /Jenga 3D/ })).toBeVisible({ timeout: 10_000 });

      // Player 2 → game over
      await waitForGameOver(page2);
      await expect(page2.getByText(/Победа/)).toBeVisible();
    } finally {
      await cleanup();
    }
  });

});
