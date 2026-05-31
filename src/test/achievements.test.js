import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS_EXTENDED, getAchievementById, getAchievementsByCategory, getAchievementProgress, getAchievementCategories } from '../achievementsExtended';

describe('ACHIEVEMENTS_EXTENDED', () => {
  it('all achievements have unique IDs', () => {
    const ids = ACHIEVEMENTS_EXTENDED.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all achievements have required fields', () => {
    for (const a of ACHIEVEMENTS_EXTENDED) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.emoji).toBeTruthy();
      expect(a.category).toBeTruthy();
      expect(typeof a.condition).toBe('function');
    }
  });

  it('all conditions return boolean for empty stats', () => {
    const emptyStats = { totalMoves: 0, bestTurns: 0, bottomLayerPulls: 0, fastMoves: 0, streak: 0, totalGames: 0, comebackAchieved: false, winStreak: 0, speedRuns: 0, hardModeWins: 0, skinsUnlocked: 0, themesUnlocked: 0 };
    for (const a of ACHIEVEMENTS_EXTENDED) {
      const result = a.condition(emptyStats);
      expect(typeof result).toBe('boolean');
    }
  });

  it('all progress functions return valid progress', () => {
    const stats = { totalMoves: 5, bestTurns: 3, bottomLayerPulls: 1, fastMoves: 2, streak: 2, totalGames: 3, winStreak: 1 };
    for (const a of ACHIEVEMENTS_EXTENDED) {
      if (a.progress) {
        const p = getAchievementProgress(a, stats);
        expect(p.current).toBeGreaterThanOrEqual(0);
        expect(p.target).toBeGreaterThan(0);
        expect(p.percentage).toBeGreaterThanOrEqual(0);
        expect(p.percentage).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('getAchievementById', () => {
  it('returns correct achievement', () => {
    const a = getAchievementById('first_move');
    expect(a).toBeDefined();
    expect(a.id).toBe('first_move');
  });

  it('returns undefined for unknown ID', () => {
    expect(getAchievementById('nonexistent')).toBeUndefined();
  });
});

describe('getAchievementsByCategory', () => {
  it('returns achievements for known categories', () => {
    const categories = getAchievementCategories();
    for (const cat of categories) {
      const achievements = getAchievementsByCategory(cat);
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.every(a => a.category === cat)).toBe(true);
    }
  });
});
