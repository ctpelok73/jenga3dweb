import { useEffect } from 'react';
import { handleKeyEvent } from '../keyboardController';
import { PLAYER_NAMES } from '../styles';

// ─── Константы фаз игры ────────────────────────────────────────────────────
const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';

/**
 * useKeyboardNavigation — хук клавиатурной навигации для Jenga 3D
 *
 * Инкапсулирует всю логику обработки клавиатурных событий,
 * вынесенную из App.jsx. Навешивает/снимает обработчик 'keydown'
 * на window через useEffect.
 *
 * @param {Object} params — все необходимые состояния и колбэки
 *
 * Состояние игры:
 * @param {string}       params.phase              — текущая фаза ('start' | 'playing' | 'gameOver')
 * @param {Set|null}     params.simulatingBlockIds  — блоки в динамическом режиме (null если нет)
 * @param {Array}        params.blocks             — массив блоков башни
 * @param {number}       params.topCompleteLayer   — верхний полный слой
 * @param {number|null}  params.keyboardFocusId    — ID блока в фокусе клавиатуры
 * @param {number|null}  params.selectedId         — ID выбранного блока
 * @param {boolean}      params.canMove            — можно ли сделать ход
 * @param {number}       params.playerMode         — режим (1=соло, 2=PvP, 3=ИИ)
 * @param {number}       params.currentPlayer      — текущий игрок (0 или 1)
 *
 * Состояние UI-панелей:
 * @param {boolean}      params.showSettings       — открыта ли панель настроек
 * @param {boolean}      params.showAchievements   — открыта ли панель достижений
 * @param {boolean}      params.showPauseMenu      — открыто ли меню паузы
 *
 * Колбэки действий:
 * @param {Function}     params.onBlockClick       — обработчик выбора блока (handleBlockClick)
 * @param {Function}     params.onMakeMove         — обработчик выполнения хода (handleMakeMove)
 * @param {Function}     params.onRestart          — обработчик перезапуска (handleRestart)
 * @param {Function}     params.onBackToMenu       — обработчик возврата в меню (handleBackToMenu)
 *
 * Сеттеры состояния:
 * @param {Function}     params.setKeyboardFocusId — установить ID блока в фокусе
 * @param {Function}     params.setSelectedId      — установить выбранный блок
 * @param {Function}     params.setMessage         — установить текстовое сообщение
 * @param {Function}     params.setAnnouncement    — установить объявление (для screen reader)
 * @param {Function}     params.setShowSettings    — управление панелью настроек
 * @param {Function}     params.setShowAchievements — управление панелью достижений
 * @param {Function}     params.setShowPauseMenu   — управление меню паузы
 *
 * Рефы:
 * @param {Object}       params.selectionTimeRef   — реф таймера выбора блока
 */
export function useKeyboardNavigation({
  // --- Состояние игры ---
  phase,
  simulatingBlockIds,
  blocks,
  topCompleteLayer,
  keyboardFocusId,
  selectedId,
  canMove,
  playerMode,
  currentPlayer,

  // --- Состояние UI-панелей ---
  showSettings,
  showAchievements,
  showPauseMenu,

  // --- Колбэки действий ---
  onBlockClick,
  onMakeMove,
  onRestart,
  onBackToMenu,

  // --- Сеттеры состояния ---
  setKeyboardFocusId,
  setSelectedId,
  setMessage,
  setAnnouncement,
  setShowSettings,
  setShowAchievements,
  setShowPauseMenu,

  // --- Рефы ---
  selectionTimeRef,
}) {
  useEffect(() => {
    /**
     * Обработчик нажатия клавиш.
     * Порядок проверок:
     *   1. Открыта панель настроек → Escape закрывает, остальное игнорируется
     *   2. Открыта панель достижений → Escape закрывает, остальное игнорируется
     *   3. Открыто меню паузы → меню обрабатывает свои клавиши само
     *   4. Фаза gameOver → Escape=в меню, Enter/Space=рестарт
     *   5. Не играем или идёт симуляция → m/Escape открывает паузу
     *   6. Играем → делегируем в handleKeyEvent из keyboardController
     */
    const onKeyDown = (e) => {
      // --- 1. Панель настроек открыта ---
      if (showSettings) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSettings(false);
          // Если играли — возвращаемся в меню паузы
          if (phase === PHASE_PLAYING) setShowPauseMenu(true);
        }
        return;
      }

      // --- 2. Панель достижений открыта ---
      if (showAchievements) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowAchievements(false);
          // Если играли — возвращаемся в меню паузы
          if (phase === PHASE_PLAYING) setShowPauseMenu(true);
        }
        return;
      }

      // --- 3. Меню паузы открыто — оно обрабатывает клавиши самостоятельно ---
      if (showPauseMenu) {
        return;
      }

      // --- 4. Экран окончания игры ---
      if (phase === PHASE_GAME_OVER) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onBackToMenu();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRestart();
        }
        return;
      }

      // --- 5. Не в игровой фазе или идёт симуляция физики ---
      if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) {
        if ((e.key === 'Escape' || e.key === 'm' || e.key === 'М') && phase === PHASE_PLAYING) {
          e.preventDefault();
          setShowPauseMenu(true);
        }
        return;
      }

      // --- 6. Активный геймплей — делегируем в keyboardController ---
      const result = handleKeyEvent(e, blocks, topCompleteLayer, keyboardFocusId, selectedId, canMove);
      if (!result) return;

      switch (result.action) {
        case 'focus':
          // Перемещение фокуса на блок (Tab, стрелки)
          setKeyboardFocusId(result.focusId);
          const focusBlock = blocks.find(b => b.id === result.focusId);
          if (focusBlock) setAnnouncement(`Блок ${result.focusId + 1}, слой ${focusBlock.layer + 1}`);
          break;

        case 'select':
          // Выбор блока клавишей Enter/Space
          setKeyboardFocusId(result.focusId);
          onBlockClick(result.focusId);
          setAnnouncement(`Блок ${result.focusId + 1} выбран`);
          break;

        case 'move':
          // Подтверждение хода (Enter/Space на уже выбранном блоке)
          onMakeMove();
          break;

        case 'deselect':
          // Отмена выбора блока (Escape)
          setSelectedId(null);
          setKeyboardFocusId(null);
          setMessage(
            playerMode === 2 || playerMode === 3
              ? `Ход: ${PLAYER_NAMES[currentPlayer]}. Выберите блок.`
              : 'Выберите блок.'
          );
          setAnnouncement('Блок отменён');
          if (selectionTimeRef) selectionTimeRef.current = null;
          break;

        case 'pause':
          // Открытие меню паузы (Escape без выбранного блока, или M)
          setShowPauseMenu(true);
          break;

        case 'restart':
          // Быстрый перезапуск (R)
          onRestart();
          break;
      }
    };

    // --- Подписка/отписка на события клавиатуры ---
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    // Зависимости эффекта — все читаемые значения и вызываемые функции
    phase,
    simulatingBlockIds,
    blocks,
    topCompleteLayer,
    keyboardFocusId,
    selectedId,
    canMove,
    playerMode,
    currentPlayer,
    onBlockClick,
    onMakeMove,
    onRestart,
    onBackToMenu,
    showSettings,
    showAchievements,
    showPauseMenu,
    setKeyboardFocusId,
    setSelectedId,
    setMessage,
    setAnnouncement,
    setShowSettings,
    setShowAchievements,
    setShowPauseMenu,
    selectionTimeRef,
  ]);
}

// ─── Экспорт по умолчанию ───────────────────────────────────────────────────
export default useKeyboardNavigation;
