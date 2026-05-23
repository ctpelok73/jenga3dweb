// ─── Achievements Tracker: unlockable achievements with localStorage ───
// Tracks progress and unlocks achievements based on game events

const ACHIEVEMENTS_KEY = 'jenga3d_achievements';

// ─── Achievement definitions ───
export const ACHIEVEMENTS = [
  {
    id: 'first_move',
    title: 'Первый ход',
    description: 'Сделай первый ход в игре',
    emoji: '👆',
    condition: (stats) => stats.totalMoves >= 1,
  },
  {
    id: 'five_moves',
    title: 'Начинающий',
    description: 'Сделай 5 ходов без падения',
    emoji: '🎯',
    condition: (stats) => stats.bestTurns >= 5,
  },
  {
    id: 'ten_moves',
    title: 'Строитель',
    description: 'Сделай 10 ходов без падения',
    emoji: '🏗️',
    condition: (stats) => stats.bestTurns >= 10,
  },
  {
    id: 'twenty_moves',
    title: 'Мастер',
    description: 'Сделай 20 ходов без падения',
    emoji: '🧠',
    condition: (stats) => stats.bestTurns >= 20,
  },
  {
    id: 'thirty_moves',
    title: 'Гроссмейстер',
    description: 'Сделай 30 ходов без падения',
    emoji: '🏆',
    condition: (stats) => stats.bestTurns >= 30,
  },
  {
    id: 'risk_taker',
    title: 'Риск-тейкер',
    description: 'Вытащи блок из нижних 3 слоёв',
    emoji: '⚡',
    condition: (stats) => stats.bottomLayerPulls >= 1,
  },
  {
    id: 'speed_demon',
    title: 'Быстрый',
    description: 'Сделай ход за 3 секунды после выбора',
    emoji: '⏱️',
    condition: (stats) => stats.fastMoves >= 1,
  },
  {
    id: 'steady_hand',
    title: 'Уверенная рука',
    description: 'Сделай 5 ходов подряд без падения',
    emoji: '🤚',
    condition: (stats) => stats.streak >= 5,
  },
  {
    id: 'veteran',
    title: 'Ветеран',
    description: 'Сыграй 10 партий',
    emoji: '🎖️',
    condition: (stats) => stats.totalGames >= 10,
  },
  {
    id: 'centurion',
    title: 'Центурион',
    description: 'Сыграй 100 партий',
    emoji: '💯',
    condition: (stats) => stats.totalGames >= 100,
  },
  {
    id: 'comeback',
    title: 'Камбэк',
    description: 'После 3 падений подряд сделай 10+ ходов',
    emoji: '🔄',
    condition: (stats) => stats.comebackAchieved,
  },
  {
    id: 'perfect_game',
    title: 'Идеальная игра',
    description: 'Сделай 25+ ходов без единого падения',
    emoji: '✨',
    condition: (stats) => stats.bestTurns >= 25,
  },
];

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