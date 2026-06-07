/**
 * aiControllerAdvanced.js — Улучшенный AI-противник с анализом stability
 *
 * Стратегии:
 * - Анализ физической устойчивости каждого блока
 * - Minimax-алгоритм для hard mode
 * - Адаптивный AI в зависимости от игрока
 * - Personality (агрессивный/консервативный стиль)
 */

import { BLOCKS_PER_LAYER, STEP, BLOCK_H, LAYER_GAP } from './towerConfig';

/**
 * Анализировать физическую устойчивость блока
 * Возвращает score от 0 (очень нестабильно) до 1 (очень стабильно)
 */
export function analyzeBlockStability(block, blocks) {
  let stabilityScore = 0.5; // Base score

  // 1. Позиция в слое (центральные блоки более стабильны)
  const isOdd = block.layer % 2 === 1;
  const val = isOdd ? block.position[0] : block.position[2];
  const slotIndex = Math.round((val + STEP) / STEP);
  const isCentral = slotIndex === 1;
  const isSide = slotIndex === 0 || slotIndex === BLOCKS_PER_LAYER - 1;

  if (isCentral) {
    stabilityScore += 0.3; // Центральные блоки стабильнее
  } else if (isSide) {
    stabilityScore -= 0.2; // Боковые блоки менее стабильны
  }

  // 2. Количество блоков в слое (полный слой = более стабилен)
  const blocksInLayer = blocks.filter(b => b.layer === block.layer).length;
  const layerCompleteness = blocksInLayer / BLOCKS_PER_LAYER;
  stabilityScore += layerCompleteness * 0.2;

  // 3. Поддержка снизу (есть ли полный слой ниже)
  if (block.layer > 0) {
    const layerBelow = block.layer - 1;
    const blocksBelow = blocks.filter(b => b.layer === layerBelow).length;
    const supportCompleteness = blocksBelow / BLOCKS_PER_LAYER;
    stabilityScore += supportCompleteness * 0.2;
  }

  // 4. Высота (блоки выше менее стабильны)
  const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
  const heightPenalty = (block.layer / maxLayer) * 0.1;
  stabilityScore -= heightPenalty;

  return Math.max(0, Math.min(1, stabilityScore));
}

/**
 * Оценить риск вытаскивания блока
 * Возвращает score от 0 (безопасно) до 1 (очень рискованно)
 */
export function evaluateBlockRisk(block, blocks) {
  const stability = analyzeBlockStability(block, blocks);
  // Риск = обратная устойчивость
  return 1 - stability;
}

/**
 * Оценить влияние вытаскивания блока на общую устойчивость башни
 */
export function evaluateTowerImpact(block, blocks) {
  // Если удалить этот блок, как это повлияет на остальные блоки в слое?
  const blocksInLayer = blocks.filter(b => b.layer === block.layer && b.id !== block.id);
  const remainingBlocks = blocksInLayer;

  if (remainingBlocks.length === 0) {
    // Последний блок в слое — высокий риск
    return 1.0;
  }

  // Башня без удаляемого блока — реалистичная оценка поддержки оставшихся блоков
  const blocksWithoutRemoved = blocks.filter(b => b.id !== block.id);

  // Оценить стабильность оставшихся блоков в башне без удалённого
  let totalStability = 0;
  for (const b of remainingBlocks) {
    totalStability += analyzeBlockStability(b, blocksWithoutRemoved);
  }
  const avgStability = totalStability / remainingBlocks.length;

  // Если оставшиеся блоки нестабильны, это плохо
  return 1 - avgStability;
}

/**
 * Класс для управления поведением AI
 */
export class AIPersonality {
  constructor(type = 'normal') {
    this.type = type; // 'aggressive', 'normal', 'conservative'
    this.riskTolerance = this.getRiskTolerance();
    this.adaptiveLevel = 0; // Адаптивность к игроку (0-1)
  }

  getRiskTolerance() {
    switch (this.type) {
      case 'aggressive':
        return 0.7; // Готов рисковать
      case 'conservative':
        return 0.3; // Избегает риска
      default:
        return 0.5; // Сбалансированный
    }
  }

  /**
   * Адаптировать поведение на основе результатов игрока
   */
  adaptToPlayer(playerStats) {
    // Если игрок хорошо играет, AI становится более агрессивным
    if (playerStats.playerWinRate > 0.6) {
      this.adaptiveLevel = Math.min(1, this.adaptiveLevel + 0.1);
    } else if (playerStats.playerWinRate < 0.3) {
      this.adaptiveLevel = Math.max(0, this.adaptiveLevel - 0.1);
    }
  }

