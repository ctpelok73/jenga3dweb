import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Default stats shape (matches getDefaultStats in achievementsTracker) ──

const DEFAULT_STATS = {
  totalMoves: 0,
  bestTurns: 0,
  totalGames: 0,
  bottomLayerPulls: 0,
  fastMoves: 0,
  streak: 0,
  currentStreak: 0,
  consecutiveLosses: 0,
  comebackAchieved: false,
  winStreak: 0,
  speedRuns: 0,
  hardModeWins: 0,
  skinsUnlocked: 0,
  themesUnlocked: 0,
};

const DEFAULT_DATA = { unlocked: {}, stats: { ...DEFAULT_STATS } };

// ─── Mock store state (shared between mock factory and tests) ──────────────
// Must define defaults INSIDE vi.hoisted — hoisting runs before module-level code

const storeState = vi.hoisted(() => {
  const defaults = {
    unlocked: {},
    stats: {
      totalMoves: 0,
      bestTurns: 0,
      totalGames: 0,
      bottomLayerPulls: 0,
      fastMoves: 0,
      streak: 0,
      currentStreak: 0,
      consecutiveLosses: 0,
      comebackAchieved: false,
      winStreak: 0,
      speedRuns: 0,
      hardModeWins: 0,
      skinsUnlocked: 0,
      themesUnlocked: 0,
    },
  };
  return { data: { ...defaults } };
});

vi.mock('../storage/createPersistedStore', () => ({
  createPersistedStore: vi.fn(() => ({
    load: () => ({ ...storeState.data, unlocked: { ...storeState.data.unlocked }, stats: { ...storeState.data.stats } }),
    save: (d) => { storeState.data = { ...d, unlocked: { ...d.unlocked }, stats: { ...d.stats } }; },
    update: (mutator) => {
      const current = { ...storeState.data, unlocked: { ...storeState.data.unlocked }, stats: { ...storeState.data.stats } };
      const next = mutator(current);
      if (next === undefined || next === null) return current;
      storeState.data = { ...next, unlocked: { ...next.unlocked }, stats: { ...next.stats } };
      return { ...storeState.data, unlocked: { ...storeState.data.unlocked }, stats: { ...storeState.data.stats } };
    },
    reset: () => { storeState.data = { unlocked: {}, stats: { ...DEFAULT_STATS } }; },
  })),
}));

import * as tracker from '../achievementsTracker';

// ─── Helpers ───────────────────────────────────────────────────────────────

function resetStore() {
  storeState.data = { unlocked: {}, stats: { ...DEFAULT_STATS } };
}

function setStats(overrides) {
  storeState.data.stats = { ...storeState.data.stats, ...overrides };
}

function unlockAchievement(id) {
  storeState.data.unlocked[id] = { unlockedAt: new Date().toISOString() };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore();
});

