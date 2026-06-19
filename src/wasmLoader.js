/**
 * wasmLoader.js — Управление загрузкой Rapier WASM с fallback и timeout
 */

const WASM_LOAD_TIMEOUT = 10000; // 10 секунд

class WasmLoader {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.callbacks = [];
    this.timeoutId = null;
  }

  /**
   * Начать загрузку WASM
   */
  async load() {
    if (this.isLoaded) return true;
    if (this.isLoading) return new Promise(resolve => {
      this.callbacks.push(resolve);
    });

    this.isLoading = true;
    this.loadProgress = 0;

    return new Promise((resolve) => {
      // Установить timeout
      this.timeoutId = setTimeout(() => {
        console.warn('[WasmLoader] WASM load timeout after 10s, using fallback');
        this.isLoading = false;
        this.isLoaded = false;
        this.notifyCallbacks(false);
        resolve(false);
      }, WASM_LOAD_TIMEOUT);

      // Имитировать прогресс загрузки
      const progressInterval = setInterval(() => {
        if (!this.isLoading) {
          clearInterval(progressInterval);
          return;
        }
        // Плавное увеличение прогресса до 90%
        this.loadProgress = Math.min(this.loadProgress + Math.random() * 30, 90);
        this.notifyProgress();
      }, 200);

      // Попытаться загрузить WASM
      this.attemptLoad().then((success) => {
        clearInterval(progressInterval);
        clearTimeout(this.timeoutId);

        if (success) {
          this.loadProgress = 100;
          this.isLoaded = true;
          this.isLoading = false;
          this.notifyProgress();
          this.notifyCallbacks(true);
          resolve(true);
        } else {
          this.isLoading = false;
          this.notifyCallbacks(false);
          resolve(false);
        }
      }).catch((error) => {
        clearInterval(progressInterval);
        clearTimeout(this.timeoutId);
        console.error('[WasmLoader] WASM load error:', error);
        this.isLoading = false;
        this.notifyCallbacks(false);
        resolve(false);
      });
    });
  }

  /**
   * Попытаться загрузить WASM (проверить, доступен ли Rapier)
   */
  async attemptLoad() {
    try {
      // Проверить, загружен ли Rapier
      if (typeof window !== 'undefined' && window.RAPIER) {
        return true;
      }

      // Попытаться динамически загрузить Rapier
      // (обычно это делает @react-three/rapier автоматически)
      // Здесь мы просто проверяем, что он доступен
      const found = await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (window.RAPIER) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);

        // Timeout для проверки
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
      });

      return found;
    } catch (error) {
      console.error('[WasmLoader] Failed to load WASM:', error);
      return false;
    }
  }

  /**
   * Уведомить об изменении прогресса
   */
  notifyProgress() {
    // Можно использовать для обновления UI
  }

  /**
   * Уведомить все callbacks о завершении загрузки
   */
  notifyCallbacks(success) {
    this.callbacks.forEach(cb => cb(success));
    this.callbacks = [];
  }

  /**
   * Получить текущий прогресс (0-100)
   */
  getProgress() {
    return this.loadProgress;
  }

  /**
   * Проверить, загружен ли WASM
   */
  isWasmLoaded() {
    return this.isLoaded;
  }

  /**
   * Проверить, идёт ли загрузка
   */
  isWasmLoading() {
    return this.isLoading;
  }

  /**
   * Сбросить состояние
   */
  reset() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.callbacks = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

export const wasmLoader = new WasmLoader();