  /**
   * Получить адаптированный tolerance
   */
  getAdaptedTolerance() {
    // Увеличить tolerance, если игрок хорошо играет
    return this.riskTolerance + (this.adaptiveLevel * 0.2);
  }
}

/**
 * Minimax-алгоритм для hard mode
 */
export class MinimaxAI {
  constructor(depth = 3) {
    this.depth = depth;
  }

  /**
   * Найти лучший ход с помощью minimax
   */
  findBestMove(blocks, topCompleteLayer, isMaximizing = false) {
    const candidates = blocks.filter(b => b.layer < topCompleteLayer);
    if (candidates.length === 0) return null;

    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestBlock = null;

    for (const block of candidates) {
      const score = this.minimax(blocks, block, this.depth - 1, !isMaximizing);
      if ((isMaximizing && score > bestScore) || (!isMaximizing && score < bestScore)) {
        bestScore = score;
        bestBlock = block;
      }
    }

    return bestBlock;
  }

  /**
   * Рекурсивная minimax функция
   * Симулирует удаление выбранного блока перед переходом на следующий уровень.
   */
  minimax(blocks, selectedBlock, depth, isMaximizing) {
    // Симулировать башню после удаления выбранного блока
    const blocksAfterRemoval = blocks.filter(b => b.id !== selectedBlock.id);

    // Базовый случай: оценить текущее состояние (уже без selectedBlock)
    if (depth === 0) {
      return this.evaluatePosition(blocksAfterRemoval, selectedBlock);
    }

    const maxLayer = blocksAfterRemoval.reduce((m, bl) => Math.max(m, bl.layer), 0);
    const candidates = blocksAfterRemoval.filter(b => b.layer < maxLayer);
    if (candidates.length === 0) {
      return this.evaluatePosition(blocksAfterRemoval, selectedBlock);
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const block of candidates.slice(0, 3)) { // Ограничить количество вариантов
        const score = this.minimax(blocksAfterRemoval, block, depth - 1, false);
        maxScore = Math.max(maxScore, score);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const block of candidates.slice(0, 3)) {
        const score = this.minimax(blocksAfterRemoval, block, depth - 1, true);
        minScore = Math.min(minScore, score);
      }
      return minScore;
    }
  }

  /**
   * Оценить позицию.
   *
   * Convention: lower score = better (safer). Both `risk` and `impact` are
   * already in [0, 1] where 0 = safe, 1 = dangerous. `findBestMove` runs with
   * `isMaximizing=false` and picks the lowest-scoring block — i.e. the safest.
   * Mirrors the "lower risk wins" sign used in `chooseAIBlockAdvanced`.
   */
  evaluatePosition(blocks, selectedBlock) {
    const risk = evaluateBlockRisk(selectedBlock, blocks);
    const impact = evaluateTowerImpact(selectedBlock, blocks);

    return risk * 0.5 + impact * 0.5;
  }
}

/**
 * Выбрать блок с учётом AI personality и стратегии
 */
export function chooseAIBlockAdvanced(blocks, topCompleteLayer, personality, difficulty) {
  const candidates = blocks.filter(b => b.layer < topCompleteLayer);
  if (candidates.length === 0) return null;

  // Оценить каждый блок
  const scored = candidates.map(block => {
    const risk = evaluateBlockRisk(block, blocks);
    const impact = evaluateTowerImpact(block, blocks);
    const stability = analyzeBlockStability(block, blocks);

    let score = 0;

    // Базовая оценка: предпочитать более стабильные блоки
    score += stability * 100;

    // Учитывать personality
    const tolerance = personality.getAdaptedTolerance();
    if (tolerance > 0.6) {
      // Агрессивный стиль: рисковать
      score -= risk * 50;
    } else if (tolerance < 0.4) {
      // Консервативный стиль: избегать риска
      score -= risk * 150;
    } else {
      // Нормальный стиль: баланс
      score -= risk * 100;
    }

    // Штраф за высокое влияние
    score -= impact * 80;

    // Добавить случайность
    if (difficulty === 'easy') {
      score += (Math.random() - 0.5) * 50;
    } else if (difficulty === 'normal') {
      score += (Math.random() - 0.5) * 20;
    } else {
      score += (Math.random() - 0.5) * 5;
    }

    return { block, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].block;
}

/**
 * Singleton instances
 */
export const aiPersonality = new AIPersonality('normal');
export const minimaxAI = new MinimaxAI(3);
