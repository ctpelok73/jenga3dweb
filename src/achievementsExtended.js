/**
 * achievementsExtended.js — Расширенная система достижений с прогресс-барами
 *
 * Добавляет:
 * - 8 новых достижений (всего 20)
 * - Progress tracking для каждого достижения
 * - Difficulty-specific achievements
 * - Collection achievements
 */

export const ACHIEVEMENTS_EXTENDED = [
  // ─── Оригинальные достижения (12) ───
  {
    id: 'first_move',
    title: 'Первый ход',
    description: 'Сделай первый ход в игре',
    emoji: '👆',
    category: 'basic',
    condition: (stats) => stats.totalMoves >= 1,
    progress: (stats) => ({ current: stats.totalMoves, target: 1 }),
  },
  {
    id: 'five_moves',
    title: 'Начинающий',
    description: 'Сделай 5 ходов без падения',
    emoji: '🎯',
    category: 'moves',
    condition: (stats) => stats.bestTurns >= 5,
    progress: (stats) => ({ current: stats.bestTurns, target: 5 }),
  },
  {
    id: 'ten_moves',
    title: 'Строитель',
    description: 'Сделай 10 ходов без падения',
    emoji: '🏗️',
    category: 'moves',
    condition: (stats) => stats.bestTurns >= 10,
    progress: (stats) => ({ current: stats.bestTurns, target: 10 }),
  },
  {
    id: 'twenty_moves',
    title: 'Мастер',
    description: 'Сделай 20 ходов без падения',
    emoji: '🧠',
    category: 'moves',
    condition: (stats) => stats.bestTurns >= 20,
    progress: (stats) => ({ current: stats.bestTurns, target: 20 }),
  },
  {
    id: 'thirty_moves',
    title: 'Гроссмейстер',
    description: 'Сделай 30 ходов без падения',
    emoji: '🏆',
    category: 'moves',
    condition: (stats) => stats.bestTurns >= 30,
    progress: (stats) => ({ current: stats.bestTurns, target: 30 }),
  },
  {
    id: 'risk_taker',
    title: 'Риск-тейкер',
    description: 'Вытащи блок из нижних 3 слоёв',
    emoji: '⚡',
    category: 'risk',
    condition: (stats) => stats.bottomLayerPulls >= 1,
    progress: (stats) => ({ current: stats.bottomLayerPulls, target: 1 }),
  },
  {
    id: 'speed_demon',
    title: 'Быстрый',
    description: 'Сделай ход за 3 секунды после выбора',
    emoji: '⏱️',
    category: 'speed',
    condition: (stats) => stats.fastMoves >= 1,
    progress: (stats) => ({ current: stats.fastMoves, target: 1 }),
  },
  {
    id: 'steady_hand',
    title: 'Уверенная рука',
    description: 'Сделай 5 ходов подряд без падения',
    emoji: '🤚',
    category: 'streak',
    condition: (stats) => stats.streak >= 5,
    progress: (stats) => ({ current: stats.streak, target: 5 }),
  },
  {
    id: 'veteran',
    title: 'Ветеран',
    description: 'Сыграй 10 партий',
    emoji: '🎖️',
    category: 'games',
    condition: (stats) => stats.totalGames >= 10,
    progress: (stats) => ({ current: stats.totalGames, target: 10 }),
  },
  {
    id: 'centurion',
    title: 'Центурион',
    description: 'Сыграй 100 партий',
    emoji: '💯',
    category: 'games',
    condition: (stats) => stats.totalGames >= 100,
    progress: (stats) => ({ current: stats.totalGames, target: 100 }),
  },
  {
    id: 'comeback',
    title: 'Камбэк',
    description: 'После 3 падений подряд сделай 10+ ходов',
    emoji: '🔄',
    category: 'comeback',
    condition: (stats) => stats.comebackAchieved,
    progress: (stats) => ({ current: stats.comebackAchieved ? 1 : 0, target: 1 }),
  },
  {
    id: 'perfect_game',
    title: 'Идеальная игра',
    description: 'Сделай 25+ ходов без единого падения',
    emoji: '✨',
    category: 'moves',
    condition: (stats) => stats.bestTurns >= 25,
    progress: (stats) => ({ current: stats.bestTurns, target: 25 }),
  },

  // ─── Новые достижения (8) ───
  {
    id: 'streak_5',
    title: 'На волне',
    description: 'Выиграй 5 игр подряд',
    emoji: '🌊',
    category: 'streak',
    condition: (stats) => stats.winStreak >= 5,
    progress: (stats) => ({ current: stats.winStreak || 0, target: 5 }),
  },
  {
    id: 'streak_10',
    title: 'Неостановимый',
    description: 'Выиграй 10 игр подряд',
    emoji: '🚀',
    category: 'streak',
    condition: (stats) => stats.winStreak >= 10,
    progress: (stats) => ({ current: stats.winStreak || 0, target: 10 }),
  },
  {
    id: 'speed_20',
    title: 'Молния',
    description: 'Сделай 20 быстрых ходов (за 3 сек)',
    emoji: '⚡⚡',
    category: 'speed',
    condition: (stats) => stats.fastMoves >= 20,
    progress: (stats) => ({ current: stats.fastMoves, target: 20 }),
  },
  {
    id: 'speed_under_1min',
    title: 'Спринтер',
    description: 'Заверши игру за менее чем 1 минуту',
    emoji: '🏃',
    category: 'speed',
    condition: (stats) => stats.speedRuns >= 1,
    progress: (stats) => ({ current: stats.speedRuns || 0, target: 1 }),
  },
  {
    id: 'hard_mode_5',
    title: 'Смельчак',
    description: 'Выиграй 5 игр на сложности Hard',
    emoji: '💪',
    category: 'difficulty',
    condition: (stats) => stats.hardModeWins >= 5,
    progress: (stats) => ({ current: stats.hardModeWins || 0, target: 5 }),
  },
  {
    id: 'hard_mode_20',
    title: 'Легенда',
    description: 'Выиграй 20 игр на сложности Hard',
    emoji: '👑',
    category: 'difficulty',
    condition: (stats) => stats.hardModeWins >= 20,
    progress: (stats) => ({ current: stats.hardModeWins || 0, target: 20 }),
  },
  {
    id: 'all_skins',
    title: 'Коллекционер',
    description: 'Разблокируй все скины блоков',
    emoji: '🎨',
    category: 'collection',
    condition: (stats) => stats.skinsUnlocked >= 6,
    progress: (stats) => ({ current: stats.skinsUnlocked || 0, target: 6 }),
  },
  {
    id: 'all_themes',
    title: 'Путешественник',
    description: 'Разблокируй все темы окружения',
    emoji: '🌍',
    category: 'collection',
    condition: (stats) => stats.themesUnlocked >= 4,
    progress: (stats) => ({ current: stats.themesUnlocked || 0, target: 4 }),
  },
];

