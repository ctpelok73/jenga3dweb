import { useReducer } from 'react';

// ─── Типы действий (Action Types) ───────────────────────────────────────────

// Ядро игры
export const SET_PHASE = 'SET_PHASE';
export const SET_BLOCKS = 'SET_BLOCKS';
export const SET_SELECTED_ID = 'SET_SELECTED_ID';
export const SET_TURN_COUNT = 'SET_TURN_COUNT';
export const SET_PLAYER_MODE = 'SET_PLAYER_MODE';
export const SET_GAME_MODE = 'SET_GAME_MODE';
export const SET_CURRENT_PLAYER = 'SET_CURRENT_PLAYER';
export const INCREMENT_RESTART_KEY = 'INCREMENT_RESTART_KEY';

// UI-панели
export const TOGGLE_PANEL = 'TOGGLE_PANEL';

// Симуляция
export const SET_SIMULATION = 'SET_SIMULATION';

// Флаги состояния игры
export const SET_AI_THINKING = 'SET_AI_THINKING';
export const SET_SCREEN_SHAKE = 'SET_SCREEN_SHAKE';
export const SET_AD_FREE = 'SET_AD_FREE';
export const SET_CONTINUED_AFTER_COLLAPSE = 'SET_CONTINUED_AFTER_COLLAPSE';

// Сообщения
export const SET_MESSAGE = 'SET_MESSAGE';
export const SET_ANNOUNCEMENT = 'SET_ANNOUNCEMENT';
export const SET_KEYBOARD_FOCUS_ID = 'SET_KEYBOARD_FOCUS_ID';
export const SET_ACHIEVEMENT_TOAST = 'SET_ACHIEVEMENT_TOAST';

// Таймеры
export const SET_MOVE_TIME_LEFT = 'SET_MOVE_TIME_LEFT';
export const SET_SPEED_TIME_LEFT = 'SET_SPEED_TIME_LEFT';
export const SET_SPEED_DURATION = 'SET_SPEED_DURATION';
export const SET_DAILY_CHALLENGE_MODE = 'SET_DAILY_CHALLENGE_MODE';

// Таймеры выделения
export const SET_SELECTION_TIME_REF = 'SET_SELECTION_TIME_REF';

// Составные действия
export const RESET_ROUND = 'RESET_ROUND';
export const INIT_GAME = 'INIT_GAME';
export const EXECUTE_MOVE = 'EXECUTE_MOVE';
export const BACK_TO_MENU = 'BACK_TO_MENU';

// ─── Начальное состояние ────────────────────────────────────────────────────

/**
 * Проверяем localStorage на предмет прохождения туториала.
 * Если ключ 'tutorialSeen' установлен — туториал скрыт по умолчанию.
 */
const getInitialTutorialState = () => {
  try {
    return localStorage.getItem('jenga3d_tutorial_done') !== '1';
  } catch {
    return true;
  }
};

export const initialState = {
  // --- Ядро игры ---
  phase: 'start',            // 'start' | 'playing' | 'gameOver'
  blocks: [],                // Block[] — массив блоков башни
  selectedId: null,          // number | null — выбранный блок
  turnCount: 0,              // Счётчик ходов
  currentPlayer: 0,          // Текущий игрок: 0 или 1
  playerMode: 1,             // 1=соло, 2=pvp, 3=против ИИ
  gameMode: 'classic',       // 'classic' | 'speed'
  restartKey: 0,             // Ключ перезапуска (для принудительного ремаунта)

  // --- UI-панели ---
  showSettings: false,
  showAchievements: false,
  showPauseMenu: false,
  showDailyChallenge: false,
  showPurchase: false,
  showTutorial: getInitialTutorialState(),

  // --- Симуляция физики ---
  simulatingBlockIds: null,     // Set<number> | null — ID блоков в динамическом режиме
  lastMovedBlockId: null,       // ID последнего перемещённого блока
  lastExtractionPosition: null, // Позиция последнего извлечения

  // --- Флаги состояния ---
  continuedAfterCollapse: false, // Продолжили ли после обрушения
  aiThinking: false,             // ИИ думает
  screenShake: false,            // Тряска экрана (эффект)
  adFree: false,                 // Отключена ли реклама

  // --- Сообщения и уведомления ---
  message: '',                   // Текстовое сообщение
  announcement: '',              // Объявление (крупный текст)
  keyboardFocusId: null,         // ID блока в фокусе клавиатуры
  achievementToast: null,        // Тост достижения

  // --- Таймеры ---
  moveTimeLeft: null,            // Оставшееся время на ход
  speedTimeLeft: null,           // Оставшееся время в скоростном режиме
  speedDuration: 60,             // Длительность скоростного режима (сек)
  isDailyChallengeMode: false,  // Режим ежедневного испытания
  selectionTimeRef: 0,           // Время выделения блока (timestamp)
};

