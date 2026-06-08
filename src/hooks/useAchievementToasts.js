import { useRef, useCallback } from 'react';
import { playAchievementUnlock } from '../soundEngine';
import * as gameActions from './useGameReducer';

// ─── useAchievementToasts ───────────────────────────────────────────────────
//
// Хук-владелец очереди тостов достижений. Когда игрок разблокирует одно или
// несколько достижений за один ход, тосты показываются по очереди:
// каждый видимый 3.5 секунды, между ними пауза 300 мс.
//
// Хук НЕ владеет состоянием тоста — текущий показываемый тост лежит в
// reducer state (поле `achievementToast`); хук только диспатчит изменения
// через `gameActions.setAchievementToast`. Это значит JSX продолжает читать
// `state.achievementToast` без изменений.
//
// Параметры:
//   dispatch — useReducer dispatch функция игры
//
// Возвращает:
//   {
//     showAchievementNotification(unlocks) — поставить очередь тостов в показ.
//                                            Прерывает любую текущую очередь.
//     clearToasts() — очистить все pending таймеры (не трогает текущий
//                     отображаемый тост — это делает callback самого тоста).
//                     Вызывается из resetRoundState при рестарте/возврате
//                     в меню, чтобы старая очередь не "догнала" новый раунд.
//     timersRef — ref на массив active timer ids. Экспортируется для случаев,
//                 когда другие side-effect хуки тоже хотят складывать в него
//                 свои setTimeout (например, useGameSimulation для отложенных
//                 game-over звуков и screen shake).
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

export function useAchievementToasts(dispatch) {
  const timersRef = useRef([]);

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const showAchievementNotification = useCallback((newUnlocks) => {
    if (!newUnlocks || newUnlocks.length === 0) return;
    // Прервать текущую очередь — старые pending таймеры больше не релевантны
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    playAchievementUnlock();
    let idx = 0;
    const showNext = () => {
      if (idx < newUnlocks.length) {
        dispatch(gameActions.setAchievementToast(newUnlocks[idx]));
        idx++;
        const t1 = setTimeout(() => {
          dispatch(gameActions.setAchievementToast(null));
          const t2 = setTimeout(showNext, 300);
          timersRef.current.push(t2);
        }, 3500);
        timersRef.current.push(t1);
      }
    };
    showNext();
  }, [dispatch]);

  return { showAchievementNotification, clearToasts, timersRef };
}

export default useAchievementToasts;
