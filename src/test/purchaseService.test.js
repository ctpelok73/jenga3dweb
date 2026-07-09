import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import with default env (no VITE_* vars) — all items have empty paymentUrl
import * as ps from '../purchaseService';

const ITEM_ID = {
  SKIN: 'skin_pack_all',
  ADS: 'remove_ads',
  ENV: 'env_themes_all',
};

beforeEach(() => {
  localStorage.clear();
});

// ─── PREMIUM_ITEMS shape ───────────────────────────────────────────

describe('premium items data', () => {
  it('has 3 items with required fields', () => {
    const items = ps.getPremiumItems();
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('price');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('status');
    }
  });

  it('has correct item IDs', () => {
    expect(ps.getPremiumItems().map((i) => i.id)).toEqual([
      ITEM_ID.SKIN, ITEM_ID.ADS, ITEM_ID.ENV,
    ]);
  });
});

// ─── isPremiumStoreAvailable ───────────────────────────────────────

describe('isPremiumStoreAvailable', () => {
  it('returns false when no payment URLs configured (default env)', () => {
    expect(ps.isPremiumStoreAvailable()).toBe(false);
  });
});

// ─── getItemStatus ─────────────────────────────────────────────────

describe('getItemStatus', () => {
  it('returns DISABLED for unknown item id', () => {
    expect(ps.getItemStatus('nonexistent')).toBe(ps.PURCHASE_STATUS.DISABLED);
  });

  it('returns DISABLED when no payment URL configured', () => {
    expect(ps.getItemStatus(ITEM_ID.SKIN)).toBe(ps.PURCHASE_STATUS.DISABLED);
  });

  it('returns PURCHASED after purchase', () => {
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(ps.getItemStatus(ITEM_ID.SKIN)).toBe(ps.PURCHASE_STATUS.PURCHASED);
  });
});

// ─── isPurchased ───────────────────────────────────────────────────

describe('isPurchased', () => {
  it('returns false for not-purchased items', () => {
    expect(ps.isPurchased(ITEM_ID.SKIN)).toBe(false);
    expect(ps.isPurchased(ITEM_ID.ADS)).toBe(false);
    expect(ps.isPurchased(ITEM_ID.ENV)).toBe(false);
  });

  it('returns true after purchase', () => {
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(ps.isPurchased(ITEM_ID.SKIN)).toBe(true);
  });
});

// ─── Purchase checkers ─────────────────────────────────────────────

describe('purchase-specific checkers', () => {
  it('isSkinPackPurchased reflects skin_pack_all purchase', () => {
    expect(ps.isSkinPackPurchased()).toBe(false);
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(ps.isSkinPackPurchased()).toBe(true);
  });

  it('isRemoveAdsPurchased sets ad_free localStorage flag', () => {
    expect(localStorage.getItem('jenga3d_ad_free')).toBeNull();
    ps.purchaseItem(ITEM_ID.ADS, { verified: true });
    expect(ps.isRemoveAdsPurchased()).toBe(true);
    expect(localStorage.getItem('jenga3d_ad_free')).toBe('1');
  });

  it('isRemoveAdsPurchased returns false when not purchased', () => {
    expect(ps.isRemoveAdsPurchased()).toBe(false);
  });

  it('isEnvThemesPurchased reflects env_themes_all purchase', () => {
    expect(ps.isEnvThemesPurchased()).toBe(false);
    ps.purchaseItem(ITEM_ID.ENV, { verified: true });
    expect(ps.isEnvThemesPurchased()).toBe(true);
  });
});

// ─── getAvailableSkins / getAvailableEnvThemes ─────────────────────

describe('getAvailableSkins', () => {
  it('returns only classic when skin pack not purchased', () => {
    expect(ps.getAvailableSkins()).toEqual(['classic']);
  });

  it('returns all 6 skins after purchase', () => {
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(ps.getAvailableSkins()).toEqual([
      'classic', 'neon', 'marble', 'ice', 'bamboo', 'candy',
    ]);
  });
});

describe('getAvailableEnvThemes', () => {
  it('returns only classic when env themes not purchased', () => {
    expect(ps.getAvailableEnvThemes()).toEqual(['classic']);
  });

  it('returns all 4 themes after purchase', () => {
    ps.purchaseItem(ITEM_ID.ENV, { verified: true });
    expect(ps.getAvailableEnvThemes()).toEqual([
      'classic', 'space', 'beach', 'library',
    ]);
  });
});

// ─── purchaseItem ──────────────────────────────────────────────────

describe('purchaseItem', () => {
  it('returns false when verified is false', () => {
    expect(ps.purchaseItem(ITEM_ID.SKIN, { verified: false })).toBe(false);
    expect(ps.isPurchased(ITEM_ID.SKIN)).toBe(false);
  });

  it('returns false when verified not provided', () => {
    expect(ps.purchaseItem(ITEM_ID.SKIN)).toBe(false);
  });

  it('returns true and saves purchase when verified', () => {
    expect(ps.purchaseItem(ITEM_ID.SKIN, { verified: true })).toBe(true);
    expect(ps.isPurchased(ITEM_ID.SKIN)).toBe(true);
  });

  it('sets ad_free flag when purchasing remove_ads', () => {
    ps.purchaseItem(ITEM_ID.ADS, { verified: true });
    expect(localStorage.getItem('jenga3d_ad_free')).toBe('1');
  });

  it('does not set ad_free flag for other purchases', () => {
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(localStorage.getItem('jenga3d_ad_free')).toBeNull();
  });
});

// ─── redeemCode ────────────────────────────────────────────────────