// ─── Значения для сброса раунда ─────────────────────────────────────────────

/**
 * Поля, которые сбрасываются при RESET_ROUND.
 * Используется в RESET_ROUND, INIT_GAME, BACK_TO_MENU.
 */
const roundResetFields = {
  selectedId: null,
  turnCount: 0,
  currentPlayer: 0,
  simulatingBlockIds: null,
  lastMovedBlockId: null,
  lastExtractionPosition: null,
  continuedAfterCollapse: false,
  keyboardFocusId: null,
  announcement: '',
  aiThinking: false,
  moveTimeLeft: null,
  speedTimeLeft: null,
  message: '',
  screenShake: false,
  achievementToast: null,
};

// ─── Маппинг имён панелей на ключи состояния ───────────────────────────────

const panelKeyMap = {
  settings: 'showSettings',
  achievements: 'showAchievements',
  pauseMenu: 'showPauseMenu',
  dailyChallenge: 'showDailyChallenge',
  purchase: 'showPurchase',
  tutorial: 'showTutorial',
};

// ─── Редьюсер ───────────────────────────────────────────────────────────────

/**
 * Главный редьюсер игры Jenga 3D.
 * Консолидирует ~25 useState-вызовов в единый управляемый стейт.
 *
 * @param {object} state  — текущее состояние
 * @param {object} action — { type, payload }
 * @returns {object} — новое состояние
 */
export function gameReducer(state, action) {
  const { type, payload } = action;

  switch (type) {
    // ── Ядро игры ──────────────────────────────────────────────────────

    case SET_PHASE:
      return { ...state, phase: payload };

    case SET_BLOCKS:
      return { ...state, blocks: payload };

    case SET_SELECTED_ID:
      return { ...state, selectedId: payload };

    case SET_TURN_COUNT:
      return { ...state, turnCount: payload };

    case SET_PLAYER_MODE:
      return { ...state, playerMode: payload };

    case SET_GAME_MODE:
      return { ...state, gameMode: payload };

    case SET_CURRENT_PLAYER:
      return { ...state, currentPlayer: payload };

    case INCREMENT_RESTART_KEY:
      return { ...state, restartKey: state.restartKey + 1 };

    // ── UI-панели ──────────────────────────────────────────────────────

    case TOGGLE_PANEL: {
      const key = panelKeyMap[payload.panel];
      if (!key) {
        console.warn(`[useGameReducer] Неизвестная панель: "${payload.panel}"`);
        return state;
      }
      return { ...state, [key]: payload.value };
    }

    // ── Симуляция ──────────────────────────────────────────────────────

    case SET_SIMULATION: {
      const updates = {};
      if (payload.simulatingBlockIds !== undefined) {
        updates.simulatingBlockIds = payload.simulatingBlockIds;
      }
      if (payload.lastMovedBlockId !== undefined) {
        updates.lastMovedBlockId = payload.lastMovedBlockId;
      }
      if (payload.lastExtractionPosition !== undefined) {
        updates.lastExtractionPosition = payload.lastExtractionPosition;
      }
      return { ...state, ...updates };
    }

    // ── Флаги состояния ────────────────────────────────────────────────

    case SET_AI_THINKING:
      return { ...state, aiThinking: payload };

    case SET_SCREEN_SHAKE:
      return { ...state, screenShake: payload };

    case SET_AD_FREE:
      return { ...state, adFree: payload };

    case SET_CONTINUED_AFTER_COLLAPSE:
      return { ...state, continuedAfterCollapse: payload };

    // ── Сообщения и уведомления ────────────────────────────────────────

    case SET_MESSAGE:
      return { ...state, message: payload };

    case SET_ANNOUNCEMENT:
      return { ...state, announcement: payload };

    case SET_KEYBOARD_FOCUS_ID:
      return { ...state, keyboardFocusId: payload };

    case SET_ACHIEVEMENT_TOAST:
      return { ...state, achievementToast: payload };

    // ── Таймеры ────────────────────────────────────────────────────────

    case SET_MOVE_TIME_LEFT:
      return { ...state, moveTimeLeft: payload };

    case SET_SPEED_TIME_LEFT:
      return { ...state, speedTimeLeft: payload };

    case SET_SPEED_DURATION:
      return { ...state, speedDuration: payload };

    case SET_DAILY_CHALLENGE_MODE:
      return { ...state, isDailyChallengeMode: payload };

    case SET_SELECTION_TIME_REF:
      return { ...state, selectionTimeRef: payload };

    // ── Составные действия ─────────────────────────────────────────────

    /**
     * RESET_ROUND — сброс данных текущего раунда.
     * Не затрагивает phase, blocks, playerMode, gameMode, restartKey,
     * UI-панели, adFree, message, achievementToast, speedDuration,
     * isDailyChallengeMode, screenShake.
     */
    case RESET_ROUND:
      return { ...state, ...roundResetFields };

    /**
     * INIT_GAME — инициализация новой игры.
     * Устанавливает phase='playing', загружает блоки, увеличивает restartKey,
     * и применяет логику RESET_ROUND.
     */
    case INIT_GAME:
      return {
        ...state,
        ...roundResetFields,
        phase: 'playing',
        blocks: payload.blocks,
        restartKey: state.restartKey + 1,
      };

    /**
     * EXECUTE_MOVE — атомарное выполнение хода.
     * Обновляет блоки, сбрасывает выделение, запоминает последний
     * перемещённый блок и позицию извлечения, увеличивает счётчик ходов,
     * устанавливает ID блоков для симуляции.
     */
    case EXECUTE_MOVE:
      return {
        ...state,
        blocks: payload.updatedBlocks,
        selectedId: null,
        lastMovedBlockId: payload.moveBlockId,
        turnCount: state.turnCount + 1,
        lastExtractionPosition: payload.extractionPosition,
        simulatingBlockIds: payload.dynamicIds,
      };

    /**
     * BACK_TO_MENU — возврат в главное меню.
     * Сбрасывает все данные раунда и переводит в фазу 'start'.
     * Если переданы блоки — устанавливает их (для предзагрузки сцены).
     */
    case BACK_TO_MENU:
      return {
        ...state,
        ...roundResetFields,
        phase: 'start',
        blocks: payload?.blocks ?? [],
        message: '',
        achievementToast: null,
        screenShake: false,
      };

    default:
      console.warn(`[useGameReducer] Неизвестный тип действия: "${type}"`);
      return state;
  }
}

