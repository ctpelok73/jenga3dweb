import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Default settings shape ────────────────────────────────────────────────
// Must define defaults INSIDE vi.hoisted — hoisting runs before module-level code

const storeState = vi.hoisted(() => ({
  data: {
    volume: 70,
    moveTimer: 0,
    difficulty: 'normal',
    theme: 'classic',
    environment: 'classic',
  },
}));

vi.mock('../storage/createPersistedStore', () => ({
  createPersistedStore: vi.fn(() => ({
    load: () => ({ ...storeState.data }),
    save: (d) => { storeState.data = { ...d }; },
    update: (mutator) => {
      const current = { ...storeState.data };
      const next = mutator(current);
      if (next === undefined || next === null) return current;
      storeState.data = { ...next };
      return { ...storeState.data };
    },
    reset: () => {
      storeState.data = {
        volume: 70,
        moveTimer: 0,
        difficulty: 'normal',
        theme: 'classic',
        environment: 'classic',
      };
    },
  })),
}));

vi.mock('../towerConfig', () => ({
  BLOCK_H: 0.3,
  LAYER_GAP: 0.01,
}));

import * as settings from '../settingsTracker';

// ─── Module-level constant for test helpers ────────────────────────────────

const DEFAULT_SETTINGS = {
  volume: 70,
  moveTimer: 0,
  difficulty: 'normal',
  theme: 'classic',
  environment: 'classic',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeBlock(id, layer, x = 0, y = 0, z = 0) {
  return { id, layer, position: [x, y, z] };
}

function resetStore() {
  storeState.data = { ...DEFAULT_SETTINGS };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('settingsTracker', () => {
  beforeEach(() => {
    resetStore();
    // Force cache reset by calling resetSettings (which resets cache + store)
    settings.resetSettings();
  });

  // ─── getSettings ────────────────────────────────────────────────────

  describe('getSettings', () => {
    it('returns default settings on first call', () => {
      const s = settings.getSettings();
      expect(s.volume).toBe(70);
      expect(s.moveTimer).toBe(0);
      expect(s.difficulty).toBe('normal');
      expect(s.theme).toBe('classic');
      expect(s.environment).toBe('classic');
    });

    it('returns cached settings on subsequent calls without reloading from store', () => {
      const s1 = settings.getSettings();

      // Mutate store directly — cache should still return old value
      storeState.data.volume = 999;
      const s2 = settings.getSettings();

      expect(s2).toBe(s1);
      expect(s2.volume).toBe(70); // cached, not 999
    });

    it('reads from store after cache is invalidated', () => {
      const s1 = settings.getSettings();

      // Reset cache by calling resetSettings
      settings.resetSettings();

      const s2 = settings.getSettings();
      expect(s2.volume).toBe(70);
      // After reset, s2 is a fresh object
      expect(s2).not.toBe(s1);
    });
  });

  // ─── updateSetting ──────────────────────────────────────────────────

  describe('updateSetting', () => {
    it('updates a single key and updates cache', () => {
      const result = settings.updateSetting('volume', 50);
      expect(result.volume).toBe(50);
      expect(result.moveTimer).toBe(0);
    });

    it('returns updated settings from cache on next getSettings', () => {
      settings.updateSetting('volume', 30);
      const s = settings.getSettings();
      expect(s.volume).toBe(30);
    });

    it('preserves other keys when updating one', () => {
      settings.updateSetting('theme', 'neon');
      const s = settings.getSettings();
      expect(s.theme).toBe('neon');
      expect(s.volume).toBe(70);
      expect(s.difficulty).toBe('normal');
    });

    it('updates cache reference immediately', () => {
      const result = settings.updateSetting('volume', 15);
      const next = settings.getSettings();
      expect(next).toEqual(result);
    });
  });

  // ─── updateAllSettings ──────────────────────────────────────────────

  describe('updateAllSettings', () => {
    it('merges new settings into existing', () => {
      const result = settings.updateAllSettings({ volume: 100, theme: 'neon' });
      expect(result.volume).toBe(100);
      expect(result.theme).toBe('neon');
      expect(result.difficulty).toBe('normal'); // preserved
    });

    it('updates cache with merged result', () => {
      settings.updateAllSettings({ volume: 0, moveTimer: 30 });
      const s = settings.getSettings();
      expect(s.volume).toBe(0);
      expect(s.moveTimer).toBe(30);
    });

    it('overwrites existing keys', () => {
      settings.updateSetting('theme', 'marble');
      settings.updateAllSettings({ theme: 'ice', environment: 'neon' });
      const s = settings.getSettings();
      expect(s.theme).toBe('ice');
      expect(s.environment).toBe('neon');
    });
  });

  // ─── resetSettings ──────────────────────────────────────────────────

  describe('resetSettings', () => {
    it('resets to defaults', () => {
      settings.updateAllSettings({ volume: 5, difficulty: 'hard', theme: 'candy' });
      const result = settings.resetSettings();
      expect(result.volume).toBe(70);
      expect(result.difficulty).toBe('normal');
      expect(result.theme).toBe('classic');
    });

    it('invalidates cache so next getSettings reads fresh defaults', () => {
      settings.updateSetting('volume', 99);
      settings.resetSettings();
      const s = settings.getSettings();
      expect(s.volume).toBe(70);
    });
  });

  // ─── Helper for getDifficultyDynamicIds tests ────────────────────────

  function makeDifficultyBlocks() {
      return [
        // Layer 0 (y ~0.15)
        { id: 0, position: [0, 0.15, 0] },
        // Layer 1 (y ~0.46)
        { id: 1, position: [0, 0.46, 0] },
        { id: 2, position: [-0.26, 0.46, 0] },
        { id: 3, position: [0.26, 0.46, 0] },
        // Layer 2 (y ~0.77)
        { id: 4, position: [0, 0.77, 0] },
        { id: 5, position: [-0.26, 0.77, 0] },
        { id: 6, position: [0.26, 0.77, 0] },
        // Layer 3 (y ~1.08)
        { id: 7, position: [0, 1.08, 0] },
        { id: 8, position: [-0.26, 1.08, 0] },
        { id: 9, position: [0.26, 1.08, 0] },
      ];
    }

  // ─── getDifficultyDynamicIds ────────────────────────────────────────

  describe('getDifficultyDynamicIds', () => {
    describe('always includes selected block and blocks above hole', () => {
      it('includes the selected block itself', () => {
        const blocks = makeDifficultyBlocks();
        const selected = blocks[1];
        const ids = settings.getDifficultyDynamicIds(blocks, selected);
        expect(ids.has(1)).toBe(true);
      });

      it('includes blocks clearly above the hole', () => {
        const blocks = makeDifficultyBlocks();
        const selected = blocks[1]; // y=0.46 → holeY=0.46
        const ids = settings.getDifficultyDynamicIds(blocks, selected);
        // Blocks at y=0.77 and y=1.08 are above holeY+0.1=0.56
        expect(ids.has(4)).toBe(true);
        expect(ids.has(7)).toBe(true);
      });

      it('does not include blocks below the hole by default (normal difficulty)', () => {
        const blocks = makeDifficultyBlocks();
        const selected = blocks[4]; // y=0.77 → holeY=0.77
        const ids = settings.getDifficultyDynamicIds(blocks, selected);
        // With default 'normal', blocks below holeY+0.1 are only included
        // if they're on the same layer. Block 1 (y=0.46) is below the threshold.
        expect(ids.has(1)).toBe(false);
        expect(ids.has(0)).toBe(false);
      });
    });

    describe('difficulty = easy', () => {
      it('only includes selected block + blocks above, siblings stay fixed', () => {
        settings.updateSetting('difficulty', 'easy');
        const blocks = makeDifficultyBlocks();
        const selected = blocks[1]; // layer 1, y=0.46
        const ids = settings.getDifficultyDynamicIds(blocks, selected);

        expect(ids.has(1)).toBe(true);  // selected
        expect(ids.has(4)).toBe(true);  // above (y=0.77)
        expect(ids.has(7)).toBe(true);  // above (y=1.08)
        expect(ids.has(2)).toBe(false); // sibling (same Y)
        expect(ids.has(3)).toBe(false); // sibling (same Y)
        expect(ids.has(0)).toBe(false); // below
      });
    });

    describe('difficulty = normal', () => {
      it('includes selected + above + siblings (same layer)', () => {
        settings.updateSetting('difficulty', 'normal');
        const blocks = makeDifficultyBlocks();
        const selected = blocks[1]; // y=0.46
        const ids = settings.getDifficultyDynamicIds(blocks, selected);

        expect(ids.has(1)).toBe(true);  // selected
        expect(ids.has(2)).toBe(true);  // sibling (|y-0.46| < 0.1)
        expect(ids.has(3)).toBe(true);  // sibling
        expect(ids.has(4)).toBe(true);  // above
        expect(ids.has(7)).toBe(true);  // above
        expect(ids.has(0)).toBe(false); // below
      });
    });

    describe('difficulty = hard', () => {
      it('includes selected + above + siblings + one layer below', () => {
        settings.updateSetting('difficulty', 'hard');
        const blocks = makeDifficultyBlocks();
        const selected = blocks[4]; // layer 2, y=0.77
        const ids = settings.getDifficultyDynamicIds(blocks, selected);
        // Range: (0.77 - 0.31 - 0.1) = 0.36 to (0.77 + 0.1) = 0.87
        // In range: y=0.46 (blocks 1,2,3) and y=0.77 (blocks 4,5,6)
        // Above: y=1.08 (blocks 7,8,9)

        expect(ids.has(4)).toBe(true);  // selected
        expect(ids.has(5)).toBe(true);  // sibling
        expect(ids.has(6)).toBe(true);  // sibling
        expect(ids.has(1)).toBe(true);  // one layer below
        expect(ids.has(2)).toBe(true);  // one layer below
        expect(ids.has(3)).toBe(true);  // one layer below
        expect(ids.has(0)).toBe(false); // two layers below (y=0.15 < 0.36)
        expect(ids.has(7)).toBe(true);  // above
        expect(ids.has(8)).toBe(true);  // above
        expect(ids.has(9)).toBe(true);  // above
      });

      it('includes siblings and one layer below for top layer selection', () => {
        settings.updateSetting('difficulty', 'hard');
        const blocks = makeDifficultyBlocks();
        const selected = blocks[7]; // layer 3, y=1.08
        const ids = settings.getDifficultyDynamicIds(blocks, selected);
        // Range: (1.08 - 0.31 - 0.1) = 0.67 to (1.08 + 0.1) = 1.18
        // In range: y=0.77 (blocks 4,5,6 — one layer below)
        //             y=1.08 (blocks 7,8,9 — selected + siblings)

        expect(ids.has(7)).toBe(true);  // selected
        expect(ids.has(8)).toBe(true);  // sibling
        expect(ids.has(9)).toBe(true);  // sibling
        expect(ids.has(4)).toBe(true);  // one layer below
        expect(ids.has(5)).toBe(true);  // one layer below
        expect(ids.has(6)).toBe(true);  // one layer below
        expect(ids.has(1)).toBe(false); // two layers below
        expect(ids.has(0)).toBe(false); // far below
      });
    });

    describe('unknown difficulty falls through (default)', () => {
      it('only includes selected + above for unknown difficulty', () => {
        settings.updateSetting('difficulty', 'unknown');
        const blocks = makeDifficultyBlocks();
        const selected = blocks[1]; // layer 1
        const ids = settings.getDifficultyDynamicIds(blocks, selected);

        expect(ids.has(1)).toBe(true);  // selected
        expect(ids.has(4)).toBe(true);  // above
        expect(ids.has(7)).toBe(true);  // above
        expect(ids.has(2)).toBe(false); // sibling (not included in default)
        expect(ids.has(0)).toBe(false); // below
      });
    });
  });

  // ─── THEME_COLORS ───────────────────────────────────────────────────

  describe('THEME_COLORS', () => {
    it('has 6 themes', () => {
      expect(Object.keys(settings.THEME_COLORS)).toEqual([
        'classic', 'neon', 'marble', 'ice', 'bamboo', 'candy',
      ]);
    });

    it('each theme has exactly 10 colors', () => {
      for (const [name, colors] of Object.entries(settings.THEME_COLORS)) {
        expect(colors.length).toBe(10, `theme "${name}" should have 10 colors`);
      }
    });
  });

  // ─── getThemeColors ─────────────────────────────────────────────────

  describe('getThemeColors', () => {
    it('returns classic colors by default', () => {
      const colors = settings.getThemeColors();
      expect(colors).toEqual(settings.THEME_COLORS.classic);
    });

    it('returns colors for selected theme', () => {
      settings.updateSetting('theme', 'neon');
      const colors = settings.getThemeColors();
      expect(colors).toEqual(settings.THEME_COLORS.neon);
    });

    it('falls back to classic for unknown theme', () => {
      settings.updateSetting('theme', 'nonexistent');
      const colors = settings.getThemeColors();
      expect(colors).toEqual(settings.THEME_COLORS.classic);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('accepts unused removedLayer parameter without throwing', () => {
      const blocks = [
        { id: 1, position: [0, 0.46, 0] },
        { id: 2, position: [0, 0.77, 0] },
      ];
      const selected = blocks[0];
      // Function accepts removedLayer as third param but doesn't use it
      expect(() => settings.getDifficultyDynamicIds(blocks, selected, undefined)).not.toThrow();
      const ids = settings.getDifficultyDynamicIds(blocks, selected, undefined);
      expect(ids.has(1)).toBe(true);
      expect(ids.has(2)).toBe(true);
    });

    it('getDifficultyDynamicIds returns a Set', () => {
      const blocks = makeDifficultyBlocks();
      const selected = blocks[1];
      const ids = settings.getDifficultyDynamicIds(blocks, selected);
      expect(ids).toBeInstanceOf(Set);
    });

    it('empty blocks array returns empty Set (selected block not in blocks list)', () => {
      // The function only adds blocks that are in the blocks array.
      // If the selected block is not in the array, it's not added.
      const ids = settings.getDifficultyDynamicIds([], { id: 1, position: [0, 0, 0] });
      expect(ids.size).toBe(0);
    });
  });
});