/**
 * Получить достижение по ID
 */
export function getAchievementById(id) {
  return ACHIEVEMENTS_EXTENDED.find(a => a.id === id);
}

/**
 * Получить достижения по категории
 */
export function getAchievementsByCategory(category) {
  return ACHIEVEMENTS_EXTENDED.filter(a => a.category === category);
}

/**
 * Получить прогресс достижения
 */
export function getAchievementProgress(achievement, stats) {
  if (!achievement.progress) return null;
  const { current, target } = achievement.progress(stats);
  return {
    current: Math.min(current, target),
    target,
    percentage: Math.round((Math.min(current, target) / target) * 100),
  };
}

/**
 * Получить все категории достижений
 */
export function getAchievementCategories() {
  const categories = new Set();
  ACHIEVEMENTS_EXTENDED.forEach(a => categories.add(a.category));
  return Array.from(categories);
}

/**
 * Получить статистику достижений
 */
export function getAchievementStats(unlockedIds, stats) {
  const total = ACHIEVEMENTS_EXTENDED.length;
  const unlocked = unlockedIds.length;
  const percentage = Math.round((unlocked / total) * 100);

  const byCategory = {};
  getAchievementCategories().forEach(cat => {
    const categoryAchievements = getAchievementsByCategory(cat);
    const categoryUnlocked = categoryAchievements.filter(a => unlockedIds.includes(a.id)).length;
    byCategory[cat] = {
      unlocked: categoryUnlocked,
      total: categoryAchievements.length,
      percentage: Math.round((categoryUnlocked / categoryAchievements.length) * 100),
    };
  });

  return {
    total,
    unlocked,
    percentage,
    byCategory,
  };
}
