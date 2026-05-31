import { describe, expect, it } from 'vitest';
import { getSettings, resetSettings, updateSetting } from '../settingsTracker';
import { getBestScore, getTotalGames, recordGame, resetAllScores } from '../scoreTracker';
import { getPremiumItems, purchaseItem, PURCHASE_STATUS, redeemCode, resetPurchases } from '../purchaseService';

describe('settingsTracker', () => {
  it('persists settings with defaults', () => {
    updateSetting('volume', 20);
    expect(getSettings()).toMatchObject({ volume: 20, difficulty: 'normal' });

    resetSettings();
    expect(getSettings().volume).toBe(70);
  });
});

describe('scoreTracker', () => {
  it('records best score and total games', () => {
    recordGame(3, false);
    recordGame(7, true);
    expect(getBestScore()).toBe(7);
    expect(getTotalGames()).toBe(2);

    resetAllScores();
    expect(getTotalGames()).toBe(0);
  });
});

describe('purchaseService', () => {
  it('disables unconfigured products and rejects unverified local purchase writes', () => {
    expect(getPremiumItems().every((item) => item.status === PURCHASE_STATUS.DISABLED)).toBe(true);
    expect(purchaseItem('remove_ads')).toBe(false);
  });

  it('does not accept demo unlock codes', () => {
    const result = redeemCode('REMOVEADS-DEMO');
    expect(result).toEqual({ success: false, error: 'Неверный код' });

    resetPurchases();
  });
});