describe('achievementsTracker', () => {
  // ─── getAchievementData ─────────────────────────────────────────────

  describe('getAchievementData', () => {
    it('returns default data when nothing saved', () => {
      const data = tracker.getAchievementData();
      expect(data.unlocked).toEqual({});
      expect(data.stats.totalMoves).toBe(0);
    });

    it('reflects persisted stats', () => {
      setStats({ totalMoves: 10, totalGames: 3 });
      const data = tracker.getAchievementData();
      expect(data.stats.totalMoves).toBe(10);
      expect(data.stats.totalGames).toBe(3);
    });

    it('reflects unlocked achievements', () => {
      unlockAchievement('first_move');
      unlockAchievement('veteran');
      const data = tracker.getAchievementData();
      expect(data.unlocked.first_move).toBeDefined();
      expect(data.unlocked.veteran).toBeDefined();
      expect(data.unlocked.centurion).toBeUndefined();
    });
  });

  // ─── getUnlockedAchievements / getLockedAchievements ─────────────────

  describe('getUnlockedAchievements', () => {
    it('returns empty array when nothing unlocked', () => {
      expect(tracker.getUnlockedAchievements()).toEqual([]);
    });

    it('returns only unlocked achievements', () => {
      unlockAchievement('first_move');
      unlockAchievement('five_moves');

      const unlocked = tracker.getUnlockedAchievements();
      const ids = unlocked.map((a) => a.id);
      expect(ids).toContain('first_move');
      expect(ids).toContain('five_moves');
      expect(ids).not.toContain('veteran');
    });
  });

  describe('getLockedAchievements', () => {
    it('returns all achievements when nothing unlocked', () => {
      // There are 20 achievements total
      const locked = tracker.getLockedAchievements();
      expect(locked.length).toBeGreaterThan(0);
      expect(locked.every((a) => a.id)).toBe(true);
    });

    it('excludes unlocked achievements', () => {
      unlockAchievement('first_move');
      const locked = tracker.getLockedAchievements();
      expect(locked.find((a) => a.id === 'first_move')).toBeUndefined();
    });
  });

  // ─── updateAchievementStats ─────────────────────────────────────────

  describe('updateAchievementStats', () => {
    it('updates stats and checks achievements', () => {
      const result = tracker.updateAchievementStats({ totalMoves: 1 });
      expect(result.data.stats.totalMoves).toBe(1);
      // first_move should unlock at totalMoves >= 1
      expect(result.newUnlocks.length).toBeGreaterThanOrEqual(1);
      expect(result.newUnlocks.some((a) => a.id === 'first_move')).toBe(true);
    });

    it('accepts existingData override', () => {
      const existing = {
        unlocked: {},
        stats: { ...DEFAULT_STATS, totalMoves: 5 },
      };
      const result = tracker.updateAchievementStats({ totalMoves: 6 }, existing);
      expect(result.data.stats.totalMoves).toBe(6);
    });

    it('detects comeback condition (3+ consecutive losses + 10+ current streak)', () => {
      setStats({ consecutiveLosses: 3, currentStreak: 10 });
      const result = tracker.updateAchievementStats({ currentStreak: 12 });
      expect(result.data.stats.comebackAchieved).toBe(true);
    });

    it('does not trigger comeback with < 3 losses', () => {
      setStats({ consecutiveLosses: 2, currentStreak: 10 });
      const result = tracker.updateAchievementStats({ currentStreak: 12 });
      expect(result.data.stats.comebackAchieved).toBe(false);
    });

    it('does not trigger comeback with < 10 streak', () => {
      setStats({ consecutiveLosses: 3, currentStreak: 5 });
      const result = tracker.updateAchievementStats({ currentStreak: 7 });
      expect(result.data.stats.comebackAchieved).toBe(false);
    });
  });

  // ─── recordMove ─────────────────────────────────────────────────────

  describe('recordMove', () => {
    it('increments totalMoves and currentStreak', () => {
      const result = tracker.recordMove(5, null);
      expect(result.data.stats.totalMoves).toBe(1);
      expect(result.data.stats.currentStreak).toBe(1);
      expect(result.data.stats.streak).toBe(1);
    });

    it('tracks bottom layer pulls (layers 0-2)', () => {
      tracker.recordMove(0, null);
      expect(tracker.getAchievementData().stats.bottomLayerPulls).toBe(1);

      tracker.recordMove(2, null);
      expect(tracker.getAchievementData().stats.bottomLayerPulls).toBe(2);

      tracker.recordMove(3, null);
      expect(tracker.getAchievementData().stats.bottomLayerPulls).toBe(2); // not bottom
    });

    it('tracks fast moves under 3 seconds', () => {
      tracker.recordMove(5, 2000);
      expect(tracker.getAchievementData().stats.fastMoves).toBe(1);
    });

    it('does not track slow moves', () => {
      tracker.recordMove(5, 5000);
      expect(tracker.getAchievementData().stats.fastMoves).toBe(0);
    });

    it('tracks null/undefined selectionTime as slow', () => {
      tracker.recordMove(5, null);
      expect(tracker.getAchievementData().stats.fastMoves).toBe(0);

      tracker.recordMove(5, undefined);
      expect(tracker.getAchievementData().stats.fastMoves).toBe(0);
    });

    it('updates streak to max(currentStreak, streak)', () => {
      tracker.recordMove(5, null); // streak=1
      tracker.recordMove(5, null); // streak=2
      expect(tracker.getAchievementData().stats.streak).toBe(2);
    });

    it('unlocks first_move achievement on first record', () => {
      const result = tracker.recordMove(5, null);
      expect(result.newUnlocks.some((a) => a.id === 'first_move')).toBe(true);
    });
  });

  // ─── recordCollapse ─────────────────────────────────────────────────

  describe('recordCollapse', () => {
    it('increments totalGames and consecutiveLosses', () => {
      tracker.recordCollapse(10);
      const stats = tracker.getAchievementData().stats;
      expect(stats.totalGames).toBe(1);
      expect(stats.consecutiveLosses).toBe(1);
    });

    it('resets currentStreak to 0', () => {
      tracker.recordMove(5, null); // streak=1
      tracker.recordCollapse(5);
      expect(tracker.getAchievementData().stats.currentStreak).toBe(0);
    });

    it('updates bestTurns when current turns exceed previous best', () => {
      tracker.recordCollapse(15);
      expect(tracker.getAchievementData().stats.bestTurns).toBe(15);

      tracker.recordCollapse(10); // lower, no change
      expect(tracker.getAchievementData().stats.bestTurns).toBe(15);

      tracker.recordCollapse(20); // higher, updates
      expect(tracker.getAchievementData().stats.bestTurns).toBe(20);
    });
  });

  // ─── recordSuccessfulMove ───────────────────────────────────────────

  describe('recordSuccessfulMove', () => {
    it('increments winStreak', () => {
      tracker.recordSuccessfulMove(5);
      expect(tracker.getAchievementData().stats.winStreak).toBe(1);

      tracker.recordSuccessfulMove(5);
      expect(tracker.getAchievementData().stats.winStreak).toBe(2);
    });

    it('updates bestTurns when turns is higher', () => {
      tracker.recordSuccessfulMove(10);
      expect(tracker.getAchievementData().stats.bestTurns).toBe(10);

      tracker.recordSuccessfulMove(5);
      expect(tracker.getAchievementData().stats.bestTurns).toBe(10);
    });
  });

  // ─── resetConsecutiveLosses ─────────────────────────────────────────

  describe('resetConsecutiveLosses', () => {
    it('sets consecutiveLosses to 0', () => {
      setStats({ consecutiveLosses: 5 });
      tracker.resetConsecutiveLosses();
      expect(tracker.getAchievementData().stats.consecutiveLosses).toBe(0);
    });

    it('does not affect other stats', () => {
      setStats({ totalGames: 3, consecutiveLosses: 5 });
      tracker.resetConsecutiveLosses();
      expect(tracker.getAchievementData().stats.totalGames).toBe(3);
    });
  });

  // ─── recordSpeedRun ─────────────────────────────────────────────────

  describe('recordSpeedRun', () => {
    it('increments speedRuns counter', () => {
      tracker.recordSpeedRun();
      expect(tracker.getAchievementData().stats.speedRuns).toBe(1);

      tracker.recordSpeedRun();
      expect(tracker.getAchievementData().stats.speedRuns).toBe(2);
    });
  });

  // ─── recordHardModeWin ──────────────────────────────────────────────

  describe('recordHardModeWin', () => {
    it('increments hardModeWins counter', () => {
      tracker.recordHardModeWin();
      expect(tracker.getAchievementData().stats.hardModeWins).toBe(1);

      tracker.recordHardModeWin();
      expect(tracker.getAchievementData().stats.hardModeWins).toBe(2);
    });
  });

  // ─── resetAchievements ──────────────────────────────────────────────

  describe('resetAchievements', () => {
    it('resets all data to defaults', () => {
      setStats({ totalMoves: 50, totalGames: 10, bestTurns: 25 });
      unlockAchievement('first_move');
      unlockAchievement('veteran');

      tracker.resetAchievements();

      const data = tracker.getAchievementData();
      expect(data.unlocked).toEqual({});
      expect(data.stats.totalMoves).toBe(0);
      expect(data.stats.totalGames).toBe(0);
      expect(data.stats.bestTurns).toBe(0);
    });
  });

  // ─── Integration: full game lifecycle ─────────────────────────────

  describe('integration', () => {
    it('records a full game: moves → collapse → moves', () => {
      // Game 1: make 3 moves then collapse
      const move1 = tracker.recordMove(5, 1000);
      // first_move unlocked on first recordMove
      expect(move1.newUnlocks.some((a) => a.id === 'first_move')).toBe(true);

      tracker.recordMove(5, 1000);
      tracker.recordMove(2, 5000); // bottom layer, slow
      tracker.recordCollapse(3);

      const stats1 = tracker.getAchievementData().stats;
      expect(stats1.totalMoves).toBe(3);
      expect(stats1.totalGames).toBe(1);
      expect(stats1.bottomLayerPulls).toBe(1);
      expect(stats1.fastMoves).toBe(2);
      expect(stats1.currentStreak).toBe(0);
      expect(stats1.bestTurns).toBe(3);

      // Game 2: make 5 moves then record successful
      for (let i = 0; i < 5; i++) tracker.recordMove(5, 1000);
      const succ = tracker.recordSuccessfulMove(5);

      expect(succ.data.stats.winStreak).toBe(1);
      expect(succ.data.stats.bestTurns).toBe(5);
    });
  });
});
