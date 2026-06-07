import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Фазы игры (константы, дублируем для независимости хука) ─────────────────
const PHASE_PLAYING = 'playing';

// ─── useTimers ──────────────────────────────────────────────────────────────────
//
// Хук инкапсулирует логику двух таймеров:
//   1. Таймер хода (moveTimer) — обратный отсчёт на каждый ход.
//      Если время вышло и блок выбран — автоматически выполняет ход.
//   2. Таймер скорости (speedTimer) — общий обратный отсчёт в режиме «speed».
//      Когда достигает нуля — вызывает onGameOver() для завершения игры.
//
// Параметры:
//   phase              — текущая фаза игры ('start' | 'playing' | 'gameOver')
//   simulatingBlockIds — массив id блоков в симуляции (null если нет)
//   turnCount          — номер текущего хода (для перезапуска таймера)
//   moveTimerSetting   — лимит хода в секундах (0 = выключен)
//   selectedId         — id выбранного блока (null если ничего не выбрано)
//   executeMoveRef     — ref на функцию executeMove для авто-хода
//   onGameOver         — колбэк для окончания игры (speed-таймер)
//
// Возвращает:
//   { moveTimeLeft, speedTimeLeft, startSpeedTimer, clearSpeedTimer }
// ─────────────────────────────────────────────────────────────────────────────────

export function useTimers({
  phase,
  simulatingBlockIds,
  turnCount,
  moveTimerSetting,
  selectedId,
  executeMoveRef,
  onGameOver,
}) {
  // ─── Состояние таймеров ──────────────────────────────────────────────────────
  const [moveTimeLeft, setMoveTimeLeft] = useState(null);
  const [speedTimeLeft, setSpeedTimeLeft] = useState(null);

  // ─── Рефы для intervalId (нужны для clearInterval внутри setInterval) ────────
  const moveTimerRef = useRef(null);
  const speedTimerRef = useRef(null);

  // ─── Таймер хода ─────────────────────────────────────────────────────────────
  // Запускается при переходе в фазу 'playing' с ненулевым лимитом.
  // Каждую секунду уменьшает moveTimeLeft на 1.
  // При достижении 0: очищает интервал и, если блок выбран, авто-выполняет ход.
  // При выходе из 'playing' или начале симуляции — сбрасывает таймер.
  useEffect(() => {
    const timerSetting = moveTimerSetting || 0;
    if (timerSetting === 0 || phase !== PHASE_PLAYING || simulatingBlockIds !== null) {
      setMoveTimeLeft(null);
      clearInterval(moveTimerRef.current);
      return;
    }

    setMoveTimeLeft(timerSetting);
    moveTimerRef.current = setInterval(() => {
      setMoveTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(moveTimerRef.current);
          // Время вышло — авто-ход если блок выбран
          if (selectedId !== null) {
            executeMoveRef.current(null);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(moveTimerRef.current);
  }, [phase, simulatingBlockIds, moveTimerSetting, turnCount]);

  // ─── Таймер скорости (speed mode) ────────────────────────────────────────────
  // Запускается вручную через startSpeedTimer() при старте игры в режиме speed.
  // Каждую секунду уменьшает speedTimeLeft на 1.
  // При достижении 0: очищает интервал и вызывает onGameOver().

  /**
   * Запуск таймера скорости.
   * @param {number} duration — длительность в секундах
   */
  const startSpeedTimer = useCallback((duration) => {
    // Очищаем предыдущий интервал на случай повторного запуска
    clearInterval(speedTimerRef.current);
    setSpeedTimeLeft(duration);
    speedTimerRef.current = setInterval(() => {
      setSpeedTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(speedTimerRef.current);
          // Время скоростного режима вышло — завершаем игру
          onGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onGameOver]);

  /**
   * Очистка таймера скорости (при возврате в меню и т.п.).
   */
  const clearSpeedTimer = useCallback(() => {
    clearInterval(speedTimerRef.current);
    setSpeedTimeLeft(null);
  }, []);

  return {
    moveTimeLeft,
    speedTimeLeft,
    startSpeedTimer,
    clearSpeedTimer,
  };
}

export default useTimers;