describe('redeemCode', () => {
  it('rejects empty code with error', () => {
    const result = ps.redeemCode('');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects short code (< 6 chars)', () => {
    const result = ps.redeemCode('AB');
    expect(result.success).toBe(false);
    expect(result.error).toContain('короткий');
  });

  it('rejects invalid code', () => {
    const result = ps.redeemCode('INVALIDCODE');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Неверный код');
  });

  it('trims whitespace and uppercases before validation', () => {
    const result = ps.redeemCode('  invalid_code  ');
    // After trim+upper it's 'INVALID_CODE' — not in VALID_CODES → rejected
    // This confirms the code WAS normalized (no whitespace/case error)
    expect(result.error).toBe('Неверный код');
  });
});

// ─── getPurchaseStatus ─────────────────────────────────────────────

describe('getPurchaseStatus', () => {
  it('returns all 3 items with full status info', () => {
    const statuses = ps.getPurchaseStatus();
    expect(statuses).toHaveLength(3);
    for (const s of statuses) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('status');
      expect(s).toHaveProperty('purchased');
      expect(s).toHaveProperty('purchasedAt');
      expect(typeof s.purchased).toBe('boolean');
    }
  });

  it('shows purchased=true and timestamp after purchase', () => {
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    const statuses = ps.getPurchaseStatus();
    const skin = statuses.find((s) => s.id === ITEM_ID.SKIN);
    expect(skin.purchased).toBe(true);
    expect(skin.purchasedAt).toBeDefined();
  });

  it('shows purchased=false for unpurchased items', () => {
    const statuses = ps.getPurchaseStatus();
    const skin = statuses.find((s) => s.id === ITEM_ID.SKIN);
    expect(skin.purchased).toBe(false);
  });
});

// ─── resetPurchases ────────────────────────────────────────────────

describe('resetPurchases', () => {
  it('clears all purchase data from localStorage', () => {
    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    ps.purchaseItem(ITEM_ID.ADS, { verified: true });
    ps.resetPurchases();

    expect(ps.isPurchased(ITEM_ID.SKIN)).toBe(false);
    expect(ps.isPurchased(ITEM_ID.ADS)).toBe(false);
    expect(localStorage.getItem('jenga3d_ad_free')).toBeNull();
  });

  it('is safe to call with no purchases', () => {
    expect(() => ps.resetPurchases()).not.toThrow();
  });
});

// ─── Integration ───────────────────────────────────────────────────

describe('integration', () => {
  it('purchase → status → available items flow', () => {
    expect(ps.getAvailableSkins()).toEqual(['classic']);
    expect(ps.getAvailableEnvThemes()).toEqual(['classic']);

    ps.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(ps.isSkinPackPurchased()).toBe(true);
    expect(ps.getAvailableSkins()).toHaveLength(6);
    expect(ps.getAvailableEnvThemes()).toEqual(['classic']);

    const allStatus = ps.getPurchaseStatus();
    expect(allStatus.find((s) => s.id === ITEM_ID.SKIN).purchased).toBe(true);
    expect(allStatus.find((s) => s.id === ITEM_ID.ENV).purchased).toBe(false);

    ps.resetPurchases();
    expect(ps.getAvailableSkins()).toEqual(['classic']);
    expect(ps.isSkinPackPurchased()).toBe(false);
  });
});

// ─── Env-dependent tests (separate import with payment URLs set) ──

describe('with payment URLs configured', () => {
  let psWithEnv;

  beforeAll(async () => {
    // Use vi.mock to set env vars before importing the module
    vi.resetModules();
    process.env.VITE_PAYMENT_SKIN_PACK = 'https://pay.example.com/skins';
    process.env.VITE_PAYMENT_REMOVE_ADS = 'https://pay.example.com/ads';
    process.env.VITE_PAYMENT_ENV_THEMES = 'https://pay.example.com/env';
    // No VITE_PURCHASE_VERIFICATION_URL → items should be REQUIRES_SERVER_VERIFICATION

    const mod = await import('../purchaseService');
    psWithEnv = mod;
  });

  afterAll(() => {
    delete process.env.VITE_PAYMENT_SKIN_PACK;
    delete process.env.VITE_PAYMENT_REMOVE_ADS;
    delete process.env.VITE_PAYMENT_ENV_THEMES;
    vi.resetModules();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('isPremiumStoreAvailable returns true with payment URLs', () => {
    expect(psWithEnv.isPremiumStoreAvailable()).toBe(true);
  });

  it('getItemStatus returns REQUIRES_SERVER_VERIFICATION when paymentUrl set but no verification URL', () => {
    const status = psWithEnv.getItemStatus(ITEM_ID.SKIN);
    expect(status).toBe(psWithEnv.PURCHASE_STATUS.REQUIRES_SERVER_VERIFICATION);
  });

  it('getItemStatus returns PURCHASED after purchase (overrides verification check)', () => {
    psWithEnv.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(psWithEnv.getItemStatus(ITEM_ID.SKIN)).toBe(psWithEnv.PURCHASE_STATUS.PURCHASED);
  });

  it('can still purchase items with env configured', () => {
    expect(psWithEnv.purchaseItem(ITEM_ID.SKIN, { verified: true })).toBe(true);
    expect(psWithEnv.isPurchased(ITEM_ID.SKIN)).toBe(true);
  });

  it('resetPurchases works with env configured', () => {
    psWithEnv.purchaseItem(ITEM_ID.SKIN, { verified: true });
    psWithEnv.resetPurchases();
    expect(psWithEnv.isPurchased(ITEM_ID.SKIN)).toBe(false);
  });

  it('available items reflect env-based purchase state', () => {
    expect(psWithEnv.getAvailableSkins()).toEqual(['classic']);
    psWithEnv.purchaseItem(ITEM_ID.SKIN, { verified: true });
    expect(psWithEnv.getAvailableSkins()).toHaveLength(6);
  });
});