// ─── Генераторы действий (Action Creators) ──────────────────────────────────

/** Инициализировать новую игру с переданным массивом блоков */
export const initGame = (blocks) => ({
  type: INIT_GAME,
  payload: { blocks },
});

/**
 * Выполнить ход — атомарное обновление за один dispatch.
 * @param {Block[]} updatedBlocks        — обновлённый массив блоков
 * @param {number}  moveBlockId          — ID перемещённого блока
 * @param {object}  extractionPosition   — позиция извлечения [x, y, z]
 * @param {Set<number>} dynamicIds       — ID блоков для физической симуляции
 */
export const executeMove = (updatedBlocks, moveBlockId, extractionPosition, dynamicIds) => ({
  type: EXECUTE_MOVE,
  payload: { updatedBlocks, moveBlockId, extractionPosition, dynamicIds },
});

/**
 * Переключить видимость UI-панели.
 * @param {string}  panel — имя панели: 'settings'|'achievements'|'pauseMenu'|'dailyChallenge'|'purchase'|'tutorial'
 * @param {boolean} value — показать (true) или скрыть (false)
 */
export const togglePanel = (panel, value) => ({
  type: TOGGLE_PANEL,
  payload: { panel, value },
});

/** Сбросить данные текущего раунда */
export const resetRound = () => ({
  type: RESET_ROUND,
});

/**
 * Вернуться в главное меню.
 * @param {Block[]} [blocks] — опциональный массив блоков для предзагрузки
 */
export const backToMenu = (blocks) => ({
  type: BACK_TO_MENU,
  payload: blocks ? { blocks } : undefined,
});

// ─── Action Creators ─────────────────────────────────────────────────────────

/** Установить фазу игры */
export const setPhase = (phase) => ({ type: SET_PHASE, payload: phase });

/** Установить массив блоков */
export const setBlocks = (blocks) => ({ type: SET_BLOCKS, payload: blocks });

/** Установить ID выбранного блока */
export const setSelectedId = (id) => ({ type: SET_SELECTED_ID, payload: id });

