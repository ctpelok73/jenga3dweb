// ─── Achievements Tracker: unlockable achievements with localStorage ───
// Tracks progress and unlocks achievements based on game events.
// Storage skeleton lives in `createPersistedStore`.

import { ACHIEVEMENTS_EXTENDED } from './achievementsExtended';
import { createPersistedStore } from './storage/createPersistedStore';

// ─── Achievement definitions ───
export const ACHIEVEMENTS = ACHIEVEMENTS_EXTENDED;

function getDefaultStats() {
  return {
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
}

const store = createPersistedStore({
  key: 'jenga3d_achievements',
  version: 1,
  defaults: () => ({ unlocked: {}, stats: getDefaultStats() }),
});

export function getAchievementData() {
  return store.load();
}

export function getUnlockedAchievements() {
  const data = store.load();
  return ACHIEVEMENTS.filter((a) => data.unlocked[a.id]);
}

export function getLockedAchievements() {
  const data = store.load();
  return ACHIEVEMENTS.filter((a) => !data.unlocked[a.id]);
}

// ─── Update stats and check for new unlocks ───
export function updateAchievementStats(statUpdates, existingData = null) {
  const data = existingData || store.load();
  const stats = { ...data.stats, ...statUpdates };

  // Check comeback condition
  if (stats.consecutiveLosses >= 3 && stats.currentStreak >= 10) {
    stats.comebackAchieved = true;
  }

  // Check all achievements for new unlocks
  const newUnlocks = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!data.unlocked[achievement.id] && achievement.condition(stats)) {
      data.unlocked[achievement.id] = {
        unlockedAt: new Date().toISOString(),
      };
      newUnlocks.push(achievement);
    }
  }

  data.stats = stats;
  store.save(data);

  return { data, newUnlocks };
}

// ─── Record a move event ───
export function recordMove(layer, selectionTimeMs) {
  const data = store.load();
  const stats = data.stats;

  stats.totalMoves += 1;
  stats.currentStreak += 1;
  if (stats.currentStreak > stats.streak) {
    stats.streak = stats.currentStreak;
  }

  // Bottom layer pull (layers 0-2)
  if (layer <= 2) {
    stats.bottomLayerPulls += 1;
  }

  // Fast move (within 3 seconds of selection)
  if (selectionTimeMs && selectionTimeMs < 3000) {
    stats.fastMoves += 1;
  }

  return updateAchievementStats(stats, data);
}

export function recordCollapse(turns) {
  const data = store.load();
  const stats = data.stats;

  stats.totalGames += 1;
  stats.currentStreak = 0;
  stats.consecutiveLosses += 1;

  if (turns > stats.bestTurns) {
    stats.bestTurns = turns;
  }

  return updateAchievementStats(stats, data);
}

export function recordSuccess(turns) {
  const data = store.load();
  const stats = data.stats;

  stats.totalGames += 1;
  stats.consecutiveLosses = 0;

  if (turns > stats.bestTurns) {
    stats.bestTurns = turns;
  }

  return updateAchievementStats(stats, data);
}

export function resetAchievements() {
  store.reset();
}

/**
 * Сбросить счётчик consecutiveLosses для корректного отслеживания winStreak
 */
export function resetConsecutiveLosses() {
  store.update((data) => {
    data.stats.consecutiveLosses = 0;
    return data;
  });
}

/**
 * Зафиксировать успешный ход без падения: увеличить winStreak и сбросить consecutiveLosses.
 * Не увеличивает totalGames — это делает только recordCollapse при завершении игры.
 */
export function recordSuccessfulMove(turns) {
  const data = store.load();
  const stats = data.stats;

  // winStreak = количество успешных ходов подряд без падения
  stats.winStreak = (stats.winStreak || 0) + 1;

  if (turns > stats.bestTurns) {
    stats.bestTurns = turns;
  }

  return updateAchievementStats(stats, data);
}