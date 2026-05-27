/**
 * shareService.js — Управление sharing и challenge links
 *
 * Функции:
 * - Генерация share-link с параметрами (tower seed, difficulty)
 * - Challenge Friend — отправить ссылку с конкретной башней
 * - Replay-функция — сохранять и воспроизводить ходы
 */

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
 * Генерировать challenge-link для друга
 */
export function generateChallengeLink(towerConfig, playerName = 'Игрок') {
  const config = {
    ...towerConfig,
    challengedBy: playerName,
    challengeType: 'tower', // или 'daily', 'speed', etc.
  };
  return generateShareLink(config);
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
 * Сохранить ходы игры для replay
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
    return gameId;
  } catch (error) {
    console.error('[ShareService] Failed to save replay:', error);
    return null;
  }
}

/**
 * Загрузить replay по ID
 */
export function loadGameReplay(gameId) {
  try {
    const key = `jenga3d_replay_${gameId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('[ShareService] Failed to load replay:', error);
    return null;
  }
}

/**
 * Получить список всех сохранённых replays
 */
export function listGameReplays() {
  try {
    const replays = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jenga3d_replay_')) {
        const raw = localStorage.getItem(key);
        const replay = JSON.parse(raw);
        replays.push(replay);
      }
    }
    return replays.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[ShareService] Failed to list replays:', error);
    return [];
  }
}

/**
 * Удалить replay
 */
export function deleteGameReplay(gameId) {
  try {
    const key = `jenga3d_replay_${gameId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('[ShareService] Failed to delete replay:', error);
    return false;
  }
}

/**
 * Генерировать уникальный ID для игры
 */
export function generateGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Генерировать seed для детерминированной башни
 */
export function generateTowerSeed(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Простой hash функция
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
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
    this.isPlaying = true;
    this.callbacks.onMove = onMove;
    this.callbacks.onComplete = onComplete;
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

    setTimeout(() => this.playNextMove(), delay);
  }

  /**
   * Пауза
   */
  pause() {
    this.isPlaying = false;
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
    return {
      current: this.currentMoveIndex,
      total: this.replay.moves.length,
      percentage: Math.round((this.currentMoveIndex / this.replay.moves.length) * 100),
    };
  }
}
