import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPersistedStore } from '../storage/createPersistedStore';

const TEST_KEY = 'jenga3d_test_store';

beforeEach(() => {
  localStorage.clear();
});

function makeDefaultStore(overrides = {}) {
  return createPersistedStore({
    key: TEST_KEY,
    version: 1,
    defaults: { volume: 70, theme: 'classic' },
    ...overrides,
  });
}

function setStorage(data) {
  localStorage.setItem(TEST_KEY, JSON.stringify(data));
}

// ─── load ─────────────────────────────────────────────────────────────────

describe('load', () => {
  it('returns defaults when localStorage is empty', () => {
    const store = makeDefaultStore();
    expect(store.load()).toEqual({ volume: 70, theme: 'classic' });
  });

  it('returns defaults when localStorage contains null', () => {
    localStorage.setItem(TEST_KEY, 'null');
    const store = makeDefaultStore();
    expect(store.load()).toEqual({ volume: 70, theme: 'classic' });
  });

  it('returns defaults when stored value is malformed JSON', () => {
    localStorage.setItem(TEST_KEY, 'not-json');
    const store = makeDefaultStore();
    expect(store.load()).toEqual({ volume: 70, theme: 'classic' });
  });

  it('returns defaults when stored value is not an object', () => {
    localStorage.setItem(TEST_KEY, '"string"');
    const store = makeDefaultStore();
    expect(store.load()).toEqual({ volume: 70, theme: 'classic' });
  });

  it('spreads array elements as keys when stored value is an array', () => {
    localStorage.setItem(TEST_KEY, '["a","b"]');
    const store = makeDefaultStore();
    const result = store.load();
    // Arrays pass typeof === 'object', so they get spread as {0:'a', 1:'b'}
    expect(result.volume).toBe(70);
    expect(result.theme).toBe('classic');
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('b');
  });

  it('merges stored data with defaults on same version', () => {
    setStorage({ __version: 1, volume: 100 });
    const store = makeDefaultStore();
    const result = store.load();
    // __version is an implementation detail that leaks through load()
    expect(result).toMatchObject({ volume: 100, theme: 'classic' });
  });

  it('fills missing default keys when stored data has fewer fields', () => {
    setStorage({ __version: 1 });
    const store = makeDefaultStore();
    expect(store.load()).toMatchObject({ volume: 70, theme: 'classic' });
  });

  it('overrides stored values with defaults when stored data is an empty object', () => {
    setStorage({ __version: 1 });
    const store = makeDefaultStore({ defaults: { volume: 50, theme: 'neon', extra: true } });
    expect(store.load()).toMatchObject({ volume: 50, theme: 'neon', extra: true });
  });

  it('calls migrate when version differs and migrate is provided', () => {
    setStorage({ __version: 0, volume: 50 });
    const migrate = vi.fn(() => ({ volume: 100 }));
    const store = makeDefaultStore({ version: 2, migrate });
    const result = store.load();
    expect(migrate).toHaveBeenCalledWith(
      expect.objectContaining({ __version: 0, volume: 50 }),
      0,
    );
    expect(result).toEqual({ volume: 100, theme: 'classic' });
  });

  it('persists migration result so it is not re-applied on next load', () => {
    setStorage({ __version: 0, volume: 50 });
    const migrate = vi.fn(() => ({ volume: 100 }));
    const store = makeDefaultStore({ version: 2, migrate });

    store.load(); // first call — runs migration and saves
    migrate.mockClear();

    // After save (persisted with __version: 2), next load sees same version
    const result = store.load(); // second call — no migration needed
    expect(migrate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ volume: 100, theme: 'classic' });
  });

  it('does not call migrate when stored version matches current version', () => {
    setStorage({ __version: 1, volume: 80 });
    const migrate = vi.fn(() => ({}));
    const store = makeDefaultStore({ migrate });
    store.load();
    expect(migrate).not.toHaveBeenCalled();
  });

  it('does not call migrate when migrate is not provided even if version differs', () => {
    setStorage({ __version: 0, volume: 50 });
    const store = makeDefaultStore({ version: 2 }); // no migrate
    // Should return merged defaults + stored data without migration
    const result = store.load();
    expect(result).toMatchObject({ volume: 50, theme: 'classic' });
  });

  it('supports function defaults', () => {
    const store = createPersistedStore({
      key: TEST_KEY,
      defaults: () => ({ count: 0, items: [] }),
    });
    const data = store.load();
    expect(data).toEqual({ count: 0, items: [] });
  });

  it('returns a fresh copy of defaults on each call when empty', () => {
    const store = makeDefaultStore();
    const a = store.load();
    const b = store.load();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('calls migrate with the stored value and old version', () => {
    setStorage({ __version: 0, volume: 30 });
    const migrate = vi.fn(() => ({ volume: 90 }));
    const store = makeDefaultStore({ version: 2, migrate });
    const result = store.load();
    expect(migrate).toHaveBeenCalledWith(
      expect.objectContaining({ __version: 0, volume: 30 }),
      0,
    );
    expect(result.volume).toBe(90);
  });
});

// ─── save ─────────────────────────────────────────────────────────────────

describe('save', () => {
  it('stores data with version field', () => {
    const store = makeDefaultStore();
    const ok = store.save({ volume: 100, theme: 'neon' });
    expect(ok).toBe(true);
    const raw = localStorage.getItem(TEST_KEY);
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ volume: 100, theme: 'neon', __version: 1 });
  });

  it('returns true on successful write', () => {
    const store = makeDefaultStore();
    expect(store.save({})).toBe(true);
  });

  it('overwrites existing data', () => {
    setStorage({ __version: 1, volume: 50 });
    const store = makeDefaultStore();
    store.save({ volume: 99, theme: 'ice' });
    const loaded = store.load();
    expect(loaded).toMatchObject({ volume: 99, theme: 'ice' });
  });
});

