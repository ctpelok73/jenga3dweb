// ─── Achievements Tracker: unlockable achievements with localStorage ───
// Tracks progress and unlocks achievements based on game events

import { ACHIEVEMENTS_EXTENDED } from './achievementsExtended';

const ACHIEVEMENTS_KEY = 'jenga3d_achievements';

// ─── Achievement definitions ───
export const ACHIEVEMENTS = ACHIEVEMENTS_EXTENDED;

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return { unlocked: {}, stats: getDefaultStats() };
    return JSON.parse(raw);
  } catch {
    return { unlocked: {}, stats: getDefaultStats() };
  }
}

function saveAchievements(data) {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

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

export function getAchievementData() {
  return loadAchievements();
}

export function getUnlockedAchievements() {
  const data = loadAchievements();
  return ACHIEVEMENTS.filter((a) => data.unlocked[a.id]);
}

export function getLockedAchievements() {
  const data = loadAchievements();
  return ACHIEVEMENTS.filter((a) => !data.unlocked[a.id]);
}

// ─── Update stats and check for new unlocks ───
export function updateAchievementStats(statUpdates, existingData = null) {
  const data = existingData || loadAchievements();
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
  saveAchievements(data);

  return { data, newUnlocks };
}

// ─── Record a move event ───
export function recordMove(layer, selectionTimeMs) {
  const data = loadAchievements();
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
  const data = loadAchievements();
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
  const data = loadAchievements();
  const stats = data.stats;

  stats.totalGames += 1;
  stats.consecutiveLosses = 0;

  if (turns > stats.bestTurns) {
    stats.bestTurns = turns;
  }

  return updateAchievementStats(stats, data);
}

export function resetAchievements() {
  localStorage.removeItem(ACHIEVEMENTS_KEY);
}

/**
 * Сбросить счётчик consecutiveLosses для корректного отслеживания winStreak
 */
export function resetConsecutiveLosses() {
  const data = loadAchievements();
  data.stats.consecutiveLosses = 0;
  saveAchievements(data);
}

/**
 * Зафиксировать успешный ход без падения: увеличить winStreak и сбросить consecutiveLosses.
 * Не увеличивает totalGames — это делает только recordCollapse при завершении игры.
 */
export function recordSuccessfulMove(turns) {
  const data = loadAchievements();
  const stats = data.stats;

  // winStreak = количество успешных ходов подряд без падения
  stats.winStreak = (stats.winStreak || 0) + 1;

  if (turns > stats.bestTurns) {
    stats.bestTurns = turns;
  }

  return updateAchievementStats(stats, data);
}