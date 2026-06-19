/**
 * shareService.js — Управление sharing и challenge links
 *
 * Функции:
 * - Генерация share-link с параметрами (tower seed, difficulty)
 * - Challenge Friend — отправить ссылку с конкретной башней
 * - Replay-функция — сохранять и воспроизводить ходы
 */

/** Максимальное количество хранимых replays в localStorage */
const MAX_REPLAYS = 10;

/**
 * Кодировать конфигурацию башни в URL-safe строку
 */
export function encodeTowerConfig(config) {
  const data = {
    seed: config.seed,
    difficulty: config.difficulty,
    theme: config.theme,
    envTheme: config.envTheme,
    timestamp: config.timestamp || Date.now(),
  };
  const json = JSON.stringify(data);
  const encoded = btoa(json); // Base64 encode
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Декодировать конфигурацию башни из URL
 */
export function decodeTowerConfig(encoded) {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padding = 4 - (padded.length % 4);
    const padded2 = padding < 4 ? padded + '='.repeat(padding) : padded;
    const json = atob(padded2);
    return JSON.parse(json);
  } catch (error) {
    console.error('[ShareService] Failed to decode tower config:', error);
    return null;
  }
}

/**
 * Генерировать share-link
 */
export function generateShareLink(config = {}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const encoded = encodeTowerConfig(config);
  return `${baseUrl}?challenge=${encoded}`;
}

/**
 * Получить конфигурацию из URL параметров
 */
export function getChallengeFromUrl() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const challenge = params.get('challenge');

  if (!challenge) return null;

  return decodeTowerConfig(challenge);
}

/**
 * Сохранить ходы игры для replay.
 * После сохранения автоматически удаляет самые старые записи,
 * если их количество превышает MAX_REPLAYS.
 */
export function saveGameReplay(gameId, moves, config) {
  try {
    const replay = {
      id: gameId,
      timestamp: Date.now(),
      config,
      moves,
      duration: moves.length > 0 ? moves[moves.length - 1].timestamp : 0,
    };

    const key = `jenga3d_replay_${gameId}`;
    localStorage.setItem(key, JSON.stringify(replay));

    // Pruning: удалить самые старые replays сверх лимита
    _pruneReplays();

    return gameId;
  } catch (error) {
    console.error('[ShareService] Failed to save replay:', error);
    return null;
  }
}

/**
 * Удалить самые старые replays, если их больше MAX_REPLAYS.
 * @private
 */
function _pruneReplays() {
  try {
    const all = listGameReplays(); // уже отсортированы по убыванию даты
    if (all.length > MAX_REPLAYS) {
      const toDelete = all.slice(MAX_REPLAYS); // самые старые
      for (const replay of toDelete) {
        localStorage.removeItem(`jenga3d_replay_${replay.id}`);
      }
    }
  } catch (e) {
    // Pruning — некритичная операция, игнорируем ошибки
  }
}

/**
 * Получить список всех сохранённых replays.
 * Безопасно обрабатывает повреждённые записи в localStorage.
 */
export function listGameReplays() {
  try {
    const replays = [];
    // Снимаем снапшот ключей, чтобы избежать проблем при итерации с изменяемым storage
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jenga3d_replay_')) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const replay = JSON.parse(raw);
        if (replay && replay.id) {
          replays.push(replay);
        }
      } catch (parseError) {
        // Запись повреждена — удаляем её и продолжаем
        console.warn('[ShareService] Removing corrupted replay entry:', key);
        try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
      }
    }
    return replays.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[ShareService] Failed to list replays:', error);
    return [];
  }
}

/**
 * Генерировать уникальный ID для игры
 */
export function generateGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Класс для управления replay-воспроизведением
 */
export class ReplayPlayer {
  constructor(replay) {
    this.replay = replay;
    this.currentMoveIndex = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1.0;
    this._timerId = null;
    this.callbacks = {
      onMove: null,
      onComplete: null,
      onPause: null,
    };
  }

  /**
   * Начать воспроизведение
   */
  play(onMove, onComplete) {
    this.callbacks.onMove = onMove;
    this.callbacks.onComplete = onComplete;

    if (!this.replay.moves || this.replay.moves.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this.isPlaying = true;
    this.playNextMove();
  }

  /**
   * Воспроизвести следующий ход
   */
  playNextMove() {
    if (!this.isPlaying || this.currentMoveIndex >= this.replay.moves.length) {
      this.isPlaying = false;
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete();
      }
      return;
    }

    const move = this.replay.moves[this.currentMoveIndex];
    const nextMove = this.replay.moves[this.currentMoveIndex + 1];

    if (this.callbacks.onMove) {
      this.callbacks.onMove(move);
    }

    this.currentMoveIndex++;

    // Рассчитать задержку до следующего хода
    const delay = nextMove
      ? (nextMove.timestamp - move.timestamp) / this.playbackSpeed
      : 1000;

    this._timerId = setTimeout(() => this.playNextMove(), delay);
  }

  /**
   * Пауза
   */
  pause() {
    this.isPlaying = false;
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
    if (this.callbacks.onPause) {
      this.callbacks.onPause();
    }
  }

  /**
   * Возобновить
   */
  resume() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.playNextMove();
    }
  }

  /**
   * Остановить и сбросить
   */
  stop() {
    this.isPlaying = false;
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
    this.currentMoveIndex = 0;
  }

  /**
   * Установить скорость воспроизведения
   */
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.25, Math.min(speed, 4));
  }

  /**
   * Перейти к определённому ходу
   */
  seekToMove(moveIndex) {
    this.currentMoveIndex = Math.max(0, Math.min(moveIndex, this.replay.moves.length - 1));
  }

  /**
   * Получить текущий прогресс
   */
  getProgress() {
    const total = this.replay.moves.length;
    return {
      current: this.currentMoveIndex,
      total,
      percentage: total > 0 ? Math.round((this.currentMoveIndex / total) * 100) : 0,
    };
  }
}
