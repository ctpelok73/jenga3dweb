/**
 * physicsOptimizer.js — Оптимизация производительности Rapier physics
 *
 * Стратегии:
 * 1. Adaptive frame rate — снижаем частоту обновлений для non-critical frames
 * 2. LOD (Level of Detail) — упрощаем расчёты для далёких блоков
 * 3. Collision caching — кэшируем результаты collision-detection
 */

/**
 * Adaptive frame rate controller
 * Снижает частоту physics updates с 60fps до 30fps когда нет активной симуляции
 */
export class AdaptiveFrameRateController {
  constructor() {
    this.isSimulating = false;
    this.frameCount = 0;
    this.skipFrames = 0; // 0 = 60fps, 1 = 30fps (skip every other frame)
  }

  setSimulating(isSimulating, dynamicBlockCount = 0) {
    this.isSimulating = isSimulating;
    this.frameCount = 0;
    // Адаптивный frame rate: больше динамических блоков → ниже частота (экономия CPU)
    if (isSimulating) {
      if (dynamicBlockCount > 15) {
        this.skipFrames = 2; // 20fps для очень сложной симуляции
      } else if (dynamicBlockCount > 8) {
        this.skipFrames = 1; // 30fps для средней сложности
      } else {
        this.skipFrames = 0; // 60fps для простой симуляции
      }
    } else {
      this.skipFrames = 1; // 30fps когда нет активной симуляции
    }
  }

  shouldUpdatePhysics() {
    if (this.skipFrames === 0) return true;
    const shouldUpdate = this.frameCount % (this.skipFrames + 1) === 0;
    this.frameCount++;
    return shouldUpdate;
  }

  getFrameRate() {
    return this.skipFrames === 0 ? 60 : 30;
  }
}

/**
 * LOD (Level of Detail) manager
 * Определяет, какие блоки нужно обновлять с полной точностью
 */
export class PhysicsLODManager {
  constructor(cameraPosition = [0, 5, 8]) {
    this.cameraPosition = cameraPosition;
    this.lodDistances = {
      high: 5,    // Полная точность до 5 units
      medium: 10, // Средняя точность до 10 units
      low: 20,    // Низкая точность дальше 20 units
    };
  }

  calculateLOD(blockPosition) {
    const dx = blockPosition[0] - this.cameraPosition[0];
    const dy = blockPosition[1] - this.cameraPosition[1];
    const dz = blockPosition[2] - this.cameraPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < this.lodDistances.high) return 'high';
    if (distance < this.lodDistances.medium) return 'medium';
    return 'low';
  }

  /**
   * Возвращает, нужно ли обновлять блок с полной точностью
   */
  shouldUpdateBlock(blockPosition, isDynamic) {
    if (isDynamic) return true; // Dynamic блоки всегда обновляются
    const lod = this.calculateLOD(blockPosition);
    return lod === 'high';
  }

  /**
   * Возвращает, нужно ли проверять collision для блока
   */
  shouldCheckCollision(blockPosition) {
    const lod = this.calculateLOD(blockPosition);
    return lod !== 'low';
  }

  updateCameraPosition(position) {
    this.cameraPosition = position;
  }
}

/**
 * Collision cache для оптимизации повторяющихся расчётов
 */
export class CollisionCache {
  constructor(maxSize = 256) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Генерирует ключ кэша для пары блоков
   */
  getKey(id1, id2) {
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  }

  /**
   * Получить результат collision из кэша
   */
  get(id1, id2) {
    return this.cache.get(this.getKey(id1, id2));
  }

  /**
   * Сохранить результат collision в кэш
   */
  set(id1, id2, result) {
    if (this.cache.size >= this.maxSize) {
      // Удалить первый элемент (FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(this.getKey(id1, id2), result);
  }

  /**
   * Инвалидировать кэш для конкретного блока
   */
  invalidate(blockId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`${blockId}-`) || key.includes(`-${blockId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Velocity threshold optimizer
 * Адаптивно меняет threshold в зависимости от количества динамических блоков
 */
export class VelocityThresholdOptimizer {
  constructor() {
    this.baseThreshold = 0.08;
    this.minThreshold = 0.05;
    this.maxThreshold = 0.15;
  }

  /**
   * Получить адаптивный threshold в зависимости от количества динамических блоков
   */
  getThreshold(dynamicBlockCount) {
    // Больше динамических блоков = выше threshold (быстрее завершить симуляцию)
    const factor = Math.min(dynamicBlockCount / 10, 1);
    return this.baseThreshold + (this.maxThreshold - this.baseThreshold) * factor;
  }

  /**
   * Получить timeout в зависимости от количества динамических блоков
   */
  getTimeout(dynamicBlockCount) {
    // Больше блоков = больше времени на симуляцию
    const baseTimeout = 8000;
    const factor = Math.min(dynamicBlockCount / 20, 1);
    return baseTimeout + (4000 * factor);
  }
}

/**
 * Главный оптимизатор физики
 */
export class PhysicsOptimizer {
  constructor() {
    this.frameRateController = new AdaptiveFrameRateController();
    this.lodManager = new PhysicsLODManager();
    this.collisionCache = new CollisionCache();
    this.velocityOptimizer = new VelocityThresholdOptimizer();
  }

  /**
   * Инициализировать оптимизатор с начальными параметрами
   */
  initialize(cameraPosition) {
    this.lodManager.updateCameraPosition(cameraPosition);
  }

  /**
   * Обновить состояние симуляции
   */
  updateSimulationState(isSimulating, dynamicBlockCount = 0) {
    this.frameRateController.setSimulating(isSimulating, dynamicBlockCount);
  }

  /**
   * Получить параметры для текущего frame
   */
  getFrameParams(dynamicBlockCount = 0) {
    return {
      shouldUpdatePhysics: this.frameRateController.shouldUpdatePhysics(),
      frameRate: this.frameRateController.getFrameRate(),
      velocityThreshold: this.velocityOptimizer.getThreshold(dynamicBlockCount),
      timeout: this.velocityOptimizer.getTimeout(dynamicBlockCount),
    };
  }

  /**
   * Получить LOD для блока
   */
  getBlockLOD(blockPosition, isDynamic) {
    if (isDynamic) return 'high'; // Динамические блоки всегда с полной точностью
    return this.lodManager.calculateLOD(blockPosition);
  }

  /**
   * Проверить, нужно ли обновлять блок
   */
  shouldUpdateBlock(blockPosition, isDynamic) {
    return this.lodManager.shouldUpdateBlock(blockPosition, isDynamic);
  }

  /**
   * Инвалидировать кэш при изменении конфигурации
   */
  invalidateCache(blockId) {
    this.collisionCache.invalidate(blockId);
  }

  /**
   * Очистить весь кэш
   */
  clearCache() {
    this.collisionCache.clear();
  }

  /**
   * Обновить позицию камеры для LOD расчётов
   */
  updateCameraPosition(position) {
    this.lodManager.updateCameraPosition(position);
  }
}

// Singleton instance
export const physicsOptimizer = new PhysicsOptimizer();