// ─── update ───────────────────────────────────────────────────────────────

describe('update', () => {
  it('loads, mutates, saves, and returns the new data', () => {
    setStorage({ __version: 1, volume: 70, theme: 'classic' });
    const store = makeDefaultStore();
    const result = store.update((d) => ({ ...d, volume: 50 }));
    expect(result.volume).toBe(50);
    expect(result.theme).toBe('classic');

    // Verify it was persisted
    const loaded = store.load();
    expect(loaded.volume).toBe(50);
  });

  it('returns current data unchanged when mutator returns null', () => {
    setStorage({ __version: 1, volume: 70, theme: 'classic' });
    const store = makeDefaultStore();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = store.update(() => null);
    expect(result.volume).toBe(70);
    expect(warnSpy).toHaveBeenCalledWith(
      '[createPersistedStore] mutator returned falsy — changes discarded',
    );
    warnSpy.mockRestore();
  });

  it('returns current data unchanged when mutator returns undefined', () => {
    setStorage({ __version: 1, volume: 70, theme: 'classic' });
    const store = makeDefaultStore();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = store.update(() => undefined);
    expect(result.volume).toBe(70);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not persist when mutator returns falsy', () => {
    setStorage({ __version: 1, volume: 70, theme: 'classic' });
    const store = makeDefaultStore();
    store.update(() => null);
    const loaded = store.load();
    expect(loaded.volume).toBe(70); // unchanged
  });

  it('persists the mutated data when mutator returns a valid object', () => {
    setStorage({ __version: 1, volume: 70, theme: 'classic' });
    const store = makeDefaultStore();
    store.update((d) => ({ ...d, theme: 'neon' }));
    const loaded = store.load();
    expect(loaded.theme).toBe('neon');
  });
});

// ─── reset ────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('removes the key from localStorage', () => {
    setStorage({ __version: 1, volume: 70 });
    const store = makeDefaultStore();
    store.reset();
    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('does not throw when key does not exist', () => {
    const store = makeDefaultStore();
    expect(() => store.reset()).not.toThrow();
  });

  it('does not affect other localStorage keys', () => {
    localStorage.setItem('other_key', 'value');
    setStorage({ __version: 1, volume: 70 });
    const store = makeDefaultStore();
    store.reset();
    expect(localStorage.getItem('other_key')).toBe('value');
  });

  it('can be called multiple times without error', () => {
    const store = makeDefaultStore();
    expect(() => {
      store.reset();
      store.reset();
      store.reset();
    }).not.toThrow();
  });
});

// ─── End-to-end integration ───────────────────────────────────────────────

describe('integration', () => {
  it('full lifecycle: save → load → update → reset', () => {
    const store = makeDefaultStore();

    // Start empty
    expect(store.load()).toMatchObject({ volume: 70, theme: 'classic' });

    // Save custom data
    store.save({ volume: 30, theme: 'candy' });
    expect(store.load()).toMatchObject({ volume: 30, theme: 'candy' });

    // Update
    store.update((d) => ({ ...d, volume: 50 }));
    expect(store.load()).toMatchObject({ volume: 50, theme: 'candy' });

    // Reset
    store.reset();
    expect(store.load()).toMatchObject({ volume: 70, theme: 'classic' });
  });

  it('multiple stores with different keys do not interfere', () => {
    const storeA = createPersistedStore({
      key: 'store_a',
      defaults: { a: 1 },
    });
    const storeB = createPersistedStore({
      key: 'store_b',
      defaults: { b: 2 },
    });

    storeA.save({ a: 10 });
    storeB.save({ b: 20 });

    expect(storeA.load()).toMatchObject({ a: 10 });
    expect(storeB.load()).toMatchObject({ b: 20 });

    storeA.reset();
    expect(storeA.load()).toMatchObject({ a: 1 });
    expect(storeB.load()).toMatchObject({ b: 20 });
  });

  it('handles missing defaults gracefully', () => {
    const store = createPersistedStore({ key: TEST_KEY });
    // defaults is undefined — makeDefaults returns empty spread
    const data = store.load();
    expect(data).toEqual({});
  });
});
