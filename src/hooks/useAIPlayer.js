// src/hooks/useAIPlayer.js
import { useRef, useEffect } from 'react';
import { getRecentHistory } from '../scoreTracker';
import { chooseAIBlockAdvanced, aiPersonality, minimaxAI } from '../aiControllerAdvanced';
import { computeAIDropSlot, AI_THINK_DELAY, AI_MOVE_DELAY } from '../aiController';

/**
 * useAIPlayer — хук, инкапсулирующий логику хода ИИ-игрока.
 *
 * Запускает ход ИИ, когда выполнены условия:
 *   playerMode === 3, currentPlayer === 1, phase === 'playing',
 *   simulatingBlockIds === null, !aiThinking.
 *
 * @param {object} options
 * @param {number} options.playerMode      — режим игры (3 = «против ИИ»)
 * @param {number} options.currentPlayer   — индекс текущего игрока (1 = ИИ)
 * @param {string} options.phase           — фаза игры ('playing' и т.д.)
 * @param {Array|null} options.simulatingBlockIds — ID блоков в симуляции (null = нет)
 * @param {object} options.blocksRef       — ref на массив блоков (blocksRef.current)
 * @param {object} options.topCompleteLayerRef — ref на верхний полный слой
 * @param {object} options.executeMoveRef  — ref на функцию executeMove
 * @param {object} options.currentSettings — настройки (currentSettings.difficulty)
 * @param {function} options.onSelectBlock — callback(id) для установки selectedId
 * @param {function} options.onMessage     — callback(msg) для отображения сообщения
 *
 * @returns {{ aiThinking: boolean }}
 */
export function useAIPlayer({
  playerMode,
  currentPlayer,
  phase,
  simulatingBlockIds,
  blocksRef,
  topCompleteLayerRef,
  executeMoveRef,
  currentSettings,
  onSelectBlock,
  onMessage,
  aiThinking,
  onAiThinkingChange,
}) {
  // aiThinking comes from props so the reducer remains the single source of truth.

  // ─── Ref для таймеров ИИ (think / move / safety) ──────────────────────────
  const aiTimersRef = useRef([]);

  // ─── Очистка всех таймеров ИИ ─────────────────────────────────────────────
  const clearAITimers = () => {
    aiTimersRef.current.forEach(id => clearTimeout(id));
    aiTimersRef.current = [];
  };

  // ─── Эффект: запуск хода ИИ ───────────────────────────────────────────────
  // aiThinking исключён из зависимостей: его установка внутри эффекта
  // вызывает cleanup, что создало бы рекурсию.
  useEffect(() => {
    // Условия запуска: режим «против ИИ», ход ИИ, фаза playing, нет симуляции
    if (playerMode !== 3 || currentPlayer !== 1 || phase !== 'playing' || simulatingBlockIds !== null) return;
    if (aiThinking) return;

    onAiThinkingChange(true);
    onMessage('🤖 ИИ думает...');

    // --- Задержка «размышления» ИИ ---
    const t1 = setTimeout(() => {
      const currentBlocks = blocksRef.current;
      const currentTopLayer = topCompleteLayerRef.current;
      const difficulty = currentSettings.difficulty || 'normal';

      // Адаптируем AI-личность к результатам игрока
      const history = getRecentHistory(10);
      if (history.length > 0) {
        const wins = history.filter(h => !h.collapsed).length;
        aiPersonality.adaptToPlayer({ playerWinRate: wins / history.length });
      }

      // Для hard-сложности используем Minimax, для остальных — heuristic
      let aiBlock;
      if (difficulty === 'hard') {
        aiBlock = minimaxAI.findBestMove(currentBlocks, currentTopLayer, false);
      }
      // Fallback: если minimax вернул null или сложность не hard
      if (!aiBlock) {
        aiBlock = chooseAIBlockAdvanced(currentBlocks, currentTopLayer, aiPersonality, difficulty);
      }

      if (!aiBlock) {
        onAiThinkingChange(false);
        onMessage('🤖 ИИ не может найти блок!');
        return;
      }

      const dropSlot = computeAIDropSlot(currentBlocks, aiBlock);
      onSelectBlock(aiBlock.id);
      onMessage(`🤖 ИИ выбрал блок ${aiBlock.id + 1}, слой ${aiBlock.layer + 1}`);

      // --- Задержка перед выполнением хода ---
      const t2 = setTimeout(() => {
        if (executeMoveRef.current) executeMoveRef.current(dropSlot, aiBlock);
      }, AI_MOVE_DELAY);
      aiTimersRef.current.push(t2);

      // Safety timeout: если симуляция не завершилась за 8 секунд, сбрасываем AI
      const safetyTimeout = setTimeout(() => {
        onAiThinkingChange(false);
      }, 8000);
      aiTimersRef.current.push(safetyTimeout);
    }, AI_THINK_DELAY);
    aiTimersRef.current.push(t1);

    // Cleanup: отменяем все таймеры при размонтировании / повторном срабатывании
    return () => {
      clearAITimers();
    };
  }, [playerMode, currentPlayer, phase, simulatingBlockIds]); // aiThinking excluded: setting it inside triggers cleanup

  return { aiThinking };
}

export default useAIPlayer;