/** Установить счётчик ходов */
export const setTurnCount = (count) => ({ type: SET_TURN_COUNT, payload: count });

/** Установить режим игры (игроков) */
export const setPlayerMode = (mode) => ({ type: SET_PLAYER_MODE, payload: mode });

/** Установить режим игры (classic/speed) */
export const setGameMode = (mode) => ({ type: SET_GAME_MODE, payload: mode });

/** Установить текущего игрока */
export const setCurrentPlayer = (player) => ({ type: SET_CURRENT_PLAYER, payload: player });

/** Переключить видимость UI-панели (существующий) */
export const setShowSettings = (value) => togglePanel('settings', value);
export const setShowAchievements = (value) => togglePanel('achievements', value);
export const setShowPauseMenu = (value) => togglePanel('pauseMenu', value);
export const setShowDailyChallenge = (value) => togglePanel('dailyChallenge', value);
export const setShowPurchase = (value) => togglePanel('purchase', value);
export const setShowTutorial = (value) => togglePanel('tutorial', value);

/** Установить симулируемые блоки и связанные данные */
export const setSimulation = (simulatingBlockIds, lastMovedBlockId, lastExtractionPosition) => ({
  type: SET_SIMULATION,
  payload: { simulatingBlockIds, lastMovedBlockId, lastExtractionPosition },
});

/** Установить флаг "ИИ думает" */
export const setAiThinking = (value) => ({ type: SET_AI_THINKING, payload: value });

/** Установить флаг тряски экрана */
export const setScreenShake = (value) => ({ type: SET_SCREEN_SHAKE, payload: value });

/** Установить флаг без рекламы */
export const setAdFree = (value) => ({ type: SET_AD_FREE, payload: value });

/** Установить флаг продолжения после обрушения */
export const setContinuedAfterCollapse = (value) => ({ type: SET_CONTINUED_AFTER_COLLAPSE, payload: value });

/** Установить текстовое сообщение */
export const setMessage = (msg) => ({ type: SET_MESSAGE, payload: msg });

/** Установить объявление (крупный текст) */
export const setAnnouncement = (text) => ({ type: SET_ANNOUNCEMENT, payload: text });

/** Установить ID блока в фокусе клавиатуры */
export const setKeyboardFocusId = (id) => ({ type: SET_KEYBOARD_FOCUS_ID, payload: id });

/** Установить тост достижения */
export const setAchievementToast = (toast) => ({ type: SET_ACHIEVEMENT_TOAST, payload: toast });

/** Установить оставшееся время на ход */
export const setMoveTimeLeft = (time) => ({ type: SET_MOVE_TIME_LEFT, payload: time });

/** Установить оставшееся время в скоростном режиме */
export const setSpeedTimeLeft = (time) => ({ type: SET_SPEED_TIME_LEFT, payload: time });

/** Установить длительность скоростного режима */
export const setSpeedDuration = (duration) => ({ type: SET_SPEED_DURATION, payload: duration });

/** Установить режим ежедневного испытания */
export const setIsDailyChallengeMode = (value) => ({ type: SET_DAILY_CHALLENGE_MODE, payload: value });

/** Установить позицию последнего извлечения */
export const setLastExtractionPosition = (position) => ({ type: SET_SIMULATION, payload: { lastExtractionPosition: position } });

/** Установить ID последнего перемещённого блока */
export const setLastMovedBlockId = (id) => ({ type: SET_SIMULATION, payload: { lastMovedBlockId: id } });

/** Установить ID блоков для симуляции */
export const setSimulatingBlockIds = (ids) => ({ type: SET_SIMULATION, payload: { simulatingBlockIds: ids } });

/** Установить время выделения блока */
export const setSelectionTimeRef = (time) => ({ type: SET_SELECTION_TIME_REF, payload: time });

// ─── Хук ────────────────────────────────────────────────────────────────────

/**
 * useGameReducer — хук управления состоянием игры Jenga 3D.
 * Заменяет ~25 вызовов useState единым useReducer.
 *
 * @param {Block[]} [initialBlocks=[]] — начальный массив блоков (опционально)
 * @returns {[object, function]} — [state, dispatch]
 */
export function useGameReducer(initialBlocksOrFn = []) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => ({
    ...initialState,
    blocks: typeof initialBlocksOrFn === 'function' ? initialBlocksOrFn() : initialBlocksOrFn,
    showTutorial: getInitialTutorialState(),
  }));

  return [state, dispatch];
}

export default useGameReducer;
